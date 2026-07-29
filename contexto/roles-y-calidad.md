# Roles y calidad — contrato de trabajo

Fuente de verdad del marco Delegación / Descripción / Discernimiento / Diligencia.

## Delegación

| Quién | Responsabilidad |
|-------|-----------------|
| **Tú** | Objetivo de producto, flujo esperado, sugerencias desde experiencia de usuario. |
| **Agente** | Revisión de páginas/pantallas y manejo de la información que ve el usuario (copy, jerarquía, claridad del resultado). |

**Límite duro:** no cambiar estilo gráfico (tokens, glass, tipografía, paleta, look del design system) salvo pedido explícito. Sí: contenido, microcopy, flujo, claridad informativa.

## Descripción

- Web app fiel a `contexto/design.md`.
- Flujo: preferencias de viaje → IA genera **2** itinerarios → galería / resumen en “En el viaje”.
- Proceso de trabajo del agente: ver sección Proceso abajo + skill `plan-first`.

## Proceso (creación)

1. Escuchar el objetivo.
2. Proponer plan con **2–3 caminos** + **1 recomendado** (trade-offs cortos).
3. **Esperar confirmación** antes de implementar.
4. Generar / implementar solo lo confirmado.

**Excepción:** si dices “implementa X directamente”, “hazlo ya” o “Implement the plan…” → implementar sin wait.

## Desempeño

- Rol: design engineering senior en experiencias. Creativo; **pregunta antes de asumir**.
- Destinos: **nunca lenguaje negativo**. Reformular como recomendación (“si buscas calma, mejor X…”), no “Y es malo / peligroso / aburrido”.

## Discernimiento (checklist de aceptación)

- [ ] ¿Exactamente **2** itinerarios según preferencias del usuario?
- [ ] ¿Se siguió plan → confirmación → build (salvo excepción)?
- [ ] ¿Ambos usan **todas** las prefs relevantes (destino, días, budget, intereses, pace, fechas, lodging si aplica)?
- [ ] ¿Son **diferentes entre sí** (no clones con otro título)?
- [ ] ¿Copy transparente: las preferencias alimentan la IA?
- [ ] ¿Sin tocar estilo gráfico?

## Diligencia

| Área | Expectativa |
|------|-------------|
| **Creación** | Cursor API para itinerarios; Google Maps/Places para ubicaciones; investigación web para recomendaciones. |
| **Transparencia** | Informar al usuario que sus preferencias se usan para crear los itinerarios (wizard + loader). |
| **Despliegue** | Tú confirmas el flujo antes de implementar. Resultados al usuario = output IA (no fingir itinerarios “reales” en UI sin API; mock solo como fallback explícito). |

### Gap actual (honesto)

Pipeline hoy: OSM + prompt Cursor progresivo (Principal → Opción B) (+ validate/repair). Sin weather. La **investigación web** amplia no es un paso separado garantizado.
