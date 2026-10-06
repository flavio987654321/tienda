import { prisma } from "@/lib/prisma";
import { monedaDe, monedaDeTienda, type Moneda } from "@/lib/monedaVehiculo";
import { diaAR, HORAS_DEMORA } from "@/lib/seguimiento";

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
  /** La moneda del precio: la del vehículo, o la principal de la tienda. */
  moneda: Moneda;
  customerName: string | null;
  customerPhone: string | null;
  customerMessage: string | null;
  status: string;
  commissionAmount: number | null;
  commissionRate: number | null;
  createdAt: string;
  affiliate: { id: string; userName: string | null; userEmail: string | null } | null;
  vehiculo: VehiculoDeConsulta;
  seguimiento: SeguimientoDeConsulta;
};

export type SeguimientoDeConsulta = {
  etapa: string | null;
  nota: string | null;
  recordarEl: string | null;
  visitaEl: string | null;
  visitaTipo: string | null;
  contactadoAt: string | null;
} | null;

type FilaSeguimiento = { leadId: string; etapa: string | null; nota: string | null; recordarEl: Date | null; visitaEl: Date | null; visitaTipo: string | null; contactadoAt: Date | null };
export const seguimientoPlano = (s: FilaSeguimiento | null | undefined): SeguimientoDeConsulta => s ? {
  etapa: s.etapa, nota: s.nota, visitaTipo: s.visitaTipo,
  recordarEl: s.recordarEl?.toISOString() ?? null, visitaEl: s.visitaEl?.toISOString() ?? null, contactadoAt: s.contactadoAt?.toISOString() ?? null,
} : null;

/* El seguimiento vive en otra tabla (ver `lib/seguimiento`) y se lee APARTE,
   con `.catch`: en una base que todavía no tiene esa tabla —el servidor local
   contra producción, antes del deploy— la lista de consultas tiene que seguir
   andando, sólo que sin seguimiento. */
async function seguimientosDe(leadIds: string[]): Promise<Map<string, FilaSeguimiento>> {
  if (!leadIds.length) return new Map();
  const filas = await prisma.seguimientoConsulta.findMany({ where: { leadId: { in: leadIds } } }).catch(() => [] as FilaSeguimiento[]);
  return new Map(filas.map((f) => [f.leadId, f]));
}

const primeraFoto = (raw: string | null) => {
  try {
    const f = (JSON.parse(raw || "[]") as (string | { url?: string })[])[0];
    const url = typeof f === "string" ? f : f?.url;
    return typeof url === "string" ? url : null;
  } catch { return null; }
};

export async function consultasDelPanel(storeId: string, { status, page = 1 }: { status?: string; page?: number }) {
  const where = { storeId, ...(status ? { status } : {}) };
  const [filas, total, tienda] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { affiliate: { select: { id: true, user: { select: { name: true, email: true } } } } },
    }),
    prisma.lead.count({ where }),
    prisma.store.findUnique({ where: { id: storeId }, select: { storeConfig: true } }),
  ]);
  const principal = monedaDeTienda(tienda?.storeConfig);

  // El vehículo de cada una: la consulta guarda el id, sin relación en la base.
  const ids = [...new Set(filas.map((l) => l.productId).filter((x): x is string => !!x))];
  const productos = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, storeId, deletedAt: null },
        select: { id: true, images: true, vehicleStatus: true, isActive: true, attributes: true },
      })
    : [];
  const porId = new Map(productos.map((p) => [p.id, p]));
  const seguimientos = await seguimientosDe(filas.map((l) => l.id));

  const consultas: ConsultaPanel[] = filas.map((l) => {
    const p = l.productId ? porId.get(l.productId) : undefined;
    return {
      id: l.id,
      productId: l.productId,
      productName: l.productName,
      productPrice: l.productPrice,
      moneda: p ? monedaDe(p, principal) : principal,
      customerName: l.customerName,
      customerPhone: l.customerPhone,
      customerMessage: l.customerMessage,
      status: l.status,
      commissionAmount: l.commissionAmount,
      commissionRate: l.commissionRate,
      createdAt: l.createdAt.toISOString(),
      affiliate: l.affiliate ? { id: l.affiliate.id, userName: l.affiliate.user.name, userEmail: l.affiliate.user.email } : null,
      vehiculo: p ? { imagen: primeraFoto(p.images), estado: p.vehicleStatus, activo: p.isActive } : null,
      seguimiento: seguimientoPlano(seguimientos.get(l.id)),
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

/* ── La agenda de la concesionaria (06/10/26) ───────────────────────────────
   Lo que hay que hacer, arriba de la lista de Consultas y en el resumen de las
   9 de la mañana: las visitas de los próximos 7 días, a quién llamar (lo de
   hoy y lo que quedó atrasado) y las consultas con teléfono que nadie tocó en
   más de `HORAS_DEMORA` horas. Sólo consultas abiertas: una vendida o
   descartada ya no tiene nada pendiente. Con `.catch` por lo mismo que arriba. */

export type ItemAgenda = { leadId: string; nombre: string; telefono: string | null; vehiculo: string; cuando: string; tipo?: string | null; nota?: string | null };

export async function agendaDeConsultas(storeId: string, ahora = new Date()) {
  const hoy = diaAR(ahora);
  const enUnaSemana = diaAR(ahora, 7).hasta;
  const abierta = { status: "PENDING" };
  const [visitas, llamar, sinResponder] = await Promise.all([
    prisma.seguimientoConsulta.findMany({
      where: { storeId, visitaEl: { gte: hoy.desde, lte: enUnaSemana }, lead: abierta },
      orderBy: { visitaEl: "asc" }, take: 30,
      include: { lead: { select: { customerName: true, customerPhone: true, productName: true } } },
    }).catch(() => []),
    prisma.seguimientoConsulta.findMany({
      where: { storeId, recordarEl: { lte: hoy.hasta }, lead: abierta },
      orderBy: { recordarEl: "asc" }, take: 30,
      include: { lead: { select: { customerName: true, customerPhone: true, productName: true } } },
    }).catch(() => []),
    prisma.lead.findMany({
      where: { storeId, ...abierta, customerPhone: { not: null }, createdAt: { lt: new Date(ahora.getTime() - HORAS_DEMORA * 3600_000) },
        OR: [{ seguimiento: { is: null } }, { seguimiento: { is: { etapa: null } } }] },
      orderBy: { createdAt: "asc" }, take: 30,
      select: { id: true, customerName: true, customerPhone: true, productName: true, createdAt: true },
    }).catch(() => []),
  ]);
  const item = (s: (typeof visitas)[number], cuando: Date): ItemAgenda => ({
    leadId: s.leadId, nombre: s.lead.customerName?.trim() || "Sin nombre", telefono: s.lead.customerPhone,
    vehiculo: s.lead.productName, cuando: cuando.toISOString(), tipo: s.visitaTipo, nota: s.nota,
  });
  return {
    visitas: visitas.map((s) => item(s, s.visitaEl!)),
    llamar: llamar.map((s) => item(s, s.recordarEl!)),
    sinResponder: sinResponder.map((l): ItemAgenda => ({
      leadId: l.id, nombre: l.customerName?.trim() || "Sin nombre", telefono: l.customerPhone, vehiculo: l.productName, cuando: l.createdAt.toISOString(),
    })),
  };
}

export type AgendaDeConsultas = Awaited<ReturnType<typeof agendaDeConsultas>>;
