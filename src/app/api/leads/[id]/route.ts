import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";
import { sendAdminAlertEmail } from "@/lib/email";
import { despues } from "@/lib/despues";

// PATCH /api/leads/[id] — el dueño confirma o rechaza una consulta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = (await req.json().catch(() => null)) ?? {};

  if (!["CONFIRMED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const lead = await prisma.lead.findFirst({
    where: { id, storeId: store.id },
    select: {
      id: true,
      status: true,
      affiliateId: true,
      productName: true,
      productPrice: true,
      commissionRate: true,
      affiliate: { select: { userId: true } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  if (lead.status !== "PENDING") {
    return NextResponse.json({ error: "La consulta ya fue procesada" }, { status: 409 });
  }

  // Si se confirma y hay afiliado, acreditar comisión en wallet
  // Nota: para tiendas de consulta (AUTOS/INMOB) no hay Order — la comisión
  // se rastrea a través del Lead.commissionAmount + Wallet, no del modelo Commission.
  if (status === "CONFIRMED" && lead.affiliateId && lead.commissionRate) {
    const commissionAmount = Math.floor((lead.productPrice * lead.commissionRate) / 100);
    const affiliateId = lead.affiliateId;

    /* Con candado (05/10/26). El `status !== "PENDING"` de arriba se leyó sin
       trabar nada: dos clics seguidos en "Confirmar" (o dos pestañas) pasaban
       los dos y la comisión se acreditaba DOS veces. El update condicionado
       sólo deja pasar al primero; el segundo encuentra 0 filas y no acredita. */
    const acreditada = await prisma.$transaction(async (tx) => {
      const tomada = await tx.lead.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date(), commissionAmount },
      });
      if (tomada.count === 0) return false;
      await tx.wallet.upsert({
        where: { affiliateId },
        create: {
          affiliateId,
          balance: commissionAmount,
          totalEarned: commissionAmount,
          totalWithdrawn: 0,
        },
        update: {
          balance: { increment: commissionAmount },
          totalEarned: { increment: commissionAmount },
        },
      });
      return true;
    });
    if (!acreditada) {
      return NextResponse.json({ error: "La consulta ya fue procesada" }, { status: 409 });
    }

    // Notificar al afiliado (fuera de la transacción — no crítico)
    if (commissionAmount > 0 && lead.affiliate?.userId) {
      // Se copia acá afuera: adentro del cierre TypeScript ya no puede
      // garantizar que `lead.affiliate` siga sin ser null, porque el cierre
      // corre después. Tiene razón.
      const afiliadoId = lead.affiliate.userId;
      despues(() => createNotification({
        userId: afiliadoId,
        type: "COMMISSION_EARNED",
        title: "¡Ganaste una comisión!",
        body: `Tu consulta sobre "${lead.productName}" fue confirmada. Comisión: $${commissionAmount.toLocaleString("es-AR")} acreditada en tu panel de comisiones.`,
        link: "/afiliados/billetera",
      }), "consulta: campanita de comisión");
    }
  } else {
    // Mismo candado: un rechazo no puede pisar una confirmación que acaba de
    // acreditar la comisión en otra pestaña.
    const tomada = await prisma.lead.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
    });
    if (tomada.count === 0) {
      return NextResponse.json({ error: "La consulta ya fue procesada" }, { status: 409 });
    }

    // Detectar patrón de rechazo sistemático para alertar al admin
    if (status === "REJECTED" && lead.affiliateId) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [rejected, confirmed] = await Promise.all([
        prisma.lead.count({
          where: { storeId: store.id, affiliateId: lead.affiliateId, status: "REJECTED", confirmedAt: null, createdAt: { gte: since } },
        }),
        prisma.lead.count({
          where: { storeId: store.id, affiliateId: lead.affiliateId, status: "CONFIRMED", createdAt: { gte: since } },
        }),
      ]);

      if (rejected >= 5 && confirmed === 0) {
        despues(() => sendAdminAlertEmail({
          subject: `⚠️ Posible rechazo sistemático de leads — tienda "${store.name}"`,
          title: "Patrón de rechazo sistemático detectado",
          reason: `La tienda "${store.name}" rechazó ${rejected} consultas del mismo afiliado en los últimos 30 días sin confirmar ninguna. Esto puede indicar un intento de evadir el pago de comisiones.`,
          actions: [
            "Revisar el historial de leads de esta tienda en el panel de admin",
            "Contactar al dueño de la tienda para pedir explicación",
            "Si se confirma el patrón, suspender la tienda o mediar la disputa",
          ],
        }), "consulta: alerta al admin");
      }
    }
  }

  return NextResponse.json({ ok: true });
}
