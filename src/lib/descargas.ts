import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

/* Cuánto vive el permiso y cuántas veces se puede usar.
   30 días: tiempo de sobra para bajarlo, y después se limpia solo.
   5 descargas: alcanza para el celular, la compu y el "se me borró", y corta el
   reenvío del link a diez amigos. */
export const DIAS_DE_VIGENCIA = 30;
export const MAX_DESCARGAS = 5;

export type ArchivoEntregado = { nombre: string; token: string };

/**
 * Emite los permisos de descarga de un pedido ya pagado.
 *
 * Devuelve qué mandarle al comprador. Si el pedido no tiene nada digital
 * devuelve una lista vacía y no toca la base.
 *
 * **Es idempotente**: si un ítem ya tiene su permiso, se reusa el que hay en vez
 * de emitir otro. Mercado Pago reintenta los webhooks —y el mismo aviso puede
 * llegar dos veces—, así que sin esto una compra podía terminar con dos tokens
 * vivos para el mismo archivo, y el tope de 5 pasaba a ser de 10 sin que nadie
 * lo decidiera.
 */
export async function crearDescargasDigitales(orderId: string): Promise<ArchivoEntregado[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
      // Sólo lo que tiene archivo. Un pedido puede mezclar: en ese caso lo
      // físico se manda por correo y lo digital sale por acá.
      product: { archivoPath: { not: null } },
    },
    select: {
      id: true,
      product: { select: { name: true, archivoNombre: true } },
      descargas: { select: { token: true }, take: 1 },
    },
  });

  if (items.length === 0) return [];

  const vence = new Date(Date.now() + DIAS_DE_VIGENCIA * 24 * 60 * 60 * 1000);
  const entregados: ArchivoEntregado[] = [];

  for (const item of items) {
    // El nombre que ve el comprador: el del producto, no el del archivo. El
    // archivo puede llamarse "final_v3_ESTE.pdf" y eso no es lo que compró.
    const nombre = item.product.name;

    const yaEmitido = item.descargas[0]?.token;
    if (yaEmitido) {
      entregados.push({ nombre, token: yaEmitido });
      continue;
    }

    /* `randomUUID` y no `Math.random()`: el token es lo ÚNICO que separa a este
       comprador del archivo, y el generador de JS es predecible a partir de unas
       pocas salidas del mismo proceso. Dos uuid pegados para que sea largo de
       verdad — adivinarlo a fuerza de intentos no es una opción. */
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");

    await prisma.digitalDownload.create({
      data: {
        token,
        orderItemId: item.id,
        expiresAt: vence,
        maxDescargas: MAX_DESCARGAS,
      },
    });

    entregados.push({ nombre, token });
  }

  return entregados;
}

/** Cuándo vencen los permisos que se emitan ahora — para el texto del mail. */
export function vencimientoDesdeAhora(): Date {
  return new Date(Date.now() + DIAS_DE_VIGENCIA * 24 * 60 * 60 * 1000);
}
