/**
 * La cuenta de una compra de producto digital.
 *
 * ── Por qué esto vive acá y no adentro de la ruta ───────────────────────────
 *
 * Porque es la única parte del cobro que se puede probar sin Mercado Pago. La
 * ruta pide sesión, pega en la base, descifra un token y sale a internet; nada
 * de eso entra en un chequeo. Estas funciones son números para adentro y números
 * para afuera, así que se prueban solas — y son justo las que, si se equivocan,
 * cobran de más o de menos.
 *
 * ── La regla de oro de este archivo ─────────────────────────────────────────
 *
 * **Ningún precio llega del navegador.** Lo que manda el comprador son
 * identificadores; los precios los busca el servidor en la base. Es la
 * diferencia entre "elegí este producto" y "este producto sale $1".
 */

import { COMISION_DIGITAL } from "./planLimits";
import type { TierDigital } from "./planes-digitales";

/**
 * Un importe usable: finito y mayor que cero. Cualquier otra cosa vale 0.
 *
 * ⚠️ Lo destapó su propio chequeo (COM-E). El filtro era `n > 0`, y `Infinity > 0`
 * da `true`: un precio infinito pasaba entero y salía una **comisión infinita**
 * rumbo a Mercado Pago. Y no es un caso de laboratorio — `price` es un `Float` y
 * una columna de doble precisión de Postgres puede guardar `Infinity` y `NaN`.
 *
 * Está en una sola función a propósito: son tres lugares los que tocan importes
 * y con la comprobación repetida alcanzaba con olvidarla en uno.
 */
