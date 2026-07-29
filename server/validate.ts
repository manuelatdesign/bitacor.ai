import {
  normalizeActivityCategory,
} from "./activityCategories";
import type {
  CafeOrCowork,
  DestinationCategory,
  GeneratedItinerary,
  ItineraryActivity,
  ItineraryDay,
} from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

/** Opt-in: keep tip only if it signals something important (not filler). */
function sanitizeTip(raw: string): string | undefined {
  const tip = raw.trim().slice(0, 120);
  if (tip.length < 16) return undefined;
  const lower = tip.toLowerCase();
  if (
    /^(revisa|consulta|verifica)/.test(lower) ||
    /^disfruta/.test(lower) ||
    /sin tip|ninguno|n\/a|no aplica/.test(lower)
  ) {
    return undefined;
  }
  const important =
    /efectivo|cash only|solo cash|cola|fila larga|llega\s+\d|cerrad[oa]|abre a las|cierra a las|horario raro|clave (wifi|del wifi)|password|llevar |dni|pasaporte|prohibid|gratis hasta|pico y placa|sin enchufe|pocos enchufes|muy ruidoso|zona (roja|complicada)|después de las|antes de las|solo con cita|con cita/i;
  return important.test(tip) ? tip : undefined;
}

/** Opt-in: keep reservation only when booking is required. */
function sanitizeReservation(raw: string): string | undefined {
  const reservation = raw.trim().slice(0, 120);
  if (reservation.length < 10) return undefined;
  if (
    /no (necesitas|hace falta|requiere|precisa)|sin reserva|no reserve|walk[- ]?in|llega y ya|opcional|no es necesario|si puedes|si quieres|recomend|conviene reserv|mejor reserv/i.test(
      reservation
    )
  ) {
    return undefined;
  }
  const mustBook =
    /obligatori|imprescindible|hay que reserv|debes reserv|necesitas reserv|reserva(r)? (con anticip|online|antes|mesa|entrada)|compra(r)? (la )?(entrada|ticket|boleto)|day[- ]?pass|inscripci[oó]n|inscribirte|ticket online|boletería/i;
  return mustBook.test(reservation) ? reservation : undefined;
}

function normalizeActivity(raw: unknown): ItineraryActivity | null {
  if (!isRecord(raw)) return null;
  const title = asString(raw.title).trim();
  if (!title) return null;
  const tip = sanitizeTip(asString(raw.tip));
  const reservation = sanitizeReservation(asString(raw.reservation));
  const desc = asString(raw.desc, "").trim().slice(0, 160);
  const legacyCowork = asBool(raw.isCoworkingFriendly, false);
  const category = normalizeActivityCategory(raw.category, {
    isCoworkingFriendly: legacyCowork,
    title,
    desc,
  });
  return {
    time: asString(raw.time, "Horario flexible"),
    title,
    desc,
    category,
    isCoworkingFriendly: category === "work",
    ...(typeof raw.mapsUrl === "string" && raw.mapsUrl ? { mapsUrl: raw.mapsUrl } : {}),
    ...(typeof raw.lat === "number" ? { lat: raw.lat } : {}),
    ...(typeof raw.lng === "number" ? { lng: raw.lng } : {}),
    ...(tip ? { tip } : {}),
    ...(reservation ? { reservation } : {}),
  };
}

function normalizeDay(raw: unknown, index: number): ItineraryDay | null {
  if (!isRecord(raw)) return null;
  const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];
  const activities = activitiesRaw
    .map(normalizeActivity)
    .filter((a): a is ItineraryActivity => !!a);
  if (activities.length === 0) return null;
  return {
    day: asNumber(raw.day, index + 1),
    title: asString(raw.title, `Día ${index + 1}`),
    activities,
  };
}

function normalizeCafe(raw: unknown): CafeOrCowork | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name).trim();
  if (!name) return null;
  const type = asString(raw.type, "cafe") === "coworking" ? "coworking" : "cafe";
  return {
    name,
    type,
    rating: asString(raw.rating, "—"),
    notes: asString(raw.notes, ""),
    ...(typeof raw.placeId === "string" ? { placeId: raw.placeId } : {}),
    ...(typeof raw.mapsUrl === "string" ? { mapsUrl: raw.mapsUrl } : {}),
    ...(typeof raw.lat === "number" ? { lat: raw.lat } : {}),
    ...(typeof raw.lng === "number" ? { lng: raw.lng } : {}),
  };
}

