import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getNewCounts } from "@/lib/adminBadges";
import {
  LIMITE_ALERTAS_ACTIVAS,
  UMBRAL_EVENTOS_REPETIDOS,
  VENTANA_ALERTAS_MINUTOS,
} from "@/lib/security-events";

async function contarAlertasSeguridad(desde: Date): Promise<number | null> {
  try {
    const [erroresGraves, repeticiones] = await Promise.all([
      prisma.securityEvent.count({
        where: {
          createdAt: { gte: desde },
          kind: "SERVER_ERROR",
          status: { gte: 500 },
        },
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count
        FROM (
          SELECT 1
          FROM "SecurityEvent"
          WHERE "createdAt" >= ${desde}
            AND "ipFingerprint" IS NOT NULL
          GROUP BY "ipFingerprint", "route", "kind", "origin"
          HAVING COUNT(*) >= ${UMBRAL_EVENTOS_REPETIDOS}
        ) AS alertas_repetidas
      `,
    ]);
    return Math.min(erroresGraves, LIMITE_ALERTAS_ACTIVAS)
      + Math.min(Number(repeticiones[0]?.count ?? 0), LIMITE_ALERTAS_ACTIVAS);
  } catch (error) {
    console.error(
      "[admin badges] No se pudieron contar las alertas de seguridad",
      error instanceof Error ? error.name : "UnknownError",
    );
    return null;
  }
}

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

  const desdeAlertas = new Date(Date.now() - VENTANA_ALERTAS_MINUTOS * 60 * 1000);
  const [pendingVerif, pendingReports, pendingRetiros, pendingCierres, newCounts, activeSecurityAlerts] = await Promise.all([
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.storeReport.count({ where: { status: "PENDING" } }),
    prisma.walletWithdrawal.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.storeClosure.count({ where: { status: "PENDING" } }),
    getNewCounts(user.id),
    contarAlertasSeguridad(desdeAlertas),
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
    activeSecurityAlerts,
  });
}
