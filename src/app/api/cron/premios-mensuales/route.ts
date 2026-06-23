import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarCuponesMensuales, expirarCuponesVencidos } from "@/lib/rewards";

// Corre el día 1 de cada mes — genera los premios del mes que acaba de cerrar
// para todas las afiliadas activas, y vence los cupones que ya pasaron su fecha límite.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = previousMonth.getMonth() + 1;

  const affiliates = await prisma.affiliate.findMany({
    where: { isActive: true, status: "APPROVED" },
    select: { id: true },
  });

  let processed = 0;
  for (const affiliate of affiliates) {
    await generarCuponesMensuales(affiliate.id, year, month);
    processed++;
  }

  await expirarCuponesVencidos();

  return NextResponse.json({ ok: true, year, month, affiliatesProcessed: processed });
}
