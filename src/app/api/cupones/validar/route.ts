import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/coupons";
import { checkRateLimit } from "@/lib/rate-limit";

// POST - validar un código de cupón antes del checkout
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`coupon:${ip}`, 15, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const { code, storeId, subtotal } = await req.json();

  if (!code || !storeId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { storeId_code: { storeId, code: normalizeCouponCode(code) } },
  });

  // Respuesta genérica para no revelar si existe, expiró o se agotó (evita enumeración)
  const INVALID = NextResponse.json({ error: "Cupón inválido o inactivo" }, { status: 404 });

  if (!coupon || !coupon.isActive) return INVALID;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return INVALID;
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return INVALID;

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
