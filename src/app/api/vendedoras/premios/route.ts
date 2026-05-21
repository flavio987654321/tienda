import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getNivelActual, getNivelLabel, getNivelColor, calcularRachaDiamante } from "@/lib/rewards";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = currentUser.id;

  // Obtener cupones de premio del usuario
  const cupones = await prisma.affiliateRewardCoupon.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Obtener nivel actual basado en comisiones del mes en curso
  const affiliates = await prisma.affiliate.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  let nivelActual = "BRONZE";
  let rachaDiamante = 0;
  if (affiliates.length > 0) {
    nivelActual = await getNivelActual(affiliates[0].id);
  }
  if (nivelActual === "DIAMOND") {
    rachaDiamante = await calcularRachaDiamante(userId);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });

  return NextResponse.json({
    cupones,
    nivelActual,
    nivelLabel: getNivelLabel(nivelActual as any),
    nivelColor: getNivelColor(nivelActual as any),
    plan: subscription?.plan ?? "MONTHLY",
    rachaDiamante,
  });
}
