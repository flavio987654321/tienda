import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// GET /api/admin/canasta/donors?type=CANASTA|LIBRE
// Lista completa de donantes de la campaña vigente de ese tipo, con sus
// datos de contacto. Solo accesible por el admin (estos datos nunca son públicos).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") === "LIBRE" ? "LIBRE" : "CANASTA";

  const campaign = await prisma.donationCampaign.findFirst({
    where: { type, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!campaign) return NextResponse.json({ donors: [] });

  const donors = await prisma.donation.findMany({
    where: { campaignId: campaign.id },
    select: {
      id: true,
      donorName: true,
      donorPhone: true,
      donorEmail: true,
      donorLocalidad: true,
      amount: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ donors });
}
