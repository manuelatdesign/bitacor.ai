import type { TravelConfigInput } from "./types";

/**
 * Lightweight travel extras without paid flight/hotel APIs:
 * deep-link search URLs the user can open (Google Flights / Hotels).
 */
export function buildTravelDeepLinks(config: TravelConfigInput): {
  flightsUrl?: string;
  hotelsUrl?: string;
  tipLines: string[];
} {
  const dest = config.destination?.trim();
  if (!dest) return { tipLines: [] };

  const dateOut = config.arrivalDate || "";
  const dateBack = config.departureDate || "";

  const flightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights to ${dest}${dateOut ? ` on ${dateOut}` : ""}${dateBack ? ` return ${dateBack}` : ""}`
  )}`;

  const hotelsUrl = `https://www.google.com/travel/hotels/${encodeURIComponent(dest)}${
    dateOut && dateBack
      ? `?dates=${dateOut.replace(/-/g, "")},${dateBack.replace(/-/g, "")}`
      : ""
  }`;

  const tipLines = [
    `Busca vuelos hacia ${dest}: [Google Flights](${flightsUrl})`,
    `Explora hospedaje en ${dest}: [Google Hotels](${hotelsUrl})`,
  ];

  return { flightsUrl, hotelsUrl, tipLines };
}
