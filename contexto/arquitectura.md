# Arquitectura (denso)

## Runtime
- `npm run dev` → `tsx server.ts` (Express :3000 + Vite middleware).
- Prod: `npm run build` → `dist/server.cjs` + static Vite.

## APIs
| Método | Path | Rol |
|--------|------|-----|
| POST | `/api/generate-proposals` | Places→Weather→Cursor→2 itinerarios + tips viajes |
| POST | `/api/destination-categories` | Categorías de intereses IA por destino (cache) |
| GET | `/api/places/autocomplete?q=` | Autocomplete ciudades (Places o vacío) |

Rate limit: `server/rateLimit.ts` por IP.
Cache in-memory: `server/cache.ts` (propuestas + categorías; TTL vía env).
Token budget: `server/tokenBudget.ts` — gate antes de cada `Agent.prompt` (ver `contexto/token-budget.md`).

## Pipeline generación
1. Validar `TravelConfigInput` (destino required; incluye `lodging` opcional).
2. Cache hit → return.
3. Enrichment gratis: Nominatim + Overpass OSM (`server/osmPlaces.ts`) → clima Open-Meteo. Google Places solo suplemento opcional.
4. `generateProposalsWithCursor` → validate → repair JSON → geo-check (haversine) → geo-repair **off** por default (tips soft).
5. Deep-links Maps + tipLines vuelos/hoteles + tips de ruta si aplica.
6. Cache set → JSON `{ proposals, meta }` (`enrichmentSource: osm+overpass`).

Cliente fallback mock: `generateMockProposals` en `src/data.ts` si 503/429/error (no cargar data.ts entero salvo tocar mocks).

## Estado cliente
- React state en `App.tsx`: config, step, proposals, tabs, resultMode (`draft`|`saved`).
- `localStorage.bitacor_saved_itineraries`
- `localStorage.theme`
- Fotos: IndexedDB `bitacor_trip` vía `src/lib/tripPhotos.ts`

## Env
Ver `.env.example`: `CURSOR_API_KEY`, `CURSOR_MODEL`, presupuesto (`CURSOR_PLAN_DAILY_TOKEN_LIMIT`, `CURSOR_APP_BUDGET_RATIO`, …), `GOOGLE_PLACES_API_KEY`, `APP_URL`.
**Nunca** documentar valores reales de keys.

## Diagrama visual
`diagrama-estructura-flujo.html` (solo abrir en browser; no pegar en prompt).
