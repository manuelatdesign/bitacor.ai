import { ACTIVITY_CATEGORY_PROMPT_LIST } from "./activityCategories";
import type { EnrichmentContext, GeneratedItinerary, TravelConfigInput } from "./types";

/** Extract energy 0–100 from pace string like "Paso Moderado · Híbrido (55)". */
export function parseEnergy(pace?: string): number {
  if (!pace) return 50;
  const m = pace.match(/\((\d{1,3})\)/);
  if (m) return Math.max(0, Math.min(100, parseInt(m[1], 10)));
  const lower = pace.toLowerCase();
  if (lower.includes("lento") || lower.includes("zen") || lower.includes("deep focus")) return 20;
  if (lower.includes("intenso") || lower.includes("explorador")) return 82;
  return 50;
}

function formatPlaceLine(p: EnrichmentContext["places"][number], i: number): string {
  const coords =
    p.lat != null && p.lng != null ? ` — coords ${p.lat.toFixed(5)},${p.lng.toFixed(5)}` : "";
  const hours = p.openingHours ? ` — abre: ${p.openingHours}` : "";
  const area = p.area ? ` — zona: ${p.area}` : "";
  const addr = p.address ? ` — ${p.address}` : "";
  const url = p.mapsUrl ? ` — ${p.mapsUrl}` : "";
  return `${i + 1}. [${p.type}] ${p.name}${coords}${hours}${area}${addr}${url}\n   notas: ${p.notes}`;
}

function sharedProfileBlock(
  config: TravelConfigInput,
  enrichment: EnrichmentContext | undefined,
  days: number,
  energy: number,
  interests: string
): string {
  const lodgingLine = config.lodging?.trim()
    ? `- Hospedaje del usuario (ancla geográfica): ${config.lodging.trim()}`
    : "";

  const maxPlacesRaw = Number.parseInt(process.env.CURSOR_MAX_PLACES_IN_PROMPT || "12", 10);
  const maxPlaces =
    Number.isFinite(maxPlacesRaw) && maxPlacesRaw > 0 ? maxPlacesRaw : 12;
  const placesList = enrichment?.places || [];
  const placesForPrompt = placesList.slice(0, maxPlaces);
  const placesBlock =
    placesForPrompt.length > 0
      ? placesForPrompt.map(formatPlaceLine).join("\n") +
        (placesList.length > placesForPrompt.length
          ? `\n(… ${placesList.length - placesForPrompt.length} POIs omitidos por límite de prompt)`
          : "")
      : "(Sin POIs externos; usa lugares reales conocidos del destino con ubicaciones coherentes entre sí, sin inventar nombres ficticios.)";

  const warnings =
    enrichment?.warnings?.length
      ? `Avisos de enriquecimiento:\n${enrichment.warnings.map((w) => `- ${w}`).join("\n")}`
      : "";

  return `PERFIL DEL USUARIO:
- Destino: ${config.destination}${enrichment?.formattedAddress ? ` (${enrichment.formattedAddress})` : ""}
- Días: ${days}
- Llegada: ${config.arrivalDate || "n/d"} ${config.arrivalTime || ""}
- Regreso: ${config.departureDate || "n/d"} ${config.departureTime || ""}
- Presupuesto: ${config.budget || "Flexible"}
- Intereses: ${interests}
- Ritmo/energía: ${config.pace || "moderado"} (nivel numérico ≈ ${energy}/100)
  * Energía baja (<38): más bloques de trabajo/coworking, menos actividades intensas.
  * Energía media (38–73): balance trabajo + exploración.
  * Energía alta (>73): más exploración, networking y actividades outdoor.
${lodgingLine}

LUGARES REALES CERCANOS (datos locales — priorízalos; incluye coords y horarios; mapsUrl ya es Google Maps):
${placesBlock}
${warnings ? `\n${warnings}\n` : ""}`;
}