function pesos(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/** Lo mínimo que hace falta saber de un producto para cobrarlo. */
export type ItemDeCompra = {
  id: string;
  name: string;
  price: number;
  rolDigital: string | null;
};

/**
 * Cuántos upsells puede sumar una compra.
 *
 * El tope real es el del plan de quien vende (`TOPES_DIGITALES`), y la ruta lo
 * aplica mirando qué upsells son hijos de ese producto. Éste es el techo
 * absoluto, contra un pedido que mande mil identificadores para hacernos leer
 * mil productos: se corta antes de tocar la base.
 */
export const MAX_UPSELLS_POR_COMPRA = 10;

/**
 * Lo que se cobra.
 *
 * El principal más los upsells elegidos. Los bonos suman CERO —van incluidos, es
 * su definición— pero igual viajan como ítems de la orden: ver `armarItems`.
 */
export function totalDeLaCompra(principal: ItemDeCompra, upsells: ItemDeCompra[]): number {
  return upsells.reduce((suma, u) => suma + pesos(u.price), pesos(principal.price));
}

/**
 * La comisión que retiene la plataforma, en pesos enteros.
 *
 * ── Cómo se cobra de verdad ─────────────────────────────────────────────────
 *
 * Este número va como `marketplace_fee` en la preferencia de Mercado Pago, así
 * que **se retiene solo adentro del cobro**: no hay que facturarle nada a nadie
 * ni perseguir a ningún vendedor. Es lo que hace que el plan Free pueda existir
 * sin abono.
 *
 * ── Por qué entra sobre el total y no sobre el principal ────────────────────
 *
 * Porque el upsell también es una venta hecha por la plataforma. Y es
 * consistente con por qué Free tiene un upsell habilitado: sube el ticket, y con
 * él la única comisión que Free paga.
 *
 * `Math.round` y no `floor` ni `ceil`, igual que en el checkout de tiendas: es
 * el mismo redondeo en los dos ecosistemas y no favorece a ninguna de las dos
 * partes por diseño.
 */
export function comisionDeLaVenta(total: number, tier: TierDigital): number {
  const base = pesos(total);
  if (base === 0) return 0;
  const pct = COMISION_DIGITAL[tier];
  const fee = Math.round((base * pct) / 100);
  /* ⚠️ Nunca más que el total. No debería poder pasar con porcentajes de un
     dígito, pero es el número que se le manda a Mercado Pago: una comisión mayor
     que el precio hace que la preferencia falle o —peor— que el vendedor cobre
     negativo. El techo cuesta una línea. */
  return Math.min(fee, base);
}

/**
 * Lo que se cobra por un AGREGADO: una compra que se suma a otra ya pagada.
 *
 * ── Por qué es su propia función ────────────────────────────────────────────
 *
 * Porque un agregado NO lleva el principal ni los bonos: la persona ya los pagó
 * y ya los tiene. Meterlos otra vez le cobraría el ebook dos veces, que es el
 * peor error posible en la pantalla que aparece justo después de pagar.
 *
 * Se escribe aparte en vez de meterle una bandera a `totalDeLaCompra`, porque
 * una bandera que decide si se cobra o no el producto principal es una línea de
 * la que hay que acordarse en todos lados. Dos funciones con nombres distintos
 * no se confunden.
 */
export function totalDelAgregado(upsells: ItemDeCompra[]): number {
  return upsells.reduce((suma, u) => suma + pesos(u.price), 0);
}

/** Las líneas de un agregado: sólo los upsells, sin principal y sin bonos. */
export function itemsDelAgregado(
  upsells: ItemDeCompra[],
): Array<{ productId: string; price: number; quantity: number }> {
  return upsells.map((u) => ({ productId: u.id, price: pesos(u.price), quantity: 1 }));
}

/**
 * Las líneas de la orden.
 *
 * ⚠️ **Una línea por cosa entregable, incluidos los bonos a precio cero.** No es
 * decorativo: el permiso de descarga (`DigitalDownload`) cuelga de `OrderItem`,
 * uno por línea. Un bono sin su línea no tiene de dónde colgar su permiso, así
 * que se cobraría la compra y ese bono no se entregaría nunca.
 *
 * Y esto es lo contrario de lo que se le manda a Mercado Pago, que va SIEMPRE
 * como un solo ítem con el total exacto. Son dos cosas distintas a propósito:
 * acá se registra qué se llevó la persona, allá cuánto se le cobra. Reconstruir
 * el total sumando líneas ya cobró un peso de más una vez en el otro ecosistema
 * (ver el comentario largo en `api/mp/checkout`).
 */
export function armarItems(
  principal: ItemDeCompra,
  bonos: ItemDeCompra[],
  upsells: ItemDeCompra[],
): Array<{ productId: string; price: number; quantity: number }> {
  return [
    { productId: principal.id, price: pesos(principal.price), quantity: 1 },
    ...bonos.map((b) => ({ productId: b.id, price: 0, quantity: 1 })),
    ...upsells.map((u) => ({ productId: u.id, price: pesos(u.price), quantity: 1 })),
  ];
}

/**
 * Qué upsells de los pedidos son de verdad comprables.
 *
 * ── Lo que esto impide ──────────────────────────────────────────────────────
 *
 * El navegador manda identificadores. Sin este filtro, alguien puede mandar el
 * id de un producto **de otro embudo o de otro vendedor** y agregarlo a su
 * compra: entraría a la orden, generaría su permiso de descarga y se llevaría un
 * ebook ajeno por el precio que quisiera el suyo. Por eso no alcanza con que el
 * producto exista: tiene que ser **hijo de este producto**, y además un UPSELL.
 *
 * Los repetidos se descartan: mandar el mismo id diez veces no compra diez
 * copias de un PDF, que además no significaría nada.
 */
export function upsellsQueValen(
  pedidos: unknown,
  hijosDelProducto: Array<ItemDeCompra & { padreId: string | null }>,
  productoId: string,
): ItemDeCompra[] {
  if (!Array.isArray(pedidos)) return [];
  const vistos = new Set<string>();
  const salida: ItemDeCompra[] = [];

  for (const id of pedidos.slice(0, MAX_UPSELLS_POR_COMPRA)) {
    if (typeof id !== "string" || vistos.has(id)) continue;
    const hijo = hijosDelProducto.find((h) => h.id === id);
    if (!hijo) continue;
    if (hijo.rolDigital !== "UPSELL") continue;
    if (hijo.padreId !== productoId) continue;
    /* Un upsell a precio cero es un error de carga, no un regalo: para eso está
       el bono. Cobrarlo a cero ensucia la orden sin darle nada a nadie. */
    if (pesos(hijo.price) === 0) continue;
    vistos.add(id);
    salida.push({ id: hijo.id, name: hijo.name, price: hijo.price, rolDigital: hijo.rolDigital });
  }
  return salida;
}
