# Gotchas conocidos

## Runtime / env
- **Dev server:** `npm run dev` = Express+Vite en `:3000`, no `vite` solo. ERR_CONNECTION_REFUSED → proceso caído.
- **Prod Vercel (`/bitacor-ai`):** APIs = `api/*.ts` + rewrites. `api/places/autocomplete.ts` debe ser **self-contained** (sin import a `server/` → si no, `FUNCTION_INVOCATION_FAILED`). Probe: `/bitacor-ai/api/health` luego `/bitacor-ai/api/places/autocomplete?q=Bo`. `VITE_*` solo en **build**.
- **CURSOR_API_KEY** en `.env` (dotenv en `server.ts`). Sin key → 503; cliente puede caer a mock.
- **README obsoleto:** habla de Gemini/`.env.local`. Fuente real: `.env.example`.
- **Nunca pegar API keys en chat.** Si se filtró: rotar en dashboard Cursor.

## UI / React
- **Pantalla azul al generar:** crash React (ej. icono `Clock` sin import). Fondo mesh se ve; revisar console.
- **ResultView:** siempre null-check propuestas/`proposalType` antes de render.
- **Dark mode botones:** verificar contraste en glass surfaces; varios fixes ya en Trip/Result.
- **Google Maps embebido:** necesita `VITE_GOOGLE_MAPS_API_KEY` (Maps JavaScript API). Sin key → fallback “Abrir en Google Maps”. Advanced Markers usan `VITE_GOOGLE_MAPS_MAP_ID` o `DEMO_MAP_ID`.
- **HMR:** `DISABLE_HMR=true` desactiva watch (AI Studio). No “arreglar” quitándolo sin motivo.

## IA / pipeline
- **JSON no tipado del SDK:** siempre `extractJsonObject` + `validate*`; hay 1 retry repair.
- **2 propuestas, no 3:** UI/copy antiguos pueden decir “3”; corregir al tocar.
- **Token budget:** sin `CURSOR_PLAN_DAILY_TOKEN_LIMIT` no bloquea (solo log). Con límite: 429 `TOKEN_BUDGET_EXCEEDED`. Contador en `.data/token-budget.json`. Ver `contexto/token-budget.md`.
- **Geo-repair:** off por default (`CURSOR_DISABLE_GEO_REPAIR=true`); tips soft si hay saltos.
- **Cache in-memory:** reinicio de server limpia cache de propuestas; el budget sí persiste en `.data/`. TTL configurable por env.
- **Enrichment POIs:** Nominatim + Overpass (gratis). Respeta rate limits / User-Agent. Si Overpass timeout → itinerario sin coords (geo-check se salta).
- **Categorías por destino:** híbrido catálogo/IA; regenerar fuerza IA.
- **Tipos duales:** cambios de shape → sync `src/types.ts` y `server/types.ts`.

## Persistencia
- **Guardados:** `localStorage` — límite ~5MB; no asumir multi-dispositivo.
- **Fotos:** IndexedDB `bitacor_trip`; demo ≠ persistencia real del usuario.
- **Lodging en cliente** puede no llegar al prompt si no está en `TravelConfigInput`.

## Contexto / tokens
- No leer `src/data.ts` entero (mocks grandes).
- No cargar transcripts; usar `logs/` + `state/`.
- `contexto/design.md` es largo: buscar sección, no volcar todo.
