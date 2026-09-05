import { prisma } from "@/lib/prisma";
import { comisionCongelada } from "@/lib/compra-digital";
import { getArgentinaDayKey, inicioDiaArgentino } from "@/lib/fechas-comerciales";

/**
 * Los números del panel de Productos Digitales.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL PANEL TIENE DOS NIVELES PORQUE LA CUENTA TIENE HASTA CINCO NEGOCIOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Una cuenta Pro puede vender un ebook de mecánica y uno de tortas. Un solo
 * número de "ventas" no le dice nada: lo que necesita saber es **cuál de los dos
 * anda**. Por eso hay una vista de todo junto y una por producto, y la de
 * producto es la que importa cuando hay más de uno.
 *
 * ── De dónde sale la plata de cada producto ────────────────────────────────
 *
 * De los ÍTEMS de la orden, no de la orden. Una compra digital trae el producto,
 * sus bonos (en cero) y sus upsells, cada uno como una línea con su precio; la
 * suma de las líneas da exactamente el total de la orden. Así se puede decir qué
 * dejó CADA producto sin repartir un total a ojo.
 *
 * Y los bonos y upsells suman al principal del que cuelgan: son parte de esa
 * venta, no negocios aparte. El que pregunta "¿cuánto me dejó mecánica?" quiere
 * el upsell adentro.
 *
 * ── Por qué se agrupa también por porcentaje de comisión ───────────────────
 *
 * Porque el plan cambia. Alguien que vendió diez veces en Free al 8% y hoy está
 * en Pro vería esas diez recalculadas al 2%: números que nunca existieron. Cada
 * orden guarda el suyo, y acá se agrupa por ese número y se descuenta grupo por
 * grupo. Es exactamente lo que hace la pantalla de Ventas, y por eso los totales
 * de las dos pantallas coinciden.
 *
 * ⚠️ La comisión real se redondea POR ORDEN y acá se redondea por grupo, así que
 * el neto puede diferir en unos pesos del centavo exacto. Es a propósito: lo que
 * no se puede es que el panel y Ventas digan números distintos, y esta es la
 * misma cuenta que hace Ventas.
 */

export type NumerosDelPanel = {
  /** Ventas cobradas. */
  ventas: number;
  bruto: number;
  /** Lo que le quedó después de la comisión. Es el número que la gente busca. */
  neto: number;
  ventasDelMes: number;
  netoDelMes: number;
  /** Compras empezadas que todavía no se pagaron. */
  esperando: number;
  /** Archivos pagos que nadie bajó todavía y que TODAVÍA se pueden bajar. */
  sinBajar: number;
};

export type ProductoDelPanel = {
  id: string;
  nombre: string;
  publicado: boolean;
  precio: number;
  slugDigital: string | null;
  dominioPropio: string | null;
  tieneArchivo: boolean;
  paginaArmada: boolean;
  ventas: number;
  neto: number;
};

export type FotoDelPanel = {
  total: NumerosDelPanel;
  productos: ProductoDelPanel[];
  /** El elegido, o `null` si se está mirando todo junto. */
  elegido: ProductoDelPanel | null;
  numerosDelElegido: NumerosDelPanel | null;
  cobroConectado: boolean;
};

const VACIO: NumerosDelPanel = {
  ventas: 0, bruto: 0, neto: 0, ventasDelMes: 0, netoDelMes: 0, esperando: 0, sinBajar: 0,
};

/** Una línea vendida, agrupada por producto y por el porcentaje de esa orden. */
export type FilaCruda = {
  producto: string;
  tasa: number | null;
  bruto: number;
  lineas: number;
  /* Del mes en curso, para poder sacar los dos números de una sola pasada. */
  brutoMes: number;
  lineasMes: number;
};

export type Cajon = { bruto: number; comision: number; ventas: number };

const cajonVacio = (): Cajon => ({ bruto: 0, comision: 0, ventas: 0 });

/** Suma un grupo a un acumulador, descontando la comisión que le tocó. */
function acumular(destino: Cajon, bruto: number, tasa: number | null, ventas: number) {
  destino.bruto += bruto;
  destino.comision += comisionCongelada(bruto, tasa);
  destino.ventas += ventas;
}

