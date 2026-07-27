# D20 — Presupuesto tokens Cursor SDK

Fecha: 2026-07-23

## Decisión
Bitácor limita el gasto del Cursor SDK en servidor: cupo diario = plan Cursor × ratio &lt; 1 (default 0.4). Sin UI de presupuesto. Geo-repair off por default; cap de POIs en prompt; cache TTL configurable.

## Por qué
Las generaciones (y repairs) pueden agotar el plan Cursor compartido con el IDE. Reservar la mayoría del plan para desarrollo y cortar Bitácor antes del 100%.

## Impl
- `server/tokenBudget.ts` + gate en `server/cursorAgent.ts`
- Env documentado en `.env.example` y `contexto/token-budget.md`
