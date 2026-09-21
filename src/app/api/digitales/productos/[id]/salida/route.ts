import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { validarOfertaSalida, codigoDeLaOferta } from "@/lib/oferta-salida";
import { MAX_CUPONES_POR_CUENTA } from "@/lib/cupones-digitales";
import { guardarCuponAutomatico } from "@/lib/cupones-automaticos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/digitales/productos/[id]/salida — guardar la oferta de salida.
 *
 * Guarda el JSON en el producto y, si es un descuento, crea o actualiza el
 * cupón `SALIDA-…` de ESE producto en la misma transacción
 * (`guardarCuponAutomatico`, el mismo que usa el precio de bienvenida):
 * prendido si la oferta está prendida, apagado si no. Así el descuento es un
 * cupón real, cobrado por la misma ruta que cualquier otro, y aparece en Cupones.
 *
 * Starter y Pro al día. El producto más barato, si lo hay, tiene que ser
 * otro principal PROPIO: un id ajeno no guarda nada.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`oferta-salida:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/salida");
  }

  const r = validarOfertaSalida(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });
  const oferta = r.datos;

  const { id } = await ctx.params;
  const [producto, sub] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
      select: { id: true, storeId: true },
    }),
    getUserSubscription(user.id),
  ]);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) {
    return NextResponse.json({ error: "La oferta de salida es de los planes Starter y Pro." }, { status: 403 });
  }

  if (oferta.tipo === "PRODUCTO") {
    if (oferta.productoId === producto.id) return NextResponse.json({ error: "Elegí OTRO producto: el más barato no puede ser el mismo." }, { status: 400 });
    const otro = await prisma.product.findFirst({
      where: { id: oferta.productoId ?? "", deletedAt: null, rolDigital: "PRINCIPAL", storeId: producto.storeId },
      select: { id: true },
    });
    if (!otro) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  }

  const codigo = codigoDeLaOferta(producto.id);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: producto.id }, data: { ofertaSalida: JSON.stringify(oferta) } });
      if (oferta.tipo === "DESCUENTO") {
        await guardarCuponAutomatico(tx, { storeId: producto.storeId, productId: producto.id, codigo, porcentaje: oferta.porcentaje, activo: oferta.activa });
      } else {
        /* Con producto más barato el cupón no se usa: se apaga, no se borra
           (las ventas que lo usaron lo nombran). */
        await tx.cuponDigital.updateMany({ where: { storeId: producto.storeId, codigo }, data: { activo: false } });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TOPE") {
      return NextResponse.json({ error: `Ya tenés ${MAX_CUPONES_POR_CUENTA} cupones y la oferta necesita uno. Borrá alguno que no uses.` }, { status: 409 });
    }
    console.error("[oferta-salida] no se pudo guardar:", e);
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, oferta });
}
