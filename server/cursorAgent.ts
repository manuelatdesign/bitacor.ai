import { Agent } from "@cursor/sdk";
import { buildCategoriesPrompt, buildCategoriesRepairPrompt } from "./categoryPrompt";
import { buildGeoRepairPrompt, checkItineraryGeography } from "./geoCheck";
import { buildProposalsPrompt, buildRepairPrompt } from "./prompt";
import { agentPromptRuntime } from "./cursorRuntime";
import {
  assertCanSpend,
  estimateTokensFromText,
  recordUsage,
} from "./tokenBudget";
import type {
  DestinationCategory,
  EnrichmentContext,
  GeneratedItinerary,
  TravelConfigInput,
} from "./types";
import {
  extractJsonObject,
  validateCategoriesPayload,
  validateProposalsPayload,
} from "./validate";

export interface GenerateProposalsResult {
  proposals: GeneratedItinerary[];
  geoWarnings: string[];
}

function requireApiKey(): string {
  const key = process.env.CURSOR_API_KEY;
  if (!key) {
    throw new Error("CURSOR_API_KEY no está configurada en el servidor.");
  }
  return key;
}

function geoRepairDisabled(): boolean {
  const raw = (process.env.CURSOR_DISABLE_GEO_REPAIR ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

async function runAgentPrompt(prompt: string, name: string): Promise<string> {
  assertCanSpend();

  const apiKey = requireApiKey();

  const result = await Agent.prompt(prompt, {
    apiKey,
    ...agentPromptRuntime(name),
  });

  if (result.status === "error" || !result.result) {
    throw new Error(
      result.error?.message ||
        `El agente Cursor no devolvió resultado (status=${result.status}).`
    );
  }

  const usage = result.usage;
  recordUsage({
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    totalTokens: usage?.totalTokens,
    estimatedTokens: usage
      ? undefined
      : estimateTokensFromText(prompt, result.result),
    runName: name,
  });

  return result.result;
}

async function parseProposals(text: string): Promise<GeneratedItinerary[]> {
  const parsed = extractJsonObject(text);
  return validateProposalsPayload(parsed);
}

export async function generateProposalsWithCursor(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext
): Promise<GenerateProposalsResult> {
  const prompt = buildProposalsPrompt(config, enrichment);
  let text = await runAgentPrompt(prompt, "bitacor-itinerary-generator");
  let proposals: GeneratedItinerary[];

  try {
    proposals = await parseProposals(text);
  } catch (firstErr: any) {
    console.warn("[cursorAgent] JSON inválido, reintentando una vez:", firstErr?.message);
    text = await runAgentPrompt(
      buildRepairPrompt(text, firstErr?.message || "JSON inválido"),
      "bitacor-itinerary-repair"
    );
    proposals = await parseProposals(text);
  }

  const geo = checkItineraryGeography(proposals, enrichment);
  if (geo.needsRepair) {
    if (geoRepairDisabled()) {
      console.warn(
        "[cursorAgent] saltos geográficos detectados; geo-repair desactivado (CURSOR_DISABLE_GEO_REPAIR). Tips soft only:",
        geo.details.slice(0, 4)
      );
      return { proposals, geoWarnings: geo.warnings };
    }

    console.warn("[cursorAgent] saltos geográficos, repair geo:", geo.details.slice(0, 4));
    try {
      text = await runAgentPrompt(
        buildGeoRepairPrompt(JSON.stringify({ proposals }), geo),
        "bitacor-itinerary-geo-repair"
      );
      proposals = await parseProposals(text);
      const geo2 = checkItineraryGeography(proposals, enrichment);
      return { proposals, geoWarnings: [...geo.warnings, ...geo2.warnings] };
    } catch (geoErr: any) {
      console.warn("[cursorAgent] geo repair falló, se devuelve original:", geoErr?.message);
      return { proposals, geoWarnings: geo.warnings };
    }
  }

  return { proposals, geoWarnings: geo.warnings };
}

export async function generateCategoriesWithCursor(
  destination: string
): Promise<DestinationCategory[]> {
  const prompt = buildCategoriesPrompt(destination);
  let text = await runAgentPrompt(prompt, "bitacor-category-generator");

  try {
    const parsed = extractJsonObject(text);
    return validateCategoriesPayload(parsed);
  } catch (firstErr: any) {
    console.warn("[cursorAgent] categorías JSON inválido, reintentando:", firstErr?.message);
    text = await runAgentPrompt(
      buildCategoriesRepairPrompt(text, firstErr?.message || "JSON inválido"),
      "bitacor-category-repair"
    );
    const parsed = extractJsonObject(text);
    return validateCategoriesPayload(parsed);
  }
}
