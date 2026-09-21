import type { Prisma } from "@prisma/client";
import { esCodigoDeOferta, leerOfertaSalida } from "@/lib/oferta-salida";
import { esCodigoDeBienvenida, leerBienvenida } from "@/lib/bienvenida";
import { leerTokenDeOferta, leerTokenDeBienvenida } from "@/lib/oferta-salida-firma";
import { MAX_CUPONES_POR_CUENTA } from "@/lib/cupones-digitales";

/**
 * Los cupones que no escribe nadie: el de la oferta de salida (`SALIDA-…`)
 * y el del precio de bienvenida (`BIENVENIDA-…`). Sólo servidor.
 *
 * ── Valen por el plazo, no por el código ────────────────────────────────────
 *
 * Un cupón común vale porque existe y está prendido. Estos dos existen y
 * están prendidos todo el tiempo, y sin embargo sólo aplican para quien
 * tiene un plazo firmado y vivo: el token que el servidor le dio cuando
 * vio la oferta. Sin token, o vencido, el cupón "no existe". Es lo que hace
 * cierto el "vale hasta las 18:23" del cartel y el "reservado por 14:59" de
 * la barra.
 *
 * ── Por qué está acá y no en cada ruta ──────────────────────────────────────
 *
 * Esta regla la aplican DOS rutas: `/api/digitales/cupon` (la pantalla
 * pregunta si aplica, para mostrar el precio) y `/api/digitales/comprar`
 * (la que cobra). Estaba escrita en las dos, igual, y la auditoría del
 * 16/09 ya había encontrado el mismo defecto en otro lado: no que una copia
 * estuviera mal, sino que hubiera copias. El día que una se corrige y la
 * otra no, la pantalla dice un precio y se cobra otro —y de eso se entera
 * el comprador—. Ahora hay una sola.
 */

export type ProductoConOfertas = { id: string; ofertaSalida: string | null; bienvenida: string | null };
/** Lo que el navegador manda junto con el código: el plazo de una, el de la otra, o ninguno. */
export type PlazosDelPedido = { oferta?: unknown; bienvenida?: unknown };

/**
 * Si el código es de un cupón automático y NO corresponde cobrarlo, por
 * qué. Null si aplica, o si es un cupón común (de esos decide
 * `porQueNoAplica`, como siempre).
 */
export function porQueNoValeElAutomatico(codigo: string, producto: ProductoConOfertas, plazos: PlazosDelPedido, ahora = Date.now()): string | null {
  if (esCodigoDeOferta(codigo)) {
    const oferta = leerOfertaSalida(producto.ofertaSalida);
    const plazo = oferta.activa && oferta.tipo === "DESCUENTO" ? leerTokenDeOferta(plazos.oferta, producto.id, ahora) : null;
    return plazo ? null : "Esa oferta ya venció.";
  }
  if (esCodigoDeBienvenida(codigo)) {
    const b = leerBienvenida(producto.bienvenida);
    const plazo = b.activa ? leerTokenDeBienvenida(plazos.bienvenida, producto.id, ahora) : null;
    return plazo?.vivo ? null : "El precio de bienvenida ya venció: se cobra el precio normal.";
  }
  return null;
}

/**
 * Crear o actualizar el cupón de una oferta automática, adentro de la
 * transacción que guarda la oferta: prendido si la oferta está prendida,
 * apagado si no. Así el descuento es un cupón real, cobrado por la misma
 * ruta que cualquier otro, y aparece en Cupones.
 *
 * Tira `Error("TOPE")` si habría que crearlo y la cuenta ya está en el
 * máximo: la ruta lo convierte en un 409 con el texto para la dueña.
 */
export async function guardarCuponAutomatico(
  tx: Prisma.TransactionClient,
  d: { storeId: string; productId: string; codigo: string; porcentaje: number; activo: boolean },
): Promise<void> {
  const existe = await tx.cuponDigital.findUnique({ where: { storeId_codigo: { storeId: d.storeId, codigo: d.codigo } }, select: { id: true } });
  if (!existe) {
    const cuantos = await tx.cuponDigital.count({ where: { storeId: d.storeId } });
    if (cuantos >= MAX_CUPONES_POR_CUENTA) throw new Error("TOPE");
  }
  await tx.cuponDigital.upsert({
    where: { storeId_codigo: { storeId: d.storeId, codigo: d.codigo } },
    create: { storeId: d.storeId, codigo: d.codigo, tipo: "PORCENTAJE", valor: d.porcentaje, productId: d.productId, activo: d.activo },
    update: { tipo: "PORCENTAJE", valor: d.porcentaje, productId: d.productId, venceAt: null, topeUsos: null, activo: d.activo },
  });
}
