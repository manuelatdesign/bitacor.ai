/**
 * Server-side Cursor SDK token budget.
 * Caps Bitácor spend below the user's full Cursor daily plan (ratio < 1).
 * State persists in `.data/token-budget.json` across server restarts.
 */

import fs from "fs";
import path from "path";

export const TOKEN_BUDGET_EXCEEDED = "TOKEN_BUDGET_EXCEEDED";

export class TokenBudgetExceededError extends Error {
  readonly code = TOKEN_BUDGET_EXCEEDED;

  constructor(message: string) {
    super(message);
    this.name = "TokenBudgetExceededError";
  }
}

interface DayState {
  /** Local calendar day YYYY-MM-DD */
  day: string;
  usedTokens: number;
  usedRuns: number;
  warned80: boolean;
}

export interface TokenBudgetStatus {
  day: string;
  usedTokens: number;
  usedRuns: number;
  planDailyLimit: number;
  appBudgetRatio: number;
  effectiveTokenBudget: number;
  runBudget: number;
  blockingEnabled: boolean;
  blocked: boolean;
  ratioUsed: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "token-budget.json");

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Local calendar day for daily reset. */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0.4;
  // Never default to consuming 100% of the Cursor plan.
  if (ratio >= 1) return 0.99;
  return ratio;
}

function readPlanLimit(): number {
  return Math.max(0, envInt("CURSOR_PLAN_DAILY_TOKEN_LIMIT", 0));
}

function readAppRatio(): number {
  return clampRatio(envFloat("CURSOR_APP_BUDGET_RATIO", 0.4));
}

function readRunBudget(): number {
  return Math.max(0, envInt("CURSOR_DAILY_RUN_BUDGET", 20));
}

function effectiveTokenBudget(): number {
  const plan = readPlanLimit();
  if (plan <= 0) return 0;
  return Math.floor(plan * readAppRatio());
}

function loadState(): DayState {
  const day = todayKey();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as Partial<DayState>;
      if (raw.day === day) {
        return {
          day,
          usedTokens: Math.max(0, Number(raw.usedTokens) || 0),
          usedRuns: Math.max(0, Number(raw.usedRuns) || 0),
          warned80: Boolean(raw.warned80),
        };
      }
    }
  } catch (err) {
    console.warn("[token-budget] no se pudo leer estado, se reinicia:", (err as Error)?.message);
  }
  return { day, usedTokens: 0, usedRuns: 0, warned80: false };
}

function saveState(state: DayState): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("[token-budget] no se pudo persistir estado:", (err as Error)?.message);
  }
}

let memory = loadState();

function syncDay(): DayState {
  const day = todayKey();
  if (memory.day !== day) {
    memory = { day, usedTokens: 0, usedRuns: 0, warned80: false };
    saveState(memory);
  }
  return memory;
}

export function getTokenBudgetStatus(): TokenBudgetStatus {
  const state = syncDay();
  const planDailyLimit = readPlanLimit();
  const appBudgetRatio = readAppRatio();
  const effective = effectiveTokenBudget();
  const runBudget = readRunBudget();
  const blockingEnabled = planDailyLimit > 0 && effective > 0;
  const tokensBlocked = blockingEnabled && state.usedTokens >= effective;
  const runsBlocked = runBudget > 0 && state.usedRuns >= runBudget;
  const ratioUsed =
    blockingEnabled && effective > 0 ? state.usedTokens / effective : 0;

  return {
    day: state.day,
    usedTokens: state.usedTokens,
    usedRuns: state.usedRuns,
    planDailyLimit,
    appBudgetRatio,
    effectiveTokenBudget: effective,
    runBudget,
    blockingEnabled,
    blocked: tokensBlocked || runsBlocked,
    ratioUsed,
  };
}

/** Throw if the next Agent.prompt would exceed the Bitácor daily cap. */
export function assertCanSpend(): void {
  const status = getTokenBudgetStatus();
  if (!status.blocked) return;

  const reason =
    status.runBudget > 0 && status.usedRuns >= status.runBudget
      ? `límite diario de runs (${status.usedRuns}/${status.runBudget})`
      : `límite diario de tokens Bitácor (${status.usedTokens}/${status.effectiveTokenBudget}; ${Math.round(status.appBudgetRatio * 100)}% del plan Cursor)`;

  console.warn(`[token-budget] blocked: ${reason}`);
  throw new TokenBudgetExceededError(
    `IA temporalmente no disponible (${TOKEN_BUDGET_EXCEEDED}). Cupo diario de Bitácor alcanzado; prueba más tarde o usa cache/mock.`
  );
}

/**
 * Rough token estimate when SDK omits usage (~4 chars/token for mixed ES/EN).
 */
export function estimateTokensFromText(prompt: string, resultText: string): number {
  const chars = (prompt?.length || 0) + (resultText?.length || 0);
  return Math.max(500, Math.ceil(chars / 4));
}

export function recordUsage(opts: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedTokens?: number;
  runName: string;
}): TokenBudgetStatus {
  const state = syncDay();
  const fromUsage =
    typeof opts.totalTokens === "number" && opts.totalTokens > 0
      ? opts.totalTokens
      : (opts.inputTokens || 0) + (opts.outputTokens || 0);
  const add =
    fromUsage > 0
      ? fromUsage
      : typeof opts.estimatedTokens === "number" && opts.estimatedTokens > 0
        ? opts.estimatedTokens
        : 0;

  state.usedTokens += add;
  state.usedRuns += 1;
  saveState(state);

  const status = getTokenBudgetStatus();
  const pct = Math.round(status.ratioUsed * 100);
  console.log(
    `[token-budget] +${add} tokens run=${opts.runName} → ${status.usedTokens}/${status.effectiveTokenBudget || "∞"} (${pct || 0}%) runs=${status.usedRuns}/${status.runBudget || "∞"}`
  );

  if (
    status.blockingEnabled &&
    !state.warned80 &&
    status.ratioUsed >= 0.8
  ) {
    state.warned80 = true;
    saveState(state);
    console.warn(
      `[token-budget] ${pct}% of app cap (${status.usedTokens}/${status.effectiveTokenBudget})`
    );
  }

  return status;
}

export function isTokenBudgetError(err: unknown): err is TokenBudgetExceededError {
  return (
    err instanceof TokenBudgetExceededError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === TOKEN_BUDGET_EXCEEDED)
  );
}
