import { Redis } from "@upstash/redis";
import { createHmac, timingSafeEqual } from "node:crypto";
import { claveDeVentana, ventanasVivas, VIDA_SEG } from "@/lib/mirando-ahora";

/**
 * El contador de "mirando ahora" contra Redis. Sólo servidor: usa `crypto` y
 * la conexión. Las reglas y los plazos están en `mirando-ahora`.
 *
 * ── Por qué un HyperLogLog y no un conjunto ───────────────────────────────
 *
 * Un conjunto guarda cada huella y hay que traerlas todas para contarlas: con
 * mil personas mirando son mil cadenas por cada carga del panel. El
 * HyperLogLog ocupa lo mismo con diez que con un millón, cuenta la unión de
 * varias claves de una sola vez y —abajo de unos cientos— no se equivoca.
 * Acá no hay ninguna decisión colgando de este número: es un cartelito.
 *
 * Y tiene un efecto que acá es una ventaja y no un costo: **no guarda los
 * elementos**. Aunque alguien leyera la clave, no hay adentro nada que
 * devuelva a una persona.
 */

/**
 * La huella anónima de quien está mirando.
 *
 * Es un HMAC con nuestro secreto, así que no se puede volver de la huella a
 * la IP. Y lleva el producto adentro: la misma persona en dos páginas son dos
 * huellas distintas, o sea que nadie puede cruzar una página con otra ni
 * siquiera teniendo las dos claves.
 *
 * Existe sólo para no contar diez veces a quien recarga. No se guarda —el
 * HyperLogLog no almacena lo que se le suma— y muere con el contador.
 *
 * Sin secreto devuelve `null` y no se cuenta a nadie: es un cartelito, no
 * vale la pena inventar una huella débil por él.
 */
export function huellaDeVisitante(productId: string, ip: string, navegador: string): string | null {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) return null;
  return createHmac("sha256", secreto)
    .update(`mirando:${productId}:${ip}:${navegador}`)
    .digest("base64url")
    .slice(0, 16);
}

/* ══════════════════════════════════════════════════════════════════════════
   EL PERMISO DEL PANEL PARA VOLVER A PREGUNTAR
   ══════════════════════════════════════════════════════════════════════════

   El cartelito tiene que moverse solo: si el número queda congelado en el
   momento en que se cargó la pantalla, el que se fue sigue ahí hasta que
   alguien recargue y el cartel miente. Así que el navegador vuelve a
   preguntar cada tanto.

   ⚠️ Y ESA PREGUNTA NO PUEDE PEDIR LA SESIÓN. Averiguar quién es exige un
   viaje a Supabase y otro a la base CADA VEZ, para un cartelito, en una
   pantalla que puede quedar abierta toda la tarde. Eso es justo lo que este
   archivo existe para no hacer.

   Entonces el panel se lleva un permiso firmado con los ids que ya son suyos
   —están en el HTML de su propia pantalla— y la ruta sólo verifica la firma:
   sin base, sin sesión, sin poder pedir por un producto ajeno. Es el mismo
   truco que los plazos de las ofertas.

   Vence, porque un permiso que no vence es un permiso para siempre. Al
   vencerse el navegador recarga la pantalla y se lleva uno nuevo. */

/** Cuánto vale el permiso. Alcanza para una tarde con el panel abierto. */
const VIDA_DEL_PERMISO_MS = 12 * 60 * 60 * 1000;

/**
 * Cuántos productos se cuentan de una.
 *
 * El tope está para que un permiso inventado no nos haga pedirle a Redis mil
 * claves de una sola vez. ⚠️ Lo aplican LAS DOS funciones —la que firma y la
 * que cuenta— con el mismo número: si sólo lo aplicara una, una cuenta con
 * más productos que el tope vería un número al cargar la pantalla y otro
 * distinto veinte segundos después, sin que nadie haya entrado ni salido.
 */
const TOPE_DE_PRODUCTOS = 50;

const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/* ⚠️ `panel-mirando:` y no `mirando:`. Las dos firmas salen del mismo secreto,
   así que si compartieran el texto una huella de visitante podría pasar por
   permiso de panel o al revés. El prefijo las mantiene separadas, igual que
   las clases de los plazos. */
function firmaDelPermiso(vence: number, ids: string[]): string | null {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) return null;
  return createHmac("sha256", secreto)
    .update(`panel-mirando:${vence}:${ids.join("~")}`)
    .digest("base64url")
    .slice(0, 32);
}

/**
 * El permiso que se lleva el panel. `null` sin secreto: sin firma no hay
 * permiso que valga, y el cartelito se queda quieto antes que abrir una
 * puerta sin llave.
 */
export function permisoDelPanel(productIds: string[], ahora = Date.now()): string | null {
  const ids = productIds.slice(0, TOPE_DE_PRODUCTOS);
  /* ⚠️ NUNCA SE FIRMA UN PERMISO QUE NO SE VA A PODER LEER. Si acá saliera uno
     que del otro lado se rechaza —la lista vacía, o un id con otro formato—,
     el panel recibiría 401, recargaría la pantalla para pedir otro, y el otro
     sería igual de malo: una recarga atrás de otra para siempre. Que no se
     dibuje el cartelito es infinitamente mejor que eso. */
  if (ids.length === 0 || !ids.every((x) => ID_RE.test(x))) return null;
  const vence = ahora + VIDA_DEL_PERMISO_MS;
  const firma = firmaDelPermiso(vence, ids);
  if (!firma) return null;
  return `${vence}.${ids.join("~")}.${firma}`;
}

