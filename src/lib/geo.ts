import exifr from "exifr";
import type { CafeOrCowork, GeneratedItinerary } from "../types";

export interface LatLng {
  lat: number;
  lng: number;
}

const KNOWN_DESTINATIONS: Record<string, LatLng> = {
  medellin: { lat: 6.2476, lng: -75.5658 },
  medellín: { lat: 6.2476, lng: -75.5658 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  kioto: { lat: 35.0116, lng: 135.7681 },
  bali: { lat: -8.4095, lng: 115.1889 },
  amalfi: { lat: 40.634, lng: 14.6027 },
  highlands: { lat: 57.1497, lng: -2.0943 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  lisboa: { lat: 38.7223, lng: -9.1393 },
  mexico: { lat: 19.4326, lng: -99.1332 },
  "cdmx": { lat: 19.4326, lng: -99.1332 },
  bogota: { lat: 4.711, lng: -74.0721 },
  bogotá: { lat: 4.711, lng: -74.0721 },
};

const geocodeCache = new Map<string, LatLng>();

function knownFromTitle(title: string): LatLng | null {
  const t = title.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_DESTINATIONS)) {
    if (t.includes(key)) return coords;
  }
  return null;
}

function firstCafeCoords(cafes: CafeOrCowork[] | undefined): LatLng | null {
  const hit = (cafes || []).find((c) => typeof c.lat === "number" && typeof c.lng === "number");
  if (!hit || hit.lat == null || hit.lng == null) return null;
  return { lat: hit.lat, lng: hit.lng };
}

/** Resolve a map center for an itinerary (cafés → known cities → Nominatim). */
export async function resolveTripCenter(itinerary: GeneratedItinerary | null): Promise<LatLng> {
  if (!itinerary) return { lat: 20, lng: 0 };

  const fromCafes = firstCafeCoords(itinerary.recommendedCafesAndCoworks);
  if (fromCafes) return fromCafes;

  const known = knownFromTitle(itinerary.destinationTitle);
  if (known) return known;

  const query = itinerary.destinationTitle.trim();
  if (!query) return { lat: 20, lng: 0 };

  const cached = geocodeCache.get(query.toLowerCase());
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(query.toLowerCase(), coords);
      return coords;
    }
  } catch {
    /* fall through */
  }

  return { lat: 20, lng: 0 };
}

export function getCurrentPosition(timeoutMs = 8000): Promise<LatLng | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

export async function readExifGps(file: Blob): Promise<LatLng | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {
    /* no EXIF */
  }
  return null;
}

/** Small random offset so stacked photos without GPS don't fully overlap. */
export function jitterAround(center: LatLng, index: number): LatLng {
  const angle = (index * 2.4) % (Math.PI * 2);
  const dist = 0.002 + (index % 5) * 0.0015;
  return {
    lat: center.lat + Math.cos(angle) * dist,
    lng: center.lng + Math.sin(angle) * dist,
  };
}

export async function reverseGeocodeLabel(coords: LatLng): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=16`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("reverse failed");
    const data = (await res.json()) as { name?: string; display_name?: string };
    if (data.name) return data.name;
    if (data.display_name) return data.display_name.split(",").slice(0, 2).join(",").trim();
  } catch {
    /* ignore */
  }
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}