/**
 * Cuánto dejó cada producto principal, con sus bonos y upsells adentro.
 *
 * Pura a propósito: es la cuenta que decide qué número ve la persona al lado del
 * nombre de su producto, y una cuenta de plata tiene que poder probarse sin base.
 *
 * ⚠️ Las VENTAS se cuentan sólo en la línea del principal. Cada orden trae una
 * sola, así que contarlas ahí da órdenes; contando todas las líneas, una compra
 * con dos bonos figuraría como tres ventas.
 *
 * ⚠️ Y una línea de un producto que no está en el mapa se descarta, no se suma a
 * ninguno. Pasa con un producto de otra tienda si alguna vez se colara: es mejor
 * perder una fila que atribuírsela a quien no le corresponde.
 */
export function repartirPorProducto(
  filas: FilaCruda[],
  suPrincipal: Map<string, string>,
): { total: Map<string, Cajon>; mes: Map<string, Cajon> } {
  const total = new Map<string, Cajon>();
  const mes = new Map<string, Cajon>();

  const cajon = (m: Map<string, Cajon>, id: string) => {
    let c = m.get(id);
    if (!c) { c = cajonVacio(); m.set(id, c); }
    return c;
  };

  for (const fila of filas) {
    const principal = suPrincipal.get(fila.producto);
    if (!principal) continue;

    const esPrincipal = principal === fila.producto;
    acumular(cajon(total, principal), fila.bruto, fila.tasa, esPrincipal ? fila.lineas : 0);
    acumular(cajon(mes, principal), fila.brutoMes, fila.tasa, esPrincipal ? fila.lineasMes : 0);
  }

  return { total, mes };
}

/**
 * El total de la cuenta, a partir de las ÓRDENES agrupadas por su porcentaje.
 *
 * ⚠️ De las órdenes y no de los ítems, y es la misma cuenta que hace la pantalla
 * de Ventas. Dos pantallas que muestran la misma plata no pueden decir números
 * distintos, y sumando ítems alcanzaba un producto borrado para separarlas.
 */
export function sumarPorTasa(
  grupos: Array<{ lockedCommissionRate: number | null; _sum: { total: number | null }; _count: { _all: number } }>,
): Cajon {
  const c = cajonVacio();
  for (const g of grupos) acumular(c, g._sum.total ?? 0, g.lockedCommissionRate, g._count._all);
  return c;
}

/**
 * Todo lo que dibuja el panel, en siete consultas y no en una por producto.
 *
 * ⚠️ El `storeId` tiene que venir ya verificado como de esta persona: acá no se
 * comprueba nada. Es una función de datos, no una puerta.
 */
