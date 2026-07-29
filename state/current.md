# Estado actual — 2026-07-29

## Hecho (MVP usable)
- [x] Wizard multi-step (destino, fechas, presupuesto, intereses, energía, lodging)
- [x] Autocomplete destino (Places opcional)
- [x] Categorías de intereses por destino vía Cursor SDK + cache
- [x] Generación progresiva: Principal primero + Opción B en background (sin weather; Overpass acotado)
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
- [x] Enrichment OSM (Nominatim+Overpass race) + geo-check + lodging en pipeline
- [x] Tips/reserva condicionales + mapa spots en ResultView
- [x] Chips de categoría de actividad (13 ids; reemplaza Wifi/Ocio binario)
- [x] Token budget Cursor SDK (plan × ratio 0.4; geo-repair off; sin UI de cupo)
- [x] Mapas embebidos = Google Maps JS (sin Leaflet)

## Pendiente / nice-to-have
- [x] Bypass cache en “Otra tanda con IA” (`regenerate: true` en API + botón ResultView)
- [ ] Auditoría UI transparencia (wizard footer + loader vs copy)
- [ ] Más fuentes gratis (Wikidata) si OSM flaco en alguna ciudad
- [ ] Google Photos sync (explorado; no implementado — OAuth/API compleja)
- [ ] Persistencia server-side (hoy solo cliente)
- [ ] Amigos reales: auth + follows + sync de viajes (hoy mock)
- [x] README actualizado (Cursor SDK, `.env`, stack y scripts reales)
- [ ] Tests automatizados (no hay suite)
- [ ] Medir timings reales Principal bajo 30s en destinos típicos

## Blockers
- Ninguno de código. Dependencias externas: `CURSOR_API_KEY` requerida para IA real; Places opcional.

## Foco sugerido próxima sesión
1. Medir `placesMs`/`cursorMs` en logs tras generación progresiva, o
2. Feature producto que priorice el usuario (con `plan-first`).

## Nota
- Rama canónica: **`main`**. Local: `npm run dev` → `:3000`.
- Prod Vercel: app en raíz (`*.vercel.app/`). APIs: `api/*.ts`. Probe: `/api/health`.
- Weather (`server/weather.ts`) ya no se llama en generate (D22).
