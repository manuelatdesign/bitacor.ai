# D01–D04 — Generación IA y flujo resultado

**Fecha:** 2026-07-22

## D01 — Cursor SDK (no Gemini)
- **Decisión:** `Agent.prompt` via `@cursor/sdk` + `CURSOR_API_KEY`.
- **Por qué:** preferencia producto; unifica con ecosistema Cursor.
- **Impl:** `server/cursorAgent.ts`. Modelo `CURSOR_MODEL` default `composer-2.5`.

## D02 — 2 propuestas creativas
- **Decisión:** Principal + Opción B según preferencias (no arquetipos fijos).
- **Por qué:** usuario rechazó Aventura/Deep Focus/Wellness.
- **Impl:** `server/prompt.ts` + validate exige 2.

## D03 — ResultView directo
- **Decisión:** sin pantalla de comparación; switch Principal/B en detalle.
- **Por qué:** menos fricción post-generación.

## D04 — Enrichment soft-fail
- **Decisión:** Places/Weather fallan → warnings, no abort.
- **Por qué:** itinerario usable sin APIs opcionales.
