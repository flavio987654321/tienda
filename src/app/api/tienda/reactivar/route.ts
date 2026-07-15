import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotificationMany } from "@/lib/notifications";

// Vuelta atrás del cierre. La tienda queda abierta pero SIN publicar: `closedAt`
// se limpia y ella decide cuándo publicarla con el toggle que ya conoce. Es a
// propósito — vuelve después de meses, quiere revisar precios y stock antes de
// que la vea alguien. Publicar es un click.
//
// No reactiva la suscripción: eso lo maneja el flujo de pago normal. Reactivar la
// tienda y volver a suscribirse son dos cosas distintas.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el dueño de una tienda puede reactivarla" }, { status: 403 });
  }

  if (!(await checkRateLimit(`reactivar-tienda:${user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, closedAt: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  if (!store.closedAt) {
    return NextResponse.json({ error: "Tu tienda no está cerrada" }, { status: 409 });
  }

  // Solo las que pausó el cierre. Una afiliada que la dueña había pausado a mano
  // antes de cerrar sigue pausada: reabrir la tienda no le levanta la suspensión
  // a nadie. Por eso existe `pausedByClosure` y no alcanza con mirar `status`.
  const pausedByClosure = await prisma.affiliate.findMany({
    where: { storeId: store.id, pausedByClosure: true },
    select: { id: true, userId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: store.id },
      data: { closedAt: null },
    });

    if (pausedByClosure.length > 0) {
      await tx.affiliate.updateMany({
        where: { id: { in: pausedByClosure.map((a) => a.id) } },
        data: { isActive: true, status: "APPROVED", pausedByClosure: false },
      });
    }
  });

  if (pausedByClosure.length > 0) {
    await createNotificationMany(
      pausedByClosure.map((a) => ({
        userId: a.userId,
        type: "AFFILIATE_APPROVED",
        title: `${store.name} volvió a abrir`,
        body: "Tu link de afiliada está activo de nuevo. Podés volver a compartirlo.",
        link: "/afiliados",
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
