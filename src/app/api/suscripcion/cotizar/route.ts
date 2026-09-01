import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { cotizarCambioDePlan, type Billing } from "@/lib/subscription";
import { PLANES, planCerrado, type PlanKey } from "@/lib/planLimits";

export const dynamic = "force-dynamic";

const CICLOS: Billing[] = ["MONTHLY", "ANNUAL"];

/**
 * Todo plan que se cobre, por sus dos ciclos.
 *
 * Sale del registro y no de una lista escrita a mano. Antes estaban las cuatro
 * combinaciones de tienda copiadas una por una, y al sumar los planes digitales
 * había que acordarse de venir a agregarlas acá. Si no: la pantalla pide la
 * cotización de un plan que este endpoint no devuelve, el modal de pago no
 * encuentra su precio, muestra "no se pudo calcular" y deja el botón de pagar
 * apagado. Un plan que no se puede comprar, sin ningún error en el registro.
 *
 * Los planes sin precio (Free, Afiliado) quedan afuera solos: no hay nada que
 * cotizar, y pedirlo devolvería cero, que en una pantalla se lee como gratis.
 */
const COMBINACIONES: { plan: PlanKey; billing: Billing }[] = Object.entries(PLANES)
  .filter(([, def]) => def.precios !== null && !planCerrado(def))
  .flatMap(([plan]) => CICLOS.map((billing) => ({ plan: plan as PlanKey, billing })));

/**
 * Cuánto le sale a esta persona cada plan, hoy, con su descuento por días no
 * usados ya aplicado.
 *
 * Existe para que la pantalla no calcule precios por su cuenta. Antes la página
 * de precios hacía su propia cuenta y mostraba un total que el cobro no
 * respetaba: decía "pagás $200.000" y MercadoPago cobraba $225.000. Ahora el
 * número sale del mismo lugar que lo usa para cobrar, así que no pueden diferir.
 *
 * Devuelve todas las combinaciones de una: son unas pocas cuentas en memoria
 * sobre una sola consulta, y así cambiar de mensual a anual en la pantalla no
 * dispara un pedido nuevo ni deja ver un precio viejo mientras carga.
 *
 * Los planes de otro ecosistema vienen con el precio de lista y sin crédito
 * (`motivoSinCredito: "OTRO_ECOSISTEMA"`), que es la verdad: ese plan cuesta eso
 * y su suscripción de hoy no le descuenta nada. Comprarlo es otra cosa, y eso lo
 * corta el candado de `preferencia`.
 *
 * No recibe ningún parámetro a propósito: no hay nada que el navegador pueda
 * mandar que cambie el resultado.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const ahora = new Date();

  return NextResponse.json(
    {
      cotizaciones: COMBINACIONES.map((destino) => cotizarCambioDePlan(sub, destino, ahora)),
    },
    // Es un precio por persona y por momento: si se cachea, alguien ve el
    // descuento de otro o uno suyo ya vencido.
    { headers: { "Cache-Control": "no-store" } }
  );
}
