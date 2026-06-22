import { prisma } from "@/lib/prisma";
import CanastaAdminTabs from "./CanastaAdminTabs";

async function loadBundle(type: "CANASTA" | "LIBRE") {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { type, status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
    include: { products: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const donors = campaign
    ? await prisma.donation.findMany({
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
      })
    : [];

  const deliveredCampaigns = await prisma.donationCampaign.findMany({
    where: { type, deliveredAt: { not: null } },
    orderBy: { deliveredAt: "desc" },
    include: { testimonial: true },
  });

  const history = deliveredCampaigns.map((c) => ({
    campaignId: c.id,
    campaignName: c.name,
    deliveredAt: c.deliveredAt as Date,
    testimonial: c.testimonial,
  }));

  return { campaign, donors, history };
}

export default async function AdminCanastaPage() {
  const [canasta, libre] = await Promise.all([loadBundle("CANASTA"), loadBundle("LIBRE")]);

  return <CanastaAdminTabs canasta={canasta} libre={libre} />;
}
