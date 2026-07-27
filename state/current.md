# Estado actual — 2026-07-23

## Hecho (MVP usable)
- [x] Wizard multi-step (destino, fechas, presupuesto, intereses, energía, lodging)
- [x] Autocomplete destino (Places opcional)
- [x] Categorías de intereses por destino vía Cursor SDK + cache
- [x] Generación 2 itinerarios (Cursor SDK + Places + Weather soft-fail + validate/repair)
- [x] ResultView: Principal/Opción B, draft vs saved, regenerar/eliminar
- [x] Guardados: página cards + localStorage
- [x] TripView: Google Maps, captura cámara/galería, EXIF geo, IndexedDB, demo photos, resumen fullscreen
- [x] Energy palette 0–100 → pace
- [x] Microcopy pass (spanglish + emojis)
- [x] QA Fill flotante (solo planificador)
- [x] Dark/light theme
- [x] Sistema de memoria persistente (`AGENTS.md` + carpetas)
- [x] Tab Amigos: feed demo (quién viaja / próximo viaje)
- [x] Marco roles/calidad (Delegación–Diligencia) + skill `plan-first`
- [x] Intereses híbridos (catálogo si match / IA si no + regenerar con IA)
- [x] Enrichment OSM (Nominatim+Overpass) + geo-check + lodging en pipeline
- [x] Tips/reserva condicionales + mapa spots en ResultView
- [x] Chips de categoría de actividad (13 ids; reemplaza Wifi/Ocio binario)
- [x] Token budget Cursor SDK (plan × ratio 0.4; geo-repair off; sin UI de cupo)
- [x] Mapas embebidos = Google Maps JS (sin Leaflet)

## Pendiente / nice-to-have
- [ ] Bypass cache en “Otra tanda con IA” (hoy puede devolver lo mismo)
- [ ] Auditoría UI transparencia (wizard footer + loader vs copy “3 itinerarios”)
- [ ] Más fuentes gratis (Wikidata) si OSM flaco en alguna ciudad
- [ ] Google Photos sync (explorado; no implementado — OAuth/API compleja)
- [ ] Persistencia server-side (hoy solo cliente)
- [ ] Amigos reales: auth + follows + sync de viajes (hoy mock)
- [ ] README desactualizado (aún menciona Gemini / `.env.local`)
- [ ] Tests automatizados (no hay suite)

## Blockers
- Ninguno de código. Dependencias externas: `CURSOR_API_KEY` requerida para IA real; Places opcional.

## Foco sugerido próxima sesión
1. Reforzar prompts del pipeline (prefs + A/B distintos + tono + research), o
2. Pasar `lodging` al pipeline/prompt, o
3. Feature producto que priorice el usuario (con `plan-first`).
