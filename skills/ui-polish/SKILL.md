---
name: ui-polish
description: Claridad informativa y microcopy Bitácor.ai — sin cambiar el look del design system salvo pedido explícito.
---

# UI polish

## Leer primero
- `contexto/roles-y-calidad.md` (frontera estilo vs info)
- `contexto/design.md` (sección relevante) solo si hay que respetar tokens existentes
- `contexto/microcopy.md` si hay copy
- Componente objetivo

## Frontera (Delegación)
- **Sí:** copy, jerarquía de información, claridad del resultado, flujo, empty states, transparencia de prefs.
- **No** (salvo pedido explícito): tokens, paleta, tipografía, glass formula, look general del design system, rediseño visual.

## Reglas
- Reusar tokens existentes si tocas clases; no inventar paletas.
- Verificar **light + dark** si el cambio afecta UI.
- Mobile-first en Trip/Wizard.
- Motion: solo si ya hay patrón en la zona; no añadir ruido.
- Copy: 2 propuestas (no 3); tono cercano + spanglish + emoji OK; destinos sin lenguaje negativo.

## DoD UI
- Info más clara; look intacto (salvo pedido).
- Sin regresiones obvias en tabs hermanos.
- Si decisión de UX nueva → `decisions/` + índice `contexto/decisiones.md`.
