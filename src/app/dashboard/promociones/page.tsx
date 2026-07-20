export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { promotionStatus } from "@/lib/promotions";
import { isPremiumTier, PRO_MAX_LIVE_PROMOTIONS } from "@/lib/planLimits";
import PromocionesClient from "./PromocionesClient";

export default async function PromocionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  const [promos, products, sub] = store
    ? await Promise.all([
        prisma.storePromotion.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } }),
        prisma.product.findMany({
          where: { storeId: store.id, isActive: true, deletedAt: null },
          select: { id: true, name: true, price: true, category: true, costPrice: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
      ])
    : [[], [], null];

  const now = new Date();
  const rows = promos.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    value: p.value,
    minQty: p.minQty,
    payQty: p.payQty,
    minOrderAmount: p.minOrderAmount,
    scope: p.scope,
    categories: safeArr(p.categories),
    productIds: safeArr(p.productIds),
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    combinesWithCoupons: p.combinesWithCoupons,
    combinesWithPromotions: p.combinesWithPromotions,
    isActive: p.isActive,
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    status: promotionStatus(p, now),
  }));

  // Categorías con su conteo de productos, para el selector "por categoría".
  const catCount = new Map<string, number>();
  for (const p of products) {
    if (p.category) catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
  }
  const categories = Array.from(catCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id}>
      <PromocionesClient
        initialPromotions={rows}
        categories={categories}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category, costPrice: p.costPrice }))}
        activeCount={rows.filter((r) => r.status === "active" || r.status === "scheduled").length}
        // null = sin tope (Premium). El cupo usado lo calcula el cliente con el
        // mismo criterio que el POST: vivas ocupan lugar, archivadas y vencidas no.
        maxPromotions={isPremiumTier(sub?.tier) ? null : PRO_MAX_LIVE_PROMOTIONS}
      />
    </DashboardLayout>
  );
}

function safeArr(raw: string): string[] {
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; }
  catch { return []; }
}
