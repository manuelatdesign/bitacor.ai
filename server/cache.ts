import crypto from "crypto";
import type { DestinationCategory, GeneratedItinerary, TravelConfigInput } from "./types";

interface CacheEntry {
  proposals: GeneratedItinerary[];
  createdAt: number;
}

interface CategoryCacheEntry {
  categories: DestinationCategory[];
  createdAt: number;
}

const store = new Map<string, CacheEntry>();
const categoryStore = new Map<string, CategoryCacheEntry>();

function envTtlMs(name: string, fallbackMs: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallbackMs;
  const minutes = Number.parseInt(raw, 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return fallbackMs;
  return minutes * 60_000;
}

/** Default 180 min (3 h) in dev-friendly setups; override with CURSOR_PROPOSALS_CACHE_TTL_MIN. */
const DEFAULT_TTL_MS = envTtlMs("CURSOR_PROPOSALS_CACHE_TTL_MIN", 180);
const CATEGORY_TTL_MS = envTtlMs("CURSOR_CATEGORIES_CACHE_TTL_MIN", 24 * 60);

export function cacheKey(config: TravelConfigInput): string {
  const payload = {
    v: "itinerary-category-v3",
    destination: config.destination?.trim().toLowerCase(),
    days: config.days,
    budget: config.budget,
    interests: [...(config.interests || [])].sort(),
    pace: config.pace,
    arrivalDate: config.arrivalDate,
    departureDate: config.departureDate,
    lodging: config.lodging?.trim().toLowerCase() || "",
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function getCachedProposals(key: string, ttlMs = DEFAULT_TTL_MS): GeneratedItinerary[] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.proposals;
}

export function setCachedProposals(key: string, proposals: GeneratedItinerary[]): void {
  store.set(key, { proposals, createdAt: Date.now() });
  // Cap memory
  if (store.size > 100) {
    const oldest = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) store.delete(oldest[0]);
  }
}

export function categoryCacheKey(destination: string): string {
  return crypto
    .createHash("sha256")
    .update(destination.trim().toLowerCase())
    .digest("hex");
}

export function getCachedCategories(
  key: string,
  ttlMs = CATEGORY_TTL_MS
): DestinationCategory[] | null {
  const entry = categoryStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > ttlMs) {
    categoryStore.delete(key);
    return null;
  }
  return entry.categories;
}

export function setCachedCategories(key: string, categories: DestinationCategory[]): void {
  categoryStore.set(key, { categories, createdAt: Date.now() });
  if (categoryStore.size > 200) {
    const oldest = [...categoryStore.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) categoryStore.delete(oldest[0]);
  }
}