export async function fotoDelPanel(
  storeId: string,
  productoElegido: string | null,
): Promise<FotoDelPanel> {
  const ahora = new Date();
  const primeroDelMes = inicioDiaArgentino(`${getArgentinaDayKey().slice(0, 7)}-01`);

  const [productos, crudas, porTasa, porTasaDelMes, esperando, sinBajar, tienda] = await Promise.all([
    /* ⚠️ TODOS los productos, borrados incluidos. Los hijos hacen falta para
       saber a qué principal suma cada línea, y los borrados también: una venta
       vieja de un producto que ya no está sigue siendo plata que entró. Se
       filtran después, al armar las tarjetas. */
    prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, price: true, isActive: true, rolDigital: true, padreId: true,
        slugDigital: true, dominioPropio: true, archivoPath: true, paginaVenta: true,
        deletedAt: true,
      },
    }),

    prisma.$queryRaw<FilaCruda[]>`
      SELECT oi."productId"                                         AS producto,
             o."lockedCommissionRate"                               AS tasa,
             COALESCE(SUM(oi.price), 0)::float8                     AS bruto,
             COUNT(*)::int                                          AS lineas,
             COALESCE(SUM(oi.price) FILTER (WHERE o."createdAt" >= ${primeroDelMes}), 0)::float8 AS "brutoMes",
             COUNT(*) FILTER (WHERE o."createdAt" >= ${primeroDelMes})::int                      AS "lineasMes"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."storeId" = ${storeId} AND o.status = 'CONFIRMED'
      GROUP BY 1, 2
    `,

    /* ⚠️ El TOTAL sale de las órdenes, no de los ítems, y agrupado por el
       porcentaje de cada una — exactamente la misma cuenta que hace la pantalla
       de Ventas. Es a propósito: dos pantallas que muestran la misma plata no
       pueden decir números distintos, y sumando ítems un producto borrado o un
       ítem huérfano bastaba para separarlas. */
    prisma.order.groupBy({
      by: ["lockedCommissionRate"],
      where: { storeId, status: "CONFIRMED" },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.order.groupBy({
      by: ["lockedCommissionRate"],
      where: { storeId, status: "CONFIRMED", createdAt: { gte: primeroDelMes } },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.order.count({ where: { storeId, status: "PENDING" } }),

    /* Los vencidos no cuentan: ahí ya no hay nada que hacer desde el panel. */
    prisma.digitalDownload.count({
      where: {
        descargas: 0,
        expiresAt: { gt: ahora },
        orderItem: { order: { storeId, status: "CONFIRMED" } },
      },
    }),

    prisma.store.findUnique({ where: { id: storeId }, select: { mpAccessToken: true } }),
  ]);

  /* De cada producto al principal del que cuelga. Un principal se apunta a sí
     mismo, así que la misma tabla sirve para los dos casos. */
  const suPrincipal = new Map<string, string>();
  for (const p of productos) {
    suPrincipal.set(p.id, p.rolDigital === "PRINCIPAL" ? p.id : (p.padreId ?? p.id));
  }

  const totalGeneral = sumarPorTasa(porTasa);
  const totalDelMes = sumarPorTasa(porTasaDelMes);
  const { total: porProducto, mes: porProductoMes } = repartirPorProducto(crudas, suPrincipal);

  const principales = productos.filter((p) => p.rolDigital === "PRINCIPAL" && p.deletedAt === null);

  const enPantalla: ProductoDelPanel[] = principales.map((p) => {
    const c = porProducto.get(p.id);
    return {
      id: p.id,
      nombre: p.name,
      publicado: p.isActive,
      precio: p.price,
      slugDigital: p.slugDigital,
      dominioPropio: p.dominioPropio,
      tieneArchivo: p.archivoPath != null,
      paginaArmada: p.paginaVenta != null,
      ventas: c?.ventas ?? 0,
      neto: c ? c.bruto - c.comision : 0,
    };
  });

  const elegido = productoElegido
    ? enPantalla.find((p) => p.id === productoElegido) ?? null
    : null;

  /* Los pendientes y los sin bajar son de toda la cuenta: partirlos por producto
     pide dos consultas más para dos números que casi siempre son cero. Cuando
     haya alguno se ve en el total, que es donde hay que actuar. */
  const numerosDelElegido: NumerosDelPanel | null = elegido
    ? (() => {
        const c = porProducto.get(elegido.id) ?? { bruto: 0, comision: 0, ventas: 0 };
        const m = porProductoMes.get(elegido.id) ?? { bruto: 0, comision: 0, ventas: 0 };
        return {
          ventas: c.ventas,
          bruto: c.bruto,
          neto: c.bruto - c.comision,
          ventasDelMes: m.ventas,
          netoDelMes: m.bruto - m.comision,
          esperando: 0,
          sinBajar: 0,
        };
      })()
    : null;

  return {
    total: {
      ...VACIO,
      ventas: totalGeneral.ventas,
      bruto: totalGeneral.bruto,
      neto: totalGeneral.bruto - totalGeneral.comision,
      ventasDelMes: totalDelMes.ventas,
      netoDelMes: totalDelMes.bruto - totalDelMes.comision,
      esperando,
      sinBajar,
    },
    productos: enPantalla,
    elegido,
    numerosDelElegido,
    cobroConectado: tienda?.mpAccessToken != null,
  };
}