function sharedRulesBlock(
  days: number,
  energy: number,
  opts?: { regenerate?: boolean; itineraryDays?: number; dayFrom?: number; dayTo?: number }
): string {
  const itineraryDays = opts?.itineraryDays ?? days;
  const dayRange =
    opts?.dayFrom != null && opts?.dayTo != null
      ? `itinerary debe cubrir solo días ${opts.dayFrom}..${opts.dayTo} (day = ${opts.dayFrom}..${opts.dayTo}).`
      : `itinerary.length debe ser ${itineraryDays} (un día por entrada, day = 1..${itineraryDays}).`;

  return `REGLAS GEO Y HORARIOS (críticas para utilidad):
G1. Agrupa cada día por ZONA/barrio. No saltes de un extremo de la ciudad a otro y vuelvas al primero.
G2. Entre actividades consecutivas del mismo día: preferir cercanía (usa coords del listado). Máximo UN traslado largo por día, y solo al inicio o entre bloque mañana/tarde.
G3. Si hay "abre:" en un lugar, NO programes la visita fuera de ese horario.
G4. Día 1 respeta hora de llegada; último día respeta hora de regreso (menos actividades o más cerca del traslado).
G5. Si hay hospedaje del usuario, úsalo como ancla (empezar/cerrar el día cerca cuando tenga sentido).
G6. En "title" de actividades usa el nombre del lugar del listado cuando lo uses, para poder mapear coords.

REGLAS JSON:
1. Devuelve SOLO JSON válido (sin markdown, sin backticks, sin texto extra).
2. ${dayRange}
3. Cada día: 2–3 actividades coherentes con la energía ${energy}/100.
4. "desc" = 1 frase corta (máx. 80 caracteres).
5. "category" OBLIGATORIO en CADA actividad: string en inglés minúsculas, exactamente UNA de: ${ACTIVITY_CATEGORY_PROMPT_LIST}.
   - Café/cowork con laptop → "work". Café sin foco trabajo → "cafe". Comida → "food". Parque → "nature". Playa → "beach". Museo → "culture". Barrio → "explore". Bar → "nightlife". Spa → "wellness". Traslado largo → "transit". Hotel → "stay". Compras → "shopping". Trek → "adventure".
   - Prohibido omitir category. Prohibido isCoworkingFriendly. No pongas "explore" en todas.
6. tip y reservation: OMITIR por defecto. Máx. 1 tip y 1 reservation por día, solo si es crítico/obligatorio.
7. practicalTips: ver instrucción de la tarea (si aplica). Links Maps solo Google.
8. shortDescription y títulos de día: 1 frase oral, concreta; Spanglish ligero OK. Sin emojis.
9. mapsUrl: SOLO Google Maps. Reutiliza del listado si existe.
${opts?.regenerate ? `\n10. NUEVA TANDA (id ${Date.now()}): otro ángulo creativo, distinto a un plan genérico.` : ""}`;
}

const ACTIVITY_SHAPE = `{ "time": string, "title": string, "desc": string (máx. 80 chars), "category": "${ACTIVITY_CATEGORY_PROMPT_LIST}", "mapsUrl": string|opcional, "tip": string|omitir, "reservation": string|omitir }`;

const DAY_SHAPE = `{ "day": number, "title": string, "activities": [ ${ACTIVITY_SHAPE}, ... ] }`;

const PROPOSAL_SHAPE = `{
  "proposalType": string,
  "destinationTitle": string (solo ciudad/destino corto, sin slogan),
  "shortDescription": string,
  "practicalTips": string[],
  "recommendedCafesAndCoworks": [
    { "name": string, "type": "cafe"|"coworking", "rating": string, "notes": string, "mapsUrl": string|opcional, "lat": number|opcional, "lng": number|opcional }
  ],
  "itinerary": [ ${DAY_SHAPE}, ... ]
}`;

function prepContext(config: TravelConfigInput) {
  const days = config.days && config.days > 0 ? config.days : 3;
  const energy = parseEnergy(config.pace);
  const interests =
    config.interests && config.interests.length > 0
      ? config.interests.join(", ")
      : "coworking, cafés, cultura local";
  return { days, energy, interests };
}

const INTRO = `Eres un amigo nómada que arma planes de viaje cercanos y útiles. Responde SIEMPRE en español con Spanglish natural (wifi, cowork, tip, day-pass, mood) cuando suene auténtico. Tono oral, corto, sin jerga SaaS ni brochure.
Nunca hables mal de un destino; si algo no conviene, reformúlalo como recomendación ("si buscas X, mejor…").

IMPORTANTE: No edites archivos, no uses herramientas del repositorio ni del sistema. Tu única salida debe ser JSON.`;

/** Progressive: meta + Día 1 only (fast first paint). */
export function buildShellPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): string {
  const { days, energy, interests } = prepContext(config);
  return `${INTRO}

TAREA: Genera el SHELL de la propuesta Principal: info básica + SOLO el Día 1.
El viaje dura ${days} días en total, pero en este JSON itinerary.length debe ser 1 (solo day: 1).
Respeta llegada del día 1, presupuesto, intereses, energía y hospedaje si hay.

${sharedProfileBlock(config, enrichment, days, energy, interests)}

${sharedRulesBlock(days, energy, { ...opts, itineraryDays: 1, dayFrom: 1, dayTo: 1 })}

FORMA DEL JSON:
{
  "proposals": [
    {
      "proposalType": "Principal",
      "destinationTitle": string,
      "shortDescription": string (1 frase),
      "practicalTips": string[3] (máx. 2 con link Google Maps markdown),
      "recommendedCafesAndCoworks": [ ... máx. 3 ... ],
      "itinerary": [ { "day": 1, "title": string, "activities": [2-3 acts] } ]
    }
  ]
}
Exactamente 1 propuesta "Principal". itinerary SOLO día 1.

Genera ahora el JSON.`;
}

