import { Redis } from "@upstash/redis";
import { createHmac } from "node:crypto";
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
    await r.pfadd(clave, huella);
    /* El vencimiento se vuelve a poner en cada latido, y está bien: la clave
       lleva el minuto adentro, así que se renueva la del minuto que corre y
       las viejas se van solas igual. */
    await r.expire(clave, VIDA_SEG);
  } catch {
    /* Un cartelito no justifica un error en la página de venta. */
  }
}

/**
 * Cuántos están mirando, contando la unión de las ventanas de todos los
 * productos que se pasen: la misma persona mirando dos páginas de la misma
 * cuenta cuenta una vez.
 *
 * ⚠️ Devuelve `null` si no se pudo averiguar —Redis caído, sin configurar— y
 * quien llama no muestra nada. Un cero inventado diría "no hay nadie", que es
 * una afirmación distinta de "no sé", y ésta es una pantalla donde los
 * números no mienten.
 */
export async function cuantosMirando(productIds: string[], ahora = Date.now()): Promise<number | null> {
  if (productIds.length === 0) return 0;
  const r = conectar();
  if (!r) return null;
  const claves = productIds.flatMap((id) => ventanasVivas(id, ahora));
  /* `pfcount` pide al menos una clave y el resto sueltas, así que la lista se
     parte en la primera y las demás: con un `...lista` a secas TypeScript no
     puede garantizar que haya una. Y la lista nunca está vacía porque arriba
     se corta con `productIds.length === 0`. */
  const [primera, ...resto] = claves;
  if (!primera) return 0;
  try {
    return await r.pfcount(primera, ...resto);
  } catch {
    return null;
  }
}
