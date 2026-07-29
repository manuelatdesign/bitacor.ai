import { Agent } from "@cursor/sdk";
import { buildCategoriesPrompt, buildCategoriesRepairPrompt } from "./categoryPrompt";
import { buildGeoRepairPrompt, checkItineraryGeography } from "./geoCheck";
import {
  buildOptionBPrompt,
  buildPrincipalPrompt,
  buildRepairPrompt,
} from "./prompt";
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
  validateSingleProposalPayload,
} from "./validate";

export interface GenerateSingleResult {
  proposal: GeneratedItinerary;
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

async function parseSingle(
  text: string,
  expectedType: "Principal" | "Opción B"
): Promise<GeneratedItinerary> {
  const parsed = extractJsonObject(text);
  return validateSingleProposalPayload(parsed, expectedType);
}

async function withGeoCheck(
  proposal: GeneratedItinerary,
  enrichment: EnrichmentContext | undefined,
  expectedType: "Principal" | "Opción B"
): Promise<GenerateSingleResult> {
  const geo = checkItineraryGeography([proposal], enrichment);
  if (!geo.needsRepair) {
    return { proposal, geoWarnings: geo.warnings };
  }

  if (geoRepairDisabled()) {
    console.warn(
      `[cursorAgent] saltos geográficos (${expectedType}); geo-repair off:`,
      geo.details.slice(0, 4)
    );
    return { proposal, geoWarnings: geo.warnings };
  }

  try {
    const text = await runAgentPrompt(
      buildGeoRepairPrompt(JSON.stringify({ proposals: [proposal] }), geo),
      `bitacor-itinerary-geo-repair-${expectedType === "Principal" ? "a" : "b"}`
    );
    const repaired = await parseSingle(text, expectedType);
    const geo2 = checkItineraryGeography([repaired], enrichment);
    return { proposal: repaired, geoWarnings: [...geo.warnings, ...geo2.warnings] };
  } catch (geoErr: any) {
    console.warn("[cursorAgent] geo repair falló, se devuelve original:", geoErr?.message);
    return { proposal, geoWarnings: geo.warnings };
  }
}

async function generateOne(
  expectedType: "Principal" | "Opción B",
  prompt: string,
  runName: string,
  repairName: string,
  enrichment?: EnrichmentContext
): Promise<GenerateSingleResult> {
  let text = await runAgentPrompt(prompt, runName);
  let proposal: GeneratedItinerary;

  try {
    proposal = await parseSingle(text, expectedType);
  } catch (firstErr: any) {
    console.warn(
      `[cursorAgent] JSON inválido (${expectedType}), reintentando:`,
      firstErr?.message
    );
    text = await runAgentPrompt(
      buildRepairPrompt(text, firstErr?.message || "JSON inválido", expectedType),
      repairName
    );
    proposal = await parseSingle(text, expectedType);
  }

  return withGeoCheck(proposal, enrichment, expectedType);
}

export async function generatePrincipalWithCursor(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): Promise<GenerateSingleResult> {
  const prompt = buildPrincipalPrompt(config, enrichment, opts);
  return generateOne(
    "Principal",
    prompt,
    "bitacor-itinerary-principal",
    "bitacor-itinerary-principal-repair",
    enrichment
  );
}

export async function generateOptionBWithCursor(
  config: TravelConfigInput,
  enrichment: EnrichmentContext | undefined,
  principal: GeneratedItinerary,
  opts?: { regenerate?: boolean }
): Promise<GenerateSingleResult> {
  const prompt = buildOptionBPrompt(config, enrichment, principal, opts);
  return generateOne(
    "Opción B",
    prompt,
    "bitacor-itinerary-option-b",
    "bitacor-itinerary-option-b-repair",
    enrichment
  );
}

/** @deprecated Prefer generatePrincipalWithCursor + generateOptionBWithCursor. */
export async function generateProposalsWithCursor(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): Promise<{ proposals: GeneratedItinerary[]; geoWarnings: string[] }> {
  const a = await generatePrincipalWithCursor(config, enrichment, opts);
  const b = await generateOptionBWithCursor(config, enrichment, a.proposal, opts);
  return {
    proposals: [a.proposal, b.proposal],
    geoWarnings: [...a.geoWarnings, ...b.geoWarnings],
  };
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
