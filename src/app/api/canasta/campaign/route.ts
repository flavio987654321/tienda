import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGoalAmount, fundedProducts } from "@/lib/canasta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") === "LIBRE" ? "LIBRE" : "CANASTA";

  // Incluye COMPLETED (meta ya alcanzada, esperando que el admin elija a
  // quién se le entrega) además de ACTIVE — si no, la página se queda sin
  // nada que mostrar justo en el momento más importante: cuando se completa
  // la campaña.
  const campaign = await prisma.donationCampaign.findFirst({
    where: { type, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
    include: { products: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  if (!campaign) {
    return NextResponse.json({ campaign: null });
  }

  const confirmedDonations = await prisma.donation.findMany({
    where: { campaignId: campaign.id, status: "CONFIRMED" },
    select: { amount: true },
  });

  const totalRaised = confirmedDonations.reduce((sum, d) => sum + d.amount, 0);

  if (type === "LIBRE") {
    const goalAmount = campaign.goalAmount;
    const progressPct = goalAmount ? Math.min(100, Math.round((totalRaised / goalAmount) * 100)) : null;
    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        goalAmount,
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType,
        contactPhone: campaign.contactPhone,
        bannerActive: campaign.bannerActive,
      },
      totalRaised,
      progressPct,
      donorsCount: confirmedDonations.length,
    });
  }

  const goalAmount = calculateGoalAmount(campaign.products, campaign.reservePct);
  const progressPct = goalAmount > 0 ? Math.min(100, Math.round((totalRaised / goalAmount) * 100)) : 0;

  const products = fundedProducts(
    campaign.products.map((p) => ({ id: p.id, name: p.name, image: p.image, targetPrice: p.targetPrice })),
    totalRaised,
    campaign.reservePct
  );

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      goalAmount,
      reservePct: campaign.reservePct,
      bannerActive: campaign.bannerActive,
    },
    products,
    totalRaised,
    progressPct,
    donorsCount: confirmedDonations.length,
  });
}
