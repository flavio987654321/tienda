/**
 * Los números de carritos abandonados, cupones y promociones para la pantalla de
 * Métricas.
 *
 * Está separado de la página por dos motivos: acá adentro hay reglas que se
 * pueden equivocar en silencio —un carrito recuperado también tiene recordatorio
 * enviado, así que contar los dos por separado da más del 100%— y porque el
 * resumen de texto y la exportación van a necesitar exactamente estos mismos
 * números. Si cada uno los calculara por su cuenta, un día el bloque diría una
 * cosa y el CSV otra.
 *
 * Todo lo de acá son funciones puras: reciben filas ya leídas de la base y
 * devuelven los totales. Los chequeos están en `metricas-marketing.check.ts`.
 */

/* ── Carritos abandonados ─────────────────────────────────────────────────── */

export type CarritoCrudo = {
  total: number;
  reminderSentAt: Date | null;
  recoveredAt: Date | null;
};

export type ResumenCarritos = {
  /** Cuántos carritos quedaron abandonados en el período. */
  cantidad: number;
  /** La plata que representaban TODOS ellos, recuperados incluidos. */
  monto: number;
  /** Las tres etapas. Son excluyentes entre sí: suman exactamente `cantidad`. */
  recuperados: { cantidad: number; monto: number };
  contactados: { cantidad: number; monto: number };
  sinContactar: { cantidad: number; monto: number };
  /** Plata que sigue sin volver. */
  montoPerdido: number;
  /** Porcentaje recuperado sobre el total, redondeado. 0 si no hubo carritos. */
  tasaRecuperacion: number;
};

export function resumirCarritos(carritos: CarritoCrudo[]): ResumenCarritos {
  const vacio = { cantidad: 0, monto: 0 };
  const resumen: ResumenCarritos = {
    cantidad: carritos.length,
    monto: 0,
    recuperados: { ...vacio },
    contactados: { ...vacio },
    sinContactar: { ...vacio },
    montoPerdido: 0,
    tasaRecuperacion: 0,
  };

  for (const c of carritos) {
    resumen.monto += c.total;
    // El orden importa y las etapas son EXCLUYENTES: un carrito recuperado casi
    // siempre tiene también el recordatorio enviado. Preguntando por separado
    // "¿tiene recordatorio?" y "¿está recuperado?" el mismo carrito caía en dos
    // grupos y los porcentajes pasaban del 100%.
    if (c.recoveredAt) {
      resumen.recuperados.cantidad++;
      resumen.recuperados.monto += c.total;
    } else if (c.reminderSentAt) {
      resumen.contactados.cantidad++;
      resumen.contactados.monto += c.total;
    } else {
      resumen.sinContactar.cantidad++;
      resumen.sinContactar.monto += c.total;
    }
  }

  resumen.montoPerdido = resumen.monto - resumen.recuperados.monto;
  resumen.tasaRecuperacion = resumen.cantidad > 0
    ? Math.round((resumen.recuperados.cantidad / resumen.cantidad) * 100)
    : 0;

  return resumen;
}

/* ── Cupones ──────────────────────────────────────────────────────────────── */

export type CuponCrudo = {
  id: string;
  code: string;
  label: string | null;
  discountType: string;
  discountValue: number;
  expiresAt: Date | null;
  isActive: boolean;
  /** Con valor = es un premio de la ruleta/raspadita, a nombre de quien lo ganó. */
  winnerEmail: string | null;
};

/**
 * Un pedido confirmado que usó cupón.
 *
 * `descuento` es lo que el cupón le sacó de encima; `total` es lo que el pedido
 * facturó igual. Los dos juntos son la única forma de saber si el cupón sirvió:
 * resignar $12.000 para entrar $180.000 es un buen negocio y resignar $12.000
 * para entrar $20.000 es una sangría, y sin el segundo número los dos casos se
 * ven idénticos.
 */
export type PedidoConCupon = { couponId: string | null; discountAmount: number; total: number };

export type FilaCupon = {
  id: string;
  code: string;
  etiqueta: string;
  usos: number;
  descuento: number;
  /** Lo que facturaron los pedidos donde entró este cupón. */
  facturado: number;
  vencido: boolean;
};

/** Lo que se llevó la ruleta, junto y aparte de los cupones propios. */
export type ResumenRuleta = {
  usos: number;
  descuento: number;
  facturado: number;
};

/** Un cupón vigente que no se usó ni una vez en el período. */
export type CuponSinUsar = { id: string; code: string; etiqueta: string };

