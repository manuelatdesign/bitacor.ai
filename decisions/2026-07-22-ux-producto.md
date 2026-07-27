# D05–D12 — UX y producto

**Fecha:** 2026-07-22

## D05 — Tabs en header
Planificador | En el viaje | Amigos | Guardados. Eliminado switch dual-mode y “Nueva Bitácora”.

## D06 — En el viaje
Último itinerario guardado. Leaflet real + cámara/galería + EXIF + IndexedDB. Demo photos vía botón. Resumen IA = fullscreen fotos.

## D07 — Intereses por destino (IA)
`POST /api/destination-categories` genera categorías contextuales; cache por destino. Fallback si no hay key/error.

## D08 — Energy palette
Control continuo 0–100 (`EnergyPalettePicker`) mapeado a `pace` string compatible con prompt.

## D09 — Microcopy
Cercano, spanglish OK, emojis OK. Ver `contexto/microcopy.md`.

## D10 — Guardados + modes
Página cards. `resultMode`: draft (guardar/ajustes) vs saved (eliminar/cambiar prefs → regenerar).

## D11 — Lodging
Input “ya tengo hospedaje” (URL o nombre). Tips booking en practicalTips. **Gap:** campo aún no en `TravelConfigInput` servidor.

## D12 — Título corto
`[bandera] [Destino] [Mes] [Año]` via `destinationFlag` + fechas config.

## D13 — Tab Amigos (feed)
Cuarta pestaña en header. Feed de amigos con status `traveling` | `upcoming` | `home`, destino, fechas y nota. Datos demo en `src/data/friendsFeed.ts` (fechas relativas a hoy). Sin auth/social backend; marcado “Demo feed” en UI.