/** Los productos de un permiso, o `null` si está tocado, vencido o no es
 *  nuestro. */
export function productosDelPermiso(permiso: unknown, ahora = Date.now()): string[] | null {
  if (typeof permiso !== "string" || permiso.length > 40 * TOPE_DE_PRODUCTOS + 64) return null;
  const [crudo, lista, firma] = permiso.split(".");
  if (!crudo || lista === undefined || !firma) return null;

  const vence = Number(crudo);
  if (!Number.isSafeInteger(vence) || vence <= ahora) return null;

  /* Con la lista vacía no hay nada que contar: se corta acá para no llamar a
     `pfcount` sin claves ni dejar pasar un permiso de "todo". */
  const ids = lista.split("~");
  if (ids.length === 0 || ids.length > TOPE_DE_PRODUCTOS || !ids.every((x) => ID_RE.test(x))) return null;

  const esperada = firmaDelPermiso(vence, ids);
  if (!esperada) return null;
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return ids;
}

let redis: Redis | null = null;
function conectar(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/**
 * Anotar que alguien está mirando. No devuelve nada y no puede fallar hacia
 * afuera: si Redis no contesta, el cartelito muestra menos gente y listo.
 * Nunca puede romper la página de venta, que es donde entra la plata.
 */
export async function marcarMirando(productId: string, huella: string, ahora = Date.now()): Promise<void> {
  const r = conectar();
  if (!r) return;
  const clave = claveDeVentana(productId, ahora);
  try {
    /* ⚠️ LOS DOS EN UN SOLO VIAJE. Sueltos son dos idas y vueltas por HTTP a
       Upstash por cada latido de cada persona mirando, y el latido es cada 20
       segundos: la mitad del tiempo de esta ruta se iba en esperar la
       segunda. Con el pipeline salen juntos y vuelven juntos.

       El vencimiento se vuelve a poner en cada latido, y está bien: la clave
       lleva la ventana adentro, así que se renueva la de la ventana que corre
       y las viejas se van solas igual. */
    await r.pipeline().pfadd(clave, huella).expire(clave, VIDA_SEG).exec();
  } catch {
    /* Un cartelito no justifica un error en la página de venta. */
  }
}

/** Cuántos están mirando cada página, y el total. */
export type MirandoAhora = {
  total: number;
  /** Una fila por producto preguntado, en el mismo orden. */
  porProducto: Array<{ id: string; n: number }>;
};

/**
 * Cuántos están mirando.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * VIENE PARTIDO POR PRODUCTO, Y ESO ES EL PUNTO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * En Pro una cuenta puede tener cinco páginas de venta. "12 mirando ahora" no
 * le sirve para nada si no puede saber CUÁL de las cinco: justo cuando el
 * cartelito se pone interesante —recién publicó un anuncio— es cuando más
 * necesita saber dónde está cayendo la gente. Por eso se cuenta producto por
 * producto y el total es la suma.
 *
 * ⚠️ El total es LA SUMA y no la unión de las claves, a propósito. La huella
 * lleva el producto adentro (ver `huellaDeVisitante`, y es por privacidad),
 * así que la misma persona en dos páginas ya son dos huellas distintas y la
 * unión daría lo mismo que la suma. Sumar acá asegura que el número de arriba
 * y el detalle de abajo digan siempre lo mismo: un total que no cierra con
 * sus renglones parece un error aunque no lo sea.
 *
 * Todas las cuentas salen en UN viaje a Redis. Con cinco productos sueltas
 * son cinco idas y vueltas por HTTP cada vez que el panel pregunta.
 *
 * ⚠️ Devuelve `null` si no se pudo averiguar —Redis caído, sin configurar— y
 * quien llama no muestra nada. Un cero inventado diría "no hay nadie", que es
 * una afirmación distinta de "no sé", y ésta es una pantalla donde los
 * números no mienten.
 */
export async function mirandoAhora(productIds: string[], ahora = Date.now()): Promise<MirandoAhora | null> {
  /* El mismo tope que el permiso, y por eso mismo: ver `TOPE_DE_PRODUCTOS`. */
  const ids = productIds.slice(0, TOPE_DE_PRODUCTOS);
  if (ids.length === 0) return { total: 0, porProducto: [] };
  const r = conectar();
  if (!r) return null;
  try {
    const p = r.pipeline();
    for (const id of ids) {
      /* `pfcount` pide al menos una clave y el resto sueltas, así que la lista
         se parte en la primera y las demás: con un `...lista` a secas
         TypeScript no puede garantizar que haya una. `ventanasVivas` siempre
         devuelve dos. */
      const [primera, ...resto] = ventanasVivas(id, ahora);
      p.pfcount(primera!, ...resto);
    }
    const cuentas = await p.exec<number[]>();
    const porProducto = ids.map((id, i) => ({
      id,
      /* Redis contesta un número; si algún día contesta otra cosa, cero es
         mejor que un `NaN` dibujado en la pantalla. */
      n: Number.isFinite(cuentas[i]) ? (cuentas[i] as number) : 0,
    }));
    return { total: porProducto.reduce((suma, x) => suma + x.n, 0), porProducto };
  } catch {
    return null;
  }
}
