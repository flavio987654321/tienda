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

/* Tope del archivo que se vende.
   Sube a 50 MB porque el archivo ya NO pasa por nuestro servidor: el navegador
   lo manda directo a Supabase con un permiso firmado (ver
   /api/upload/firma-digital). Los dos techos que había —10 MB de Next y el más
   bajo de la plataforma en producción— se aplicaban al cuerpo de un pedido
   nuestro, y ahora no hay tal pedido.
   Este número también se le configura AL BUCKET: es Supabase quien lo aplica
   sobre los bytes reales, no un `if` de este lado. */
/* 50 MB NO es un número elegido: es el tope global de subida del proyecto de
   Supabase, medido. Un bucket no puede pedir más que eso — al crearlo con 150 MB
   contesta 413 "The object exceeded the maximum allowed size" y el bucket
   directamente no se crea, así que la subida falla con un 502 que no explica
   nada. Probado: 50 entra, 100 no.
   Para subirlo hay que levantar el límite global en el panel de Supabase, y eso
   depende del plan. Si algún día se levanta, este número acompaña. */
export const MAX_ARCHIVO_DIGITAL_MB = 50;
export const MAX_ARCHIVO_DIGITAL_BYTES = MAX_ARCHIVO_DIGITAL_MB * 1024 * 1024;

/* A partir de acá se avisa, pero NO se frena.
   El caso real que lo motivó: una guía de 46 páginas exportada a calidad de
   imprenta pesaba 117 MB. Se puede vender igual, pero quien la compra tiene que
   bajarse esos 117 MB —muchas veces desde el celular con datos— y el permiso
   sólo da 5 intentos: tres cortes y se quedó sin lo que pagó. Además el tráfico
   de cada descarga lo paga la plataforma.
   Avisar y no bloquear es el mismo criterio que usan las fotos que van a salir
   borrosas: quien sube es el único que puede arreglarlo, y en su compu el
   archivo abre al instante — si no se lo decimos, se entera por un reclamo. */
export const ARCHIVO_PESADO_MB = 25;

/* Qué se puede vender. Se le configura al bucket como `allowed_mime_types`, así
   que Supabase rechaza lo que no esté acá aunque el navegador insista.
   Sin videos a propósito: el rubro es de archivos que se descargan, y un curso
   en video se mira online — ver PRODUCTOS-DIGITALES.md. */
export const TIPOS_ARCHIVO_DIGITAL = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * ¿Esta ruta guardada apunta de verdad a un archivo del bucket de productos
 * digitales?
 *
 * Vive acá, en una función sola, porque la preguntan DOS lugares que no se
 * conocen entre sí: la validación del producto (para no dejar guardar una ruta
 * torcida) y la ruta de entrega (para no servirla aunque se haya guardado antes
 * de que este chequeo existiera). Si los dos no contestan igual, el que afloje
 * es por donde se cuela.
 *
 * Lo que descarta y por qué:
 *
 * - **Otro bucket.** Es el caso grave: con sólo exigir `supabase://`, una dueña
 *   escribía `supabase://affiliate-docs/…` en su producto, se lo compraba, y el
 *   servidor le firmaba un link al bucket de los documentos de identidad de los
 *   afiliados. El prefijo lleva el bucket adentro y termina en barra, así que un
 *   bucket que EMPIECE igual (`producto-digital-viejo`) tampoco pasa.
 * - **Una URL pública** (`https://…`): no empieza con el prefijo.
 * - **`..` y la barra inicial**: la ruta se pega dentro de la URL que se firma, y
 *   un salto de directorio la sacaría del prefijo recién anclado.
 * - **El prefijo pelado**, sin archivo después.
 */
export function rutaDeArchivoValida(ruta: string | null | undefined): boolean {
  if (!ruta || !ruta.startsWith(PREFIJO_ARCHIVO_DIGITAL)) return false;
  const resto = ruta.slice(PREFIJO_ARCHIVO_DIGITAL.length);
  if (!resto || resto.startsWith("/") || resto.includes("..")) return false;
  return true;
}

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
