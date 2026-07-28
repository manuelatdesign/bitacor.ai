import type { ActivityCategoryId } from "./lib/activityCategories";

export interface ItineraryActivity {
  time: string;
  title: string;
  desc: string;
  /** @deprecated Prefer `category`; kept for older saved itineraries. */
  isCoworkingFriendly: boolean;
  /** Place/activity chip category */
  category?: ActivityCategoryId;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  /** Short practical tip for this activity */
  tip?: string;
  /** Reservation / booking recommendation */
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
  id?: string;
  proposalType: string; // "Principal" | "Opción B"
  destinationTitle: string;
  shortDescription: string;
  practicalTips: string[];
  itinerary: ItineraryDay[];
  recommendedCafesAndCoworks: CafeOrCowork[];
  /** Wizard preferences captured at save time (restored from Guardados). */
  travelConfig?: TravelConfig;
  savedAt?: string;
}

export type StepId = 1 | 2 | 3 | 4 | 5;

/** How the current draft proposals were produced. */
export type ProposalSource = "ai" | "ai-cached" | "mock" | null;

export interface TravelConfig {
  destination: string;
  days: number;
  budget: string;
  interests: string[];
  pace: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  /** User lodging: booking URL or place name. */
  lodging?: string;
}
