---
name: itinerary-pipeline
description: Pipeline de generación de itinerarios — Cursor SDK, prompts, Places, validate, cache.
---

# Itinerary pipeline

## Leer primero
- `contexto/arquitectura.md`
- `contexto/token-budget.md` (si tocas SDK / env de cupo)
- `contexto/roles-y-calidad.md` (Discernimiento + Diligencia)
- Archivos: `server.ts`, `cursorAgent.ts`, `tokenBudget.ts`, `prompt.ts`, `osmPlaces.ts`, `geoCheck.ts`, `places.ts`, `validate.ts`, `types.ts`
- Cliente solo si cambia contrato: `src/App.tsx`, `src/types.ts`

## Invariantes
- Exactamente 2 propuestas: Principal + Opción B, **distintas entre sí** (progresivo: `shell` → `days` → `optionB`).
- Prefs: destino, días, budget, intereses, pace, fechas, **lodging**.
- Enrichment: OSM (Nominatim + Overpass race); **sin weather**; Google Nearby off en hot path. Soft-fail.
- Validate + repair JSON por etapa + geo-check; geo-repair off por default (tips soft).
- Token budget gate antes de cada `Agent.prompt` (plan × ratio bajo 1.0).
- Prompt: clustering por zona + horarios + ancla lodging; cap POIs (`CURSOR_MAX_PLACES_IN_PROMPT`).
- Tono destinos: **nunca negativo**.
- No loguear API keys ni prompts con PII innecesaria.

## Checklist cambio de prompt
1. Actualizar builder (`prompt.ts` / `categoryPrompt.ts`): prefs completas, diferenciación A/B, tono.
2. Ajustar validate si el schema cambia.
3. Invalidar/considerar cache keys en `cache.ts`.
4. Probar con y sin `GOOGLE_PLACES_API_KEY` mentalmente (soft-fail).

## No hacer
- No leer `src/data.ts` salvo editar mocks de fallback.
- No reintroducir Gemini.
- No fingir itinerarios “reales” en UI sin pasar por la API (mock = fallback explícito).