export type ResumenCupones = {
  /** Ranking de los cupones PROPIOS que se usaron. Sin los premios de la ruleta. */
  filas: FilaCupon[];
  usosTotales: number;
  descuentoTotal: number;
  facturadoTotal: number;
  /**
   * Los premios de la ruleta canjeados, sumados aparte.
   *
   * Iban mezclados en el mismo ranking, y eso rompía la tarjeta de dos formas:
   * cada ganador genera su propio código de un solo uso, así que una ruleta que
   * anda llena la lista de filas de "1 uso" que empujan afuera a los cupones de
   * verdad; y el total descontado sumaba las dos cosas, así que no había manera
   * de saber cuánto costó la ruleta y cuánto costaron tus cupones.
   */
  ruleta: ResumenRuleta;
  /**
   * Cupones propios vigentes que no se usaron ni una vez.
   *
   * Es la pregunta que la tarjeta no sabía contestar. El ranking sólo muestra lo
   * que se usó, o sea que sólo sabe felicitar: el cupón que no funcionó
   * desaparecía de la pantalla justo cuando había que decidir si apagarlo.
   */
  sinUsar: CuponSinUsar[];
};

/** "20%" o "$5.000", según el tipo. Lo que la dueña configuró, no lo que salió. */
export function etiquetaDescuento(tipo: string, valor: number): string {
  return tipo === "percentage"
    ? `${valor}%`
    : `$${Math.round(valor).toLocaleString("es-AR")}`;
}

export function resumirCupones(
  cupones: CuponCrudo[],
  pedidos: PedidoConCupon[],
  ahora: Date = new Date()
): ResumenCupones {
  // Los usos se cuentan sobre los PEDIDOS del período, no sobre `Coupon.usedCount`
  // —que es histórico y no se puede recortar por fecha—. Así el bloque dice lo
  // mismo que el resto de la pantalla, que también mira el período elegido.
  //
  // Un pedido tiene UN solo cupón (`Order.couponId` es un campo, no una lista),
  // así que acá no hay riesgo de contar la misma plata dos veces. En promociones
  // sí lo hay, y por eso allá la cuenta es distinta.
  const porCupon = new Map<string, { usos: number; descuento: number; facturado: number }>();
  for (const p of pedidos) {
    if (!p.couponId) continue;
    const acum = porCupon.get(p.couponId) ?? { usos: 0, descuento: 0, facturado: 0 };
    acum.usos++;
    acum.descuento += p.discountAmount;
    acum.facturado += p.total;
    porCupon.set(p.couponId, acum);
  }

  const vacio = { usos: 0, descuento: 0, facturado: 0 };
  const ruleta: ResumenRuleta = { ...vacio };
  const usados: FilaCupon[] = [];
  const sinUsar: CuponSinUsar[] = [];

  for (const c of cupones) {
    const uso = porCupon.get(c.id) ?? vacio;
    const vencido = !!c.expiresAt && c.expiresAt < ahora;

    // Premios de la ruleta: van al total de la ruleta y nunca al ranking ni a la
    // lista de "sin usar". Un premio que nadie canjeó no es una campaña tuya que
    // haya fallado — es alguien que no volvió, y eso se mide en la ruleta.
    if (c.winnerEmail) {
      ruleta.usos += uso.usos;
      ruleta.descuento += uso.descuento;
      ruleta.facturado += uso.facturado;
      continue;
    }

    if (uso.usos > 0) {
      usados.push({
        id: c.id,
        code: c.code,
        etiqueta: c.label?.trim() || etiquetaDescuento(c.discountType, c.discountValue),
        usos: uso.usos,
        descuento: uso.descuento,
        facturado: uso.facturado,
        vencido,
      });
      continue;
    }

    // Sin usar, pero sólo si todavía puede usarse. Un cupón apagado o vencido no
    // es una campaña que no funcionó: es una que terminó, y nombrarla sería
    // pedirle a la dueña que revise algo que ya decidió.
    if (c.isActive && !vencido) {
      sinUsar.push({
        id: c.id,
        code: c.code,
        etiqueta: c.label?.trim() || etiquetaDescuento(c.discountType, c.discountValue),
      });
    }
  }

  const filas = usados.sort((a, b) => b.usos - a.usos || b.descuento - a.descuento);

  return {
    filas,
    usosTotales: filas.reduce((s, f) => s + f.usos, 0),
    descuentoTotal: filas.reduce((s, f) => s + f.descuento, 0),
    facturadoTotal: filas.reduce((s, f) => s + f.facturado, 0),
    ruleta,
    sinUsar: sinUsar.sort((a, b) => a.code.localeCompare(b.code, "es")),
  };
}

