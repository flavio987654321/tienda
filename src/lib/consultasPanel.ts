import { prisma } from "@/lib/prisma";

/* El listado de consultas del panel: una página, con el vehículo de cada una
   (foto y estado) y los totales contados en la BASE (06/10/26).

   Antes la pantalla traía las últimas 50 y contaba "Pendientes" y
   "Confirmadas" sobre esas 50: con más consultas, los números no coincidían
   con el del menú (que cuenta todas) y las viejas no se veían nunca. Ahora la
   pantalla y `GET /api/leads` usan esto mismo y se pagina. */

export const POR_PAGINA = 20;

export type VehiculoDeConsulta = { imagen: string | null; estado: string | null; activo: boolean } | null;

export type ConsultaPanel = {
  id: string;
  productId: string | null;
  productName: string;
  productPrice: number;
  customerName: string | null;
  customerPhone: string | null;
  customerMessage: string | null;
  status: string;
  commissionAmount: number | null;
  commissionRate: number | null;
  createdAt: string;
  affiliate: { id: string; userName: string | null; userEmail: string | null } | null;
  vehiculo: VehiculoDeConsulta;
};

const primeraFoto = (raw: string | null) => {
  try {
    const f = (JSON.parse(raw || "[]") as (string | { url?: string })[])[0];
    const url = typeof f === "string" ? f : f?.url;
    return typeof url === "string" ? url : null;
  } catch { return null; }
};

export async function consultasDelPanel(storeId: string, { status, page = 1 }: { status?: string; page?: number }) {
  const where = { storeId, ...(status ? { status } : {}) };
  const [filas, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { affiliate: { select: { id: true, user: { select: { name: true, email: true } } } } },
    }),
    prisma.lead.count({ where }),
  ]);

  // El vehículo de cada una: la consulta guarda el id, sin relación en la base.
  const ids = [...new Set(filas.map((l) => l.productId).filter((x): x is string => !!x))];
  const productos = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, storeId, deletedAt: null },
        select: { id: true, images: true, vehicleStatus: true, isActive: true },
      })
    : [];
  const porId = new Map(productos.map((p) => [p.id, p]));

  const consultas: ConsultaPanel[] = filas.map((l) => {
    const p = l.productId ? porId.get(l.productId) : undefined;
    return {
      id: l.id,
      productId: l.productId,
      productName: l.productName,
      productPrice: l.productPrice,
      customerName: l.customerName,
      customerPhone: l.customerPhone,
      customerMessage: l.customerMessage,
      status: l.status,
      commissionAmount: l.commissionAmount,
      commissionRate: l.commissionRate,
      createdAt: l.createdAt.toISOString(),
      affiliate: l.affiliate ? { id: l.affiliate.id, userName: l.affiliate.user.name, userEmail: l.affiliate.user.email } : null,
      vehiculo: p ? { imagen: primeraFoto(p.images), estado: p.vehicleStatus, activo: p.isActive } : null,
    };
  });

  return { consultas, total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

/** Los totales de la pantalla, contados en la base (todas, no una página). */
export async function totalesDeConsultas(storeId: string) {
  const hace7 = new Date(Date.now() - 7 * 864e5);
  const [porEstado, semana] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
    prisma.lead.count({ where: { storeId, createdAt: { gte: hace7 } } }),
  ]);
  const de = (s: string) => porEstado.find((x) => x.status === s)?._count._all ?? 0;
  return { nuevas: de("PENDING"), vendidas: de("CONFIRMED"), descartadas: de("REJECTED"), semana };
}
