# D22 — Generación progresiva y pipeline más rápido (2026-07-29)

## Contexto
La generación cold path (OSM → Weather → un Agent.prompt con 2 itinerarios) superaba con frecuencia 30–60s+. Objetivo: percepción &lt;30s al primer plan útil, sin bajar a 1 sola propuesta.

## Decisión
1. **Sin weather** en el hot path de generación (Open-Meteo fuera del pipeline).
2. **Overpass** con timeout duro ~8s, race de mirrors, ≤5 filtros; Google Nearby off en generate.
3. **UX/API progresiva:** `POST /api/generate-proposals` con `stage: "principal" | "optionB"`. Cliente muestra Principal al llegar; Opción B en segundo plano (pasa `principal` en el body para serverless).
4. Prompts separados (`buildPrincipalPrompt` / `buildOptionBPrompt`); Opción B recibe resumen de Principal para diferenciarse.
5. Cache de enrichment (30 min) + cache de par completo solo cuando hay 2 propuestas.

## Consecuencias
- Time-to-Principal ≈ enrichment + 1 LLM call (JSON más pequeño).
- Total wall-clock puede ser similar o mayor (2 LLM calls), pero percepción mucho mejor.
- En Vercel, si miss de enrichment cache, optionB re-enriquece (soft).
- `server/weather.ts` queda sin uso en generate (archivo conservado).
