import { enrichPlacesFromOsm } from "./osmPlaces";
import type { EnrichmentContext, PlaceSpot, TravelConfigInput } from "./types";

export { autocompleteCities } from "./cityAutocomplete";
export type { CitySuggestion } from "./cityAutocomplete";

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

function mapsSearchUrl(name: string, destination: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${destination}`)}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeDestination(
  destination: string,
  apiKey: string
): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) {
    throw new Error(`Geocoding falló: ${data.status || "sin resultados"}`);
  }
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
  };
}

async function nearbySearch(
  lat: number,
  lng: number,
  type: string,
  keyword: string | undefined,
  apiKey: string,
  destination: string,
  spotType: PlaceSpot["type"]
): Promise<PlaceSpot[]> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: "6000",
    type,
    key: apiKey,
  });
  if (keyword) params.set("keyword", keyword);

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Places nearby HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places nearby falló: ${data.status}`);
  }

  const results = Array.isArray(data.results) ? data.results : [];
  return results.slice(0, 6).map((p: any): PlaceSpot => ({
    name: p.name,
    type: spotType,
    rating: p.rating != null ? `${p.rating}/5` : "—",
    notes: p.vicinity || p.types?.slice(0, 3).join(", ") || "Lugar recomendado",
    placeId: p.place_id,
    mapsUrl: p.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
      : mapsSearchUrl(p.name, destination),
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
    address: p.vicinity,
  }));
}

function interestKeywords(interests: string[] = []): string[] {
  const map: Record<string, string> = {
    coworking: "coworking",
    cafés: "specialty coffee",
    cafes: "specialty coffee",
    culture: "museum",
    cultura: "museum",
    nature: "park",
    naturaleza: "park",
    beach: "beach",
    playa: "beach",
    gastronomy: "restaurant",
    gastronomía: "restaurant",
    nightlife: "bar",
    wellness: "yoga spa",
    surf: "surf",
  };
  const out: string[] = [];
  for (const interest of interests) {
    const key = interest.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (key.includes(k)) out.push(v);
    }
  }
  return [...new Set(out)].slice(0, 3);
}

/**
 * Enrich destination with free OSM (Nominatim + Overpass) for any city.
 * Optional Google nearby only as soft supplement when key is present.
 */
export async function enrichPlaces(
  config: TravelConfigInput
): Promise<Pick<EnrichmentContext, "places" | "lat" | "lng" | "formattedAddress" | "warnings">> {
  const osm = await enrichPlacesFromOsm(config);
  const warnings = [...osm.warnings];
  const places = [...osm.places];
  const seen = new Set(places.map((p) => p.placeId || p.name.toLowerCase()));

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  // Supplement (not replace) with Google if key exists and OSM returned few spots
  if (apiKey && places.length < 8 && osm.lat != null && osm.lng != null) {
    try {
      const searches: Promise<PlaceSpot[]>[] = [
        nearbySearch(
          osm.lat,
          osm.lng,
          "cafe",
          "specialty coffee wifi",
          apiKey,
          config.destination,
          "cafe"
        ),
        nearbySearch(osm.lat, osm.lng, "cafe", "coworking", apiKey, config.destination, "coworking"),
      ];
      for (const kw of interestKeywords(config.interests)) {
        searches.push(
          nearbySearch(
            osm.lat,
            osm.lng,
            "tourist_attraction",
            kw,
            apiKey,
            config.destination,
            "poi"
          )
        );
      }
      const settled = await Promise.allSettled(searches);
      for (const s of settled) {
        if (s.status === "rejected") {
          warnings.push(`Google Places parcial: ${s.reason?.message || s.reason}`);
          continue;
        }
        for (const p of s.value) {
          const key = p.placeId || p.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          places.push({ ...p, source: "google" });
        }
      }
    } catch (err: any) {
      warnings.push(`Google Places suplemento falló: ${err?.message || err}`);
    }
  }

  places.sort((a, b) => {
    const rank = (t: PlaceSpot["type"]) => (t === "coworking" ? 0 : t === "cafe" ? 1 : 2);
    return rank(a.type) - rank(b.type);
  });

  return {
    places: places.slice(0, 18),
    lat: osm.lat,
    lng: osm.lng,
    formattedAddress: osm.formattedAddress,
    warnings,
  };
}
