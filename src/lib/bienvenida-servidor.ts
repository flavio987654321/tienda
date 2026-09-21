import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";
import { leerBienvenida, codigoDeBienvenida, precioDeBienvenida, claveDeBienvenida } from "@/lib/bienvenida";
import { firmarBienvenida, leerTokenDeBienvenida, hayClaveDeFirma } from "@/lib/oferta-salida-firma";

/**
 * El precio de bienvenida contra la base y la cookie: qué le toca a ESTA
 * visita. Lo usan la página de venta (las dos: la de secciones y la landing
 * propia) y el checkout, con la misma función, así los tres dicen lo mismo.
 *
 * ── Tres respuestas ─────────────────────────────────────────────────────────
 *
 *   - `null`: no hay precio de bienvenida para nadie (apagado, sin plan, o
 *     el cupón no está). La página se dibuja como siempre.
 *   - `"vencida"`: esta persona YA tuvo su plazo y pasó. Precio normal, sin
 *     reloj. Es distinto de `null` a propósito: no se le da otro token.
 *   - `"viva"`: tiene plazo (el que traía, o uno nuevo si es la primera
 *     vez). Precio con descuento y el reloj contando hasta `venceEn`.
 *
 * ── La cookie la escribe el navegador, no el servidor ───────────────────────
 *
 * Un componente de servidor no puede mandar `Set-Cookie` (Next lo reserva
 * para las rutas y las acciones). Así que el token nuevo viaja en la página
 * y el navegador lo guarda —cookie y localStorage— la primera vez. El
 * servidor sólo LEE la cookie, y la verifica: una tocada se ignora y se da
 * un token nuevo, que es lo mismo que pasaría borrándola. Ver `lib/bienvenida`
 * por qué eso no es un agujero.
 */

export type BienvenidaDeLaVisita =
  | {
      estado: "viva";
      token: string;
      venceEn: number;
      codigo: string;
      porcentaje: number;
      /** Lo que paga mientras el reloj corre. */
      precio: number;
      /** Lo que vale sin el descuento: es lo que se tacha. */
      precioNormal: number;
      texto: string;
    }
  | { estado: "vencida" }
  | null;

type FilaConBienvenida = {
  id: string;
  price: number;
  bienvenida: string | null;
  store: { id: string; owner: { subscription: { tier: string; status: string; trialEndsAt: Date; currentPeriodEnd: Date | null; gracePeriodEndsAt: Date | null } | null } };
};

/** La cookie de este producto, si el navegador la mandó. */
export async function tokenDeBienvenidaDeLaCookie(productId: string): Promise<string | undefined> {
  return (await cookies()).get(claveDeBienvenida(productId))?.value;
}

/**
 * `candidatos`: los tokens que llegaron con el pedido —la cookie, y en el
 * checkout también el del link—. Se verifican todos y manda el que vence
 * ANTES: si alguno ya venció, la persona ya tuvo su plazo. Sin ninguno
 * nuestro, es la primera vez y se firma uno nuevo.
 */
export async function bienvenidaDeLaVisita(fila: FilaConBienvenida, candidatos: Array<string | undefined>, ahora = Date.now()): Promise<BienvenidaDeLaVisita> {
  const b = leerBienvenida(fila.bienvenida);
  if (!b.activa || !(fila.price > 0)) return null;
  /* Sin clave no hay plazo que firmar ni que leer: la página sale con el
     precio normal y el error queda en el log. Nunca un 500 acá. */
  if (!hayClaveDeFirma("el precio de bienvenida")) return null;
  /* Starter y Pro al día, como la oferta de salida. Si el plan vence, la
     página vuelve sola al precio normal y no se pierde lo configurado. */
  const sub = fila.store.owner.subscription;
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) return null;

  /* El cupón tiene que existir y estar prendido: si la dueña lo apagó desde
     Cupones, no se promete un descuento que al pagar no aplica. Y el
     porcentaje que se muestra es EL DEL CUPÓN, que es el que se cobra. */
  const codigo = codigoDeBienvenida(fila.id);
  const cupon = await prisma.cuponDigital.findUnique({
    where: { storeId_codigo: { storeId: fila.store.id, codigo } },
    select: { activo: true, valor: true, tipo: true },
  });
  if (!cupon || !cupon.activo || cupon.tipo !== "PORCENTAJE") return null;

  let elegido: { token: string; venceEn: number } | null = null;
  for (const c of candidatos) {
    const leido = leerTokenDeBienvenida(c, fila.id, ahora);
    if (!leido) continue;
    if (!leido.vivo) return { estado: "vencida" };
    if (!elegido || leido.venceEn < elegido.venceEn) elegido = { token: c as string, venceEn: leido.venceEn };
  }
  const venceEn = elegido ? elegido.venceEn : ahora + b.minutos * 60_000;
  const token = elegido ? elegido.token : firmarBienvenida(fila.id, venceEn);

  return {
    estado: "viva",
    token,
    venceEn,
    codigo,
    porcentaje: cupon.valor,
    precio: precioDeBienvenida(fila.price, cupon.valor),
    precioNormal: fila.price,
    texto: b.texto,
  };
}
