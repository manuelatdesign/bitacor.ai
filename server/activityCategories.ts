/** Allowed activity category ids (keep in sync with src/lib/activityCategories.ts). */

export const ACTIVITY_CATEGORY_IDS = [
  "work",
  "cafe",
  "food",
  "nature",
  "culture",
  "explore",
  "nightlife",
  "wellness",
  "transit",
  "stay",
  "shopping",
  "beach",
  "adventure",
] as const;

export type ActivityCategoryId = (typeof ACTIVITY_CATEGORY_IDS)[number];

const SET = new Set<string>(ACTIVITY_CATEGORY_IDS);

/** Labels / synonyms the model often returns instead of English ids. */
const ALIASES: Record<string, ActivityCategoryId> = {
  work: "work",
  cowork: "work",
  coworking: "work",
  "work / cowork": "work",
  "work/cowork": "work",
  trabajo: "work",
  "wifi ok": "work",
  wifi: "work",
  laptop: "work",
  cafe: "cafe",
  café: "cafe",
  coffee: "cafe",
  cafetería: "cafe",
  cafeteria: "cafe",
  food: "food",
  comida: "food",
  restaurant: "food",
  restaurante: "food",
  gastronomía: "food",
  gastronomia: "food",
  brunch: "food",
  nature: "nature",
  naturaleza: "nature",
  outdoor: "nature",
  parque: "nature",
  culture: "culture",
  cultura: "culture",
  museo: "culture",
  explore: "explore",
  explorar: "explore",
  exploración: "explore",
  exploracion: "explore",
  ocio: "explore",
  "ocio/cultura": "explore",
  nightlife: "nightlife",
  "vida nocturna": "nightlife",
  noche: "nightlife",
  bar: "nightlife",
  wellness: "wellness",
  bienestar: "wellness",
  yoga: "wellness",
  spa: "wellness",
  transit: "transit",
  traslado: "transit",
  transporte: "transit",
  stay: "stay",
  hospedaje: "stay",
  hotel: "stay",
  hostel: "stay",
  shopping: "shopping",
  compras: "shopping",
  beach: "beach",
  playa: "beach",
  adventure: "adventure",
  aventura: "adventure",
};

function resolveCategoryToken(raw: string): ActivityCategoryId | null {
  const id = raw.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (SET.has(id)) return id as ActivityCategoryId;
  const aliased = ALIASES[raw.trim().toLowerCase()] || ALIASES[id];
  return aliased ?? null;
}

/** Heuristic when model omits category or sends junk. */
export function inferActivityCategory(
  title: string,
  desc: string,
  isCoworkingFriendly?: boolean
): ActivityCategoryId {
  const t = `${title} ${desc}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (
    isCoworkingFriendly ||
    /\b(cowork|coworking|laptop|deep work|trabajo remoto|sesion de trabajo|bloque de trabajo|hot desk|day[- ]?pass)\b/.test(
      t
    )
  ) {
    return "work";
  }
  if (/\b(playa|beach|costa|malec[oó]n|malecon|orill[ao] del mar)\b/.test(t)) return "beach";
  if (
    /\b(raft|parapente|bungee|zipline|escalada|canyoning|cascadismo|trek|trekking|hiking|aventura|deportes extremos?)\b/.test(
      t
    )
  ) {
    return "adventure";
  }
  if (
    /\b(museo|galeria|patrimonio|templo|iglesia|catedral|teatro|galeria de arte|centro cultural|historia)\b/.test(
      t
    )
  ) {
    return "culture";
  }
  if (
    /\b(parque|sendero|mirador|naturaleza|cascada|jardin|bosque|trail|cerro|montaña|montana|rio|laguna)\b/.test(
      t
    )
  ) {
    return "nature";
  }
  if (/\b(spa|yoga|masaje|medit|wellness|sauna|estiramiento|holistic)\b/.test(t)) {
    return "wellness";
  }
  if (
    /\b(nightlife|antro|discoteca|club nocturno|bar craft|cerveza craft|copa|fiesta|after|pub)\b/.test(
      t
    )
  ) {
    return "nightlife";
  }
  if (/\b(hotel|hostel|check[- ]?in|hospedaje|alojamiento|hostal|airbnb)\b/.test(t)) {
    return "stay";
  }
  if (
    /\b(aeropuerto|vuelo|bus inter|traslado|terminal|estacion de|estación de|ferry|tren)\b/.test(t)
  ) {
    return "transit";
  }
  if (/\b(shopping|compras|outlet|mall|centro comercial|souvenir)\b/.test(t)) {
    return "shopping";
  }
  if (
    /\b(restaurante|almuerzo|cena|comida|brunch|gastronom|taller de cocina|mercado gastron|street food|arepa|asado)\b/.test(
      t
    )
  ) {
    return "food";
  }
  if (/\b(cafe|cafeteria|tostadur|coffee|latte|espresso)\b/.test(t)) return "cafe";

  return "explore";
}

export function normalizeActivityCategory(
  raw: unknown,
  opts?: {
    isCoworkingFriendly?: boolean;
    title?: string;
    desc?: string;
  }
): ActivityCategoryId {
  const inferred = inferActivityCategory(
    opts?.title || "",
    opts?.desc || "",
    opts?.isCoworkingFriendly
  );

  if (typeof raw === "string" && raw.trim()) {
    const resolved = resolveCategoryToken(raw);
    if (resolved) {
      // Model often stamps "explore" on everything — trust text when it is more specific.
      if (resolved === "explore" && inferred !== "explore") return inferred;
      return resolved;
    }
  }
  return inferred;
}

export const ACTIVITY_CATEGORY_PROMPT_LIST = ACTIVITY_CATEGORY_IDS.join(" | ");
