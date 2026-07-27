import { toGoogleMapsUrl } from "./googleMaps";
import type { CafeOrCowork, ItineraryActivity } from "../types";

const GENERIC_TITLE =
  /^(desayuno|almuerzo|cena|brunch|check[- ]?in|check[- ]?out|llegada|regreso|salida|transfer|traslado|deep work|trabajo remoto|trabajo en|bloque de|tiempo libre|mañana libre|tarde libre|noche libre|paseo|walk|explorar|explora|descanso|siesta)/i;

export interface ResolvedActivityPlace {
  mapsUrl: string;
  lat?: number;
  lng?: number;
  label: string;
}

function looksLikeSpecificPlace(title: string): boolean {
  const t = title.trim();
  if (t.length < 4) return false;
  if (GENERIC_TITLE.test(t)) return false;
  // Proper-ish name: has a capital letter after start, or venue keywords
  if (
    /\b(café|cafe|cowork|hostel|hotel|museo|parque|plaza|mercado|templo|bar|selina|wework|mirador|cerro|iglesia|galería|galeria)\b/i.test(
      t
    )
  ) {
    return true;
  }
  // Multi-word with capitals (e.g. "Parque del Agua", "Café Contento")
  const words = t.split(/\s+/);
  if (words.length >= 2 && /[A-ZÁÉÍÓÚÑ]/.test(t.slice(1))) return true;
  return false;
}

/** Resolve Maps link + optional coords for an activity title. */
export function resolveActivityPlace(
  act: ItineraryActivity,
  spots: CafeOrCowork[] = [],
  destination = ""
): ResolvedActivityPlace | null {
  const title = (act.title || "").trim();
  if (!title || !looksLikeSpecificPlace(title)) return null;

  const fromSpot = spots.find((s) => {
    const a = title.toLowerCase();
    const b = s.name.toLowerCase();
    return a.includes(b) || b.includes(a);
  });

  const lat = act.lat ?? fromSpot?.lat;
  const lng = act.lng ?? fromSpot?.lng;
  const mapsUrl = toGoogleMapsUrl(act.mapsUrl || fromSpot?.mapsUrl, {
    name: fromSpot?.name || title,
    destination,
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
    placeId: fromSpot?.placeId,
  });

  return {
    mapsUrl,
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
    label: fromSpot?.name || title,
  };
}
