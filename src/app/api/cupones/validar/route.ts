import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/coupons";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// POST - validar un código de cupón antes del checkout
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`coupon:${ip}`, 15, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const { code, storeId, subtotal, email } = await req.json();

  if (!code || !storeId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { storeId_code: { storeId, code: normalizeCouponCode(String(code).slice(0, 30)) } },
  });

  // Respuesta genérica para no revelar si existe, expiró o se agotó (evita enumeración)
  const INVALID = NextResponse.json({ error: "Cupón inválido o inactivo" }, { status: 404 });

  if (!coupon || !coupon.isActive) return INVALID;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return INVALID;
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return INVALID;
  // Cupón de gamificación: verificar que el email que valida es el ganador
  // (si el cupón es personal y no llegó email, tratamos como no coincide — no alcanza con omitirlo)
  if (coupon.winnerEmail && coupon.winnerEmail !== String(email ?? "").trim().toLowerCase()) {
    // Mensaje específico (no el genérico "inválido") para que el ganador sepa QUÉ
    // corregir: el cupón existe pero es personal. El riesgo de enumeración es
    // marginal (código de 6 chars + rate-limit) y sin el email no se puede usar igual.
    return NextResponse.json(
      { error: "Este cupón es personal: ingresá el mismo email con el que lo ganaste en el sorteo." },
      { status: 400 }
    );
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
