# Presupuesto de tokens (Cursor SDK)

Bitácor usa `Agent.prompt` (`CURSOR_API_KEY`). El gasto cuenta contra tu plan Cursor. El servidor limita la parte de Bitácor **por debajo del 100%** del plan diario para dejar margen al IDE.

## Cupo efectivo

```
effectiveBudget = floor(CURSOR_PLAN_DAILY_TOKEN_LIMIT × CURSOR_APP_BUDGET_RATIO)
```

- Default ratio: **0.4** (Bitácor ≤ 40% del plan; ~60% libre).
- Ratio se clampa a `(0, 1)`; nunca default 1.0.
- Si `CURSOR_PLAN_DAILY_TOKEN_LIMIT` está vacío/`0`: solo mide y loguea (no bloquea).
- Red de seguridad: `CURSOR_DAILY_RUN_BUDGET` (default 20 calls/día).

Estado: `.data/token-budget.json` (gitignored), reset por día calendario local.

## Cuándo se gasta

| Acción | Calls típicas |
|--------|----------------|
| Categorías IA (destino sin catálogo / forzar IA) | 1 (+1 repair JSON) |
| Generar itinerarios | ~3 calls (+ repair): shell → days → optionB |
| Geo repair | 0 por default (`CURSOR_DISABLE_GEO_REPAIR=true`) |

## Cuándo NO se gasta

- Cache hit propuestas / categorías
- Catálogo local de intereses (sin IA)
- OSM / Open-Meteo / autocomplete Places
- Mock cliente si API falla o falta key
- Editar actividades a mano en ResultView

## Env (ver `.env.example`)

| Variable | Default | Rol |
|----------|---------|-----|
| `CURSOR_PLAN_DAILY_TOKEN_LIMIT` | — | Tope diario de tu plan Cursor |
| `CURSOR_APP_BUDGET_RATIO` | `0.4` | Fracción para Bitácor |
| `CURSOR_DAILY_RUN_BUDGET` | `20` | Máx. `Agent.prompt`/día |
| `CURSOR_DISABLE_GEO_REPAIR` | `true` | Sin re-prompt geo |
| `CURSOR_MAX_PLACES_IN_PROMPT` | `12` | Cap POIs en prompt |
| `CURSOR_PROPOSALS_CACHE_TTL_MIN` | `180` | Cache propuestas (min) |
| `CURSOR_CATEGORIES_CACHE_TTL_MIN` | `1440` | Cache categorías (min) |

## Al bloquear

HTTP **429** + `code: TOKEN_BUDGET_EXCEEDED`. Mensaje amigable; sin UI de cupo. Logs: `[token-budget] …`.

## Hábitos

- No spamear regenerar con el mismo config (usa cache).
- Preferir editar el itinerario a regenerar.
- “Otra tanda con IA” es cara (nuevo prompt).
- Ajusta `CURSOR_PLAN_DAILY_TOKEN_LIMIT` a tu plan real; baja el ratio si el IDE es prioridad.
