import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/auth-session";

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

  // El contenido de las novedades es solo para quienes siguen la tienda —
  // seguir es lo único que controla el acceso, no si el push llegó al dispositivo.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ campaigns: [] });

  const follow = await prisma.storeFollow.findUnique({
    where: { userId_storeId: { userId: user.id, storeId: store.id } },
    select: { id: true },
  });
  if (!follow) return NextResponse.json({ campaigns: [] });

  const campaigns = await prisma.pushCampaign.findMany({
    where: {
      storeId: store.id,
      // Sin esto, una campaña que el dueño borró de su historial seguiría
      // apareciendo en el banner de novedades de la tienda: la borraría para
      // sacarla de la vista del cliente y sería el único lugar donde quedaría.
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, body: true, createdAt: true },
  });

  return NextResponse.json(
    { campaigns },
    { headers: { "Cache-Control": "no-store" } }
  );
}
