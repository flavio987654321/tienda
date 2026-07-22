import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

const PAGE_SIZE = 20;
const STATUSES = ["NEW", "REVIEWED", "BUILDING", "DONE", "DISCARDED"] as const;
type Status = (typeof STATUSES)[number];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // uno de STATUSES, o null = todos
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const where = status && (STATUSES as readonly string[]).includes(status) ? { status } : {};

  const [briefs, total, byStatusRaw, patternsRaw] = await Promise.all([
    prisma.designBrief.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.designBrief.count({ where }),
    // Contador por estado, para las pestañas y para no perder de vista cuántos
    // hay sin mirar aunque estés filtrando por otro estado.
    prisma.designBrief.groupBy({ by: ["status"], _count: { _all: true } }),
    // El resumen que da sentido a todo: qué combinación de rubro + estética se
    // pide más. Se excluyen los descartados para que no ensucien la demanda real.
    prisma.designBrief.groupBy({
      by: ["tipoTienda", "estetica"],
      where: { status: { not: "DISCARDED" } },
      // tipoTienda va en el _count además de _all porque es el campo por el que
      // se ordena: mismo patrón que el groupBy de vendedoras/stats, que ya corre
      // en producción. Contar y ordenar por el mismo campo evita depender de que
      // Prisma acepte ordenar por uno que no está en la agregación.
      _count: { _all: true, tipoTienda: true },
      orderBy: { _count: { tipoTienda: "desc" } },
      take: 8,
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  for (const row of byStatusRaw) byStatus[row.status] = row._count._all;

  const patterns = patternsRaw.map((p) => ({
    tipoTienda: p.tipoTienda,
    estetica: p.estetica,
    count: p._count._all,
  }));

  return NextResponse.json({ briefs, total, page, pageSize: PAGE_SIZE, byStatus, patterns });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !status || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const brief = await prisma.designBrief.update({
    where: { id },
    data: { status: status as Status },
  });

  return NextResponse.json({ brief });
}
