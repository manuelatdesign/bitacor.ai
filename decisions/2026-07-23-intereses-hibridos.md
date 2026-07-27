# D17 — Intereses híbridos

**Fecha:** 2026-07-23

## Decisión
- Por defecto: catálogo curado si el destino hace match; si no → IA (`/api/destination-categories`).
- Botón **Regenerar con IA**: fuerza llamada a Cursor aunque haya catálogo; limpia selección previa.
- Si la IA falla: fallback a catálogo (si existe) o categorías genéricas.

## Por qué
Control + frescura: destinos estrella rápidos, cualquier ciudad con IA, y override manual.

## Impl
`WizardView.tsx` (`categorySource`, `forceAiRef`, `regenerateInterestsWithAi`).
