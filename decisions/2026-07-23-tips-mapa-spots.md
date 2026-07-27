# D19 — Tips condicionales + mapa spots

**Fecha:** 2026-07-23

## Decisión
- `tip` / `reservation` opcionales en prompt; validate y UI filtran genéricos / “no reserva”.
- Tab Cafés & cowork: mapa Leaflet con pines (coords de OSM hidratadas en server) + lista debajo.

## Impl
`server/prompt.ts`, `server/validate.ts`, `src/lib/activityMeta.ts`, `ResultSpotsMap.tsx`, `ResultView.tsx`, hydrate coords en `server.ts`.
