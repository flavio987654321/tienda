/* ══════════════════════════════════════════════════════════════════════════
   EL PRECIO DE BIENVENIDA (el "reservado por 15:00" de todas las landings)
   ══════════════════════════════════════════════════════════════════════════

   La persona entra a la página y arranca un reloj: mientras corre, el
   producto está más barato. Es lo que hace toda landing de ebooks, y en
   todas es mentira: el reloj vuelve a 15:00 con F5, y el precio de "después"
   no existe. Acá es de verdad, con el MISMO motor que la oferta de salida:

   - El plazo lo firma el servidor la primera vez que ESA persona ve la
     página (`firmarBienvenida`): el token lleva la hora en que VENCE.
   - El navegador lo guarda (cookie y localStorage) y se queda con el más
     viejo que tenga: recargar, cerrar la pestaña o volver a las dos horas no
     lo reinicia. Al llegar a cero, el reloj se va y vuelve el precio normal
     en la página Y en el pago.
   - El descuento es un cupón real de la cuenta (`BIENVENIDA-…`), que el
     checkout aplica solo, y que la ruta que cobra sólo acepta con un token
     vivo. Pasado el plazo se cobra el precio normal aunque la pantalla siga
     diciendo otra cosa: la plata la decide el servidor, siempre.

   ── Lo que NO se cierra, a propósito ───────────────────────────────────────

   Otro navegador, incógnito, otro celular: para nosotros es alguien nuevo y
   arranca sus minutos. No se intenta "recordar" por IP: los celulares
   comparten IP de a cientos (CGNAT) y en una casa todos tienen la misma, así
   que la segunda persona de la familia lo vería vencido. Y lo que consigue
   quien lo esquiva es exactamente el precio que el vendedor ya ofrece a
   cualquiera que entra por primera vez: no hay descuento de más, hay el mismo.

   Este archivo es puro y lo importa el navegador: las reglas, la forma
   guardada y el texto. La firma vive en `oferta-salida-firma` (necesita
   `crypto`); lo que toca la base, en `bienvenida-servidor`. Probado en
   `bienvenida.check.ts`. */

import { descuentoDe, PREFIJO_DE_BIENVENIDA } from "@/lib/cupones-digitales";

/** Cuánto vale, en minutos desde que la persona entra. */
export const MINUTOS_DE_BIENVENIDA = [15, 30, 60] as const;
export type MinutosDeBienvenida = (typeof MINUTOS_DE_BIENVENIDA)[number];
export const MINUTOS_MAXIMOS = 60;
export const PORCENTAJE_MINIMO = 5;
export const PORCENTAJE_MAXIMO_BIENVENIDA = 50;
export const TEXTO_BIENVENIDA_MAX = 60;

/** Lo que se guarda en `Product.bienvenida`, como JSON. */
export type Bienvenida = {
  activa: boolean;
  porcentaje: number;
  minutos: MinutosDeBienvenida;
  /** Lo que dice la barra, antes del reloj: "Precio de bienvenida reservado por". */
  texto: string;
};

export const BIENVENIDA_DE_FABRICA: Bienvenida = {
  activa: false,
  porcentaje: 15,
  minutos: 15,
  texto: "Precio de bienvenida reservado por",
};

/** Lo guardado, o la de fábrica (apagada) si no hay nada o está roto. */
export function leerBienvenida(raw: string | null | undefined): Bienvenida {
  if (!raw) return BIENVENIDA_DE_FABRICA;
  try {
    const r = validarBienvenida(JSON.parse(raw));
    return r.ok ? r.datos : BIENVENIDA_DE_FABRICA;
  } catch {
    return BIENVENIDA_DE_FABRICA;
  }
}

/**
 * Lo que manda la pantalla, revisado. La misma función corre en la pantalla
 * (para avisar antes) y en la ruta (para decidir).
 */
