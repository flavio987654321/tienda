import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validatePromotionBody, promotionStatus } from "@/lib/promotions";

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

  const promotions = filtered.slice(skip, skip + take).map((p) => ({ ...p, status: promotionStatus(p, now) }));

  return NextResponse.json({ promotions, total: filtered.length, take, skip, stats });
}

function emptyStats() {
  return { active: 0 };
}

// POST — crear promoción.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const result = validatePromotionBody(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const d = result.data;

  const promotion = await prisma.storePromotion.create({
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
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
