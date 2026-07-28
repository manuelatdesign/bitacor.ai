/**
 * Prefix for API calls. Matches Vite's `base` (site root on Vercel and local dev).
 */
const rawBase = import.meta.env.BASE_URL || "/";
export const API_BASE = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
