import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { validarOfertaUpsell } from "@/lib/oferta-upsell";
import { validarCampos } from "@/lib/productos-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/digitales/productos/[id]/upsells — guardar la oferta del
 * upsell: el reloj de la caja "Sumá a tu compra".
 *
 * Guarda dos cosas en la misma transacción, porque son una sola idea:
 *
 *   1. El JSON de la oferta en el producto principal (`ofertaUpsell`).
 *   2. El precio de lista de cada upsell hijo (`comparePrice`), que es a lo
 *      que vuelve cuando el reloj llega a cero.
 *
 * ⚠️ Lo segundo es el mismo campo que en Productos se llama "Precio
 * original". Con la oferta prendida deja de ser un anclaje de marketing y
 * pasa a ser PLATA QUE SE COBRA, y por eso se puede tocar desde acá con ese
 * nombre: es el número de la oferta. No se duplica nada más del producto —el
 * nombre, el archivo y la imagen siguen viviendo sólo en Productos—, que es
 * lo que evita dos formularios que en tres meses dicen cosas distintas.
 *
 * Starter y Pro al día, como las otras dos ofertas con reloj.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`upsells:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/upsells");
  }

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const r = validarOfertaUpsell(cuerpo);
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });
  const oferta = r.datos;

  const { id } = await ctx.params;
  const [producto, sub] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
      select: {
        id: true,
        /* ⚠️ Los hijos se traen ACÁ, de la base, y no se confía en lo que
           mandó la pantalla: es lo que impide que alguien mande el id de un
           upsell de otro vendedor y le cambie el precio. Mismo criterio que
           `upsellsQueValen` en el cobro. */
        hijos: { where: { deletedAt: null, rolDigital: "UPSELL" }, select: { id: true, price: true } },
      },
    }),
    getUserSubscription(user.id),
  ]);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) {
    return NextResponse.json({ error: "La oferta del upsell es de los planes Starter y Pro." }, { status: 403 });
  }

  /* Los precios de lista, revisados uno por uno contra los hijos de verdad. */
  const precios: Array<{ id: string; comparePrice: number | null }> = [];
  const crudos = Array.isArray(cuerpo?.precios) ? cuerpo.precios : [];
  for (const c of crudos.slice(0, 20)) {
    const fila = (typeof c === "object" && c !== null ? c : {}) as Record<string, unknown>;
    const hijo = producto.hijos.find((h) => h.id === fila.id);
    if (!hijo) continue;
    if (fila.comparePrice === null || fila.comparePrice === "" || fila.comparePrice === undefined) {
      precios.push({ id: hijo.id, comparePrice: null });
      continue;
    }
    const n = typeof fila.comparePrice === "number" ? fila.comparePrice : Number(String(fila.comparePrice).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "El precio de después tiene que ser un número." }, { status: 400 });
    }
    /* ⚠️ LA MISMA FUNCIÓN QUE VALIDA EN PRODUCTOS, no una copia. Es el MISMO
       campo (`comparePrice`) y ahora se escribe desde dos pantallas: con
       reglas propias acá, esta ruta aceptaría un precio que aquélla rechaza
       —el tope, por ejemplo— y el número entraría por la puerta de al lado.
       `validarCampos` ya exige además que sea mayor que el precio de venta,
       que es justo lo que hace que el reloj cambie algo al terminar. */
    const mal = validarCampos({ price: hijo.price, comparePrice: n }, "UPSELL");
    if (mal) {
      return NextResponse.json(
        {
          error: n <= hijo.price
            ? "El precio de después tiene que ser mayor que el de la oferta: si no, el reloj no cambia nada al terminar."
            : mal,
        },
        { status: 400 },
      );
    }
    precios.push({ id: hijo.id, comparePrice: n });
  }

  /* ⚠️ Prendida sin ningún upsell que participe sería un reloj sobre nada.
     El checkout ya lo trata como apagada (`hayAlgunoQueParticipa`), pero se
     avisa acá para que no se guarde creyendo que quedó andando. */
  if (oferta.activa) {
    const quedan = producto.hijos.filter((h) => {
      const tocado = precios.find((p) => p.id === h.id);
      return tocado ? tocado.comparePrice !== null : false;
    });
    if (quedan.length === 0 && precios.length > 0) {
      return NextResponse.json(
        { error: "Ponele el precio de después a por lo menos un upsell, si no el reloj no tiene qué cambiar." },
        { status: 400 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: producto.id }, data: { ofertaUpsell: JSON.stringify(oferta) } });
      for (const p of precios) {
        await tx.product.update({ where: { id: p.id }, data: { comparePrice: p.comparePrice } });
      }
    });
  } catch (e) {
    console.error("[oferta-upsell] no se pudo guardar:", e);
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, oferta, precios });
}
