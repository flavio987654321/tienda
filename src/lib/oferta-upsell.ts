/* ══════════════════════════════════════════════════════════════════════════
   LA OFERTA DEL UPSELL (el "+50% off por 10 minutos" de la caja de al lado)
   ══════════════════════════════════════════════════════════════════════════

   En el checkout, la caja "Sumá a tu compra" ofrece el upsell más barato
   mientras corre un reloj. Cuando el reloj llega a cero, el upsell **pasa a
   costar su precio de lista**. El producto principal no se mueve nunca: esta
   oferta manda sobre la caja del upsell y sobre nada más.

   Es el tercer plazo firmado del panel, y usa el MISMO motor que los otros
   dos (`oferta-salida` y `bienvenida`), a propósito:

   - El plazo lo firma el servidor la primera vez que ESA persona abre el
     checkout (`firmarUpsell`); el token lleva la hora en que VENCE.
   - El navegador lo guarda —cookie y localStorage— y se queda con el más
     viejo que tenga: recargar, volver desde Mercado Pago o abrir de nuevo el
     link dos horas después **no** lo reinicia.
   - Al cobrar, la ruta vuelve a verificar la firma. Con el plazo vencido no
     se cobra el precio de oferta, diga lo que diga la pantalla.

   ── Por qué un solo reloj para toda la caja ────────────────────────────────

   Un producto puede tener hasta tres upsells, y los tres empiezan a contar
   en el mismo momento —cuando la persona entra al checkout—, así que tres
   relojes mostrarían el mismo número tres veces. Uno arriba de la caja.

   ── Quién entra en la oferta, sin otro interruptor ─────────────────────────

   El upsell que tenga cargado su **precio de lista** (`comparePrice`) mayor
   que el precio de oferta. El que no lo tenga no entra: se muestra con su
   precio de siempre y sin reloj. Así nadie prende sin querer una oferta que
   al vencer no tiene a qué precio volver, que sería un reloj que no hace
   nada — justo lo que esto no quiere ser.

   ⚠️ Y por eso, con la oferta prendida, ese número deja de ser un anclaje de
   marketing y pasa a ser PLATA QUE SE COBRA. El panel lo dice con todas las
   letras donde se carga: ver la pantalla de Marketing › Upsells.

   Este archivo es puro y lo importa el navegador: las reglas, la forma
   guardada y los precios. La firma vive en `oferta-salida-firma` (necesita
   `crypto`); lo que toca la base, en `oferta-upsell-servidor`. Probado en
   `oferta-upsell.check.ts`. */

/** Cuánto dura, en minutos desde que la persona abre el checkout. */
export const MINUTOS_DE_UPSELL = [5, 10, 15, 30] as const;
export type MinutosDeUpsell = (typeof MINUTOS_DE_UPSELL)[number];
export const MINUTOS_MAXIMOS_UPSELL = 30;
export const TEXTO_UPSELL_MAX = 40;

/** Lo que se guarda en `Product.ofertaUpsell`, como JSON. */
export type OfertaUpsell = {
  activa: boolean;
  minutos: MinutosDeUpsell;
  /** Lo que dice arriba del reloj: "La oferta se termina en". */
  texto: string;
};

export const OFERTA_UPSELL_DE_FABRICA: OfertaUpsell = {
  activa: false,
  minutos: 10,
  texto: "La oferta se termina en",
};

/** Lo guardado, o la de fábrica (apagada) si no hay nada o está roto. */
export function leerOfertaUpsell(raw: string | null | undefined): OfertaUpsell {
  if (!raw) return OFERTA_UPSELL_DE_FABRICA;
  try {
    const r = validarOfertaUpsell(JSON.parse(raw));
    return r.ok ? r.datos : OFERTA_UPSELL_DE_FABRICA;
  } catch {
    return OFERTA_UPSELL_DE_FABRICA;
  }
}

/**
 * Lo que manda la pantalla, revisado. La misma función corre en la pantalla
 * (para avisar antes) y en la ruta (para decidir).
 */
