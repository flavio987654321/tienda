import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/donation-status/[id]
// Endpoint público de seguimiento (el link va por email). El id de la
// donación funciona como clave de acceso — no expone datos de otros donantes.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const donation = await prisma.donation.findUnique({
    where: { id },
    select: { id: true, donorName: true, amount: true, status: true, campaignId: true, createdAt: true },
  });
  if (!donation) return NextResponse.json({ error: "No encontramos esa donación" }, { status: 404 });

  const campaign = await prisma.donationCampaign.findUnique({
    where: { id: donation.campaignId },
    select: { name: true, type: true, deliveredAt: true },
  });

  return NextResponse.json({
    donorName: donation.donorName,
    amount: donation.amount,
    status: donation.status,
    campaignName: campaign?.name ?? null,
    campaignType: campaign?.type === "LIBRE" ? "LIBRE" : "CANASTA",
    createdAt: donation.createdAt,
    campaignDelivered: !!campaign?.deliveredAt,
  });
}
