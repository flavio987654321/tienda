import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const confirmedCount = await prisma.donation.count({ where: { campaignId: id, status: "CONFIRMED" } });
  if (confirmedCount > 0) {
    return NextResponse.json({ error: "No se puede eliminar: ya tiene donaciones confirmadas" }, { status: 409 });
  }

  await prisma.donationCampaign.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// POST /api/admin/canasta/campaign
// Crea una campaña nueva desde cero (solo cuando no hay ninguna activa —
// el índice único parcial "one_active_campaign" en la base ya protege esto
// a nivel de datos, esta validación es solo para dar un mensaje claro).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { name, reservePct } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Falta el nombre de la campaña" }, { status: 400 });
  }
  const pct = typeof reservePct === "number" && reservePct >= 0 && reservePct <= 50 ? reservePct : 10;

  const existing = await prisma.donationCampaign.findFirst({ where: { status: "ACTIVE" } });
  if (existing) {
    return NextResponse.json({ error: "Ya hay una campaña activa" }, { status: 409 });
  }

  const campaign = await prisma.donationCampaign.create({
    data: {
      name: name.trim(),
      reservePct: pct,
      goalAmount: 0,
      status: "ACTIVE",
      drawStatus: "SCHEDULED",
    },
  });

  // Se crean 14 productos "placeholder" para que el admin no tenga que
  // apretar "Agregar alimento" uno por uno — solo edita nombre, precio y foto.
  const PLACEHOLDER_COUNT = 14;
  await prisma.donationProduct.createMany({
    data: Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
      campaignId: campaign.id,
      name: `Producto ${i + 1}`,
      targetPrice: 100,
      sortOrder: i,
    })),
  });

  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, reservePct, scheduledDrawAt } = await req.json();
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const data: { reservePct?: number; scheduledDrawAt?: Date | null; reminderSentAt?: null } = {};

  if (reservePct !== undefined) {
    if (typeof reservePct !== "number" || reservePct < 0 || reservePct > 50) {
      return NextResponse.json({ error: "reservePct inválido (0 a 50)" }, { status: 400 });
    }
    data.reservePct = reservePct;
  }

  if (scheduledDrawAt !== undefined) {
    if (scheduledDrawAt === null) {
      data.scheduledDrawAt = null;
    } else {
      const date = new Date(scheduledDrawAt);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Fecha de sorteo inválida (tiene que ser futura)" }, { status: 400 });
      }
      // Solo se puede programar/editar la fecha mientras el sorteo no haya arrancado.
      const campaign = await prisma.donationCampaign.findUnique({ where: { id }, select: { status: true, drawStatus: true } });
      if (campaign?.drawStatus === "LIVE" || campaign?.drawStatus === "FINISHED") {
        return NextResponse.json({ error: "El sorteo ya arrancó, no se puede reprogramar" }, { status: 409 });
      }
      if (campaign?.status !== "COMPLETED") {
        return NextResponse.json({ error: "Todavía no se completó la meta de la canasta" }, { status: 409 });
      }
      data.scheduledDrawAt = date;
      // Nueva fecha → si ya se había mandado el recordatorio de "ya es la
      // hora" para la fecha anterior, hay que poder mandarlo de nuevo.
      data.reminderSentAt = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.update({ where: { id }, data });

  return NextResponse.json(campaign);
}