/* ── Promociones ──────────────────────────────────────────────────────────── */

export type PromoAplicada = { name: string | null; label: string; type: string; savings: number };

export type FilaPromo = {
  clave: string;
  etiqueta: string;
  pedidos: number;
  ahorro: number;
  /**
   * Lo que facturaron los pedidos donde entró esta promo.
   *
   * OJO: un pedido con dos promas suma su total ENTERO en las dos filas, igual
   * que ya pasaba con la columna `pedidos`. Es lo correcto fila por fila —"los
   * pedidos donde entró el 3x2 facturaron $X"— pero por eso la columna no se
   * puede sumar. El total de verdad es `facturadoTotal`, que se cuenta por
   * pedido y no por fila.
   */
  facturado: number;
};

export type ResumenPromos = {
  filas: FilaPromo[];
  /** Pedidos que tuvieron AL MENOS una promo. No es la suma de la columna. */
  pedidosConPromo: number;
  ahorroTotal: number;
  /** Lo que facturaron esos pedidos. Contado por pedido: no es la suma de la columna. */
  facturadoTotal: number;
  /**
   * Promos activas que no se aplicaron ni una vez en el período.
   *
   * Sale de comparar los nombres de las promos vivas contra las que aparecen en
   * los pedidos. Como el nombre en el pedido es una foto congelada del momento
   * de la venta, una promo que se renombró después va a figurar acá aunque haya
   * funcionado. Es un falso positivo barato: te manda a mirar una promo que
   * anda bien. El error caro sería el contrario —callar una que no funcionó— y
   * ese no puede pasar.
   */
  sinUsar: string[];
};

/**
 * Agrupa las promos congeladas en los pedidos.
 *
 * Ojo con `pedidosConPromo`: un pedido puede llevar dos promos a la vez, así que
 * sumar la columna "pedidos" da más que la cantidad real de pedidos. Por eso se
 * cuenta aparte, sobre pedidos y no sobre filas.
 */
export function resumirPromos(
  pedidos: { applied: PromoAplicada[]; freeShipping: PromoAplicada | null; total: number }[],
  /** Nombres de las promos vivas hoy, para saber cuáles no se aplicaron nunca. */
  activas: string[] = []
): ResumenPromos {
  const porPromo = new Map<string, FilaPromo>();
  let pedidosConPromo = 0;
  let ahorroTotal = 0;
  let facturadoTotal = 0;

  for (const pedido of pedidos) {
    const todas = [...pedido.applied, ...(pedido.freeShipping ? [pedido.freeShipping] : [])];
    if (todas.length === 0) continue;
    pedidosConPromo++;
    // Por PEDIDO, no por fila: abajo el total del pedido se suma en cada promo que
    // le entró, así que sumar la columna contaría la misma plata dos veces.
    facturadoTotal += pedido.total;

    // Dentro de UN pedido, la misma promo no puede contarse dos veces como si
    // fueran dos pedidos distintos: se junta primero por promo y recién ahí suma.
    const enEstePedido = new Map<string, number>();
    for (const promo of todas) {
      // La clave es el nombre si existe y si no la etiqueta: dos promos distintas
      // pueden mostrar el mismo "20% OFF", y unirlas seria mezclar dos campañas.
      const clave = promo.name?.trim() || promo.label;
      enEstePedido.set(clave, (enEstePedido.get(clave) ?? 0) + promo.savings);
    }

    for (const [clave, ahorro] of enEstePedido) {
      const etiqueta =
        todas.find((p) => (p.name?.trim() || p.label) === clave)?.label || clave;
      const fila = porPromo.get(clave) ?? { clave, etiqueta, pedidos: 0, ahorro: 0, facturado: 0 };
      fila.pedidos++;
      fila.ahorro += ahorro;
      fila.facturado += pedido.total;
      porPromo.set(clave, fila);
      ahorroTotal += ahorro;
    }
  }

  const usadas = new Set(porPromo.keys());

  return {
    filas: [...porPromo.values()].sort((a, b) => b.pedidos - a.pedidos || b.ahorro - a.ahorro),
    pedidosConPromo,
    ahorroTotal,
    facturadoTotal,
    sinUsar: activas
      .map((n) => n.trim())
      .filter((n) => n && !usadas.has(n))
      .sort((a, b) => a.localeCompare(b, "es")),
  };
}
