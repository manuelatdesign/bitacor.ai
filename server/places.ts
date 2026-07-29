import { enrichPlacesFromOsm } from "./osmPlaces";
import type { EnrichmentContext, TravelConfigInput } from "./types";

export { autocompleteCities } from "./cityAutocomplete";
export type { CitySuggestion } from "./cityAutocomplete";

/**
 * Enrich destination with free OSM (Nominatim + Overpass).
 * Google Nearby supplement is skipped on the generate hot path for latency.
 */
export async function enrichPlaces(
  config: TravelConfigInput
): Promise<Pick<EnrichmentContext, "places" | "lat" | "lng" | "formattedAddress" | "warnings">> {
  const osm = await enrichPlacesFromOsm(config);
  const places = [...osm.places];

  places.sort((a, b) => {
    const rank = (t: (typeof places)[number]["type"]) =>
      t === "coworking" ? 0 : t === "cafe" ? 1 : 2;
    return rank(a.type) - rank(b.type);
  });

  return {
    places: places.slice(0, 18),
    lat: osm.lat,
    lng: osm.lng,
    formattedAddress: osm.formattedAddress,
    warnings: [...osm.warnings],
  };
}
