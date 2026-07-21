import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendCanastaAnnouncementEmail } from "@/lib/resend";

// POST /api/admin/canasta/notify-donors
// Manda un email con texto libre a todos los donantes CONFIRMED de la
// campaña vigente (ej: avisar una novedad de la campaña).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { message, type } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }
  const campaignType = type === "LIBRE" ? "LIBRE" : "CANASTA";

  const campaign = await prisma.donationCampaign.findFirst({
    where: { type: campaignType, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!campaign) return NextResponse.json({ error: "No hay campaña vigente" }, { status: 404 });

  // Límite: máximo 3 avisos masivos por día por campaña.
  //
  // Se reserva el lugar ANTES de mandar, en la misma transacción que cuenta.
  // Contando primero y registrando al final, dos clicks casi simultáneos veían
  // los dos "2 de 3" y mandaban los dos: 4 emails a cada donante. Mismo patrón
  // que usan los topes de cupones y promociones.
  const MAX_POR_DIA = 3;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let notificationId: string;
  try {
    notificationId = await prisma.$transaction(async (tx) => {
      // Toma la fila de la campaña: dos pedidos simultáneos se serializan acá.
      await tx.$queryRaw`SELECT id FROM "DonationCampaign" WHERE id = ${campaign.id} FOR UPDATE`;
      const sentToday = await tx.donationNotification.count({
        where: { campaignId: campaign.id, createdAt: { gte: startOfDay } },
      });
      if (sentToday >= MAX_POR_DIA) throw new DailyLimitError();
      // sentCount arranca en 0 y se completa abajo con los que salieron de verdad.
      const n = await tx.donationNotification.create({
        data: { campaignId: campaign.id, message: message.trim(), sentCount: 0 },
      });
      return n.id;
    });
  } catch (e) {
    if (e instanceof DailyLimitError) {
      return NextResponse.json(
        { error: `Ya se enviaron ${MAX_POR_DIA} avisos hoy. Probá de nuevo mañana.` },
        { status: 429 }
      );
    }
    throw e;
  }

  const donors = await prisma.donation.findMany({
    where: { campaignId: campaign.id, status: "CONFIRMED" },
    select: { donorName: true, donorEmail: true },
  });

  const results = await Promise.allSettled(
    donors.map((d) =>
      sendCanastaAnnouncementEmail({
        to: d.donorEmail,
        donorName: d.donorName,
        campaignName: campaign.name,
        message: message.trim(),
        campaignUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${campaignType === "LIBRE" ? "/comunidad/causa" : "/comunidad/campana"}`,
        campaignType,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  // El registro ya existe (se creó al reservar el lugar); acá se completa con
  // cuántos salieron realmente.
  await prisma.donationNotification.update({
    where: { id: notificationId },
    data: { sentCount: sent },
  });

  const usadosHoy = await prisma.donationNotification.count({
    where: { campaignId: campaign.id, createdAt: { gte: startOfDay } },
  });

  return NextResponse.json({
    ok: true,
    totalDonors: donors.length,
    sent,
    failed,
    remainingToday: Math.max(0, MAX_POR_DIA - usadosHoy),
  });
}

class DailyLimitError extends Error {}