function normalizeProposal(raw: unknown, fallbackType: string): GeneratedItinerary | null {
  if (!isRecord(raw)) return null;
  const itineraryRaw = Array.isArray(raw.itinerary) ? raw.itinerary : [];
  const itinerary = itineraryRaw
    .map((d, i) => normalizeDay(d, i))
    .filter((d): d is ItineraryDay => !!d);
  if (itinerary.length === 0) return null;

  const cafesRaw = Array.isArray(raw.recommendedCafesAndCoworks)
    ? raw.recommendedCafesAndCoworks
    : [];
  const cafes = cafesRaw
    .map(normalizeCafe)
    .filter((c): c is CafeOrCowork => !!c);

  const tipsRaw = Array.isArray(raw.practicalTips) ? raw.practicalTips : [];
  const practicalTips = tipsRaw
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .slice(0, 8);

  return {
    proposalType: asString(raw.proposalType, fallbackType) || fallbackType,
    destinationTitle: asString(raw.destinationTitle, "Destino"),
    shortDescription: asString(raw.shortDescription, ""),
    practicalTips: practicalTips.length > 0 ? practicalTips : ["Revisa conectividad local al llegar."],
    recommendedCafesAndCoworks: cafes,
    itinerary,
  };
}

/** Extract JSON object from agent text (handles accidental markdown fences). */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No se encontró un objeto JSON en la respuesta del agente.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function validateProposalsPayload(raw: unknown): GeneratedItinerary[] {
  if (!isRecord(raw)) {
    throw new Error("El JSON raíz debe ser un objeto.");
  }

  let list: unknown[] = [];
  if (Array.isArray(raw.proposals)) {
    list = raw.proposals;
  } else if (Array.isArray(raw)) {
    list = raw as unknown[];
  } else {
    throw new Error('Falta el array "proposals".');
  }

  if (list.length < 2) {
    throw new Error("Se requieren exactamente 2 propuestas.");
  }

  const primary = normalizeProposal(list[0], "Principal");
  const optionB = normalizeProposal(list[1], "Opción B");
  if (!primary || !optionB) {
    throw new Error("Una o ambas propuestas son inválidas (faltan días/actividades).");
  }

  // Normalize labels
  primary.proposalType = "Principal";
  optionB.proposalType = "Opción B";

  return [primary, optionB];
}

/** Progressive: validate a single proposal (Principal or Opción B). */
export function validateSingleProposalPayload(
  raw: unknown,
  expectedType: "Principal" | "Opción B"
): GeneratedItinerary {
  if (!isRecord(raw)) {
    throw new Error("El JSON raíz debe ser un objeto.");
  }

  let candidate: unknown = raw;
  if (Array.isArray(raw.proposals) && raw.proposals.length > 0) {
    candidate = raw.proposals[0];
  } else if (isRecord(raw.proposal)) {
    candidate = raw.proposal;
  } else if (Array.isArray(raw) && raw.length > 0) {
    candidate = (raw as unknown[])[0];
  }

  const proposal = normalizeProposal(candidate, expectedType);
  if (!proposal) {
    throw new Error(`Propuesta ${expectedType} inválida (faltan días/actividades).`);
  }
  proposal.proposalType = expectedType;
  return proposal;
}

const ALLOWED_ICONS = new Set([
  "laptop_mac",
  "local_cafe",
  "museum",
  "forest",
  "restaurant",
  "surfing",
  "spa",
  "self_improvement",
  "nightlife",
  "beach_access",
  "directions_boat",
  "castle",
  "explore",
  "photo_camera",
  "edit",
  "backpack",
  "diamond",
  "directions_walk",
]);

function slugifyId(raw: string, fallback: string): string {
  const s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return s || fallback;
}

export function validateCategoriesPayload(raw: unknown): DestinationCategory[] {
  if (!isRecord(raw)) {
    throw new Error("El JSON raíz debe ser un objeto.");
  }
  const list = Array.isArray(raw.categories) ? raw.categories : null;
  if (!list || list.length < 4) {
    throw new Error('Se requieren al menos 4 categorías en "categories".');
  }

  const out: DestinationCategory[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < list.length && out.length < 6; i++) {
    const item = list[i];
    if (!isRecord(item)) continue;
    const name = asString(item.name).trim().slice(0, 48);
    if (!name) continue;
    let id = slugifyId(asString(item.id) || name, `cat-${i + 1}`);
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    const iconRaw = asString(item.icon, "explore").trim();
    const icon = ALLOWED_ICONS.has(iconRaw) ? iconRaw : "explore";
    const desc = asString(item.desc).trim().slice(0, 140) || `Explora ${name.toLowerCase()} en el destino.`;
    out.push({ id, name, icon, desc });
  }

  if (out.length < 4) {
    throw new Error("Categorías insuficientes tras normalizar.");
  }
  return out;
}
