/** Shared server-side travel types (mirrors src/types.ts shape). */

import type { ActivityCategoryId } from "./activityCategories";

export interface TravelConfigInput {
  destination: string;
  days?: number;
  budget?: string;
  interests?: string[];
  pace?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  /** User lodging: booking URL or place name. */
  lodging?: string;
  /** Skip server cache and ask the model for a fresh take. */
  regenerate?: boolean;
  /**
   * Progressive generation:
   * - `principal` (default): enrich + Principal only
   * - `optionB`: Opción B (requires `principal` in body)
   */
  stage?: "principal" | "optionB";
}

export interface PlaceSpot {
  name: string;
  type: "cafe" | "coworking" | "poi";
  rating: string;
  notes: string;
  placeId?: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  address?: string;
  /** Human-readable hours from OSM opening_hours when available. */
  openingHours?: string;
  /** Approx neighborhood / suburb from OSM tags. */
  area?: string;
  source?: "osm" | "google";
}

export interface WeatherDaySummary {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  summary: string;
}

export interface EnrichmentContext {
  places: PlaceSpot[];
  /** @deprecated Weather enrichment removed from hot path; kept optional for compat. */
  weather?: WeatherDaySummary[];
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  warnings: string[];
}

export interface DestinationCategory {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface ItineraryActivity {
  time: string;
  title: string;
  desc: string;
  isCoworkingFriendly: boolean;
  category?: ActivityCategoryId;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  tip?: string;
  reservation?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface CafeOrCowork {
  name: string;
  type: "cafe" | "coworking";
  rating: string;
  notes: string;
  placeId?: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
}

export interface GeneratedItinerary {
  proposalType: string;
  destinationTitle: string;
  shortDescription: string;
  practicalTips: string[];
  itinerary: ItineraryDay[];
  recommendedCafesAndCoworks: CafeOrCowork[];
}
