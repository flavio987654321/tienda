import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/canasta/donation-status/[id]
// Endpoint público de seguimiento (el link va por email). El id de la
// donación funciona como clave de acceso — no expone datos de otros
// donantes ni el resultado del sorteo antes de que corresponda revelarlo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const donation = await prisma.donation.findUnique({
    where: { id },
    select: { id: true, donorName: true, amount: true, status: true, campaignId: true, createdAt: true },
  });
  if (!donation) return NextResponse.json({ error: "No encontramos esa donación" }, { status: 404 });

  const campaign = await prisma.donationCampaign.findUnique({
    where: { id: donation.campaignId },
    select: {
      name: true,
      drawStatus: true,
      draws: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: { revealAt: true, winner1Id: true, winner2Id: true, winner3Id: true },
      },
    },
  });

  const draw = campaign?.draws[0] ?? null;
  const revealed = !!draw?.revealAt && new Date() >= draw.revealAt;

  let winnerPosition: 1 | 2 | 3 | null = null;
  if (revealed && draw) {
    if (draw.winner1Id === donation.id) winnerPosition = 1;
    else if (draw.winner2Id === donation.id) winnerPosition = 2;
    else if (draw.winner3Id === donation.id) winnerPosition = 3;
  }

  return NextResponse.json({
    donorName: donation.donorName,
    amount: donation.amount,
    status: donation.status,
    campaignName: campaign?.name ?? null,
    createdAt: donation.createdAt,
    drawHappened: revealed,
    winnerPosition,
  });
}
