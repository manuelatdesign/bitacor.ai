import { ACTIVITY_CATEGORY_PROMPT_LIST } from "./activityCategories";
import type { EnrichmentContext, TravelConfigInput } from "./types";

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

export function buildProposalsPrompt(
  config: TravelConfigInput,
  enrichment?: EnrichmentContext
): string {
  const days = config.days && config.days > 0 ? config.days : 3;
  const energy = parseEnergy(config.pace);
  const interests =
    config.interests && config.interests.length > 0
      ? config.interests.join(", ")
      : "coworking, cafés, cultura local";

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

  const weatherBlock =
    enrichment?.weather && enrichment.weather.length > 0
      ? enrichment.weather
          .map(
            (d) =>
              `- ${d.date}: ${d.tempMinC}–${d.tempMaxC}°C, precip ${d.precipitationMm}mm — ${d.summary}`
          )
          .join("\n")
      : "(Sin pronóstico; asume clima típico del destino.)";

  const warnings =
    enrichment?.warnings?.length
      ? `Avisos de enriquecimiento:\n${enrichment.warnings.map((w) => `- ${w}`).join("\n")}`
      : "";

  const lodgingLine = config.lodging?.trim()
    ? `- Hospedaje del usuario (ancla geográfica): ${config.lodging.trim()}`
    : "";

  return `Eres un amigo nómada que arma planes de viaje cercanos y útiles. Responde SIEMPRE en español con Spanglish natural (wifi, cowork, tip, day-pass, mood) cuando suene auténtico. Tono oral, corto, sin jerga SaaS ni brochure ("calibrar", "parámetros", "elegidos rigurosamente", "supervivencia").
Nunca hables mal de un destino; si algo no conviene, reformúlalo como recomendación ("si buscas X, mejor…").

IMPORTANTE: No edites archivos, no uses herramientas del repositorio ni del sistema. Tu única salida debe ser JSON.

TAREA: Genera exactamente 2 itinerarios creativos a partir del perfil completo del usuario.
NO uses arquetipos fijos tipo "Aventura / Deep Focus / Wellness" como títulos de propuesta.
Ambas propuestas deben respetar el MISMO perfil (destino, presupuesto, intereses, energía, fechas, hospedaje si hay).
Diferéncialas con creatividad: barrios/zonas distintas, orden del día, mix de actividades — pero ambas deben ser geográficamente realistas.

PERFIL DEL USUARIO:
- Destino: ${config.destination}${enrichment?.formattedAddress ? ` (${enrichment.formattedAddress})` : ""}
- Días: ${days}
- Llegada: ${config.arrivalDate || "n/d"} ${config.arrivalTime || ""}
- Regreso: ${config.departureDate || "n/d"} ${config.departureTime || ""}
- Presupuesto: ${config.budget || "Flexible"}
- Intereses: ${interests}
- Ritmo/energía: ${config.pace || "moderado"} (nivel numérico ≈ ${energy}/100)
  * Energía baja (<38): más bloques de trabajo/coworking, menos actividades intensas.
  * Energía media (38–73): balance trabajo + exploración.
  * Energía alta (>73): más exploración, networking y actividades outdoor (si el clima lo permite).
${lodgingLine}

LUGARES REALES CERCANOS (datos locales — priorízalos; incluye coords y horarios; mapsUrl ya es Google Maps):
${placesBlock}

CLIMA POR FECHAS:
${weatherBlock}
${warnings ? `\n${warnings}\n` : ""}

REGLAS GEO Y HORARIOS (críticas para utilidad):
G1. Agrupa cada día por ZONA/barrio. No saltes de un extremo de la ciudad a otro y vuelvas al primero.
G2. Entre actividades consecutivas del mismo día: preferir cercanía (usa coords del listado). Máximo UN traslado largo por día, y solo al inicio o entre bloque mañana/tarde.
G3. Si hay "abre:" en un lugar, NO programes la visita fuera de ese horario.
G4. Día 1 respeta hora de llegada; último día respeta hora de regreso (menos actividades o más cerca del traslado).
G5. Si hay hospedaje del usuario, úsalo como ancla (empezar/cerrar el día cerca cuando tenga sentido).
G6. En "title" de actividades usa el nombre del lugar del listado cuando lo uses, para poder mapear coords.

REGLAS JSON:
1. Devuelve SOLO JSON válido (sin markdown, sin backticks, sin texto extra).
2. El JSON debe ser un objeto con la forma:
{
  "proposals": [
    {
      "proposalType": "Principal",
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
    },
    {
      "proposalType": "Opción B",
      ...mismo shape...
    }
  ]
}
3. Exactamente 2 elementos en "proposals": el primero "Principal", el segundo "Opción B".
4. itinerary.length debe ser ${days} (un día por entrada, day = 1..${days}).
5. Cada día: 2–4 actividades coherentes con la energía ${energy}/100.
6. "desc" = 1 frase corta (máx. 100 caracteres).
6b. "category" OBLIGATORIO en CADA actividad: string en inglés minúsculas, exactamente UNA de: ${ACTIVITY_CATEGORY_PROMPT_LIST}.
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
7. tip y reservation: por defecto NO existen. Por cada día del itinerario: MÁXIMO 2 tips y MÁXIMO 2 reservations (a menudo menos o cero).
   - tip: OMITIR el campo salvo info crítica (solo efectivo, cola larga, cierre temprano, clave wifi, documento, zona complicada a cierta hora). Prohibido rellenar tip en cada actividad.
   - reservation: OMITIR el campo salvo reserva OBLIGATORIA (entradas, day-pass, tour con cupo, mesa imprescindible). Prohibido "recomendada reservar" en actividades walk-in. Nunca escribas "sin reserva" / "no hace falta".
   - Si dudas: OMITIR el campo. No inventes tip ni reservation para "completar" el JSON.
8. practicalTips (4–6): wifi/conectividad, hospedaje, transporte — tono de tip de amigo. OBLIGATORIO: cada nombre de lugar/hostal/barrio/café debe ir como markdown [Nombre](https://www.google.com/maps/search/?api=1&query=...) — SOLO Google Maps (nunca openstreetmap.org). Incluye al menos 3 tips con enlaces.
9. shortDescription y títulos de día: 1 frase oral, concreta; Spanglish ligero OK. Sin emojis en el JSON.
10. mapsUrl de cafés/actividades: SOLO Google Maps (search o place). Reutiliza mapsUrl del listado si ya es google.com/maps.

Genera ahora el JSON.`;
}

export function buildRepairPrompt(invalidText: string, errorMessage: string): string {
  return `Tu respuesta anterior no era JSON válido o no cumplía el schema.

Error: ${errorMessage}

Respuesta previa (recorta si es largo):
${invalidText.slice(0, 4000)}

Devuelve ÚNICAMENTE el JSON corregido con exactamente 2 propuestas (Principal y Opción B), sin markdown ni texto extra. Respeta cercanía por zona y horarios de apertura.
Cada actividad DEBE incluir "category" con un id en inglés de: ${ACTIVITY_CATEGORY_PROMPT_LIST} (no español; no pongas "explore" en todas).`;
}
