/**
 * Clientes nuevos contra clientes que vuelven.
 *
 * Para una tienda chica es *la* métrica, y el panel no la tenía: venderle a
 * alguien que ya te compró cuesta una fracción de lo que cuesta conseguir a
 * alguien nuevo. Una tienda que factura lo mismo todos los meses pero siempre
 * con gente distinta está corriendo para quedarse en el mismo lugar, y desde
 * afuera —mirando sólo el total— se ve idéntica a una que está construyendo
 * clientela.
 *
 * Todo son funciones puras. Los chequeos están en `clientes.check.ts`.
 *
 * ── Quién es quién ───────────────────────────────────────────────────────────
 * La identidad sale de `Order.buyerId`, y eso funciona porque el checkout busca
 * el usuario por email antes de crear uno: la misma dirección siempre cae en la
 * misma persona, compre logueada o como invitada.
 *
 * El límite es el que se ve venir: alguien que compra con un mail y vuelve con
 * otro entra como nuevo. No hay forma de saberlo sin pedirle que se registre, y
 * pedirle que se registre cuesta ventas. La pantalla lo dice.
 *
 * ── Nuevo o que vuelve: se clasifica la PERSONA, no el pedido ────────────────
 * Alguien cuya primera compra cayó adentro del período es nuevo, y TODO lo que
 * gastó en el período cuenta como plata de cliente nuevo —incluso si compró tres
 * veces—. Al revés, quien ya te había comprado antes del período es de los que
 * vuelven, aunque acá haya comprado una sola vez.
 *
 * Así los dos grupos no se pisan y la plata suma exacta. Clasificando pedido por
 * pedido, una misma persona caería en los dos lados y "cuántos clientes nuevos
 * tuve" dejaría de tener respuesta.
 */

/** Un pedido confirmado del período, con lo mínimo para clasificarlo. */
export type PedidoDeCliente = {
  buyerId: string;
  total: number;
  /**
   * `true` si la primera compra confirmada de esa persona EN ESTA TIENDA cayó
   * dentro del período. Se resuelve con una query aparte, no acá: esta función
   * es pura y no sabe de fechas.
   */
  primeraCompraEnElPeriodo: boolean;
};

export type GrupoClientes = {
  /** Personas distintas. */
  personas: number;
  pedidos: number;
  facturado: number;
  /** Facturado / pedidos. 0 si no hubo pedidos. */
  ticket: number;
};

export type ResumenClientes = {
  nuevos: GrupoClientes;
  vuelven: GrupoClientes;
  /**
   * Cuánto más gasta por pedido el que vuelve, en porcentaje. Negativo si gasta
   * menos. `null` cuando falta muestra de un lado: comparar el ticket de veinte
   * pedidos contra el de uno no compara nada.
   */
  diferenciaTicketPct: number | null;
  /**
   * Qué porción de lo facturado vino de gente que ya te había comprado. `null`
   * si no hubo facturación.
   */
  pctFacturadoDeVuelven: number | null;
};

/**
 * Cuántos pedidos tiene que tener cada grupo para comparar los tickets.
 *
 * Con un solo pedido de un lado, el "ticket promedio" de ese grupo es el monto
 * de ese pedido: cualquier compra grande o chica da vuelta la conclusión entera.
 */
export const MINIMO_POR_GRUPO = 3;

/**
 * Cuánto tienen que separarse los dos tickets para decir algo.
 *
 * Abajo de esto son iguales, y anunciar que los que vuelven gastan "un 4% más"
 * es presentar ruido como si fuera un hallazgo.
 */
export const DIFERENCIA_MINIMA_PCT = 10;

export function resumirClientes(pedidos: PedidoDeCliente[]): ResumenClientes {
  const armar = (lista: PedidoDeCliente[]): GrupoClientes => {
    const facturado = lista.reduce((s, p) => s + p.total, 0);
    return {
      personas: new Set(lista.map((p) => p.buyerId)).size,
      pedidos: lista.length,
      facturado,
      ticket: lista.length > 0 ? facturado / lista.length : 0,
    };
  };

  const nuevos = armar(pedidos.filter((p) => p.primeraCompraEnElPeriodo));
  const vuelven = armar(pedidos.filter((p) => !p.primeraCompraEnElPeriodo));

  let diferenciaTicketPct: number | null = null;
  if (
    nuevos.pedidos >= MINIMO_POR_GRUPO &&
    vuelven.pedidos >= MINIMO_POR_GRUPO &&
    nuevos.ticket > 0
  ) {
    const bruta = Math.round(((vuelven.ticket - nuevos.ticket) / nuevos.ticket) * 100);
    // Se devuelve `null` y no el número chico: un 4% presentado como dato es
    // peor que no decir nada, porque invita a decidir sobre ruido.
    diferenciaTicketPct = Math.abs(bruta) >= DIFERENCIA_MINIMA_PCT ? bruta : null;
  }

  const facturadoTotal = nuevos.facturado + vuelven.facturado;

  return {
    nuevos,
    vuelven,
    diferenciaTicketPct,
    pctFacturadoDeVuelven:
      facturadoTotal > 0 ? Math.round((vuelven.facturado / facturadoTotal) * 100) : null,
  };
}
