import { prisma } from "@/lib/prisma";
import CanastaAdmin from "./CanastaAdmin";
import CanastaEntregaAdmin from "./CanastaEntregaAdmin";

export default async function AdminCanastaPage() {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] }, deliveredAt: null },
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

  const notifiedCount = campaign
    ? await prisma.donationNotification.count({ where: { campaignId: campaign.id } })
    : 0;

  const deliveredCampaigns = await prisma.donationCampaign.findMany({
    where: { deliveredAt: { not: null } },
    orderBy: { deliveredAt: "desc" },
    include: { testimonial: true },
  });

  const history = deliveredCampaigns.map((c) => ({
    campaignId: c.id,
    campaignName: c.name,
    deliveredAt: c.deliveredAt as Date,
    testimonial: c.testimonial,
  }));

  return (
    <div>
      <CanastaAdmin campaign={campaign} />
      <CanastaEntregaAdmin campaign={campaign} donors={donors} notifiedCount={notifiedCount} history={history} />
    </div>
  );
}
