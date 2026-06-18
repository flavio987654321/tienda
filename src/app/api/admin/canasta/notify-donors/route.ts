import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendCanastaAnnouncementEmail } from "@/lib/resend";

// POST /api/admin/canasta/notify-donors
// Manda un email con texto libre a todos los donantes CONFIRMED de la
// campaña vigente (ej: avisar día y hora del sorteo).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
  }

  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!campaign) return NextResponse.json({ error: "No hay campaña vigente" }, { status: 404 });

  // Límite: máximo 3 avisos masivos por día por campaña.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sentToday = await prisma.donationNotification.count({
    where: { campaignId: campaign.id, createdAt: { gte: startOfDay } },
  });
  if (sentToday >= 3) {
    return NextResponse.json(
      { error: "Ya se enviaron 3 avisos hoy. Probá de nuevo mañana." },
      { status: 429 }
    );
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
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  await prisma.donationNotification.create({
    data: { campaignId: campaign.id, message: message.trim(), sentCount: sent },
  });

  return NextResponse.json({ ok: true, totalDonors: donors.length, sent, failed, remainingToday: 2 - sentToday });
}
