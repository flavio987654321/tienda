import { prisma } from "@/lib/prisma";
import type { EstadoTasacion } from "@/lib/tasaciones";

/* Lo que pide la pantalla de Tasaciones del panel, en un solo lugar: la
   página (primer dibujo, en el servidor) y GET /api/tasaciones ("Ver más" y
   los filtros) traen exactamente lo mismo. El mismo molde que `consultasPanel`. */

export const POR_PAGINA = 20;

export async function tasacionesDelPanel(storeId: string, { status, page = 1 }: { status?: EstadoTasacion; page?: number }) {
  const where = { storeId, ...(status ? { status } : {}) };
  const [filas, total] = await Promise.all([
    prisma.tasacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.tasacion.count({ where }),
  ]);
  return {
    tasaciones: filas.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(), ofertadaAt: t.ofertadaAt?.toISOString() ?? null })),
    total,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

export type TasacionDelPanel = Awaited<ReturnType<typeof tasacionesDelPanel>>["tasaciones"][number];

export async function totalesDeTasaciones(storeId: string) {
  const grupos = await prisma.tasacion.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } });
  const de = (s: EstadoTasacion) => grupos.find((g) => g.status === s)?._count._all ?? 0;
  return { pendientes: de("PENDIENTE"), ofertadas: de("OFERTADA"), aceptadas: de("ACEPTADA"), descartadas: de("DESCARTADA") };
}