export function validarBienvenida(body: unknown): { ok: true; datos: Bienvenida } | { ok: false; problema: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const porcentaje = typeof b.porcentaje === "number" ? b.porcentaje : Number.parseInt(String(b.porcentaje ?? ""), 10);
  const minutosCrudo = typeof b.minutos === "number" ? b.minutos : Number(String(b.minutos ?? ""));
  const minutos = MINUTOS_DE_BIENVENIDA.find((m) => m === minutosCrudo);
  const texto = typeof b.texto === "string" ? b.texto.replace(/\s+/g, " ").trim() : "";

  if (!Number.isInteger(porcentaje) || porcentaje < PORCENTAJE_MINIMO || porcentaje > PORCENTAJE_MAXIMO_BIENVENIDA) {
    return { ok: false, problema: `El descuento va de ${PORCENTAJE_MINIMO} a ${PORCENTAJE_MAXIMO_BIENVENIDA} %. Más que eso no es una bienvenida, es otro precio.` };
  }
  if (!minutos) return { ok: false, problema: "Elegí cuántos minutos vale desde que la persona entra." };
  if (texto.length < 3) return { ok: false, problema: "Escribí qué dice la barra, antes del reloj." };
  if (texto.length > TEXTO_BIENVENIDA_MAX) return { ok: false, problema: `El texto va hasta ${TEXTO_BIENVENIDA_MAX} letras: es una barra, no un párrafo.` };

  return { ok: true, datos: { activa: b.activa === true, porcentaje, minutos, texto } };
}

/* ── El cupón ───────────────────────────────────────────────────────────── */

/**
 * El código del cupón que el precio de bienvenida crea solo: `BIENVENIDA-`
 * y la cola del id del producto. Fijo por producto, así guardar dos veces
 * actualiza el mismo cupón en vez de crear otro. En Cupones se reconoce por
 * el prefijo.
 */
export function codigoDeBienvenida(productId: string): string {
  return `${PREFIJO_DE_BIENVENIDA}${productId.slice(-8).toUpperCase()}`;
}

export function esCodigoDeBienvenida(codigo: string): boolean {
  return codigo.startsWith(PREFIJO_DE_BIENVENIDA);
}

/**
 * Cuánto queda pagando con el descuento. Sale de `descuentoDe`, la MISMA
 * cuenta que hace la ruta al cobrar: la página no puede prometer un número
 * distinto del que después aparece en Mercado Pago.
 */
export function precioDeBienvenida(precio: number, porcentaje: number): number {
  return precio - descuentoDe({ tipo: "PORCENTAJE", valor: porcentaje }, precio);
}

/* ── El token en el navegador ───────────────────────────────────────────── */

/** Dónde lo guarda el navegador: cookie y localStorage, con la misma clave. */
export function claveDeBienvenida(productId: string): string {
  return `pv_bienvenida_${productId}`;
}

/** La forma de un token nuestro: `<milisegundos>.<firma>`. Sólo la forma, no la firma. */
export const TOKEN_DE_BIENVENIDA_RE = /^\d{10,16}\.[A-Za-z0-9_-]{24}$/;

/** Sólo la hora en que vence, sin verificar la firma: para que el navegador sepa qué mostrar. */
export function venceEnDelTokenDeBienvenida(token: unknown): number | null {
  if (typeof token !== "string" || !TOKEN_DE_BIENVENIDA_RE.test(token)) return null;
  const ts = Number(token.split(".")[0]);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/**
 * De todos los tokens que el navegador tiene a mano (la cookie, el
 * localStorage, el que trae la página), con cuál se queda: el que vence
 * ANTES. Así recargar nunca estira el plazo, y el que llegue con un token
 * viejo en una pestaña y uno nuevo en otra ve el mismo reloj en las dos.
 *
 * No verifica firmas —el navegador no puede—; el servidor lo hace al cobrar.
 * Un token inventado sólo puede acortarle el plazo a quien lo inventa.
 */
export function elTokenMasViejo(candidatos: Array<unknown>): string | null {
  let mejor: { token: string; venceEn: number } | null = null;
  for (const c of candidatos) {
    const v = venceEnDelTokenDeBienvenida(c);
    if (v === null) continue;
    if (!mejor || v < mejor.venceEn) mejor = { token: c as string, venceEn: v };
  }
  return mejor?.token ?? null;
}
