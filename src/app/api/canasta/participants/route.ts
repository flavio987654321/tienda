import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/participants
// Lista pública de quienes donaron a la campaña vigente.
// Select explícito: SOLO donorName. Nunca incluir teléfono, email, localidad
// ni el id real de la donación.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") === "LIBRE" ? "LIBRE" : "CANASTA";

  const campaign = await prisma.donationCampaign.findFirst({
    where: { type, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
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
