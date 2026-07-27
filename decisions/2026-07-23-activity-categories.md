# D19 — Categorías de actividad (chip)

Fecha: 2026-07-23

## Decisión
Cada actividad del itinerario lleva una sola `category` de un catálogo fijo de 13 ids (no boolean Wifi/Ocio).

## Catálogo
`work` | `cafe` | `food` | `nature` | `culture` | `explore` | `nightlife` | `wellness` | `transit` | `stay` | `shopping` | `beach` | `adventure`

## Reglas
- Una categoría dominante por actividad.
- Café + laptop / cowork → `work` (no `cafe`).
- `isCoworkingFriendly` se deriva (`category === "work"`) por compat con itinerarios guardados.
- Validate normaliza ids desconocidos → `explore` (o `work` si el boolean legacy es true).

## Por qué
El chip binario no describía el plan; el usuario pidió la lista de 10 + shopping/beach/adventure.
