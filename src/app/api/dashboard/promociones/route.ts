import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validatePromotionBody, promotionStatus, parseStringArray, fixedFloorError } from "@/lib/promotions";
import { livePromotionsWhere, PRO_MAX_LIVE_PROMOTIONS } from "@/lib/planLimits";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";

// GET — listar promociones de la tienda. tab=act (vivas) | hist (historial).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ promotions: [], total: 0, stats: emptyStats() });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") === "hist" ? "hist" : "act";
  const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "20"), 1), 50);
  const skip = Math.max(parseInt(searchParams.get("skip") ?? "0"), 0);
  const now = new Date();

  // Volumen por tienda es chico: se trae todo y se separa/pagina en JS. El estado
  // depende de comparar fechas con "ahora", que Prisma no expresa cómodo en el where.
  const all = await prisma.storePromotion.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  const stats = all.reduce((acc, p) => {
    const st = promotionStatus(p, now);
    if (st === "active" || st === "scheduled") acc.active++;
    return acc;
  }, emptyStats());

  // Vivas = activa, programada o pausada (sin archivar ni vencer). Historial = el resto.
  const isLive = (p: (typeof all)[number]) => {
    const st = promotionStatus(p, now);
    return st === "active" || st === "scheduled" || st === "paused";
  };
  const filtered = tab === "act" ? all.filter(isLive) : all.filter((p) => !isLive(p));

  // categories/productIds se guardan como JSON string — se PARSEAN a array acá para
  // que el cliente reciba lo mismo que en la carga inicial (page.tsx). Sin esto,
  // `productIds.length` contaba los caracteres del string (ej. 29) en vez de los productos.
  const promotions = filtered.slice(skip, skip + take).map((p) => ({
    ...p,
    categories: parseStringArray(p.categories),
    productIds: parseStringArray(p.productIds),
    status: promotionStatus(p, now),
  }));

  return NextResponse.json({ promotions, total: filtered.length, take, skip, stats });
}

function emptyStats() {
  return { active: 0 };
}

// Tope del plan alcanzado, detectado dentro de la transacción → se traduce a 403.
class PromotionLimitError extends Error {}

// POST — crear promoción.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id }, select: SUB_STATUS_SELECT });

  const body = await req.json().catch(() => ({}));
  const result = validatePromotionBody(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const d = result.data;

  // Candado del monto fijo (B-07): se consulta el catálogo porque el tope depende
  // del precio del producto más barato en alcance, no de un número fijo. Solo se
  // consulta cuando hace falta — los otros tipos no pagan la query.
  if (d.type === "FIXED") {
    const productos = await prisma.product.findMany({
      // `deletedAt: null` no es opcional: el asistente juzga con los productos que
      // trae `page.tsx`, que excluye los borrados. Sin esta condición el server
      // frenaría por un producto que la dueña ya no ve —y no puede arreglar— con
      // el asistente mostrándole todo en verde.
      where: { storeId: store.id, isActive: true, deletedAt: null },
      select: { id: true, name: true, price: true, category: true },
    });
    const err = fixedFloorError(d, productos);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // Tope del plan Pro: cuenta las promos vivas (activas, programadas o pausadas).
  // Archivar o dejar vencer una libera lugar al instante.
  //
  // Contar y crear van en la misma transacción, con la fila de la tienda tomada
  // con FOR UPDATE (mismo recurso que usa el cambio de rubro). Sueltos, dos
  // pedidos simultáneos —dos pestañas, o un doble click que le gane al guard
  // del botón— contaban los dos 4 de 5 y creaban los dos: 6 promos en un plan
  // de 5.
  try {
    const promotion = await prisma.$transaction(async (tx) => {
      if (!hasActivePremium(sub)) {
        await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`;
        const liveCount = await tx.storePromotion.count({ where: livePromotionsWhere(store.id) });
        if (liveCount >= PRO_MAX_LIVE_PROMOTIONS) throw new PromotionLimitError();
      }

      return tx.storePromotion.create({
        data: {
          storeId: store.id,
          name: d.name,
          type: d.type,
          value: d.value,
          minQty: d.minQty,
          payQty: d.payQty,
          minOrderAmount: d.minOrderAmount,
          scope: d.scope,
          categories: JSON.stringify(d.categories),
          productIds: JSON.stringify(d.productIds),
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          combinesWithCoupons: d.combinesWithCoupons,
          combinesWithPromotions: d.combinesWithPromotions,
          eventLabel: d.eventLabel,
        },
      });
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (err) {
    if (err instanceof PromotionLimitError) {
      return NextResponse.json(
        {
          error: `Llegaste a las ${PRO_MAX_LIVE_PROMOTIONS} promociones del plan Tienda Pro. Archivá una para crear otra, o pasá a Premium para tenerlas sin límite.`,
          code: "LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
    throw err;
  }
}
