import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { getArgentinaDayKey, inicioDiaArgentino, sumarDiasCalendario } from "@/lib/fechas-comerciales";
import { MADURACION_MS, PAGO_EN_CAMINO } from "@/lib/carritos-digitales";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";

/**
 * Lo que Sasha sabe de ESTA cuenta, por producto.
 *
 * No usa `cargarEstadisticas`: aquélla trae hasta 20.000 órdenes para dibujar
 * gráficos, y acá hacen falta cinco números. Son consultas agregadas —la base
 * cuenta, no nosotros— y el resultado entero entra en menos de 300 tokens,
 * que es lo que se paga en CADA mensaje.
 *
 * ⚠️ LO QUE VE SASHA ES LO QUE VE EL PANEL DE ESE PLAN, ni un número más.
 * `puedeVer` es la misma función que apaga los bloques en la pantalla de
 * Estadísticas: si Sasha contara las visitas en Free, sería una puerta
 * trasera a lo que ese plan no compró. Ver `estadisticas-digitales`.
 */

/** Cuántos días mira el resumen. Un mes es lo que la gente tiene en la cabeza. */
export const DIAS_DEL_RESUMEN = 30;

export type ProductoEnSnapshot = {
  nombre: string;
  publicado: boolean;
  precio: number;
  bonos: number;
  upsells: number;
  tienePagina: boolean;
  tieneArchivo: boolean;
  ventas: number;
  /** Sólo Starter y Pro: en Free el panel tampoco las muestra. */
  visitas: number | null;
  conversion: number | null;
  opinionesPublicadas: number;
};

export type SnapshotDigital = {
  tier: TierDigital;
  nombre: string | null;
  mpConectado: boolean;
  /** Si no creó su espacio todavía: no guardó ningún producto. */
  sinEspacio: boolean;
  /** La dueña cerró la cuenta: no hay panel, y no se le gasta un mensaje. */
  cerrada: boolean;
  productos: ProductoEnSnapshot[];
  ventasDelMes: number;
  netoDelMes: number;
  clientes: number;
  repiten: number;
  sinBajar: number;
  carritos: number;
  opinionesPendientes: number;
};

