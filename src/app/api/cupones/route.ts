import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupons";

// GET - listar cupones de la tienda
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ coupons: [] });

  const coupons = await prisma.coupon.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ coupons });
}

// POST - crear cupón
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = body;

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

  const coupon = await prisma.coupon.create({
    data: {
      code: codeClean,
      discountType,
      discountValue: value,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      storeId: store.id,
    },
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
