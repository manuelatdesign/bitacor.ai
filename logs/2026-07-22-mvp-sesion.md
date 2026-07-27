# Log — 2026-07-22 MVP itinerarios + viaje

## Scope
Sesión larga: de mocks → IA real + TripView usable.

## Hecho
- Pipeline Cursor SDK + Places + Weather + validate/repair
- 2 propuestas; ResultView sin comparación
- Tabs header; Guardados cards; draft/saved
- Trip: Leaflet, camera/gallery, IndexedDB, demo, resumen fullscreen
- Categorías intereses IA; energy palette; lodging UI; título bandera
- Microcopy pass; QA Fill solo planner
- Fix crash “pantalla azul” (imports/null-safety)

## No hecho
- Google Photos
- Lodging en prompt servidor
- README sync
- Tests

## Lecciones
- Validar JSON del SDK siempre; repair retry salva UX.
- Enrichment soft-fail evita bloqueos.
- Preferir estado en archivos: transcript ~1MB inútil en prompts.

## Siguiente
Ver `state/current.md` → foco sugerido.
