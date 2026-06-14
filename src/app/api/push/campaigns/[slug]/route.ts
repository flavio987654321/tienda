import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      owner: {
        select: {
          subscription: {
            select: {
              tier: true,
              status: true,
              trialEndsAt: true,
              currentPeriodEnd: true,
              gracePeriodEndsAt: true,
            },
          },
        },
      },
    },
  });

  if (!store) return NextResponse.json({ campaigns: [] });

  const sub = store.owner?.subscription;
  const isPremium =
    sub?.tier === "PREMIUM" &&
    sub.status != null &&
    isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);

  if (!isPremium) return NextResponse.json({ campaigns: [] });

  const campaigns = await prisma.pushCampaign.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, title: true, body: true, createdAt: true },
  });

  return NextResponse.json(
    { campaigns },
    { headers: { "Cache-Control": "no-store" } }
  );
}
