import { prisma } from "@/lib/prisma";
import { monedaDe, type Moneda } from "@/lib/monedaVehiculo";
import { numerosDeUnidad, estancado, DIA_MS, type NumerosDeUnidad, type MotivoEstancado } from "@/lib/rentabilidadAutos";

/* Lo que pide la pantalla "Stock y ganancia" (06/10/26). Ver `lib/rentabilidadAutos`.
   Repuestos y accesorios afuera: no son unidades que se compran, se arreglan
   y se venden una por una, y mezclados harían inútil el promedio de días. */

const NO_SON_UNIDADES = ["repuestos", "accesorios"];

export type FilaDeStock = NumerosDeUnidad & {
  id: string;
  nombre: string;
  imagen: string | null;
  estado: "DISPONIBLE" | "RESERVADO" | "OCULTO" | "VENDIDO";
  consultas: number;
  consultas30: number;
  visitas: number;
  estancado: MotivoEstancado;
  soldAt: string | null;
  /** La moneda de este vehículo: su precio, su costo y su ganancia van en ella. */
  moneda: Moneda;
};

const primeraFoto = (raw: string | null) => {
  try {
    const f = (JSON.parse(raw || "[]") as (string | { url?: string })[])[0];
    const url = typeof f === "string" ? f : f?.url;
    return typeof url === "string" ? url : null;
  } catch { return null; }
};

export async function stockDelPanel(storeId: string, ahora = new Date(), principal: Moneda = "ARS") {
  const haceUnAnio = new Date(ahora.getTime() - 365 * DIA_MS);
  const hace30 = new Date(ahora.getTime() - 30 * DIA_MS);
  const [productos, consultas, consultas30] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId, deletedAt: null,
        NOT: { category: { in: NO_SON_UNIDADES } },
        OR: [{ vehicleStatus: { not: "SOLD" } }, { vehicleStatus: null }, { vehicleStatus: "SOLD", soldAt: { gte: haceUnAnio } }],
      },
      select: {
        id: true, name: true, price: true, images: true, createdAt: true, isActive: true, viewCount: true,
        vehicleStatus: true, soldAt: true, soldPrice: true, attributes: true,
        expenses: { select: { concepto: true, monto: true, fecha: true } },
      },
      take: 500,
    }),
    prisma.lead.groupBy({ by: ["productId"], where: { storeId, productId: { not: null } }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["productId"], where: { storeId, productId: { not: null }, createdAt: { gte: hace30 } }, _count: { _all: true } }),
  ]);
  const cuenta = (g: typeof consultas) => new Map(g.map((x) => [x.productId as string, x._count._all]));
  const total = cuenta(consultas);
  const ultimo = cuenta(consultas30);

  const filas: FilaDeStock[] = productos.map((p) => {
    const n = numerosDeUnidad({ price: p.price, createdAt: p.createdAt, gastos: p.expenses, vehicleStatus: p.vehicleStatus, soldAt: p.soldAt, soldPrice: p.soldPrice }, ahora);
    const vendido = p.vehicleStatus === "SOLD";
    const c30 = ultimo.get(p.id) ?? 0;
    return {
      ...n,
      id: p.id, nombre: p.name, imagen: primeraFoto(p.images),
      estado: vendido ? "VENDIDO" : !p.isActive ? "OCULTO" : p.vehicleStatus === "RESERVED" ? "RESERVADO" : "DISPONIBLE",
      consultas: total.get(p.id) ?? 0, consultas30: c30, visitas: p.viewCount,
      estancado: vendido || p.vehicleStatus === "RESERVED" ? null : estancado(n.dias, c30),
      soldAt: p.soldAt?.toISOString() ?? null,
      moneda: monedaDe(p, principal),
    };
  });

  return {
    enStock: filas.filter((f) => f.estado !== "VENDIDO"),
    vendidos: filas.filter((f) => f.estado === "VENDIDO").sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? "")),
  };
}
