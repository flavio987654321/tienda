import { cookies } from "next/headers";
import { isSubscriptionActive } from "@/lib/subscription";
import { leerOfertaUpsell, claveDeOfertaUpsell } from "@/lib/oferta-upsell";
import { firmarUpsell, leerTokenDeUpsell, hayClaveDeFirma } from "@/lib/oferta-salida-firma";

/**
 * La oferta del upsell contra la base y la cookie: qué le toca a ESTA
 * visita. La usan el checkout (para dibujar y para firmar el plazo) y la
 * ruta que cobra (para decidir el precio), con la misma función: así la
 * pantalla no puede prometer un precio que después no se cobra.
 *
 * ── Tres respuestas ─────────────────────────────────────────────────────────
 *
 *   - `null`: no hay oferta para nadie (apagada, sin plan, o ningún upsell
 *     de este producto participa). La caja sale con sus precios de siempre
 *     y sin reloj.
 *   - `"vencida"`: esta persona ya tuvo su plazo y pasó. Precio de lista,
 *     sin reloj. Es distinto de `null` a propósito: no se le da otro token.
 *   - `"viva"`: tiene plazo (el que traía, o uno nuevo si es la primera
 *     vez). Precio de oferta y el reloj contando hasta `venceEn`.
 *
 * ── La cookie la escribe el navegador, no el servidor ───────────────────────
 *
 * Igual que en el precio de bienvenida: un componente de servidor no puede
 * mandar `Set-Cookie`, así que el token nuevo viaja en la página y el
 * navegador lo guarda. El servidor sólo LEE la cookie, y la verifica: una
 * tocada se ignora y se firma otra, que es lo mismo que pasaría borrándola.
 *
 * ⚠️ Y por eso el plazo NO se guarda en la base: no hace falta una fila por
 * visitante para sostener un reloj, y guardarla sería anotar a gente que no
 * compró nada.
 */

export type OfertaUpsellDeLaVisita =
  | { estado: "viva"; token: string; venceEn: number; texto: string }
  | { estado: "vencida" }
  | null;

type FilaConOfertaUpsell = {
  id: string;
  ofertaUpsell: string | null;
  store: { owner: { subscription: { tier: string; status: string; trialEndsAt: Date; currentPeriodEnd: Date | null; gracePeriodEndsAt: Date | null } | null } };
};

/** La cookie de este producto, si el navegador la mandó. */
export async function tokenDeUpsellDeLaCookie(productId: string): Promise<string | undefined> {
  return (await cookies()).get(claveDeOfertaUpsell(productId))?.value;
}

/**
 * `candidatos`: los tokens que llegaron con el pedido —la cookie, y al
 * cobrar también el que manda el checkout—. Se verifican todos y manda el
 * que vence ANTES: si alguno ya venció, la persona ya tuvo su plazo. Sin
 * ninguno nuestro, es la primera vez y se firma uno nuevo.
 *
 * `hayAlgunoQueParticipa` lo decide quien llama, porque es quien tiene los
 * hijos del producto a mano: sin ningún upsell con precio de lista cargado,
 * la oferta no existe aunque esté prendida (ver `entraEnLaOferta`).
 *
 * ⚠️ `firmarSiNoHay` es la diferencia entre DIBUJAR y COBRAR, y no es un
 * detalle de comodidad:
 *
 *   - El checkout dibuja con `true`: quien entra por primera vez no tiene
 *     token, y hay que darle uno para que su reloj arranque.
 *   - La ruta que cobra va con `false`: sin un token válido, NO se firma
 *     uno nuevo. Con `true`, a cualquiera le alcanzaría con no mandar el
 *     token —o mandar uno tocado— para que el servidor le firmara un plazo
 *     fresco en el mismo momento de pagar y le cobrara el precio de oferta
 *     para siempre. El reloj sería un adorno, que es justo lo que esto no es.
 */
export function ofertaUpsellDeLaVisita(
  fila: FilaConOfertaUpsell,
  candidatos: Array<string | undefined>,
  hayAlgunoQueParticipa: boolean,
  /* `ahora` va adentro de las opciones y no como parámetro suelto: así quien
     sólo quiere `firmarSiNoHay` no tiene que escribir `Date.now()` para
     llegar hasta él. Escribirlo en una pantalla, además, es una llamada
     impura en el dibujo y el linter la frena — con razón. */
  { firmarSiNoHay = true, ahora = Date.now() }: { firmarSiNoHay?: boolean; ahora?: number } = {},
): OfertaUpsellDeLaVisita {
  const o = leerOfertaUpsell(fila.ofertaUpsell);
  if (!o.activa || !hayAlgunoQueParticipa) return null;
  /* Sin clave no hay plazo que firmar ni que leer: la caja sale con los
     precios de siempre y el error queda en el log. Nunca un 500 acá. */
  if (!hayClaveDeFirma("la oferta del upsell")) return null;
  /* Starter y Pro al día, como las otras dos ofertas con reloj. Si el plan
     vence, el checkout vuelve solo al precio de lista y no se pierde lo
     configurado. */
  const sub = fila.store.owner.subscription;
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) return null;

  let elegido: { token: string; venceEn: number } | null = null;
  for (const c of candidatos) {
    const leido = leerTokenDeUpsell(c, fila.id, ahora);
    if (!leido) continue;
    if (!leido.vivo) return { estado: "vencida" };
    if (!elegido || leido.venceEn < elegido.venceEn) elegido = { token: c as string, venceEn: leido.venceEn };
  }
  if (!elegido && !firmarSiNoHay) return { estado: "vencida" };

  const venceEn = elegido ? elegido.venceEn : ahora + o.minutos * 60_000;
  const token = elegido ? elegido.token : firmarUpsell(fila.id, venceEn);

  return { estado: "viva", token, venceEn, texto: o.texto };
}