/** Progressive: days 2..N given shell (day 1 already done). */
export function buildRemainingDaysPrompt(
  config: TravelConfigInput,
  enrichment: EnrichmentContext | undefined,
  shell: GeneratedItinerary,
  opts?: { regenerate?: boolean }
): string {
  const { days, energy, interests } = prepContext(config);
  const day1 = (shell.itinerary || []).find((d) => d.day === 1) || shell.itinerary?.[0];
  const day1Acts = (day1?.activities || []).map((a) => a.title).join(", ");
  const cafes = (shell.recommendedCafesAndCoworks || [])
    .map((c) => c.name)
    .slice(0, 4)
    .join(", ");

  return `${INTRO}

TAREA: Completa la propuesta Principal generando SOLO los días 2..${days} (no regeneres el día 1).
Mantén coherencia con el shell: mismas vibes, sin repetir las mismas actividades del día 1, varía zonas cuando tenga sentido.

SHELL YA GENERADO:
- shortDescription: ${shell.shortDescription || "(n/d)"}
- Cafés/cowork: ${cafes || "(n/d)"}
- Día 1 (${day1?.title || "n/d"}): ${day1Acts || "(sin acts)"}

${sharedProfileBlock(config, enrichment, days, energy, interests)}

${sharedRulesBlock(days, energy, {
    ...opts,
    itineraryDays: Math.max(0, days - 1),
    dayFrom: 2,
    dayTo: days,
  })}

FORMA DEL JSON:
{
  "days": [
    ${DAY_SHAPE},
    ...
  ]
}
Exactamente ${Math.max(0, days - 1)} entradas en "days", con day = 2..${days} en orden.
NO incluyas day 1. NO envolvas en "proposals".

Genera ahora el JSON.`;
}

/** Progressive stage: full Principal (compat / single-shot). */
export function buildPrincipalPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): string {
  const { days, energy, interests } = prepContext(config);
  return `${INTRO}

TAREA: Genera EXACTAMENTE 1 itinerario — la propuesta Principal — completa (${days} días).
NO uses arquetipos fijos. Geográficamente realista y útil.

${sharedProfileBlock(config, enrichment, days, energy, interests)}

${sharedRulesBlock(days, energy, opts)}

FORMA DEL JSON:
{
  "proposals": [
    {
      "proposalType": "Principal",
      ...shape...
    }
  ]
}
Shape:
${PROPOSAL_SHAPE}
practicalTips: 3–4 (máx. 2 con link Maps). recommendedCafesAndCoworks: máx. 3.
Exactamente 1 elemento "Principal".

Genera ahora el JSON.`;
}

/** Progressive: Opción B distinct from Principal. */
export function buildOptionBPrompt(
  config: TravelConfigInput,
  enrichment: EnrichmentContext | undefined,
  principal: GeneratedItinerary,
  opts?: { regenerate?: boolean }
): string {
  const { days, energy, interests } = prepContext(config);
  const principalZones = (principal.itinerary || [])
    .map((d) => `Día ${d.day}: ${d.title} → ${(d.activities || []).map((a) => a.title).join(", ")}`)
    .join("\n");
  const principalCafes = (principal.recommendedCafesAndCoworks || [])
    .map((c) => c.name)
    .slice(0, 6)
    .join(", ");

  return `${INTRO}

TAREA: Genera EXACTAMENTE 1 itinerario — Opción B — completa (${days} días) para el MISMO perfil.
CLARAMENTE distinta de la Principal (otros barrios/zonas, otro orden), sin clonar.

PRINCIPAL YA GENERADA (NO la copies):
- shortDescription: ${principal.shortDescription || "(n/d)"}
- Cafés/cowork: ${principalCafes || "(n/d)"}
- Días:
${principalZones || "(sin detalle)"}

${sharedProfileBlock(config, enrichment, days, energy, interests)}

${sharedRulesBlock(days, energy, opts)}

FORMA DEL JSON:
{
  "proposals": [
    {
      "proposalType": "Opción B",
      ...shape...
    }
  ]
}
Shape:
${PROPOSAL_SHAPE}
practicalTips: 3–4. recommendedCafesAndCoworks: máx. 3.
Exactamente 1 elemento "Opción B".

Genera ahora el JSON.`;
}

/** @deprecated Prefer buildShellPrompt / buildRemainingDaysPrompt / buildOptionBPrompt. */
export function buildProposalsPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): string {
  return buildShellPrompt(config, enrichment, opts);
}

export function buildRepairPrompt(
  invalidText: string,
  errorMessage: string,
  expectedType: "Principal" | "Opción B" | "both" | "days" = "both"
): string {
  let count: string;
  if (expectedType === "both") {
    count = "exactamente 2 propuestas (Principal y Opción B)";
  } else if (expectedType === "days") {
    count = 'un objeto { "days": [ ... ] } con los días pedidos';
  } else {
    count = `exactamente 1 propuesta con proposalType "${expectedType}"`;
  }
  return `Tu respuesta anterior no era JSON válido o no cumplía el schema.

Error: ${errorMessage}

Respuesta previa (recorta si es largo):
${invalidText.slice(0, 4000)}

Devuelve ÚNICAMENTE el JSON corregido con ${count}, sin markdown ni texto extra. Respeta cercanía por zona y horarios de apertura.
Cada actividad DEBE incluir "category" con un id en inglés de: ${ACTIVITY_CATEGORY_PROMPT_LIST} (no español; no pongas "explore" en todas).`;
}
