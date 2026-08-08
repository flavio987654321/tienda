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
 *
 * `ganancia` es lo que quedó de verdad: lo facturado menos el costo de los
 * productos y menos el descuento. Es el único de los tres que se puede comparar
 * entre cupones sin pensar — facturar mucho con margen chico puede dejar menos
 * que facturar poco con margen grande. Viene en `null` cuando ningún producto de
 * ese pedido tenía el costo cargado: es "no se sabe", nunca cero.
 */
export type PedidoConCupon = {
  couponId: string | null;
  discountAmount: number;
  total: number;
  ganancia: number | null;
};

/** La parte de plata que comparten las filas de cupones y las de promociones. */
type Plata = {
  /** Lo que facturaron los pedidos donde entró. */
  facturado: number;
  /**
   * Lo que quedó después del costo de los productos y del descuento. `null` = no
   * hay un solo pedido con costo cargado, así que no se puede saber.
   */
  ganancia: number | null;
  /**
   * Pedidos del grupo sin costo cargado. Con esto > 0 la ganancia de arriba se
   * queda corta y hay que decirlo: un número incompleto presentado como completo
   * es peor que no mostrarlo.
   */
  pedidosSinCosto: number;
};

export type FilaCupon = Plata & {
  id: string;
  code: string;
  etiqueta: string;
  usos: number;
  descuento: number;
  vencido: boolean;
};

/** Lo que se llevó la ruleta, junto y aparte de los cupones propios. */
export type ResumenRuleta = Plata & {
  usos: number;
  descuento: number;
};

/** Un cupón vigente que no se usó ni una vez en el período. */
export type CuponSinUsar = { id: string; code: string; etiqueta: string };

