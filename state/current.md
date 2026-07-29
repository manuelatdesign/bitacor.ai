# Estado actual — 2026-07-29

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
- [x] Mitigación 504 Vercel: prompt compacto + `CURSOR_MAX_PLACES_IN_PROMPT` default 8 + client abort ~70s + copy timeout

## Pendiente / nice-to-have
- [x] Bypass cache en “Otra tanda con IA” (`regenerate: true` en API + botón ResultView)
- [ ] Auditoría UI transparencia (wizard footer + loader vs copy “3 itinerarios”)
- [ ] Más fuentes gratis (Wikidata) si OSM flaco en alguna ciudad
- [ ] Google Photos sync (explorado; no implementado — OAuth/API compleja)
- [ ] Persistencia server-side (hoy solo cliente)
- [ ] Amigos reales: auth + follows + sync de viajes (hoy mock)
- [x] README actualizado (Cursor SDK, `.env`, stack y scripts reales)
- [ ] Tests automatizados (no hay suite)
- [ ] Tras deploy: confirmar en logs Vercel `timings.totalMs` < 60000 en generate-proposals

## Blockers
- Ninguno de código. Dependencias externas: `CURSOR_API_KEY` requerida para IA real; Places opcional.
- Prod Hobby Vercel: techo duro 60s en serverless; si aún hay 504 tras compactar, valorar Pro (`maxDuration` 120) o más recorte.

## Foco sugerido próxima sesión
1. Validar timings en prod tras merge/deploy, o
2. Feature producto que priorice el usuario (con `plan-first`), o
3. Auditoría copy “3 itinerarios” residual.

## Nota
- Rama canónica: **`main`**. Local: `npm run dev` → `:3000`.
- Prod Vercel: app en raíz (`*.vercel.app/`). APIs: `api/*.ts`. Probe: `/api/health`.
