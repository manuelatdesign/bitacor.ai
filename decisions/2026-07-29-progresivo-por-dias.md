# D23 — Generación progresiva por días (2026-07-29)

## Contexto
Aunque Principal→Opción B mejoró la percepción, el primer `Agent.prompt` del Principal completo seguía >30s. Se necesita primera pintura útil más temprana.

## Decisión
Stages en `POST /api/generate-proposals`:
1. `shell` — meta + Día 1 (JSON chico)
2. `days` — días 2..N con contexto del shell
3. `optionB` — Opción B completa con Principal ya armada

UI: ResultView muestra Día 1 al instante; chips de días pendientes con loading; luego Opción B.

## Consecuencias
- Time-to-first-useful ≈ enrichment + 1 LLM pequeño (shell).
- Más `Agent.prompt` por generación (≈3) → más tokens/cupo diario.
- Coherencia entre días depende del prompt de `days` (contexto del shell).
- Rate limit subido a 20 req/min/IP.
