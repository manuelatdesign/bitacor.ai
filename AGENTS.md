# Bitácor.ai — AGENTS.md

Planificador de itinerarios para nómadas digitales. Wizard → 2 propuestas IA (Principal + Opción B) → bitácora en viaje (mapa + fotos BeReal). Stack: React 19 + Vite + Tailwind v4 + Express + Cursor SDK + Google Maps JS (cliente) + Google Places (opcional) + OSM enrichment (server).

## Reglas de oro (contexto)

1. El context window es caro y volátil. La memoria real debe vivir en archivos.
2. Nunca cargar todo el historial ni todos los archivos del proyecto.
3. Cargar solo lo estrictamente necesario para la tarea actual.
4. Al final de cada sesión importante: actualizar `state/`, registrar decisiones y comprimir lo valioso en `logs/`.
5. Preferir referenciar archivos antes que copiar contenido largo al prompt.
6. Convertir procedimientos repetitivos en skills reutilizables.
7. Mantener `AGENTS.md` conciso y de alta densidad de información.

## Orden de lectura (mínimo → máximo)

| Prioridad | Archivo | Cuándo |
|-----------|---------|--------|
| 1 | `AGENTS.md` (este) | Siempre al inicio |
| 2 | `state/current.md` | Siempre al inicio |
| 3 | `contexto/roles-y-calidad.md` | Producto, UX, flujo, features (no typos/bugs mecánicos) |
| 4 | `gotchas/known.md` | Si tocas área con historial de bugs |
| 5 | `contexto/arquitectura.md` | Backend, APIs, flujo de datos |
| 5b | `contexto/token-budget.md` | Si tocas Cursor SDK, cache IA o env de cupo |
| 6 | `contexto/decisiones.md` + `decisions/*` | Cambios de producto/UX/arquitectura |
| 7 | `contexto/design.md` | UI, branding, animaciones |
| 8 | `contexto/microcopy.md` | Textos de producto |
| 9 | Solo archivos de código del área tocada | Implementación |
| 10 | `logs/*` reciente | Solo si falta contexto de sesión previa |

**No cargar por defecto:** `node_modules/`, `src/data.ts` (mocks grandes), `diagrama-estructura-flujo.html`, transcripts, `.env`, `package-lock.json`.

## Mapa de memoria

```
AGENTS.md                 ← control central (este archivo)
contexto/                 ← roles-y-calidad, diseño, arquitectura, microcopy
decisions/                ← decisiones fechadas (ADR ligero)
state/current.md          ← hecho / pendiente / blockers
skills/                   ← procedimientos reutilizables
gotchas/known.md          ← problemas + fixes
logs/                     ← resúmenes comprimidos de sesiones
```

## Identidad & invariantes

- **Roles:** tú defines objetivo/flujo/UX; agente revisa pantallas e info al usuario. Ver `contexto/roles-y-calidad.md`.
- **Proceso:** features de producto → plan 2–3 caminos + 1 recomendado → **confirmación** → implementar (`skills/plan-first`). Excepción: “hazlo ya” / “Implement the plan…”.
- **Estilo gráfico:** no cambiar tokens/look/design system sin pedido explícito. Sí: copy, claridad, flujo.
- **Destinos:** nunca lenguaje negativo; reformular como recomendación.
- **Producto:** itinerarios híbridos (trabajo + exploración) + diario fotográfico en viaje.
- **IA:** Cursor SDK (`Agent.prompt`), no Gemini. Key: `CURSOR_API_KEY`. Modelo: `CURSOR_MODEL` (default `composer-2.5`).
- **Tokens:** presupuesto server-side menor al 100% del plan Cursor diario (`CURSOR_PLAN_DAILY_TOKEN_LIMIT` × `CURSOR_APP_BUDGET_RATIO`, default 0.4). Ver `contexto/token-budget.md`.
- **Output IA:** exactamente **2** propuestas: `Principal` + `Opción B` (progresivo: Principal primero, Opción B en segundo plano).
- **Post-generación:** abrir directo Principal; switch a Opción B dentro de `ResultView` (sin pantalla de comparación).
- **Enrichment soft-fail:** OSM/Places pueden fallar; la generación continúa. Sin weather en hot path.
- **Validación:** JSON del agente se parsea + valida en servidor (`server/validate.ts`); retry con repair prompt si falla.
- **Persistencia cliente:** itinerarios en `localStorage` (`bitacor_saved_itineraries`); fotos en IndexedDB (`bitacor_trip`).
- **Tabs header:** Planificador | En el viaje | Amigos | Guardados. Sin switch legacy planificador/viaje. Feed Amigos = demo mock (sin backend social).
- **QA Fill:** botón flotante solo en Planificador.
- **Microcopy:** español cercano, spanglish suelto permitido, emojis OK. Ver `contexto/microcopy.md`.
- **Diseño:** Glassmorphic Cozy-Tech. Tokens en `src/index.css`. Guía: `contexto/design.md`.
- **Secretos:** nunca commitear ni pegar keys en chat/logs. Usar `.env` (gitignored).

