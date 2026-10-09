import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  LIMITE_ALERTAS_ACTIVAS,
  UMBRAL_EVENTOS_REPETIDOS,
  VENTANA_ALERTAS_MINUTOS,
} from "@/lib/security-events";

export const dynamic = "force-dynamic";

const DIAS_RETENCION = 30;
const LIMITE_EVENTOS = 100;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const desde = new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000);
  const desdeAlertas = new Date(Date.now() - VENTANA_ALERTAS_MINUTOS * 60 * 1000);

  try {
    const [eventos, conteos, repeticiones, erroresGraves, repeticionesAlerta] = await Promise.all([
      prisma.securityEvent.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: "desc" },
        take: LIMITE_EVENTOS,
        select: {
          id: true,
          createdAt: true,
          kind: true,
          origin: true,
          route: true,
          method: true,
          status: true,
          reason: true,
          errorName: true,
          requestId: true,
          ipFingerprint: true,
        },
      }),
      prisma.securityEvent.groupBy({
        by: ["kind", "origin"],
        where: { createdAt: { gte: desde } },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{
        ipFingerprint: string;
        route: string;
        kind: string;
        origin: string;
        count: bigint;
        firstAt: Date;
        lastAt: Date;
      }[]>`
        SELECT "ipFingerprint", "route", "kind", "origin",
               COUNT(*) AS count,
               MIN("createdAt") AS "firstAt",
               MAX("createdAt") AS "lastAt"
        FROM "SecurityEvent"
        WHERE "createdAt" >= ${desde}
          AND "ipFingerprint" IS NOT NULL
        GROUP BY "ipFingerprint", "route", "kind", "origin"
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, MAX("createdAt") DESC
        LIMIT 25
      `,
      prisma.securityEvent.findMany({
        where: {
          createdAt: { gte: desdeAlertas },
          kind: "SERVER_ERROR",
          status: { gte: 500 },
        },
        orderBy: { createdAt: "desc" },
        take: LIMITE_ALERTAS_ACTIVAS,
        select: {
          id: true,
          createdAt: true,
          origin: true,
          route: true,
          method: true,
          status: true,
          errorName: true,
        },
      }),
      prisma.$queryRaw<{
        ipFingerprint: string;
        route: string;
        kind: string;
        origin: string;
        count: bigint;
        firstAt: Date;
        lastAt: Date;
      }[]>`
        SELECT "ipFingerprint", "route", "kind", "origin",
               COUNT(*) AS count,
               MIN("createdAt") AS "firstAt",
               MAX("createdAt") AS "lastAt"
        FROM "SecurityEvent"
        WHERE "createdAt" >= ${desdeAlertas}
          AND "ipFingerprint" IS NOT NULL
        GROUP BY "ipFingerprint", "route", "kind", "origin"
        HAVING COUNT(*) >= ${UMBRAL_EVENTOS_REPETIDOS}
        ORDER BY COUNT(*) DESC, MAX("createdAt") DESC
        LIMIT ${LIMITE_ALERTAS_ACTIVAS}
      `,
    ]);

    return NextResponse.json({
      desde: desde.toISOString(),
      eventos: eventos.map((evento) => ({
        ...evento,
        createdAt: evento.createdAt.toISOString(),
      })),
      conteos: conteos.map((fila) => ({
        kind: fila.kind,
        origin: fila.origin,
        count: fila._count._all,
      })),
      repeticiones: repeticiones.map((fila) => ({
        ...fila,
        count: Number(fila.count),
        firstAt: fila.firstAt.toISOString(),
        lastAt: fila.lastAt.toISOString(),
      })),
      alertas: {
        erroresGraves: erroresGraves.map((evento) => ({
          ...evento,
          createdAt: evento.createdAt.toISOString(),
        })),
        repeticiones: repeticionesAlerta.map((fila) => ({
          ...fila,
          count: Number(fila.count),
          firstAt: fila.firstAt.toISOString(),
          lastAt: fila.lastAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error(
      "[admin seguridad] No se pudieron leer los eventos",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "No se pudieron cargar los eventos de seguridad." }, { status: 500 });
  }
}
