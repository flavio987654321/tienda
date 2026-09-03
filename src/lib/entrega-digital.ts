import { randomBytes } from "crypto";

/**
 * El permiso de descarga: qué se le habilita a alguien cuando el pago se acredita.
 *
 * ── Qué es y qué NO es ──────────────────────────────────────────────────────
 *
 * Es una llave, no una dirección. El token no dice dónde está el archivo: se
 * canjea en una ruta que —después de mirar el vencimiento y el tope— le pide a
 * Supabase un enlace firmado de vida corta. Por eso el mail nunca lleva algo que
 * sirva solo, y por eso un permiso se puede vencer o agotar sin tener que mover
 * el archivo de lugar.
 *
 * El diseño completo está en el modelo `DigitalDownload`, que existe en la base
 * desde el 29/08/26 y estuvo sin uso hasta hoy, esperando este momento.
 */

/**
 * Cuánto dura el permiso.
 *
 * ⚠️ Lo prometen la página de venta y el mail de entrega, así que el número vive
 * acá y no escrito a mano en cada lugar: con la cuenta repetida alcanza con
 * tocar una para que las otras sigan prometiendo otra cosa.
 *
 * Y es el mismo plazo que la cuarentena del barrido (`DIAS_CUARENTENA_ARCHIVO`),
 * a propósito: pasado el permiso más largo posible, el archivo de un producto
 * borrado ya no le sirve a nadie.
 */
export const DIAS_DEL_PERMISO = 30;

/**
 * Cuántas veces se puede bajar.
 *
 * Corta el reenvío del enlace a diez amigos sin castigar a quien lo baja en el
 * celular y en la computadora, o a quien lo perdió y vuelve a buscarlo.
 */
export const MAX_DESCARGAS = 5;

/**
 * La llave que viaja en el mail.
 *
 * ⚠️ 32 bytes al azar del generador criptográfico, NUNCA un cuid ni
 * `Math.random()`. Un cuid lleva la marca de tiempo adentro, así que a partir de
 * uno se adivinan los cercanos; y el generador de JavaScript es predecible con
 * unas pocas salidas del mismo proceso. Acá este token es **lo único** que
 * separa a un comprador del archivo de otro.
 */
export function nuevoTokenDeDescarga(): string {
  return randomBytes(32).toString("base64url");
}

/** Cuándo vence un permiso emitido en `desde`. */
export function vencimientoDelPermiso(desde: Date): Date {
  return new Date(desde.getTime() + DIAS_DEL_PERMISO * 24 * 60 * 60 * 1000);
}

/**
 * Qué líneas de una orden merecen permiso de descarga.
 *
 * ⚠️ Sólo las que tienen archivo. Una línea sin `archivoPath` no tiene nada que
 * entregar, y emitirle un permiso sería peor que no emitirlo: el mail mostraría
 * un enlace que al tocarlo no baja nada, y quien pagó pensaría que le estafaron.
 * No debería pasar —`loQueFalta` no deja publicar sin archivo— pero entre
 * publicar y comprar pueden pasar días.
 */
export function lineasEntregables<T extends { id: string; product: { archivoPath: string | null } }>(
  items: T[],
): T[] {
  return items.filter((i) => !!i.product.archivoPath);
}

/** Lo mínimo que hay que saber de una línea para armarle el mail. */
type LineaParaElMail = {
  id: string;
  product: {
    id: string;
    name: string;
    archivoPath: string | null;
    archivoNombre: string | null;
    rolDigital: string | null;
    padreId: string | null;
  };
};

/**
 * Cómo se arma el mail de entrega de una orden: qué archivos lleva, cómo se
 * llama la compra y a qué pantalla de gracias apunta el botón.
 *
 * ── Por qué esto es una función y no está escrito en el webhook ─────────────
 *
 * Porque ahora lo arman DOS lugares: el aviso de pago, que lo manda solo, y el
 * botón de "reenviar" de la pantalla de Ventas, que lo manda a pedido. Con la
 * cuenta escrita en los dos, alcanza con tocar uno para que el mail automático y
 * el reenviado digan cosas distintas — y el segundo se prueba mucho menos.
 *
 * ⚠️ EN UN AGREGADO —la oferta de después de pagar— LA ORDEN NO TIENE PRINCIPAL:
 * lleva sólo el upsell, porque el principal se pagó en la orden anterior. Buscar
 * el principal y salir si no está dejaba esas compras sin mail. Se toma el
 * principal si está, y si no, el padre del upsell: la pantalla de gracias cuelga
 * del producto del embudo, no de la línea.
 */
export function armadoDelMail<T extends LineaParaElMail>(items: T[]) {
  const entregables = lineasEntregables(items);
  const laPrincipal = items.find((i) => i.product.rolDigital === "PRINCIPAL")?.product;
  const primera = items[0]?.product;
  return {
    entregables,
    /* A qué producto del embudo pertenece la pantalla de gracias. */
    idDeLaPagina: laPrincipal?.id ?? primera?.padreId ?? null,
    /* Y el título dice lo que se compró en ESTA orden: en un agregado, el upsell. */
    comoSeLlama: laPrincipal?.name ?? primera?.name ?? "tu compra",
    archivos: entregables.map((l) => ({
      nombre: l.product.archivoNombre ?? l.product.name,
      esBono: l.product.rolDigital === "BONO",
    })),
  };
}
