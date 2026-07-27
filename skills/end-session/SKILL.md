---
name: end-session
description: Cierre de sesión — actualizar state, decisions y log comprimido.
---

# End session

Usar al final de sesiones importantes o cuando el usuario diga “cierra sesión / actualiza memoria”.

## Pasos
1. Actualizar `state/current.md`: hecho / pendiente / blockers / foco siguiente.
2. Si hubo decisión durable → nuevo archivo `decisions/YYYY-MM-DD-slug.md` + fila en `contexto/decisiones.md`.
3. Si cambió el contrato de roles/proceso/calidad → actualizar `contexto/roles-y-calidad.md` (y ADR si aplica).
4. Si hubo bug no obvio → bullet en `gotchas/known.md`.
5. Crear/append `logs/YYYY-MM-DD-tema.md` (≤40 líneas): scope, hecho, no hecho, lecciones.
6. Si `AGENTS.md` quedó obsoleto en invariantes → editar solo esa sección (mantener ≤300 líneas).

## Formato log
```
# Log — YYYY-MM-DD tema
## Scope
## Hecho
## No hecho
## Lecciones
## Siguiente
```

## No hacer
- No copiar diffs largos ni transcripts.
- No crear archivos vacíos “por si acaso”.
