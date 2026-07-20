import { NextRequest, NextResponse } from "next/server";
import { myActiveCouponsWhere, isPremiumTier, PRO_MAX_ACTIVE_COUPONS } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupons";

type CouponRow = Awaited<ReturnType<typeof prisma.coupon.findMany>>[number];

// Mismo criterio que couponStatus() en el dashboard (cupones/page.tsx) — se mantienen
// en sync a propósito para que el badge de la fila y los contadores de arriba coincidan.
function statusOf(c: CouponRow, now: Date): "expired" | "exhausted" | "inactive" | "active" {
  if (c.expiresAt && c.expiresAt <= now) return "expired";
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return "exhausted";
  if (!c.isActive) return "inactive";
  return "active";
}

// GET - listar cupones con filtros y stats
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ coupons: [], total: 0 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "20"), 1), 50);
  const skip = Math.max(parseInt(searchParams.get("skip") ?? "0"), 0);
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search")?.trim().toUpperCase().slice(0, 30) ?? "";
  const now = new Date();

  // Volumen por tienda es chico (decenas/cientos) — se trae todo y se filtra/pagina en JS.
  // Necesario porque "agotado" depende de comparar dos columnas (usedCount vs maxUses),
  // algo que Prisma no puede expresar en un where sin SQL crudo.
  const [allCoupons, discountAgg, activePrizeTemplates, myActiveCount, sub] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        storeId: store.id,
        ...(search ? {
          OR: [
            { code: { contains: search } },
            { winnerEmail: { contains: search, mode: "insensitive" as const } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.aggregate({ where: { storeId: store.id, discountAmount: { gt: 0 } }, _sum: { discountAmount: true } }),
    // Cupones que hoy son la plantilla activa de un premio de la ruleta — borrarlos
    // deja a un futuro ganador con un premio sin código, así que se marcan aparte.
    prisma.gamificationPrize.findMany({
      where: { couponId: { not: null }, widget: { storeId: store.id, isActive: true } },
      select: { couponId: true },
    }),
    // Mismo count que usa el POST para bloquear: así el número que ve la dueña
    // es exactamente el que se le va a aplicar, sin sorpresas al guardar.
    prisma.coupon.count({ where: myActiveCouponsWhere(store.id, now) }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
  ]);
  const activePrizeTemplateIds = new Set(activePrizeTemplates.map((p) => p.couponId as string));

  const stats = allCoupons.reduce(
    (acc, c) => {
      acc.total++;
      const st = statusOf(c, now);
      if (st === "active") acc.active++;
      else if (st === "expired") acc.expired++;
      else if (st === "exhausted") acc.exhausted++;
      if (c.winnerEmail) acc.gamification++;
      if (c.label?.includes("WhatsApp")) acc.whatsapp++;
      return acc;
    },
    { total: 0, active: 0, expired: 0, exhausted: 0, gamification: 0, whatsapp: 0 }
  );

  const filtered = allCoupons.filter((c) => {
    if (status === "active")       return statusOf(c, now) === "active";
    if (status === "expired")      return statusOf(c, now) === "expired";
    if (status === "exhausted")    return statusOf(c, now) === "exhausted";
    if (status === "inactive")     return statusOf(c, now) === "inactive";
    if (status === "gamification") return !!c.winnerEmail;
    if (status === "whatsapp")     return !!c.label?.includes("WhatsApp");
    return true; // all
  });

  const coupons = filtered.slice(skip, skip + take).map((c) => ({
    ...c,
    isActivePrizeTemplate: activePrizeTemplateIds.has(c.id),
  }));

  return NextResponse.json({
    coupons,
    total: filtered.length,
    take,
    skip,
    stats: {
      ...stats,
      totalDiscount: discountAgg._sum.discountAmount ?? 0,
    },
    limit: {
      used: myActiveCount,
      max: isPremiumTier(sub?.tier) ? null : PRO_MAX_ACTIVE_COUPONS,
    },
  });
}

// POST - crear cupón
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
  ]);
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, label } = body;

  const codeClean = normalizeCouponCode(code);
  if (!codeClean || codeClean.length < 3 || codeClean.length > 20) {
    return NextResponse.json({ error: "El código debe tener entre 3 y 20 caracteres" }, { status: 400 });
  }
  if (!isValidCouponCode(codeClean)) {
    return NextResponse.json({ error: "El código solo puede tener letras, números, guiones y guiones bajos" }, { status: 400 });
  }
  if (!["percentage", "fixed"].includes(discountType)) {
    return NextResponse.json({ error: "Tipo de descuento inválido" }, { status: 400 });
  }
  const value = parseFloat(discountValue);
  if (isNaN(value) || value <= 0) {
    return NextResponse.json({ error: "El valor del descuento debe ser mayor a 0" }, { status: 400 });
  }
  if (discountType === "percentage" && value > 100) {
    return NextResponse.json({ error: "El porcentaje no puede superar 100%" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({
    where: { storeId_code: { storeId: store.id, code: codeClean } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
  }

  const labelClean = typeof label === "string" ? label.trim().slice(0, 60) || null : null;

  // Tope del plan Pro. Cuenta solo los cupones propios que siguen vivos: los
  // vencidos, los apagados y los de la ruleta no ocupan lugar. Antes contaba
  // `coupon.count({ storeId })` a secas, así que una ruleta de 5 premios ya te
  // comía media cuota y cada ganador te acercaba al tope sin que la dueña
  // hubiera creado nada.
  //
  // Contar y crear van juntos, con la fila de la tienda tomada con FOR UPDATE:
  // sueltos, dos pedidos simultáneos contaban los dos 9 de 10 y creaban los dos.
  try {
    const coupon = await prisma.$transaction(async (tx) => {
      if (!isPremiumTier(sub?.tier)) {
        await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`;
        const couponCount = await tx.coupon.count({ where: myActiveCouponsWhere(store.id) });
        if (couponCount >= PRO_MAX_ACTIVE_COUPONS) throw new CouponLimitError();
      }

      return tx.coupon.create({
        data: {
          code: codeClean,
          discountType,
          discountValue: value,
          minOrderAmount: parseFloat(minOrderAmount) || 0,
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          label: labelClean,
          storeId: store.id,
        },
      });
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    if (err instanceof CouponLimitError) {
      return NextResponse.json(
        {
          error: `Llegaste a los ${PRO_MAX_ACTIVE_COUPONS} cupones activos del plan Tienda Pro. Apagá o dejá vencer uno para crear otro, o pasá a Premium para tenerlos sin límite.`,
          code: "LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
    // Carrera con otro pedido creando el mismo código: el unique lo frena.
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
    }
    throw err;
  }
}

// Tope del plan alcanzado, detectado dentro de la transacción → se traduce a 403.
class CouponLimitError extends Error {}
