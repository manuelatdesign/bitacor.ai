# D21 — Mapas UI = Google Maps (sin Leaflet)

Fecha: 2026-07-23

## Decisión
Eliminar Leaflet/`react-leaflet` de la UI. Trip map, spots del resultado y preview al hover usan Google Maps JavaScript API (`@vis.gl/react-google-maps`) con `VITE_GOOGLE_MAPS_API_KEY`. Sin key: empty state + link a Google Maps.

## Por qué
Unificar la experiencia de mapas con Google (ya usado en deep links). Evitar tiles OSM/CARTO en producto.

## Nota
Geocoding server-side (Nominatim/Overpass) se mantiene; no es UI de mapa.
