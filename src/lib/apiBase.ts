/**
 * Prefix for API calls. Matches Vite's `base` so the app keeps working
 * when served under a subpath (e.g. manuelatorres.com/bitacor-ai via
 * a reverse proxy) as well as at the root during local dev.
 */
const rawBase = import.meta.env.BASE_URL || "/";
export const API_BASE = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
