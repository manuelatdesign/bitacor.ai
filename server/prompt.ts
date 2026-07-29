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

function sharedRulesBlock(days: number, energy: number, opts?: { regenerate?: boolean }): string {
  return `REGLAS GEO Y HORARIOS (críticas para utilidad):
G1. Agrupa cada día por ZONA/barrio. No saltes de un extremo de la ciudad a otro y vuelvas al primero.
G2. Entre actividades consecutivas del mismo día: preferir cercanía (usa coords del listado). Máximo UN traslado largo por día, y solo al inicio o entre bloque mañana/tarde.
G3. Si hay "abre:" en un lugar, NO programes la visita fuera de ese horario.
G4. Día 1 respeta hora de llegada; último día respeta hora de regreso (menos actividades o más cerca del traslado).
G5. Si hay hospedaje del usuario, úsalo como ancla (empezar/cerrar el día cerca cuando tenga sentido).
G6. En "title" de actividades usa el nombre del lugar del listado cuando lo uses, para poder mapear coords.

REGLAS JSON:
1. Devuelve SOLO JSON válido (sin markdown, sin backticks, sin texto extra).
2. itinerary.length debe ser ${days} (un día por entrada, day = 1..${days}).
3. Cada día: 2–4 actividades coherentes con la energía ${energy}/100.
4. "desc" = 1 frase corta (máx. 100 caracteres).
5. "category" OBLIGATORIO en CADA actividad: string en inglés minúsculas, exactamente UNA de: ${ACTIVITY_CATEGORY_PROMPT_LIST}.
   - NO uses español ("Explorar", "Comida", "Naturaleza"). Solo el id: "explore", "food", "nature", etc.
   - NO uses el mismo "explore" en todas: varía según la actividad real.
   - Café/cowork con laptop o trabajo remoto → "work" (no "cafe").
   - Café sin foco trabajo → "cafe". Restaurante/comida → "food".
   - Parque/sendero/mirador → "nature". Playa/costa → "beach".
   - Museo/galería/patrimonio → "culture". Paseo/barrio sin foco claro → "explore".
   - Bar/fiesta → "nightlife". Spa/yoga → "wellness".
   - Bus/vuelo/taxi largo → "transit". Check-in hotel/hostel → "stay".
   - Compras → "shopping". Deporte extremo/trek exigente → "adventure".
   - Prohibido omitir category. Prohibido isCoworkingFriendly.
6. tip y reservation: por defecto NO existen. Por cada día: MÁXIMO 2 tips y MÁXIMO 2 reservations.
   - tip: OMITIR salvo info crítica. Si dudas: OMITIR.
   - reservation: OMITIR salvo reserva OBLIGATORIA. Nunca escribas "sin reserva".
7. practicalTips (4–6): wifi/conectividad, hospedaje, transporte — tono de tip de amigo. OBLIGATORIO: cada nombre de lugar/hostal/barrio/café debe ir como markdown [Nombre](https://www.google.com/maps/search/?api=1&query=...) — SOLO Google Maps. Incluye al menos 3 tips con enlaces.
8. shortDescription y títulos de día: 1 frase oral, concreta; Spanglish ligero OK. Sin emojis en el JSON.
9. mapsUrl de cafés/actividades: SOLO Google Maps (search o place). Reutiliza mapsUrl del listado si ya es google.com/maps.
${opts?.regenerate ? `\n10. NUEVA TANDA (id ${Date.now()}): propón barrios, orden del día y actividades DISTINTAS a un plan genérico anterior. Mantén el perfil del usuario pero sorprende con otro ángulo creativo.` : ""}`;
}

const PROPOSAL_SHAPE = `{
  "proposalType": string,
  "destinationTitle": string (solo ciudad/destino corto, sin slogan),
  "shortDescription": string,
  "practicalTips": string[4-6],
  "recommendedCafesAndCoworks": [
    { "name": string, "type": "cafe"|"coworking", "rating": string, "notes": string, "mapsUrl": string|opcional, "lat": number|opcional, "lng": number|opcional }
  ],
  "itinerary": [
    {
      "day": number,
      "title": string,
      "activities": [
        { "time": string, "title": string, "desc": string (máx. 120 chars), "category": "${ACTIVITY_CATEGORY_PROMPT_LIST}", "mapsUrl": string|opcional, "tip": string|omitir, "reservation": string|omitir }
      ]
    }
  ]
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

/** Progressive stage 1: only Principal (faster first paint). */
export function buildPrincipalPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): string {
  const { days, energy, interests } = prepContext(config);
  return `Eres un amigo nómada que arma planes de viaje cercanos y útiles. Responde SIEMPRE en español con Spanglish natural (wifi, cowork, tip, day-pass, mood) cuando suene auténtico. Tono oral, corto, sin jerga SaaS ni brochure.
Nunca hables mal de un destino; si algo no conviene, reformúlalo como recomendación ("si buscas X, mejor…").

IMPORTANTE: No edites archivos, no uses herramientas del repositorio ni del sistema. Tu única salida debe ser JSON.

TAREA: Genera EXACTAMENTE 1 itinerario — la propuesta Principal — a partir del perfil completo del usuario.
NO uses arquetipos fijos tipo "Aventura / Deep Focus / Wellness" como título.
Debe respetar destino, presupuesto, intereses, energía, fechas y hospedaje si hay. Sea geográficamente realista y útil.

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
Shape de cada propuesta:
${PROPOSAL_SHAPE}
Exactamente 1 elemento en "proposals" con proposalType "Principal".

Genera ahora el JSON.`;
}

/** Progressive stage 2: Opción B distinct from Principal. */
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

  return `Eres un amigo nómada que arma planes de viaje cercanos y útiles. Responde SIEMPRE en español con Spanglish natural. Tono oral, corto.
Nunca hables mal de un destino; si algo no conviene, reformúlalo como recomendación.

IMPORTANTE: No edites archivos, no uses herramientas. Tu única salida debe ser JSON.

TAREA: Genera EXACTAMENTE 1 itinerario — Opción B — para el MISMO perfil del usuario.
Debe ser CLARAMENTE distinta de la Principal (otros barrios/zonas, otro orden del día, otro mix), sin clonar títulos ni el mismo recorrido.

PRINCIPAL YA GENERADA (NO la copies; diferénciate):
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
Shape de cada propuesta:
${PROPOSAL_SHAPE}
Exactamente 1 elemento en "proposals" con proposalType "Opción B".

Genera ahora el JSON.`;
}

/** @deprecated Prefer buildPrincipalPrompt / buildOptionBPrompt. Kept for repair of both. */
export function buildProposalsPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext,
  opts?: { regenerate?: boolean }
): string {
  return buildPrincipalPrompt(config, enrichment, opts);
}

export function buildRepairPrompt(
  invalidText: string,
  errorMessage: string,
  expectedType: "Principal" | "Opción B" | "both" = "both"
): string {
  const count =
    expectedType === "both"
      ? "exactamente 2 propuestas (Principal y Opción B)"
      : `exactamente 1 propuesta con proposalType "${expectedType}"`;
  return `Tu respuesta anterior no era JSON válido o no cumplía el schema.

Error: ${errorMessage}

Respuesta previa (recorta si es largo):
${invalidText.slice(0, 4000)}

Devuelve ÚNICAMENTE el JSON corregido con ${count}, sin markdown ni texto extra. Respeta cercanía por zona y horarios de apertura.
Cada actividad DEBE incluir "category" con un id en inglés de: ${ACTIVITY_CATEGORY_PROMPT_LIST} (no español; no pongas "explore" en todas).`;
}
