/** Client-side Google Maps JS config (Vite env). */

export function getGoogleMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export function hasGoogleMapsApiKey(): boolean {
  return getGoogleMapsApiKey().length > 0;
}

/** Cloud Console Map ID (required for Advanced Markers). DEMO_MAP_ID works for local testing. */
export function getGoogleMapsMapId(): string {
  const id = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  return typeof id === "string" && id.trim() ? id.trim() : "DEMO_MAP_ID";
}
