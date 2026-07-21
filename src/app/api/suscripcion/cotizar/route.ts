import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { cotizarCambioDePlan, type PlanKey, type Billing } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const COMBINACIONES: { plan: PlanKey; billing: Billing }[] = [
  { plan: "OWNER_BASIC", billing: "MONTHLY" },
  { plan: "OWNER_BASIC", billing: "ANNUAL" },
  { plan: "OWNER_PREMIUM", billing: "MONTHLY" },
  { plan: "OWNER_PREMIUM", billing: "ANNUAL" },
];

/**
 * Cuánto le sale a esta persona cada plan, hoy, con su descuento por días no
 * usados ya aplicado.
 *
 * Existe para que la pantalla no calcule precios por su cuenta. Antes la página
 * de precios hacía su propia cuenta y mostraba un total que el cobro no
 * respetaba: decía "pagás $200.000" y MercadoPago cobraba $225.000. Ahora el
 * número sale del mismo lugar que lo usa para cobrar, así que no pueden diferir.
 *
 * Devuelve las cuatro combinaciones de una: son cuatro cuentas en memoria sobre
 * una sola consulta, y así cambiar de mensual a anual en la pantalla no dispara
 * un pedido nuevo ni deja ver un precio viejo mientras carga.
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