export type ResumenCupones = {
  /** Ranking de los cupones PROPIOS que se usaron. Sin los premios de la ruleta. */
  filas: FilaCupon[];
  usosTotales: number;
  descuentoTotal: number;
  facturadoTotal: number;
  /** Suma de las ganancias conocidas del ranking. `null` = ninguna se sabe. */
  gananciaTotal: number | null;
  /** Pedidos con cupón propio sin costo cargado, sobre `usosTotales`. */
  pedidosSinCosto: number;
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
  type Acum = {
    usos: number; descuento: number; facturado: number;
    /** Suma cruda de las ganancias conocidas. */
    ganancia: number;
    /** Cuántos de esos pedidos tenían el costo cargado. 0 → la ganancia es `null`. */
    conCosto: number;
  };
  const nuevoAcum = (): Acum => ({ usos: 0, descuento: 0, facturado: 0, ganancia: 0, conCosto: 0 });

  const porCupon = new Map<string, Acum>();
  for (const p of pedidos) {
    if (!p.couponId) continue;
    const acum = porCupon.get(p.couponId) ?? nuevoAcum();
    acum.usos++;
    acum.descuento += p.discountAmount;
    acum.facturado += p.total;
    // Los pedidos sin costo cargado no suman cero: no suman nada, y se cuentan
    // aparte. Tratar "no sé" como "cero de ganancia" haría que un cupón bueno con
    // los costos a medio cargar apareciera peor que uno malo con todo cargado.
    if (p.ganancia !== null) {
      acum.ganancia += p.ganancia;
      acum.conCosto++;
    }
    porCupon.set(p.couponId, acum);
  }

  const ruletaAcum = nuevoAcum();
  const usados: FilaCupon[] = [];
  const sinUsar: CuponSinUsar[] = [];

  for (const c of cupones) {
    const uso = porCupon.get(c.id);
    const vencido = !!c.expiresAt && c.expiresAt < ahora;

    // Premios de la ruleta: van al total de la ruleta y nunca al ranking ni a la
    // lista de "sin usar". Un premio que nadie canjeó no es una campaña tuya que
    // haya fallado — es alguien que no volvió, y eso se mide en la ruleta.
    if (c.winnerEmail) {
      if (uso) {
        ruletaAcum.usos += uso.usos;
        ruletaAcum.descuento += uso.descuento;
        ruletaAcum.facturado += uso.facturado;
        ruletaAcum.ganancia += uso.ganancia;
        ruletaAcum.conCosto += uso.conCosto;
      }
      continue;
    }

    if (uso && uso.usos > 0) {
      usados.push({
        id: c.id,
        code: c.code,
        etiqueta: c.label?.trim() || etiquetaDescuento(c.discountType, c.discountValue),
        usos: uso.usos,
        descuento: uso.descuento,
        facturado: uso.facturado,
        ganancia: uso.conCosto > 0 ? uso.ganancia : null,
        pedidosSinCosto: uso.usos - uso.conCosto,
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
  const conCostoTotal = filas.reduce((s, f) => s + (f.usos - f.pedidosSinCosto), 0);

  return {
    filas,
    usosTotales: filas.reduce((s, f) => s + f.usos, 0),
    descuentoTotal: filas.reduce((s, f) => s + f.descuento, 0),
    facturadoTotal: filas.reduce((s, f) => s + f.facturado, 0),
    gananciaTotal: conCostoTotal > 0 ? filas.reduce((s, f) => s + (f.ganancia ?? 0), 0) : null,
    pedidosSinCosto: filas.reduce((s, f) => s + f.pedidosSinCosto, 0),
    ruleta: {
      usos: ruletaAcum.usos,
      descuento: ruletaAcum.descuento,
      facturado: ruletaAcum.facturado,
      ganancia: ruletaAcum.conCosto > 0 ? ruletaAcum.ganancia : null,
      pedidosSinCosto: ruletaAcum.usos - ruletaAcum.conCosto,
    },
    sinUsar: sinUsar.sort((a, b) => a.code.localeCompare(b.code, "es")),
  };
}

/* ── ¿El cupón hace que compren más? ──────────────────────────────────────── */

/**
 * Cuántos pedidos hacen falta de CADA lado para animarse a comparar. Con uno o
 * dos, un solo cliente que compró de más da vuelta el resultado y la comparación
 * afirma cualquier cosa. Es el mismo criterio que usa el resumen en texto.
 */
export const MINIMO_PARA_COMPARAR = 3;

export type ComparacionCompra = {
  conCupon: { pedidos: number; promedio: number };
  sinCupon: { pedidos: number; promedio: number };
  /**
   * Cuánto más grande (o más chica) es la compra con cupón, en %. `null` cuando
   * falta base de alguno de los dos lados: ahí no se afirma nada.
   */
  diferenciaPct: number | null;
};

/**
 * Compara el tamaño de la compra con cupón contra sin cupón.
 *
 * Es lo más cerca que se puede estar de responder "¿vendí más GRACIAS al cupón?"
 * sin hacer un experimento. Que un cupón aparezca en pedidos por $180.000 no
 * prueba que esos $180.000 existan gracias a él: buena parte de esa gente quizás
 * compraba igual. Lo que sí se puede ver es si el carrito de quien usa cupón es
 * más grande que el del resto — si lo es, el cupón está empujando; si es más
 * chico, le estás descontando a quien ya iba a comprar.
 *
 * Se mide sobre el SUBTOTAL, no sobre el total del pedido, y antes del
 * descuento. Dos motivos: el total incluye el envío, y justamente los cupones y
 * las promos de envío gratis lo mueven, así que compararía dos cosas distintas;
 * y antes del descuento se mide lo que la persona se llevó, que es la pregunta
 * ("¿compró más?") y no "¿cuánto me quedó?".
 *
 * Por eso mismo NO es el mismo número que el "Ticket promedio" de arriba en la
 * pantalla, que sí va sobre el total. Son dos cuentas distintas y legítimas; lo
 * que no puede pasar es que se llamen igual — de ahí que ésta se llame "compra
 * promedio" y aclare siempre sobre qué se calcula.
 */
export function compararCompra(
  pedidos: { couponId: string | null; subtotal: number }[]
): ComparacionCompra {
  let conN = 0, conSuma = 0, sinN = 0, sinSuma = 0;
  for (const p of pedidos) {
    if (p.couponId) { conN++; conSuma += p.subtotal; }
    else { sinN++; sinSuma += p.subtotal; }
  }

  const conCupon = { pedidos: conN, promedio: conN > 0 ? conSuma / conN : 0 };
  const sinCupon = { pedidos: sinN, promedio: sinN > 0 ? sinSuma / sinN : 0 };

  const hayBase =
    conN >= MINIMO_PARA_COMPARAR && sinN >= MINIMO_PARA_COMPARAR && sinCupon.promedio > 0;

  return {
    conCupon,
    sinCupon,
    diferenciaPct: hayBase
      ? Math.round(((conCupon.promedio - sinCupon.promedio) / sinCupon.promedio) * 100)
      : null,
  };
}

/* ── Promociones ──────────────────────────────────────────────────────────── */

export type PromoAplicada = { name: string | null; label: string; type: string; savings: number };

/**
 * OJO con `facturado` y `ganancia`: un pedido con dos promos suma su plata
 * ENTERA en las dos filas, igual que ya pasaba con la columna `pedidos`. Es lo
 * correcto fila por fila —"los pedidos donde entró el 3x2 facturaron $X"— pero
 * por eso las columnas no se pueden sumar. Los totales de verdad son
 * `facturadoTotal` y `gananciaTotal`, que se cuentan por pedido y no por fila.
 */
export type FilaPromo = Plata & {
  clave: string;
  etiqueta: string;
  pedidos: number;
  ahorro: number;
};

export type ResumenPromos = {
  filas: FilaPromo[];
  /** Pedidos que tuvieron AL MENOS una promo. No es la suma de la columna. */
  pedidosConPromo: number;
  ahorroTotal: number;
  /** Lo que facturaron esos pedidos. Contado por pedido: no es la suma de la columna. */
  facturadoTotal: number;
  /** Lo que quedó después de costos y descuentos. Por pedido, no por fila. */
  gananciaTotal: number | null;
  /** Pedidos con promo sin costo cargado, sobre `pedidosConPromo`. */
  pedidosSinCosto: number;
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
  pedidos: {
    applied: PromoAplicada[];
    freeShipping: PromoAplicada | null;
    total: number;
    ganancia: number | null;
  }[],
  /** Nombres de las promos vivas hoy, para saber cuáles no se aplicaron nunca. */
  activas: string[] = []
): ResumenPromos {
  // `conCosto` se lleva aparte de la fila porque no se muestra: sólo decide si la
  // ganancia es un número o un "no se sabe".
  const porPromo = new Map<string, FilaPromo & { conCosto: number }>();
  let pedidosConPromo = 0;
  let ahorroTotal = 0;
  let facturadoTotal = 0;
  let gananciaTotal = 0;
  let pedidosConCosto = 0;

  for (const pedido of pedidos) {
    const todas = [...pedido.applied, ...(pedido.freeShipping ? [pedido.freeShipping] : [])];
    if (todas.length === 0) continue;
    pedidosConPromo++;
    // Por PEDIDO, no por fila: abajo la plata del pedido se suma en cada promo que
    // le entró, así que sumar la columna contaría la misma plata dos veces.
    facturadoTotal += pedido.total;
    if (pedido.ganancia !== null) {
      gananciaTotal += pedido.ganancia;
      pedidosConCosto++;
    }

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
      const fila = porPromo.get(clave) ?? {
        clave, etiqueta, pedidos: 0, ahorro: 0,
        facturado: 0, ganancia: 0, pedidosSinCosto: 0, conCosto: 0,
      };
      fila.pedidos++;
      fila.ahorro += ahorro;
      fila.facturado += pedido.total;
      if (pedido.ganancia !== null) {
        fila.ganancia = (fila.ganancia ?? 0) + pedido.ganancia;
        fila.conCosto++;
      }
      porPromo.set(clave, fila);
      ahorroTotal += ahorro;
    }
  }

  const usadas = new Set(porPromo.keys());

  return {
    filas: [...porPromo.values()]
      .sort((a, b) => b.pedidos - a.pedidos || b.ahorro - a.ahorro)
      .map(({ conCosto, ...fila }) => ({
        ...fila,
        ganancia: conCosto > 0 ? fila.ganancia : null,
        pedidosSinCosto: fila.pedidos - conCosto,
      })),
    pedidosConPromo,
    ahorroTotal,
    facturadoTotal,
    gananciaTotal: pedidosConCosto > 0 ? gananciaTotal : null,
    pedidosSinCosto: pedidosConPromo - pedidosConCosto,
    sinUsar: activas
      .map((n) => n.trim())
      .filter((n) => n && !usadas.has(n))
      .sort((a, b) => a.localeCompare(b, "es")),
  };
}
