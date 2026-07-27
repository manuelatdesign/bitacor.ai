# Decisiones (índice)

Fuente detallada: `decisions/`. Este archivo es el índice denso.

| Fecha | ID | Decisión |
|-------|-----|----------|
| 2026-07-22 | D01 | IA = Cursor SDK, no Gemini |
| 2026-07-22 | D02 | 2 propuestas creativas (Principal + Opción B), no 3 arquetipos |
| 2026-07-22 | D03 | Post-gen: ResultView directo (sin comparación) |
| 2026-07-22 | D04 | Enrichment Places+Weather soft-fail |
| 2026-07-22 | D05 | Tabs header: Planificador / En el viaje / Amigos / Guardados |
| 2026-07-22 | D06 | Viaje = último guardado + mapa + cámara/galería + IndexedDB (mapa = Google Maps, D21) |
| 2026-07-22 | D07 | Intereses condicionados al destino vía IA (`/api/destination-categories`) |
| 2026-07-22 | D08 | Energía = paleta continua 0–100 → `pace` string |
| 2026-07-22 | D09 | Microcopy: cercano + spanglish + emojis |
| 2026-07-22 | D10 | Guardados = página cards; draft vs saved modes en ResultView |
| 2026-07-22 | D11 | Lodging: URL o nombre en wizard; deep-links tip en practicalTips |
| 2026-07-22 | D12 | Título viaje: `🏳️ Destino Mes Año` (bandera país) |
| 2026-07-22 | D13 | Tab Amigos: feed demo (en viaje / próximo / en casa); sin backend aún |
| 2026-07-23 | D14 | Contrato delegación + plan-first + confirmación antes de implementar |
| 2026-07-23 | D15 | No cambiar estilo gráfico sin pedido explícito |
| 2026-07-23 | D17 | Intereses híbridos: catálogo si match, IA si no; botón regenerar fuerza IA |
| 2026-07-23 | D18 | POIs vía OSM gratis (Nominatim+Overpass); Google solo suplemento; geo-check + lodging en prompt |
| 2026-07-23 | D19 | Tip/reserva condicionales en actividades; mapa en tab spots (Google Maps, D21) |
| 2026-07-23 | D20 | Token budget SDK: plan × ratio (default 0.4); sin UI; geo-repair off |
| 2026-07-23 | D21 | Mapas UI = Google Maps JS; Leaflet eliminado |

Diseño visual canónico: `contexto/design.md`.
Arquitectura: `contexto/arquitectura.md`.
Roles/calidad: `contexto/roles-y-calidad.md`.
Token budget: `contexto/token-budget.md`.