export async function snapshotDigital(userId: string, tier: TierDigital): Promise<SnapshotDigital> {
  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    /* `closedAt`: una cuenta que la dueña cerró no tiene panel, pero la ruta
       sí sigue existiendo. Cerrar NO cancela la suscripción —el plan queda
       en Pro—, así que sin este dato una cuenta cerrada podría seguir
       gastando mensajes. Viaja acá para no pagar una consulta más. */
    select: { id: true, name: true, mpConnectedAt: true, closedAt: true },
  });
  if (!store) {
    return {
      tier, nombre: null, mpConectado: false, sinEspacio: true, cerrada: false, productos: [],
      ventasDelMes: 0, netoDelMes: 0, clientes: 0, repiten: 0, sinBajar: 0,
      carritos: 0, opinionesPendientes: 0,
    };
  }

  const hoy = getArgentinaDayKey();
  const desdeDia = sumarDiasCalendario(hoy, -(DIAS_DEL_RESUMEN - 1));
  const desde = inicioDiaArgentino(desdeDia);
  const ahora = new Date();
  const maduros = new Date(ahora.getTime() - MADURACION_MS);
  const verVisitas = puedeVer(tier, "visitas");

  const productos = await prisma.product.findMany({
    where: { storeId: store.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    select: { id: true, name: true, price: true, isActive: true, rolDigital: true, padreId: true, paginaVenta: true, archivoPath: true },
  });
  const principales = productos.filter((p) => p.rolDigital === "PRINCIPAL");
  const ids = principales.map((p) => p.id);

  /* Todo junto: son contadores, no listas. Lo que el plan no ve ni se
     pregunta —una consulta que no se hace no se puede filtrar mal—. */
  const [vendidos, delMes, porPersona, sinBajarFilas, carritos, opinionesPendientes, opinionesPorProducto, visitasFilas] = await Promise.all([
    /* Cuántas unidades se vendieron de cada principal en el mes. Las líneas
       de bonos y upsells cuelgan del principal por `padreId`, pero acá se
       cuenta la venta de cada ficha tal cual se vendió. */
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: ids }, order: { storeId: store.id, status: "CONFIRMED", createdAt: { gte: desde } } },
      _sum: { quantity: true },
      orderBy: { productId: "asc" },
      take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: "CONFIRMED", createdAt: { gte: desde } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    /* Clientes y cuántos repiten, de toda la vida de la cuenta. */
    prisma.order.groupBy({
      by: ["buyerId"],
      where: { storeId: store.id, status: "CONFIRMED" },
      _count: { _all: true },
      orderBy: { buyerId: "asc" },
      take: 5_000,
    }),
    prisma.digitalDownload.findMany({
      where: { descargas: 0, expiresAt: { gt: ahora }, orderItem: { order: { storeId: store.id, status: "CONFIRMED" } } },
      select: { id: true },
      take: 1_000,
    }),
    prisma.order.count({
      where: { storeId: store.id, status: "PENDING", createdAt: { lt: maduros }, payment: { is: { status: { notIn: [...PAGO_EN_CAMINO] } } } },
    }),
    prisma.opinionDigital.count({ where: { storeId: store.id, estado: "PENDIENTE" } }),
    prisma.opinionDigital.groupBy({
      by: ["productId"],
      where: { storeId: store.id, estado: "PUBLICADA" },
      _count: { _all: true },
      orderBy: { productId: "asc" },
      take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    }),
    /* Las visitas sólo si el plan las ve. La tabla puede no existir todavía
       (la migración la aplica el build): sin ella se dice cero, no se cae. */
    verVisitas
      ? prisma.digitalVisita.groupBy({
          by: ["productId"],
          where: { productId: { in: ids }, date: { gte: desdeDia }, paso: "pagina" },
          _sum: { count: true },
          orderBy: { productId: "asc" },
          take: MAX_PRODUCTOS_DIGITALES_CREADOS,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const ventasDe = new Map(vendidos.map((v) => [v.productId, v._sum.quantity ?? 0]));
  const visitasDe = new Map(visitasFilas.map((v) => [v.productId, v._sum.count ?? 0]));
  const opinionesDe = new Map(opinionesPorProducto.map((o) => [o.productId, o._count._all]));
  const hijosDe = (id: string, rol: "BONO" | "UPSELL") => productos.filter((p) => p.padreId === id && p.rolDigital === rol).length;

  const enPantalla: ProductoEnSnapshot[] = principales.map((p) => {
    const ventas = ventasDe.get(p.id) ?? 0;
    const visitas = verVisitas ? (visitasDe.get(p.id) ?? 0) : null;
    return {
      nombre: p.name,
      publicado: p.isActive,
      precio: p.price,
      bonos: hijosDe(p.id, "BONO"),
      upsells: hijosDe(p.id, "UPSELL"),
      tienePagina: !!p.paginaVenta,
      tieneArchivo: !!p.archivoPath,
      ventas,
      visitas,
      conversion: visitas && visitas > 0 ? Math.round((ventas / visitas) * 1000) / 10 : null,
      opinionesPublicadas: opinionesDe.get(p.id) ?? 0,
    };
  });

  return {
    tier,
    nombre: store.name,
    mpConectado: !!store.mpConnectedAt,
    sinEspacio: false,
    cerrada: !!store.closedAt,
    productos: enPantalla,
    ventasDelMes: delMes._count._all,
    netoDelMes: Math.round(delMes._sum.total ?? 0),
    clientes: porPersona.length,
    repiten: porPersona.filter((g) => g._count._all >= 2).length,
    sinBajar: sinBajarFilas.length,
    carritos,
    opinionesPendientes,
  };
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/**
 * El snapshot como texto para el modelo. Corto y sin adornos: cada línea que
 * se agrega acá se paga en cada mensaje de cada cuenta.
 */
export function textoDelSnapshot(s: SnapshotDigital): string {
  if (s.sinEspacio) {
    return `LA CUENTA DE QUIEN TE ESCRIBE\nPlan: ${s.tier}. Todavía no creó ningún producto — está empezando de cero.`;
  }
  const lineas: string[] = [`LA CUENTA DE QUIEN TE ESCRIBE`, `Plan: ${s.tier}. Mercado Pago: ${s.mpConectado ? "conectado" : "SIN CONECTAR (así nadie puede comprarle)"}.`];

  if (s.productos.length === 0) {
    lineas.push("Todavía no cargó ningún producto.");
  } else {
    lineas.push(`Sus productos (últimos ${DIAS_DEL_RESUMEN} días):`);
    for (const p of s.productos) {
      const partes = [
        `- "${p.nombre}" ${pesos(p.precio)}`,
        p.publicado ? "publicado" : "SIN PUBLICAR",
        `${p.ventas} venta${p.ventas === 1 ? "" : "s"}`,
      ];
      if (p.visitas !== null) partes.push(`${p.visitas} visita${p.visitas === 1 ? "" : "s"}${p.conversion !== null ? `, convierte ${p.conversion}%` : ""}`);
      partes.push(`${p.bonos} bono${p.bonos === 1 ? "" : "s"}, ${p.upsells} upsell${p.upsells === 1 ? "" : "s"}`);
      if (!p.tieneArchivo) partes.push("SIN ARCHIVO CARGADO");
      if (!p.tienePagina) partes.push("sin página armada");
      /* "opinión" pierde la tilde en plural: pegarle "es" da "opiniónes". */
      if (p.opinionesPublicadas > 0) partes.push(p.opinionesPublicadas === 1 ? "1 opinión publicada" : `${p.opinionesPublicadas} opiniones publicadas`);
      lineas.push(partes.join(" · "));
    }
  }

  lineas.push(`En el mes: ${s.ventasDelMes} venta${s.ventasDelMes === 1 ? "" : "s"} por ${pesos(s.netoDelMes)}.`);
  lineas.push(`Clientes: ${s.clientes}${s.repiten > 0 ? `, ${s.repiten} compraron más de una vez` : ""}${s.sinBajar > 0 ? `; ${s.sinBajar} todavía no bajaron lo que pagaron` : ""}.`);
  if (s.carritos > 0) lineas.push(`Carritos abandonados sin recuperar: ${s.carritos}.`);
  if (s.opinionesPendientes > 0) lineas.push(`Opiniones esperando que las revise: ${s.opinionesPendientes}.`);
  if (!puedeVer(s.tier, "visitas")) lineas.push(`(Su plan no muestra visitas ni conversión: no tenés esos números, y si pregunta, se los ofrece Starter.)`);
  return lineas.join("\n");
}
