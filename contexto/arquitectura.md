# Arquitectura (denso)

## Runtime
- `npm run dev` → `tsx server.ts` (Express :3000 + Vite middleware).
- Prod: `npm run build` → `dist/server.cjs` + static Vite.

## APIs
| Método | Path | Rol |
|--------|------|-----|
| POST | `/api/generate-proposals` | OSM → Cursor progresivo (`stage: principal` \| `optionB`) + tips |
| POST | `/api/destination-categories` | Categorías de intereses IA por destino (cache) |
| GET | `/api/places/autocomplete?q=` | Autocomplete ciudades (Places o vacío) |

Rate limit: `server/rateLimit.ts` por IP.
Cache in-memory: `server/cache.ts` (propuestas + categorías; TTL vía env).
Token budget: `server/tokenBudget.ts` — gate antes de cada `Agent.prompt` (ver `contexto/token-budget.md`).

## Pipeline generación
1. Validar `TravelConfigInput` (destino required; incluye `lodging` opcional).
2. Cache hit (par completo) → return ambas propuestas.
3. Enrichment OSM (Nominatim + Overpass race ~8s); sin weather; Google Nearby off en hot path. Cache enrichment 30 min.
4. `stage=principal` → `generatePrincipalWithCursor` → validate/repair → geo-check (geo-repair off).
5. Cliente muestra Principal; `stage=optionB` + `principal` → `generateOptionBWithCursor` → cache par completo.
6. Deep-links Maps + tipLines vuelos/hoteles + tips de ruta si aplica.

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
