---
name: session-bootstrap
description: Bootstrap de sesión Bitácor.ai — carga mínima de contexto y plan de lectura.
---

# Session bootstrap

## Hacer (en orden)
1. Leer `AGENTS.md` (si no está en contexto del sistema).
2. Leer `state/current.md`.
3. Si la tarea es **producto / UX / flujo / feature** → leer `contexto/roles-y-calidad.md` y aplicar `skills/plan-first` (salvo excepción “hazlo ya”).
4. Si la tarea menciona bug previo → `gotchas/known.md`.
5. Clasificar tarea y abrir **solo** skill + archivos del área (tabla en AGENTS.md).
6. Confirmar en 2–4 líneas: estado actual + plan de archivos a tocar. No volcar historial.

## No hacer
- No leer transcripts ni `src/data.ts` completo.
- No leer todos los `logs/`; máximo el más reciente si el state es ambiguo.
- No re-documentar el proyecto entero en la respuesta.
- No cargar `roles-y-calidad.md` para typos o bugs mecánicos triviales.

## Salida esperada al usuario
“Estado: … / Voy a tocar: … / DoD: …”  
(Si aplica plan-first: caminos + recomendado, luego esperar.)
