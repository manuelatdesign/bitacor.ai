import { Agent } from "@cursor/sdk";
import { buildCategoriesPrompt, buildCategoriesRepairPrompt } from "./categoryPrompt";
import { buildGeoRepairPrompt, checkItineraryGeography } from "./geoCheck";
import {
  buildOptionBPrompt,
  buildPrincipalPrompt,
  buildRemainingDaysPrompt,
  buildRepairPrompt,
  buildShellPrompt,
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
  ItineraryDay,
  TravelConfigInput,
} from "./types";
import {
  extractJsonObject,
  mergeShellWithDays,
  validateCategoriesPayload,
  validateRemainingDaysPayload,
  validateShellProposalPayload,
  validateSingleProposalPayload,
} from "./validate";

export interface GenerateSingleResult {
  proposal: GeneratedItinerary;
  geoWarnings: string[];
}

export interface GenerateDaysResult {
  days: ItineraryDay[];
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

async function parseShell(text: string): Promise<GeneratedItinerary> {
  const parsed = extractJsonObject(text);
  return validateShellProposalPayload(parsed);
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
  enrichment?: EnrichmentContext,
  parseFn: (text: string) => Promise<GeneratedItinerary> = (t) => parseSingle(t, expectedType)
): Promise<GenerateSingleResult> {
  let text = await runAgentPrompt(prompt, runName);
  let proposal: GeneratedItinerary;

  try {
    proposal = await parseFn(text);
  } catch (firstErr: any) {
    console.warn(
      `[cursorAgent] JSON inválido (${expectedType}), reintentando:`,
      firstErr?.message
    );
    text = await runAgentPrompt(
      buildRepairPrompt(text, firstErr?.message || "JSON inválido", expectedType),
      repairName
    );
    proposal = await parseFn(text);
  }

  return withGeoCheck(proposal, enrichment, expectedType);
}

/** Fast first paint: Principal meta + day 1 only. */
export async function generateShellWithCursor(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): Promise<GenerateSingleResult> {
  const prompt = buildShellPrompt(config, enrichment, opts);
  return generateOne(
    "Principal",
    prompt,
    "bitacor-itinerary-shell",
    "bitacor-itinerary-shell-repair",
    enrichment,
    parseShell
  );
}

/** Complete Principal days 2..N given shell. */
export async function generateRemainingDaysWithCursor(
  config: TravelConfigInput,
  enrichment: EnrichmentContext | undefined,
  shell: GeneratedItinerary,
  opts?: { regenerate?: boolean }
): Promise<{ proposal: GeneratedItinerary; geoWarnings: string[] }> {
  const totalDays = config.days && config.days > 0 ? config.days : 3;
  if (totalDays <= 1) {
    return { proposal: { ...shell, proposalType: "Principal" }, geoWarnings: [] };
  }

  const prompt = buildRemainingDaysPrompt(config, enrichment, shell, opts);
  let text = await runAgentPrompt(prompt, "bitacor-itinerary-days");
  let days: ItineraryDay[];

  try {
    days = validateRemainingDaysPayload(extractJsonObject(text), 2, totalDays);
  } catch (firstErr: any) {
    console.warn("[cursorAgent] días JSON inválido, reintentando:", firstErr?.message);
    text = await runAgentPrompt(
      buildRepairPrompt(text, firstErr?.message || "JSON inválido", "days"),
      "bitacor-itinerary-days-repair"
    );
    days = validateRemainingDaysPayload(extractJsonObject(text), 2, totalDays);
  }

  const proposal = mergeShellWithDays(shell, days, totalDays);
  return withGeoCheck(proposal, enrichment, "Principal");
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

/** @deprecated Prefer shell → days → optionB. */
export async function generateProposalsWithCursor(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): Promise<{ proposals: GeneratedItinerary[]; geoWarnings: string[] }> {
  const shell = await generateShellWithCursor(config, enrichment, opts);
  const full = await generateRemainingDaysWithCursor(
    config,
    enrichment,
    shell.proposal,
    opts
  );
  const b = await generateOptionBWithCursor(config, enrichment, full.proposal, opts);
  return {
    proposals: [full.proposal, b.proposal],
    geoWarnings: [...shell.geoWarnings, ...full.geoWarnings, ...b.geoWarnings],
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
