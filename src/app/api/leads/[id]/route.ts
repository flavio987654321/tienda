import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// PATCH /api/leads/[id] — el dueño confirma o rechaza una consulta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["CONFIRMED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const lead = await prisma.lead.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, status: true, affiliateId: true, productPrice: true, commissionRate: true },
  });
  if (!lead) return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  if (lead.status !== "PENDING") {
    return NextResponse.json({ error: "La consulta ya fue procesada" }, { status: 409 });
  }

  // Si se confirma y hay afiliado, calcular y acreditar comisión
  if (status === "CONFIRMED" && lead.affiliateId && lead.commissionRate) {
    const commissionAmount = Math.floor((lead.productPrice * lead.commissionRate) / 100);

    await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date(), commissionAmount },
      }),
      prisma.commission.create({
        data: {
          affiliateId: lead.affiliateId,
          orderId: `lead_${id}`,
          amount: commissionAmount,
          rate: lead.commissionRate,
          status: "PAID",
          paidAt: new Date(),
        },
      }),
      prisma.wallet.upsert({
        where: { affiliateId: lead.affiliateId },
        create: {
          affiliateId: lead.affiliateId,
          balance: commissionAmount,
          totalEarned: commissionAmount,
          totalWithdrawn: 0,
        },
        update: {
          balance: { increment: commissionAmount },
          totalEarned: { increment: commissionAmount },
        },
      }),
    ]);
  } else {
    await prisma.lead.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
