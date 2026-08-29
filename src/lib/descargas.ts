import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

/* Cuánto vive el permiso y cuántas veces se puede usar.
   30 días: tiempo de sobra para bajarlo, y después se limpia solo.
   5 descargas: alcanza para el celular, la compu y el "se me borró", y corta el
   reenvío del link a diez amigos. */
export const DIAS_DE_VIGENCIA = 30;
export const MAX_DESCARGAS = 5;

/* El bucket privado donde viven los archivos que se venden, en UN solo lugar:
   lo usan la subida, la validación del producto y la ruta de descarga, y los
   tres tienen que estar de acuerdo.

   Por qué importa que sea uno fijo y no "el que diga la ruta guardada": la ruta
   de descarga firma contra el bucket que le indica `archivoPath`. Si eso no se
   ancla, una dueña puede escribir a mano `supabase://affiliate-docs/...` en su
   propio producto, comprárselo, y hacer que el servidor le firme un link al
   bucket de los DOCUMENTOS DE IDENTIDAD de los afiliados. Anclarlo cierra la
   familia entera de ese ataque, no sólo ese caso. */
export const DIGITAL_BUCKET = process.env.SUPABASE_DIGITAL_BUCKET || "producto-digital";
export const PREFIJO_ARCHIVO_DIGITAL = `supabase://${DIGITAL_BUCKET}/`;

/** Tope del archivo que se vende. Debe coincidir con `/api/upload`. */
export const MAX_ARCHIVO_DIGITAL_MB = 15;
export const MAX_ARCHIVO_DIGITAL_BYTES = MAX_ARCHIVO_DIGITAL_MB * 1024 * 1024;

export type ArchivoEntregado = { nombre: string; token: string };
/* El vencimiento sale de la base y NO se recalcula al mandar el mail. Cuando el
   webhook se reintenta días después, el permiso que se reusa es el original: si
   el mail dijera "30 días desde hoy", le estaría prometiendo al comprador una
   fecha que el link no va a respetar. */
export type Entrega = { archivos: ArchivoEntregado[]; venceEl: Date | null };

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
export async function crearDescargasDigitales(orderId: string): Promise<Entrega> {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
      // Sólo lo que tiene archivo. Un pedido puede mezclar: en ese caso lo
      // físico se manda por correo y lo digital sale por acá.
      product: { archivoPath: { not: null } },
    },
    select: {
      id: true,
      product: { select: { name: true } },
      descargas: { select: { token: true, expiresAt: true }, take: 1 },
    },
  });

  if (items.length === 0) return { archivos: [], venceEl: null };

  const vence = new Date(Date.now() + DIAS_DE_VIGENCIA * 24 * 60 * 60 * 1000);
  const archivos: ArchivoEntregado[] = [];
  // El más TEMPRANO de los vencimientos reales: si un permiso viejo vence antes
  // que los nuevos, el mail tiene que decir esa fecha y no la optimista.
  let venceEl: Date | null = null;

  for (const item of items) {
    // El nombre que ve el comprador: el del producto, no el del archivo. El
    // archivo puede llamarse "final_v3_ESTE.pdf" y eso no es lo que compró.
    const nombre = item.product.name;

    const yaEmitido = item.descargas[0];
    if (yaEmitido) {
      archivos.push({ nombre, token: yaEmitido.token });
      if (!venceEl || yaEmitido.expiresAt < venceEl) venceEl = yaEmitido.expiresAt;
      continue;
    }

    /* `randomUUID` y no `Math.random()`: el token es lo ÚNICO que separa a este
       comprador del archivo, y el generador de JS es predecible a partir de unas
       pocas salidas del mismo proceso. Dos uuid pegados para que sea largo de
       verdad — adivinarlo a fuerza de intentos no es una opción. */
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");

    /* `upsert` sobre `orderItemId`, que es ÚNICO en la base. La lectura de
       arriba no alcanza para ser idempotente: dos avisos de Mercado Pago en
       paralelo leen los dos "todavía no hay" y crean los dos. El único lugar
       donde eso se decide sin carrera es la restricción de la base, y el upsert
       la usa — el segundo no crea, lee el que quedó. */
    const permiso = await prisma.digitalDownload.upsert({
      where: { orderItemId: item.id },
      create: {
        token,
        orderItemId: item.id,
        expiresAt: vence,
        maxDescargas: MAX_DESCARGAS,
      },
      // Vacío a propósito: si ya existe NO se le corre el vencimiento ni se le
      // reinicia el contador. Un reintento del webhook no puede regalar 5
      // descargas nuevas.
      update: {},
      select: { token: true, expiresAt: true },
    });

    archivos.push({ nombre, token: permiso.token });
    if (!venceEl || permiso.expiresAt < venceEl) venceEl = permiso.expiresAt;
  }

  return { archivos, venceEl };
}
