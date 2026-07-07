import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupons";

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

  // Build status filter — all conditions scoped to the store
  const statusFilter = (() => {
    if (status === "active")        return { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    if (status === "expired")       return { expiresAt: { lte: now } };
    if (status === "inactive")      return { isActive: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    if (status === "gamification")  return { winnerEmail: { not: null } };
    if (status === "whatsapp")      return { label: { contains: "WhatsApp" } };
    return {};
  })();

  const where = {
    storeId: store.id,
    ...(search ? { code: { contains: search } } : {}),
    ...statusFilter,
  };

  const [coupons, total, statsTotal, statsActive, statsExpired, statsGami, statsWhatsapp, discountAgg] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.coupon.count({ where }),
    prisma.coupon.count({ where: { storeId: store.id } }),
    prisma.coupon.count({ where: { storeId: store.id, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.coupon.count({ where: { storeId: store.id, expiresAt: { lte: now } } }),
    prisma.coupon.count({ where: { storeId: store.id, winnerEmail: { not: null } } }),
    prisma.coupon.count({ where: { storeId: store.id, label: { contains: "WhatsApp" } } }),
    prisma.order.aggregate({ where: { storeId: store.id, discountAmount: { gt: 0 } }, _sum: { discountAmount: true } }),
  ]);

  return NextResponse.json({
    coupons,
    total,
    take,
    skip,
    stats: {
      total: statsTotal,
      active: statsActive,
      expired: statsExpired,
      gamification: statsGami,
      whatsapp: statsWhatsapp,
      totalDiscount: discountAgg._sum.discountAmount ?? 0,
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

  if (!sub || sub.tier !== "PREMIUM") {
    const couponCount = await prisma.coupon.count({ where: { storeId: store.id } });
    if (couponCount >= 10) {
      return NextResponse.json(
        { error: "Alcanzaste el límite de 10 cupones del plan Tienda Pro. Actualizá a Premium para crear más." },
        { status: 403 }
      );
    }
  }

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

  const coupon = await prisma.coupon.create({
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

  return NextResponse.json({ coupon }, { status: 201 });
}
