import { googleMapsLatLngUrl, googleMapsSearchUrl } from "./googleMaps";
import type { EnrichmentContext, PlaceSpot, TravelConfigInput } from "./types";

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

const NOMINATIM_UA = "Bitacor.ai/1.0 (travel planner; contact: local-dev)";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 12_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}


/** Geocode via Nominatim (free). Soft rate-limit friendly. */
export async function geocodeNominatim(destination: string): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(destination)}`;
  const res = await fetchWithTimeout(url, {
    timeoutMs: 8000,
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_UA },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = (await res.json()) as any[];
  if (!data?.[0]) throw new Error("Nominatim sin resultados");
  const item = data[0];
  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    formattedAddress: item.display_name || destination,
  };
}

type OsmQuery = { spotType: PlaceSpot["type"]; filter: string };

/** node+way around point for better coverage (ways need out center). */
function nw(tagFilter: string): string {
  return `node${tagFilter}(around:RADIUS,LAT,LNG);way${tagFilter}(around:RADIUS,LAT,LNG);`;
}

function buildOsmQueries(interests: string[] = []): OsmQuery[] {
  const base: OsmQuery[] = [
    { spotType: "cafe", filter: nw(`["amenity"="cafe"]`) },
    { spotType: "coworking", filter: nw(`["amenity"="coworking_space"]`) },
    { spotType: "coworking", filter: nw(`["office"="coworking"]`) },
  ];

  const interest = interests.join(" ").toLowerCase();
  const extras: OsmQuery[] = [];
  const add = (spotType: PlaceSpot["type"], tagFilter: string) => {
    extras.push({ spotType, filter: nw(tagFilter) });
  };

  if (/museum|cultur|arte|templo|histor/.test(interest)) {
    add("poi", `["tourism"="museum"]`);
    add("poi", `["historic"]`);
  }
  if (/park|natur|sender|forest|arví|arvi/.test(interest)) {
    add("poi", `["leisure"="park"]`);
    add("poi", `["tourism"="viewpoint"]`);
  }
  if (/beach|playa|surf|mar /.test(interest)) {
    add("poi", `["natural"="beach"]`);
    add("poi", `["sport"="surfing"]`);
  }
  if (/gastro|food|restaurant|comida|mercado|street/.test(interest)) {
    add("poi", `["amenity"="restaurant"]`);
    add("poi", `["amenity"="marketplace"]`);
  }
  if (/night|bar|salsa|fiesta/.test(interest)) {
    add("poi", `["amenity"="bar"]`);
  }
  if (/yoga|wellness|spa|medit/.test(interest)) {
    add("poi", `["leisure"="spa"]`);
  }
  if (/cowork|remote|wifi|trabajo/.test(interest)) {
    add("cafe", `["amenity"="cafe"]["internet_access"="wlan"]`);
  }

  extras.push(
    { spotType: "poi", filter: nw(`["tourism"="attraction"]`) },
    { spotType: "poi", filter: nw(`["tourism"="gallery"]`) }
  );

  return [...base, ...extras].slice(0, 5);
}

function elementToSpot(
  el: any,
  spotType: PlaceSpot["type"],
  destination: string
): PlaceSpot | null {
  const tags = el.tags || {};
  const name = tags.name || tags["name:es"] || tags["name:en"];
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const area =
    tags["addr:suburb"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:quarter"] ||
    tags["addr:district"] ||
    undefined;
  const address = [tags["addr:street"], tags["addr:housenumber"], area, tags["addr:city"]]
    .filter(Boolean)
    .join(", ");
  const openingHours = typeof tags.opening_hours === "string" ? tags.opening_hours : undefined;
  const notesParts = [
    tags.cuisine && `cocina: ${tags.cuisine}`,
    tags.tourism && `turismo: ${tags.tourism}`,
    tags.amenity && `tipo: ${tags.amenity}`,
    tags.internet_access === "wlan" && "wifi",
    area && `zona: ${area}`,
  ].filter(Boolean);

  return {
    name,
    type: spotType,
    rating: tags.stars ? `${tags.stars}/5` : "OSM",
    notes: notesParts.join(" · ") || "OpenStreetMap",
    placeId: `osm-${el.type || "node"}-${el.id}`,
    mapsUrl: googleMapsLatLngUrl(lat, lng, name),
    lat,
    lng,
    address: address || undefined,
    openingHours,
    area,
    source: "osm",
  };
}

async function queryOverpassEndpoint(endpoint: string, query: string): Promise<any[]> {
  const res = await fetchWithTimeout(endpoint, {
    method: "POST",
    timeoutMs: 8_000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": NOMINATIM_UA,
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.elements) ? data.elements : [];
}

/** Race Overpass mirrors; first success wins (hard ~8s budget). */
async function queryOverpass(query: string): Promise<any[]> {
  return Promise.any(
    OVERPASS_URLS.map((endpoint) => queryOverpassEndpoint(endpoint, query))
  );
}

/**
 * Free enrichment: Nominatim geocode + Overpass POIs (any destination, no API key).
 */
export async function enrichPlacesFromOsm(
  config: TravelConfigInput
): Promise<Pick<EnrichmentContext, "places" | "lat" | "lng" | "formattedAddress" | "warnings">> {
  const warnings: string[] = [];

  try {
    const geo = await geocodeNominatim(config.destination);
    const radius = 5500;
    const queries = buildOsmQueries(config.interests);

    const filters = queries
      .map((q) =>
        q.filter
          .replace(/RADIUS/g, String(radius))
          .replace(/LAT/g, String(geo.lat))
          .replace(/LNG/g, String(geo.lng))
      )
      .join("\n  ");

    const overpassQl = `
[out:json][timeout:8];
(
  ${filters}
);
out center;
`.trim();

    let elements: any[] = [];
    try {
      elements = await queryOverpass(overpassQl);
    } catch (err: any) {
      warnings.push(`Overpass lento/timeout: ${err?.message || err}. Seguimos con coords de ciudad.`);
    }
    const places: PlaceSpot[] = [];
    const seen = new Set<string>();

    // Map elements back roughly by matching tags
    for (const el of elements) {
      const tags = el.tags || {};
      let spotType: PlaceSpot["type"] = "poi";
      if (tags.amenity === "cafe") spotType = "cafe";
      else if (tags.amenity === "coworking_space" || tags.office === "coworking")
        spotType = "coworking";

      const spot = elementToSpot(el, spotType, config.destination);
      if (!spot) continue;
      const key = spot.placeId || spot.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!spot.mapsUrl) {
        spot.mapsUrl = googleMapsSearchUrl(`${spot.name} ${config.destination}`);
      }
      places.push(spot);
    }

    places.sort((a, b) => {
      const rank = (t: PlaceSpot["type"]) => (t === "coworking" ? 0 : t === "cafe" ? 1 : 2);
      const hoursBonus = (p: PlaceSpot) => (p.openingHours ? -1 : 0);
      return rank(a.type) - rank(b.type) || hoursBonus(a) - hoursBonus(b);
    });

    if (places.length === 0) {
      warnings.push("OpenStreetMap no devolvió lugares cercanos; la IA usará conocimiento general del destino.");
    }

    return {
      places: places.slice(0, 18),
      lat: geo.lat,
      lng: geo.lng,
      formattedAddress: geo.formattedAddress,
      warnings,
    };
  } catch (err: any) {
    warnings.push(`OSM/Nominatim no disponible: ${err?.message || err}`);
    return { places: [], warnings };
  }
}