## Arquitectura rápida

```
Cliente (src/)                Servidor (server.ts + server/)
WizardView → App.tsx          POST /api/generate-proposals (stage principal → optionB)
 → ResultView                  OSM → Cursor Principal → UI → Cursor Opción B
TripView (Google Maps+camera) POST /api/destination-categories
FriendsFeedView (demo)        GET  /api/places/autocomplete
SavedItinerariesView
```

Dev: `npm run dev` → Express+Vite middleware en `:3000`.

## Routing de skills

| Tarea | Skill |
|-------|-------|
| Inicio de sesión / “continúa donde quedamos” | `skills/session-bootstrap/SKILL.md` |
| Feature/producto: plan multi-camino antes de codear | `skills/plan-first/SKILL.md` |
| UI info/claridad (sin cambiar look) / microcopy | `skills/ui-polish/SKILL.md` |
| Generación IA, prompts, Places, cache, validate | `skills/itinerary-pipeline/SKILL.md` |
| Cierre de sesión importante | `skills/end-session/SKILL.md` |

## Definition of Done

- [ ] Cambio acotado al área pedida; sin refactors colaterales.
- [ ] Tipos alineados (`src/types.ts` ↔ `server/types.ts` si aplica).
- [ ] UI: light + dark; mobile si toca Trip/Wizard.
- [ ] Sin secrets en código/logs/commits.
- [ ] Features: plan → confirmación (salvo excepción) según `roles-y-calidad.md`.
- [ ] Generación: 2 itinerarios distintos; prefs relevantes aplicadas; tono destinos OK.
- [ ] Sin drift de estilo gráfico (salvo pedido explícito).
- [ ] Si hay decisión de producto/arquitectura: entrada en `decisions/` + línea en `contexto/decisiones.md`.
- [ ] Si la sesión avanzó estado: actualizar `state/current.md`.
- [ ] `npm run lint` limpio si se tocaron tipos/TS no triviales.

## Comportamiento del agente

1. **Bootstrap:** leer `AGENTS.md` + `state/current.md`. Luego solo lo necesario.
2. **Producto/UX/flujo:** leer `contexto/roles-y-calidad.md` y aplicar `skills/plan-first` antes de implementar.
3. **Antes de inventar:** buscar en `decisions/`, `gotchas/`, `contexto/`.
4. **Código grande:** no leer enteros `App.tsx`/`data.ts`/`prompt.ts` sin necesidad; usar grep + rangos.
5. **Tras sesión importante:** skill `end-session` (state + decisions + log ≤40 líneas).
6. **UI:** respetar `contexto/design.md` y tokens; no cambiar look sin pedido; sí mejorar información/claridad.
7. **Idioma:** respuestas al usuario en español; código/identificadores en inglés como el repo.

## Archivos críticos por área

| Área | Paths |
|------|-------|
| Shell app / tabs / save | `src/App.tsx`, `src/components/Header.tsx` |
| Wizard | `src/components/WizardView.tsx`, `EnergyPalettePicker.tsx`, `DestinationAutocomplete.tsx` |
| Resultado | `src/components/ResultView.tsx` |
| Viaje | `src/components/TripView.tsx`, `trip/*`, `src/lib/tripPhotos.ts` |
| Mapas UI | `src/components/GoogleMapShell.tsx`, `TripMap.tsx`, `ResultSpotsMap.tsx`, `ActivityPlaceTitle.tsx` |
| Amigos | `src/components/FriendsFeedView.tsx`, `src/data/friendsFeed.ts` |
| API gen | `server.ts`, `server/cursorAgent.ts`, `server/prompt.ts`, `server/validate.ts` |
| Token budget | `server/tokenBudget.ts`, `contexto/token-budget.md` |
| Categorías IA | `server/categoryPrompt.ts`, `server/cursorAgent.ts` |
| Places/OSM | `server/places.ts`, `server/osmPlaces.ts`, `server/cache.ts` |
| Tipos | `src/types.ts`, `server/types.ts` |

## Anti-patrones de contexto

- Pegar transcripts completos o dumps de `localStorage`.
- Releer `design.md` entero para un cambio de un botón (buscar sección).
- Duplicar decisiones en chat en vez de escribirlas en `decisions/`.
- Expandir `AGENTS.md` con narrativa; mover detalle a `contexto/` o skills.
- Implementar features de producto sin plan multi-camino ni confirmación (salvo excepción).
