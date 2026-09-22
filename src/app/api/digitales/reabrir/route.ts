import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { despublicarLasDeMas } from "@/lib/caida-a-free";
import { reabrirCuentaDigital } from "@/lib/cierre-digital";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/reabrir — la vuelta atrás del cierre.
 *
 * `closedAt` se limpia y lo que el cierre apagó vuelve a publicarse: en
 * digitales una página es un archivo y un precio, no un stock que se
 * desactualiza, así que volver es volver a estar en línea (a diferencia de
 * `/api/tienda/reactivar`, que deja la tienda sin publicar a propósito).
 *
 * Después se hace cumplir el tope del plan de HOY: si mientras estuvo cerrada
 * cayó a Free, quedan las que Free permite, las que más vendieron. Es la
 * misma función que usa la caída a Free, y corre DESPUÉS del commit porque
 * lee y escribe por su cuenta.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    if (!(await checkRateLimit(`reabrir-digital:${user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/reabrir");
  }

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true, closedAt: true } });
  if (!store) return NextResponse.json({ error: "No encontramos tu cuenta." }, { status: 404 });
  if (!store.closedAt) return NextResponse.json({ error: "Tu cuenta no está cerrada." }, { status: 409 });

  const volvieron = await prisma.$transaction((tx) => reabrirCuentaDigital(tx, store.id));

  /* El plan de hoy, no el de cuando cerró. Sin suscripción viva, es Free. */
  const sub = await getUserSubscription(user.id);
  const tier: TierDigital = sub && isSubscriptionActive(sub) ? (sub.tier as TierDigital) : "FREE";
  const { despublicadas } = await despublicarLasDeMas(store.id, tier);

  console.info("[digitales] cuenta reabierta", { storeId: store.id, volvieron, deMas: despublicadas.length, tier });
  return NextResponse.json({ ok: true, volvieron: volvieron - despublicadas.length, deMas: despublicadas.length, tier });
}
