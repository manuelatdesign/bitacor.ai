# Bitácor.ai

Planificador de itinerarios para nómadas digitales: wizard de preferencias → **2 propuestas IA** (Principal + Opción B) → bitácora en viaje con mapa y fotos estilo BeReal.

## Qué hace

- **Wizard multi-step** — destino, fechas, presupuesto, intereses, energía y lodging
- **2 itinerarios distintos** — Principal y Opción B, generados con Cursor SDK
- **Enrichment soft-fail** — OSM (Nominatim + Overpass) + clima Open-Meteo; Google Places opcional
- **En el viaje** — mapa Google Maps, captura cámara/galería con EXIF, fotos en IndexedDB
- **Guardados** — itinerarios en `localStorage`
- **Amigos** — feed demo (sin backend social)

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Express (`server.ts`) + Vite middleware en dev |
| IA | Cursor SDK (`Agent.prompt`) |
| Mapas | Google Maps JS (`@vis.gl/react-google-maps`) |
| POIs | OpenStreetMap (gratis); Google Places opcional |

## Requisitos

- **Node.js** 20+ (recomendado)
- **`CURSOR_API_KEY`** — necesaria para generación IA real ([Cursor](https://cursor.com))
- Opcional: claves Google para autocomplete Places y mapas embebidos

Sin `CURSOR_API_KEY`, la API responde 503 y el cliente puede usar un fallback mock.

## Arranque rápido

```bash
git clone <repo-url>
cd bitácor.ai
npm install
cp .env.example .env
# Edita .env y añade al menos CURSOR_API_KEY
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copia `.env.example` → `.env`. Nunca commits keys.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `CURSOR_API_KEY` | Sí (IA real) | API key del Cursor SDK |
| `CURSOR_MODEL` | No | Modelo para `Agent.prompt` (default `composer-2.5`) |
| `CURSOR_PLAN_DAILY_TOKEN_LIMIT` | No | Tope diario del plan Cursor; vacío/`0` = solo mide |
| `CURSOR_APP_BUDGET_RATIO` | No | Fracción del plan para Bitácor (default `0.4`) |
| `GOOGLE_PLACES_API_KEY` | No | Autocomplete ciudades + suplemento de POIs |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Mapas embebidos (Maps JavaScript API) |
| `VITE_GOOGLE_MAPS_MAP_ID` | No | Map ID para Advanced Markers |
| `APP_URL` | No | URL pública de la app |

Detalle del presupuesto de tokens: [`contexto/token-budget.md`](contexto/token-budget.md).

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Dev server Express + Vite en `:3000` |
| `npm run build` | Build cliente (Vite) + bundle servidor (`dist/server.cjs`) |
| `npm start` | Sirve el build de producción |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run clean` | Borra `dist/` |

## Estructura

```
src/                 # Cliente React (wizard, resultado, viaje, amigos, guardados)
server.ts            # Entry Express + Vite middleware
server/              # Pipeline IA, Places/OSM, validate, cache, token budget
contexto/            # Arquitectura, diseño, microcopy, decisiones
AGENTS.md            # Guía para agentes / contribuidores de IA
.env.example         # Plantilla de variables
```

Flujo principal:

```
WizardView → POST /api/generate-proposals → ResultView
TripView (mapa + fotos) · FriendsFeedView · SavedItinerariesView
```

## Persistencia (cliente)

| Dato | Dónde |
|------|--------|
| Itinerarios guardados | `localStorage` (`bitacor_saved_itineraries`) |
| Tema light/dark | `localStorage` (`theme`) |
| Fotos del viaje | IndexedDB (`bitacor_trip`) |

No hay persistencia server-side en el MVP.

## Desarrollo con agentes

Si trabajas con Cursor u otro agente de código, empieza por [`AGENTS.md`](AGENTS.md) y [`state/current.md`](state/current.md). Ahí está el orden de lectura y las invariantes del producto.
