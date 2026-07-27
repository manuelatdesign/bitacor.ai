# Microcopy — Bitácor.ai

**Tono:** cercano, casual, útil. Español + spanglish suelto OK. Emojis con propósito (no spam).

## Principios
- Hablar al nómada, no al “usuario”.
- Preferir verbos de acción cortos: “Crear”, “Guardar”, “Cambiar prefs”.
- Evitar corporativo (“utiliza”, “proceder”, “experiencia premium”).
- Loader: mensaje único claro con destino (“Creando 2 itinerarios para {destino}…”).
- Empty states: qué falta + CTA obvio.
- **Transparencia:** dejar claro que las preferencias del usuario alimentan los 2 itinerarios (wizard footer + loader).
- **Destinos:** nunca framing negativo. Reformular como recomendación (“si buscas X, mejor…”).

## Zonas sensibles
| Zona | Nota |
|------|------|
| Wizard intereses | Catálogo si hay match; si no IA. Botón “Regenerar con IA” fuerza IA también en destinos curados. |
| Loader | Misma transparencia + destino. |
| Result draft | “Cambiar ajustes” / “Guardar bitácora” |
| Result saved | “Eliminar” / “Cambiar preferencias” (regenerar); sin Guardar |
| Activity tip | Solo si hay info importante; no genéricos |
| Activity reserva | Chip solo si hay que reservar de verdad |
| Spots mapa | Empty: “Sin ubicación en el mapa aún” |
| Trip empty | Pedir guardar un viaje primero o cargar demo |
| Amigos feed | “Crew check-in”; status En viaje / Próximo / En casa; marcar demo si datos mock |
| QA Fill | Solo planificador; label técnico OK |

## Evitar
- “3 arquetipos” / Aventura-Deep Focus-Wellness como framing.
- Telemetría falsa o stats inventados (ver design.md: honestidad arquitectónica).
- Lenguaje negativo sobre destinos, barrios o países.
