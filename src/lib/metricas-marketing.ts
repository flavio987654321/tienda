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
};

/** Un pedido confirmado que usó cupón. `discountAmount` es lo que descontó. */
export type PedidoConCupon = { couponId: string | null; discountAmount: number };

export type FilaCupon = {
  id: string;
  code: string;
  etiqueta: string;
  usos: number;
  descuento: number;
  vencido: boolean;
};

export type ResumenCupones = {
  filas: FilaCupon[];
  usosTotales: number;
  descuentoTotal: number;
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
  const porCupon = new Map<string, { usos: number; descuento: number }>();
  for (const p of pedidos) {
    if (!p.couponId) continue;
    const acum = porCupon.get(p.couponId) ?? { usos: 0, descuento: 0 };
    acum.usos++;
    acum.descuento += p.discountAmount;
    porCupon.set(p.couponId, acum);
  }

  const filas: FilaCupon[] = cupones
    .map((c) => {
      const uso = porCupon.get(c.id) ?? { usos: 0, descuento: 0 };
      return {
        id: c.id,
        code: c.code,
        etiqueta: c.label?.trim() || etiquetaDescuento(c.discountType, c.discountValue),
        usos: uso.usos,
        descuento: uso.descuento,
        vencido: !!c.expiresAt && c.expiresAt < ahora,
      };
    })
    // Sin usos en el período no aporta nada al bloque: la lista es para ver cuál
    // funcionó, no un inventario de cupones (para eso está la pantalla de Cupones).
    .filter((f) => f.usos > 0)
    .sort((a, b) => b.usos - a.usos || b.descuento - a.descuento);

  return {
    filas,
    usosTotales: filas.reduce((s, f) => s + f.usos, 0),
    descuentoTotal: filas.reduce((s, f) => s + f.descuento, 0),
  };
}

/* ── Promociones ──────────────────────────────────────────────────────────── */

export type PromoAplicada = { name: string | null; label: string; type: string; savings: number };

export type FilaPromo = {
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
};

/**
 * Agrupa las promos congeladas en los pedidos.
 *
 * Ojo con `pedidosConPromo`: un pedido puede llevar dos promos a la vez, así que
 * sumar la columna "pedidos" da más que la cantidad real de pedidos. Por eso se
 * cuenta aparte, sobre pedidos y no sobre filas.
 */
export function resumirPromos(
  pedidos: { applied: PromoAplicada[]; freeShipping: PromoAplicada | null }[]
): ResumenPromos {
  const porPromo = new Map<string, FilaPromo>();
  let pedidosConPromo = 0;
  let ahorroTotal = 0;

  for (const pedido of pedidos) {
    const todas = [...pedido.applied, ...(pedido.freeShipping ? [pedido.freeShipping] : [])];
    if (todas.length === 0) continue;
    pedidosConPromo++;

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
      const fila = porPromo.get(clave) ?? { clave, etiqueta, pedidos: 0, ahorro: 0 };
      fila.pedidos++;
      fila.ahorro += ahorro;
      porPromo.set(clave, fila);
      ahorroTotal += ahorro;
    }
  }

  return {
    filas: [...porPromo.values()].sort((a, b) => b.pedidos - a.pedidos || b.ahorro - a.ahorro),
    pedidosConPromo,
    ahorroTotal,
  };
}
