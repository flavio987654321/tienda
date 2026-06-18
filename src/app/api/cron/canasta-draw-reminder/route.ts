import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCanastaDrawTimeReminderEmail } from "@/lib/resend";

// Llamado por un cron externo (ej: cron-job.org) cada pocos minutos — el plan
// Hobby de Vercel solo permite crons una vez por día, insuficiente para avisar
// a una hora exacta cualquiera del día. Protegido con CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ reminded: 0, note: "ADMIN_EMAIL no configurado" });
  }

  const now = new Date();
  const campaigns = await prisma.donationCampaign.findMany({
    where: {
      drawStatus: "SCHEDULED",
      scheduledDrawAt: { lte: now },
      reminderSentAt: null,
    },
    select: { id: true, name: true, scheduledDrawAt: true },
  });

  for (const c of campaigns) {
    if (!c.scheduledDrawAt) continue;
    await sendCanastaDrawTimeReminderEmail({
      to: adminEmail,
      campaignName: c.name,
      scheduledDrawAt: c.scheduledDrawAt,
    });
    await prisma.donationCampaign.update({
      where: { id: c.id },
      data: { reminderSentAt: now },
    });
  }

  return NextResponse.json({ reminded: campaigns.length });
}
