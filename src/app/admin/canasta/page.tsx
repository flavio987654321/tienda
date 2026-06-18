import { prisma } from "@/lib/prisma";
import CanastaAdmin from "./CanastaAdmin";
import CanastaSorteoAdmin from "./CanastaSorteoAdmin";

export default async function AdminCanastaPage() {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      products: { orderBy: { sortOrder: "asc" } },
      draws: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        include: {
          winner1: { select: { donorName: true, donorPhone: true, donorEmail: true } },
          winner2: { select: { donorName: true, donorPhone: true, donorEmail: true } },
          winner3: { select: { donorName: true, donorPhone: true, donorEmail: true } },
        },
      },
    },
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

  const finishedCampaigns = await prisma.donationCampaign.findMany({
    where: { drawStatus: "FINISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      draws: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        include: {
          winner1: { select: { donorName: true } },
          winner2: { select: { donorName: true } },
          winner3: { select: { donorName: true } },
        },
      },
      testimonial: true,
    },
  });

  const history = finishedCampaigns.map((c) => {
    const draw = c.draws[0];
    const winnerName = draw
      ? [draw.winner1?.donorName, draw.winner2?.donorName, draw.winner3?.donorName][draw.currentPosition - 1] ?? null
      : null;
    return {
      campaignId: c.id,
      campaignName: c.name,
      finishedAt: c.updatedAt,
      winnerName,
      testimonial: c.testimonial,
    };
  });

  return (
    <div>
      <CanastaAdmin campaign={campaign} />
      <CanastaSorteoAdmin campaign={campaign} draw={campaign?.draws[0] ?? null} donors={donors} notifiedCount={notifiedCount} history={history} />
    </div>
  );
}
