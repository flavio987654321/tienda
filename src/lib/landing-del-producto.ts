import { isSubscriptionActive } from "@/lib/subscription";
import { leerEstadoDeLanding } from "@/lib/landing-estado";

/**
 * Una sola respuesta a "¿qué está viendo quien entra a la dirección del
 * producto: el diseño propio o nuestra página de venta?".
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTÁ ACÁ Y NO ESCRITA EN CADA PANTALLA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Porque la respuesta tiene DOS partes y el panel se sabía sólo una. La
 * página pública (`/p/[id]`) siempre miró las dos —el interruptor Y el plan—
 * y hace lo correcto: en Free devuelve `null` y sirve nuestra página. El
 * panel, en cambio, miraba sólo `estado.activa`.
 *
 * Eso salió a la luz el 24/09/26 con una cuenta a la que se le venció la
 * prueba de Pro. Con el interruptor prendido y el plan en Free, el editor de
 * la página de venta le avisaba: "tu dirección está mostrando tu propio
 * diseño, así que lo que edites acá no se ve". Era al revés — lo único que se
 * estaba viendo era esa página. Le estaba diciendo que no valía la pena
 * editar justo lo que le estaba vendiendo.
 *
 * ── El interruptor NO se apaga solo ────────────────────────────────────────
 *
 * Se deja prendido en la base a propósito, igual que el dominio propio que
 * queda anotado al caer a Free (ver `api/digitales/productos/[id]/dominio`):
 * apagarlo sería perderle la elección, y el día que vuelva a Starter o Pro
 * tendría que acordarse de volver a prenderlo. El plan decide qué se muestra;
 * el interruptor guarda lo que ella quiere.
 */

/** Los campos que hacen falta para saber si el plan muestra diseños propios. */
type SubParaDiseno = {
  tier: string;
  status: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
} | null;

/**
 * El plan deja mostrar un diseño propio: Starter o Pro, y al día.
 *
 * Vencido cuenta como Free. Es la misma vara que usa el candado del servidor
 * para dejar subir: un plan que venció no sigue publicando lo que compró.
 */
export function elPlanMuestraDisenos(sub: SubParaDiseno): boolean {
  return !!sub && sub.tier !== "FREE" && isSubscriptionActive(sub);
}

/**
 * Lo que de verdad ve quien entra a la dirección del producto.
 *
 * `versionId` entra en la cuenta porque el interruptor puede estar prendido
 * sin archivo elegido, y en ese caso tampoco hay nada que mostrar.
 */
export function laDireccionMuestraTuDiseno(
  landingPropia: string | null | undefined,
  sub: SubParaDiseno,
): boolean {
  const estado = leerEstadoDeLanding(landingPropia);
  return estado.activa && !!estado.versionId && elPlanMuestraDisenos(sub);
}
