# D18 — OSM enrichment + calidad geo

**Fecha:** 2026-07-23

## Decisión
- Fuente principal de lugares: **OpenStreetMap** (Nominatim geocode + Overpass POIs). Sin key, cualquier destino.
- Google Places: solo autocomplete + suplemento si OSM trae pocos resultados.
- Prompt: coords, `opening_hours`, clustering por zona, llegada/regreso, lodging como ancla.
- Post-check haversine; 1 repair geo si hay saltos largos; tips de ruta soft.

## Por qué
Catálogo Google-only no sirve bien para “cualquier ciudad”; zigzag/horarios irreales. OSM aporta POIs reales con coords/horarios gratis.
