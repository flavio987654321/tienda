export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { promotionStatus } from "@/lib/promotions";
import { PRO_MAX_LIVE_PROMOTIONS } from "@/lib/planLimits";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";
import PromocionesClient from "./PromocionesClient";

export default async function PromocionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  // Arranque del mes en hora de Argentina. Sin esto, el servidor (UTC en Vercel)
  // corta el mes 3 horas antes y los pedidos de la última noche del mes caen en
  // el mes siguiente, así que el panel no coincide con lo que ve la dueña.
  const inicioDeMes = mesActualEnArgentina();

  // Un pedido cuenta como "con promo" si tiene promoSummary, no si ahorró plata:
  // una promo de envío gratis no toca promoSavings (baja shippingCost) y si
  // midiéramos por el ahorro esa venta no aparecería en ningún lado.
  const conPromoDelMes = store
    ? { storeId: store.id, promoSummary: { not: null }, status: { not: "CANCELLED" }, createdAt: { gte: inicioDeMes } }
    : null;

  // A-05 — lo que de verdad cuestan los envíos de esta tienda, para poder decírselo
  // a la dueña ANTES de que arme un envío gratis. Con cotización en vivo la tarifa
  // la pone el transportista y varía por destino: el costo del envío bonificado no
  // es un número que ella eligió. Salen de los pedidos reales, no de la tarifa
  // configurada — es el mismo principio que el resto de los avisos: mostrarle sus
  // propios números en vez de una advertencia genérica.
  const enviosReales = store
    ? { storeId: store.id, status: { not: "CANCELLED" }, shippingCost: { gt: 0 } }
    : null;

  const [promos, products, sub, ventasConPromo, ahorroAgg] = store
    ? await Promise.all([
        prisma.storePromotion.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } }),
        prisma.product.findMany({
          where: { storeId: store.id, isActive: true, deletedAt: null },
          select: { id: true, name: true, price: true, category: true, costPrice: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.subscription.findUnique({ where: { userId: user.id }, select: SUB_STATUS_SELECT }),
        prisma.order.count({ where: conPromoDelMes! }),
        // Los cancelados quedan afuera: ahí no se le regaló nada a nadie.
        prisma.order.aggregate({ where: conPromoDelMes!, _sum: { promoSavings: true } }),
      ])
    : [[], [], null, 0, null];

  const ahorroDelMes = ahorroAgg?._sum.promoSavings ?? 0;

  // Rango real de envíos cobrados. Si la tienda todavía no despachó nada, queda en
  // null y el asistente no inventa un número: muestra la advertencia sin datos.
  const envioAgg = enviosReales
    ? await prisma.order.aggregate({
        where: enviosReales,
        _avg: { shippingCost: true },
        _max: { shippingCost: true },
        _count: true,
      })
    : null;
  const costoEnvio = envioAgg && envioAgg._count > 0
    ? { promedio: Math.round(envioAgg._avg.shippingCost ?? 0), maximo: Math.round(envioAgg._max.shippingCost ?? 0), pedidos: envioAgg._count }
    : null;

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
    eventLabel: p.eventLabel,
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
    <DashboardLayout userName={user.name} userId={user.id}>
      <PromocionesClient
        initialPromotions={rows}
        categories={categories}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category, costPrice: p.costPrice }))}
        activeCount={rows.filter((r) => r.status === "active" || r.status === "scheduled").length}
        // null = sin tope (Premium). El cupo usado lo calcula el cliente con el
        // mismo criterio que el POST: vivas ocupan lugar, archivadas y vencidas no.
        maxPromotions={hasActivePremium(sub) ? null : PRO_MAX_LIVE_PROMOTIONS}
        // Lo que le cuestan los envíos de verdad, para el aviso del envío gratis (A-05).
        costoEnvio={costoEnvio}
        ventasConPromo={ventasConPromo}
        ahorroDelMes={ahorroDelMes}
      />
    </DashboardLayout>
  );
}

// Primer día del mes en curso, según el calendario argentino, devuelto como
// instante UTC para comparar contra createdAt.
function mesActualEnArgentina(): Date {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  // Argentina es UTC-3 todo el año (no tiene horario de verano desde 2009), así
  // que el 1° a las 00:00 de acá son las 03:00 UTC.
  return new Date(Date.UTC(y, m - 1, 1, 3, 0, 0));
}

function safeArr(raw: string): string[] {
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; }
  catch { return []; }
}
