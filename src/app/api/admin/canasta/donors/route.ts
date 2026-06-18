import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// GET /api/admin/canasta/donors
// Lista completa de donantes de la campaña vigente, con sus datos de
// contacto. Solo accesible por el admin (estos datos nunca son públicos).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
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
      donorDeliveryPref: true,
      amount: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ donors });
}
