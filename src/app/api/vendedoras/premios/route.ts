import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getNivelActual, getNivelLabel, getNivelColor, getCategoriaLabel, calcularRachaDiamante, type RewardLevel, type StoreCategoria } from "@/lib/rewards";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = currentUser.id;

  const cupones = await prisma.affiliateRewardCoupon.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const affiliates = await prisma.affiliate.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  let nivelActual: RewardLevel = "BRONZE";
  let esMayorista   = false;
  let categoria: StoreCategoria = "RETAIL";
  let rachaDiamante = 0;

  if (affiliates.length > 0) {
    const result = await getNivelActual(affiliates[0].id);
    nivelActual  = result.nivel;
    esMayorista  = result.esMayorista;
    categoria    = result.categoria;
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
    nivelLabel:     getNivelLabel(nivelActual),
    nivelColor:     getNivelColor(nivelActual),
    plan:           subscription?.plan ?? "MONTHLY",
    rachaDiamante,
    esMayorista,
    categoria,
    categoriaLabel: getCategoriaLabel(categoria),
  });
}
