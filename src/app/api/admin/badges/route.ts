import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getNewCounts } from "@/lib/adminBadges";

// Todos los contadores del sidebar en una sola llamada. Antes el sidebar pegaba
// a 5 endpoints por separado (verificación, denuncias, retiros, cierres,
// section-views) en cada refresco, y refresca en cada evento realtime. Acá van
// juntos: menos round-trips y una foto consistente.
//
// Dos familias:
//  - pending*: cuántas cosas faltan RESOLVER (siguen contando hasta accionarlas).
//  - new*: cuántas ENTRARON desde la última vez que abriste la sección.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [pendingVerif, pendingReports, pendingRetiros, pendingCierres, newCounts] = await Promise.all([
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.storeReport.count({ where: { status: "PENDING" } }),
    prisma.walletWithdrawal.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.storeClosure.count({ where: { status: "PENDING" } }),
    getNewCounts(user.id),
  ]);

  return NextResponse.json({
    pendingVerif,
    pendingReports,
    pendingRetiros,
    pendingCierres,
    newDisenos: newCounts.disenos,
    newLeads: newCounts.leads,
    newTestimonios: newCounts.testimonios,
    newDonaciones: newCounts.donaciones,
  });
}
