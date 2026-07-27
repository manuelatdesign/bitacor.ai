import type { EnrichmentContext, GeneratedItinerary, PlaceSpot } from "./types";

const JUMP_KM = 9;
const MAX_BIG_JUMPS_PER_DAY = 1;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchPlace(
  title: string,
  places: PlaceSpot[]
): PlaceSpot | undefined {
  const t = normalize(title);
  if (!t) return undefined;
  let best: PlaceSpot | undefined;
  let bestScore = 0;
  for (const p of places) {
    if (p.lat == null || p.lng == null) continue;
    const n = normalize(p.name);
    if (!n) continue;
    if (t.includes(n) || n.includes(t)) {
      const score = Math.min(t.length, n.length);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
  }
  return best;
}

export interface GeoCheckResult {
  warnings: string[];
  needsRepair: boolean;
  details: string[];
}

/** Flag days with excessive long hops between matched activities. */
export function checkItineraryGeography(
  proposals: GeneratedItinerary[],
  enrichment?: EnrichmentContext
): GeoCheckResult {
  const places = enrichment?.places || [];
  if (places.filter((p) => p.lat != null && p.lng != null).length < 2) {
    return { warnings: [], needsRepair: false, details: [] };
  }

  const warnings: string[] = [];
  const details: string[] = [];
  let badDays = 0;

  for (const proposal of proposals) {
    for (const day of proposal.itinerary || []) {
      const coords: { label: string; lat: number; lng: number }[] = [];
      for (const act of day.activities || []) {
        const hit = matchPlace(act.title, places) || matchPlace(act.desc || "", places);
        if (hit?.lat != null && hit?.lng != null) {
          coords.push({ label: act.title, lat: hit.lat, lng: hit.lng });
        }
      }
      if (coords.length < 2) continue;

      let bigJumps = 0;
      for (let i = 1; i < coords.length; i++) {
        const km = haversineKm(coords[i - 1], coords[i]);
        if (km > JUMP_KM) {
          bigJumps++;
          details.push(
            `${proposal.proposalType} día ${day.day}: ${coords[i - 1].label} → ${coords[i].label} (~${km.toFixed(1)} km)`
          );
        }
      }
      if (bigJumps > MAX_BIG_JUMPS_PER_DAY) {
        badDays++;
        warnings.push(
          `${proposal.proposalType}: el día ${day.day} tiene traslados largos; conviene reordenar por zona.`
        );
      }
    }
  }

  return {
    warnings,
    needsRepair: badDays > 0,
    details,
  };
}

export function buildGeoRepairPrompt(
  invalidOrPreviousJson: string,
  geo: GeoCheckResult
): string {
  return `El itinerario tiene saltos geográficos poco útiles (ir lejos y volver).

Problemas detectados:
${geo.details.slice(0, 12).map((d) => `- ${d}`).join("\n") || "(traslados largos entre actividades del mismo día)"}

Reordena las actividades de cada día por cercanía / misma zona. Máximo un traslado largo por día (mejor al inicio o entre mañana/tarde). Respeta horarios de apertura si estaban en el catálogo. Mantén exactamente 2 propuestas (Principal y Opción B) y el mismo schema JSON.

Respuesta previa (recorta si es largo):
${invalidOrPreviousJson.slice(0, 5000)}

Devuelve ÚNICAMENTE el JSON corregido, sin markdown.`;
}
