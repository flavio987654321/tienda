import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - validar un código de cupón antes del checkout
export async function POST(req: NextRequest) {
  const { code, storeId, subtotal } = await req.json();

  if (!code || !storeId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { storeId_code: { storeId, code: String(code).trim().toUpperCase() } },
  });

  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: "Cupón inválido o inactivo" }, { status: 404 });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: "El cupón ya expiró" }, { status: 400 });
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ error: "El cupón ya alcanzó su límite de usos" }, { status: 400 });
  }
  if (subtotal !== undefined && subtotal < coupon.minOrderAmount) {
    return NextResponse.json({
      error: `El monto mínimo para este cupón es $${coupon.minOrderAmount.toLocaleString("es-AR")}`,
    }, { status: 400 });
  }

  const discount =
    coupon.discountType === "percentage"
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, subtotal);

  return NextResponse.json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discount,
  });
}
