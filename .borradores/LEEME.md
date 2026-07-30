# Borradores — NO son código en uso

Nada de esta carpeta está enganchado a la app. Ningún archivo la importa, no entra
al build, y **nada de acá fue verificado**: se escribió sin correr `tsc` ni los
chequeos, mientras todavía se estaba discutiendo el diseño.

Se guarda por si sirve de referencia, no para usar tal cual.

## Qué hay

Borradores de la FASE 1 de Sasha en WhatsApp, del 29/07/2026:

- `whatsapp.ts` — validación de la firma de Meta, handshake de verificación,
  parseo del payload y envío de mensajes.
- `whatsapp.check.ts` — chequeos de lo de arriba. **Tiene al menos un error de
  sintaxis conocido** en el arreglo de payloads roñosos.
- `20260729220000_add_asistente_canal/` — migración del campo `canal`
  (`panel` | `whatsapp`) en `AsistenteMensaje`.

## Antes de reusar algo de acá

**Leer `SASHA-WHATSAPP.md` primero.** Ese documento es la fuente de verdad y es
posterior a estos borradores: tiene el alcance ya decidido (sólo preguntas, sin
avisos, sólo Premium) y seis requisitos (W-01 a W-06) que estos archivos cubren
sólo en parte.

El motivo por el que quedó parado no fue técnico: se estaba escribiendo código
mientras el diseño todavía se discutía. El plan va primero.
