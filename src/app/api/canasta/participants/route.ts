import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/participants
// Lista pública de quienes donaron (para mostrar en la página del sorteo).
// Select explícito: SOLO donorName. Nunca incluir teléfono, email, localidad
// ni el id real de la donación — esto es a propósito para que nadie pueda
// correlacionar un nombre visible con el id interno usado para el sorteo.
export async function GET() {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!campaign) return NextResponse.json({ participants: [] });

  const donations = await prisma.donation.findMany({
    where: { campaignId: campaign.id, status: "CONFIRMED" },
    select: { donorName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    participants: donations.map((d) => d.donorName),
    donors: donations.map((d) => ({ donorName: d.donorName, createdAt: d.createdAt })),
  });
}
