import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`reward-coupon:${ip}`, 15, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Tenés que estar logueado para usar este cupón" }, { status: 401 });
  }

  const { code, storeId, subtotal } = await req.json();
  if (!code || !storeId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const INVALID = NextResponse.json({ error: "Cupón inválido o inactivo" }, { status: 404 });

  // Buscar el cupón de premio del usuario
  const coupon = await prisma.affiliateRewardCoupon.findUnique({
    where: { code: String(code).trim().toUpperCase().slice(0, 30) },
  });

  if (!coupon) return INVALID;
  if (coupon.userId !== currentUser.id) return INVALID;
  if (coupon.type !== "STORE") return NextResponse.json({ error: "Este cupón no es válido para tiendas" }, { status: 400 });
  if (coupon.status !== "AVAILABLE") return NextResponse.json({ error: "Este cupón ya fue usado o venció" }, { status: 400 });
  if (coupon.expiresAt < new Date()) return NextResponse.json({ error: "Este cupón venció" }, { status: 400 });

  // Verificar que la tienda acepta cupones de premio
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { acceptsRewardCoupons: true, ownerId: true },
  });

  if (!store?.acceptsRewardCoupons) {
    return NextResponse.json({ error: "Esta tienda no acepta cupones de premio" }, { status: 400 });
  }

  // El afiliado no puede usar su cupón en la tienda donde él es afiliado
  const esAfiliado = await prisma.affiliate.findFirst({
    where: { userId: currentUser.id, store: { id: storeId }, isActive: true },
  });
  if (esAfiliado) {
    return NextResponse.json({ error: "No podés usar un cupón de premio en la tienda donde sos afiliada" }, { status: 400 });
  }

  const discount = Math.round((subtotal * coupon.discountValue) / 100);

  return NextResponse.json({
    rewardCoupon: {
      id: coupon.id,
      code: coupon.code,
      discountValue: coupon.discountValue,
      level: coupon.level,
      earnedMonth: coupon.earnedMonth,
    },
    discount,
  });
}
