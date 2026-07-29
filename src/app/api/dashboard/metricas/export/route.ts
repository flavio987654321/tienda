import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { aggregateProfitability, type ProfitOrderItem } from "@/lib/margin";
import { parseOrderPromoSummary } from "@/lib/email";
import { resumirCarritos, resumirCupones, resumirPromos } from "@/lib/metricas-marketing";
import { armarResumen } from "@/lib/resumen-mes";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import {
  getArgentinaDayKey, diaArgentino, inicioDiaArgentino, sumarDiasCalendario,
} from "@/lib/fechas-comerciales";

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
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

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
  const raw = parseInt(searchParams.get("range") ?? "30", 10);
  const range = isNaN(raw) || raw < 7 ? 30 : Math.min(raw, 90);

  const now = new Date();

  // Las mismas ventanas que la pantalla de Métricas, con los mismos cortes: días
  // ARGENTINOS (en UTC, cada "día" iría de las 21:00 a las 21:00 de acá) y el
  // período anterior recortado al mismo tiempo transcurrido, porque hoy va por la
  // mitad. Si el archivo cortara distinto, exportar el mismo período daría números
  // distintos a los de la pantalla.
  const hoyDia = getArgentinaDayKey();

  const days: { dateStr: string; revenue: number; orders: number; visits: number; cost: number; profit: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    days.push({
      dateStr: sumarDiasCalendario(hoyDia, -i),
      revenue: 0, orders: 0, visits: 0, cost: 0, profit: 0,
    });
  }

  const startDate = inicioDiaArgentino(days[0].dateStr);
  const endDate = inicioDiaArgentino(sumarDiasCalendario(hoyDia, 1));

  const CONFIRMED = ESTADOS_VENTA_CONFIRMADA_LISTA;

  const prevStartDia = sumarDiasCalendario(days[0].dateStr, -range);
  const prevStartDate = inicioDiaArgentino(prevStartDia);
  const prevEndDate = new Date(prevStartDate.getTime() + (now.getTime() - startDate.getTime()));

  // Ver `DIAS_SIN_DESPACHAR` en la pantalla de Métricas: el mismo umbral.
  const sinDespacharDesde = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -5));

  const [
    orders, views, carritosRaw, cuponesRaw, pedidosConCupon, pedidosConPromoRaw,
    revenuePrevAgg, ordersPrevConfirmedCount, viewsPrevAgg, sinDespacharAgg,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: startDate, lt: endDate }, status: { not: "CANCELLED" } },
      select: { total: true, status: true, createdAt: true },
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
    prisma.coupon.findMany({
      where: { storeId: store.id },
      select: { id: true, code: true, label: true, discountType: true, discountValue: true, expiresAt: true },
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id, createdAt: { gte: startDate, lt: endDate },
        status: { in: CONFIRMED }, couponId: { not: null },
      },
      select: { couponId: true, discountAmount: true },
    }),
    prisma.order.findMany({
      where: {
        storeId: store.id, createdAt: { gte: startDate, lt: endDate },
        status: { in: CONFIRMED }, promoSummary: { not: null },
      },
      select: { promoSummary: true },
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
        date: { gte: prevStartDia, lt: days[0].dateStr },
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
  const resumenCupones = resumirCupones(cuponesRaw, pedidosConCupon);
  const resumenPromos = resumirPromos(
    pedidosConPromoRaw.map((o) => {
      const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(o.promoSummary);
      return { applied: appliedPromos, freeShipping: freeShippingPromo };
    })
  );

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
  if (!isAutos) {
    const rawProfitItems = await prisma.orderItem.findMany({
      where: {
        order: { storeId: store.id, status: { in: CONFIRMED }, createdAt: { gte: startDate, lt: endDate } },
      },
      select: {
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
  }

  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);
  const totalVisits = days.reduce((s, d) => s + d.visits, 0);
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

  // ── El resumen en texto ──
  // De la misma función que la pantalla, con los mismos números: si acá se
  // recalculara algo, el archivo y la pantalla podrían decir cosas distintas.
  const pedidosPendientes = orders.filter((o) => o.status === "PENDING");
  const fraccionDiaSinTranscurrir =
    1 - (now.getTime() - inicioDiaArgentino(hoyDia).getTime()) / 86_400_000;
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
    `# Métricas de ${safeName} — últimos ${range} días`,
    `# Exportado el ${new Date().toLocaleDateString("es-AR")}`,
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

    ...(resumenCupones.filas.length > 0 ? [
      `# CUPONES`,
      `Codigo,Descuento,Usos,Monto descontado (ARS),Vencido`,
      ...resumenCupones.filas.map(f =>
        `${csv(f.code)},${csv(f.etiqueta)},${f.usos},${Math.round(f.descuento)},${f.vencido ? "si" : "no"}`),
      `TOTAL,,${resumenCupones.usosTotales},${Math.round(resumenCupones.descuentoTotal)},`,
      ``,
    ] : []),

    ...(resumenPromos.filas.length > 0 ? [
      `# PROMOCIONES`,
      `Promocion,Pedidos,Monto resignado (ARS)`,
      ...resumenPromos.filas.map(f => `${csv(f.etiqueta)},${f.pedidos},${Math.round(f.ahorro)}`),
      // El total de pedidos NO es la suma de la columna: un pedido con dos promos
      // aparece en dos filas. Se aclara para que nadie sume a mano y crea que hay
      // un error en el archivo.
      `# Un pedido con dos promos aparece en dos filas — por eso la columna Pedidos suma mas que el total`,
      `TOTAL,${resumenPromos.pedidosConPromo} pedidos con promo,${Math.round(resumenPromos.ahorroTotal)}`,
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
