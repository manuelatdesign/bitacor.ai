/** Activity place categories (chip on itinerary cards). */

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

export interface ActivityCategoryMeta {
  id: ActivityCategoryId;
  label: string;
  emoji: string;
  /** Tailwind-ish chip classes */
  chipClass: string;
}

export const ACTIVITY_CATEGORIES: ActivityCategoryMeta[] = [
  {
    id: "work",
    label: "Work / cowork",
    emoji: "💻",
    chipClass:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
  },
  {
    id: "cafe",
    label: "Café",
    emoji: "☕",
    chipClass:
      "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/25",
  },
  {
    id: "food",
    label: "Comida",
    emoji: "🍽️",
    chipClass:
      "bg-orange-500/15 text-orange-900 dark:text-orange-200 border-orange-500/25",
  },
  {
    id: "nature",
    label: "Naturaleza",
    emoji: "🌿",
    chipClass:
      "bg-teal-500/15 text-teal-900 dark:text-teal-200 border-teal-500/25",
  },
  {
    id: "culture",
    label: "Cultura",
    emoji: "🏛️",
    chipClass:
      "bg-violet-500/15 text-violet-900 dark:text-violet-200 border-violet-500/25",
  },
  {
    id: "explore",
    label: "Explorar",
    emoji: "🧭",
    chipClass:
      "bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 border-indigo-500/25",
  },
  {
    id: "nightlife",
    label: "Nightlife",
    emoji: "🌙",
    chipClass:
      "bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-500/25",
  },
  {
    id: "wellness",
    label: "Wellness",
    emoji: "🧘",
    chipClass:
      "bg-sky-500/15 text-sky-900 dark:text-sky-200 border-sky-500/25",
  },
  {
    id: "transit",
    label: "Traslado",
    emoji: "🚌",
    chipClass:
      "bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/25",
  },
  {
    id: "stay",
    label: "Hospedaje",
    emoji: "🛏️",
    chipClass:
      "bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/25",
  },
  {
    id: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    chipClass:
      "bg-pink-500/15 text-pink-900 dark:text-pink-200 border-pink-500/25",
  },
  {
    id: "beach",
    label: "Playa",
    emoji: "🏖️",
    chipClass:
      "bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border-cyan-500/25",
  },
  {
    id: "adventure",
    label: "Aventura",
    emoji: "🏔️",
    chipClass:
      "bg-lime-500/15 text-lime-900 dark:text-lime-200 border-lime-500/25",
  },
];

const BY_ID = new Map(ACTIVITY_CATEGORIES.map((c) => [c.id, c]));
const SET = new Set<string>(ACTIVITY_CATEGORY_IDS);

const ALIASES: Record<string, ActivityCategoryId> = {
  work: "work",
  cowork: "work",
  coworking: "work",
  "work / cowork": "work",
  trabajo: "work",
  wifi: "work",
  cafe: "cafe",
  café: "cafe",
  coffee: "cafe",
  food: "food",
  comida: "food",
  restaurant: "food",
  restaurante: "food",
  nature: "nature",
  naturaleza: "nature",
  culture: "culture",
  cultura: "culture",
  explore: "explore",
  explorar: "explore",
  exploración: "explore",
  exploracion: "explore",
  nightlife: "nightlife",
  "vida nocturna": "nightlife",
  wellness: "wellness",
  bienestar: "wellness",
  transit: "transit",
  traslado: "transit",
  stay: "stay",
  hospedaje: "stay",
  shopping: "shopping",
  compras: "shopping",
  beach: "beach",
  playa: "beach",
  adventure: "adventure",
  aventura: "adventure",
};

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function resolveCategoryToken(raw: string): ActivityCategoryId | null {
  const folded = fold(raw.trim());
  if (SET.has(folded)) return folded as ActivityCategoryId;
  return ALIASES[raw.trim().toLowerCase()] || ALIASES[folded] || null;
}

/** Heuristic when model omits category or stamps explore on everything. */
export function inferActivityCategory(
  title: string,
  desc: string,
  isCoworkingFriendly?: boolean
): ActivityCategoryId {
  const t = fold(`${title} ${desc}`);

  if (
    isCoworkingFriendly ||
    /\b(cowork|coworking|laptop|deep work|trabajo remoto|sesion de trabajo|bloque de trabajo|hot desk|day[- ]?pass|wifi|enchufe)\b/.test(
      t
    )
  ) {
    return "work";
  }
  if (/\b(playa|beach|costa|malecon|orilla del mar)\b/.test(t)) return "beach";
  if (
    /\b(raft|parapente|bungee|zipline|escalada|canyoning|cascadismo|trek|trekking|hiking|aventura|extreme)\b/.test(
      t
    )
  ) {
    return "adventure";
  }
  if (
    /\b(museo|galeria|patrimonio|templo|iglesia|catedral|teatro|centro cultural|historia|monumento)\b/.test(
      t
    )
  ) {
    return "culture";
  }
  if (
    /\b(parque|sendero|mirador|naturaleza|cascada|jardin|bosque|trail|cerro|montana|rio|laguna|canon|cañon)\b/.test(
      t
    )
  ) {
    return "nature";
  }
  if (/\b(spa|yoga|masaje|medit|wellness|sauna|estiramiento|holistic)\b/.test(t)) {
    return "wellness";
  }
  if (/\b(nightlife|antro|discoteca|club|bar craft|cerveza|copa|fiesta|after|pub|rumba)\b/.test(t)) {
    return "nightlife";
  }
  if (/\b(hotel|hostel|check[- ]?in|hospedaje|alojamiento|hostal|airbnb)\b/.test(t)) {
    return "stay";
  }
  if (/\b(aeropuerto|vuelo|traslado|terminal|estacion de|ferry|tren)\b/.test(t)) {
    return "transit";
  }
  if (/\b(shopping|compras|outlet|mall|centro comercial|souvenir)\b/.test(t)) {
    return "shopping";
  }
  if (
    /\b(restaurante|almuerzo|cena|comida|brunch|gastronom|taller de cocina|street food|arepa|asado|desayuno)\b/.test(
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
      if (resolved === "explore" && inferred !== "explore") return inferred;
      return resolved;
    }
  }
  return inferred;
}

export function isActivityCategoryId(v: string): v is ActivityCategoryId {
  return (ACTIVITY_CATEGORY_IDS as readonly string[]).includes(v);
}

export interface ActivityLike {
  category?: string | null;
  title?: string;
  desc?: string;
  isCoworkingFriendly?: boolean;
}

/** Resolve chip category from activity fields (works even if API stamped explore). */
export function resolveActivityCategory(act: ActivityLike): ActivityCategoryId {
  return normalizeActivityCategory(act.category, {
    title: act.title,
    desc: act.desc,
    isCoworkingFriendly: act.isCoworkingFriendly,
  });
}

export function getActivityCategory(act: ActivityLike): ActivityCategoryMeta {
  return BY_ID.get(resolveActivityCategory(act))!;
}

export function categoryImpliesCoworking(id?: string | null): boolean {
  return id === "work";
}

/** Mutate proposals so each activity has a concrete category. */
export function enrichProposalCategories<T extends { itinerary?: Array<{ activities?: ActivityLike[] }> }>(
  proposals: T[]
): T[] {
  for (const p of proposals) {
    for (const day of p.itinerary || []) {
      for (const act of day.activities || []) {
        const category = resolveActivityCategory(act);
        act.category = category;
        act.isCoworkingFriendly = category === "work";
      }
    }
  }
  return proposals;
}