export function validarOfertaUpsell(body: unknown): { ok: true; datos: OfertaUpsell } | { ok: false; problema: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const minutosCrudo = typeof b.minutos === "number" ? b.minutos : Number(String(b.minutos ?? ""));
  const minutos = MINUTOS_DE_UPSELL.find((m) => m === minutosCrudo);
  const texto = typeof b.texto === "string" ? b.texto.replace(/\s+/g, " ").trim() : "";

  if (!minutos) return { ok: false, problema: "Elegí cuántos minutos dura desde que la persona abre el pago." };
  if (texto.length < 3) return { ok: false, problema: "Escribí qué dice arriba del reloj." };
  if (texto.length > TEXTO_UPSELL_MAX) {
    return { ok: false, problema: `El texto va hasta ${TEXTO_UPSELL_MAX} letras: al lado hay un reloj, no entra un párrafo.` };
  }

  return { ok: true, datos: { activa: b.activa === true, minutos, texto } };
}

/* ── Los precios ────────────────────────────────────────────────────────── */

/** Lo que el checkout y la ruta necesitan saber de un upsell para ponerle precio. */
export type UpsellConPrecios = { price: number; comparePrice: number | null };

/**
 * Si este upsell participa de la oferta: tiene un precio de lista mayor que
 * el de oferta, o sea que al vencer el reloj hay a qué precio volver.
 *
 * ⚠️ Sin esto, un upsell sin `comparePrice` quedaría con un reloj que al
 * llegar a cero no cambia nada. Eso es exactamente el reloj de mentira que
 * tiene toda la competencia, y el motivo por el que esto se escribió.
 */
export function entraEnLaOferta(u: UpsellConPrecios): boolean {
  return typeof u.comparePrice === "number" && u.comparePrice > u.price && u.price > 0;
}

/**
 * Lo que sale ESTE upsell ahora mismo.
 *
 * Con el reloj corriendo, su precio de oferta. Vencido —o sin oferta
 * prendida—, su precio de lista. El que no participa vale siempre lo mismo,
 * haya reloj o no.
 *
 * La usan la pantalla (para mostrar) y la ruta (para cobrar): un solo lugar
 * donde está escrita la cuenta, así no pueden decir números distintos.
 */
export function precioDelUpsell(u: UpsellConPrecios, ofertaViva: boolean): number {
  if (ofertaViva || !entraEnLaOferta(u)) return u.price;
  return u.comparePrice as number;
}

/**
 * La oferta de ESTA visita, tal como se la pasa el servidor a la pantalla.
 * La usan las DOS que ofrecen el upsell —el checkout y la de gracias— con
 * el mismo tipo, para que no puedan interpretarla distinto.
 *
 * `null` = no hay (apagada, sin plan, o ningún upsell tiene precio de
 * lista); se muestra como siempre. `"vencida"` = esta persona ya tuvo su
 * plazo: al precio de lista, que es el que se va a cobrar. Son dos cosas
 * distintas y por eso no se juntan en `null`.
 */
export type OfertaDeUpsellEnPantalla =
  | { estado: "viva"; productoId: string; token: string; texto: string }
  | { estado: "vencida" };

/* ── El token en el navegador ───────────────────────────────────────────── */

/** Dónde lo guarda el navegador: cookie y localStorage, con la misma clave. */
export function claveDeOfertaUpsell(productId: string): string {
  return `pv_upsell_${productId}`;
}

/** La forma de un token nuestro: `<milisegundos>.<firma>`. Sólo la forma, no la firma. */
export const TOKEN_DE_UPSELL_RE = /^\d{10,16}\.[A-Za-z0-9_-]{24}$/;

/** Sólo la hora en que vence, sin verificar la firma: para que el navegador sepa qué mostrar. */
export function venceEnDelTokenDeUpsell(token: unknown): number | null {
  if (typeof token !== "string" || !TOKEN_DE_UPSELL_RE.test(token)) return null;
  const ts = Number(token.split(".")[0]);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/**
 * De todos los tokens que el navegador tiene a mano (la cookie, el
 * localStorage, el que trajo la página), con cuál se queda: el que vence
 * ANTES. Así recargar nunca estira el plazo.
 *
 * No verifica firmas —el navegador no puede—; el servidor lo hace al cobrar.
 * Un token inventado sólo puede acortarle el plazo a quien lo inventa.
 */
export function elTokenDeUpsellMasViejo(candidatos: Array<unknown>): string | null {
  let mejor: { token: string; venceEn: number } | null = null;
  for (const c of candidatos) {
    const v = venceEnDelTokenDeUpsell(c);
    if (v === null) continue;
    if (!mejor || v < mejor.venceEn) mejor = { token: c as string, venceEn: v };
  }
  return mejor?.token ?? null;
}
