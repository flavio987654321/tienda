import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { validarBienvenida, codigoDeBienvenida } from "@/lib/bienvenida";
import { MAX_CUPONES_POR_CUENTA } from "@/lib/cupones-digitales";
import { guardarCuponAutomatico } from "@/lib/cupones-automaticos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/digitales/productos/[id]/bienvenida — guardar el precio de
 * bienvenida.
 *
 * Guarda el JSON en el producto y crea o actualiza el cupón `BIENVENIDA-…`
 * de ESE producto en la misma transacción (`guardarCuponAutomatico`, el
 * mismo que la oferta de salida): prendido si está prendido, apagado si no.
 * El descuento es un cupón real, cobrado por la misma ruta que cualquier
 * otro y que sólo aplica con el plazo firmado vivo (`lib/cupones-automaticos`).
 *
 * Starter y Pro al día, como la oferta de salida.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`bienvenida:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/bienvenida");
  }

  const r = validarBienvenida(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });
  const bienvenida = r.datos;

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
    return NextResponse.json({ error: "El precio de bienvenida es de los planes Starter y Pro." }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: producto.id }, data: { bienvenida: JSON.stringify(bienvenida) } });
      await guardarCuponAutomatico(tx, {
        storeId: producto.storeId, productId: producto.id, codigo: codigoDeBienvenida(producto.id),
        porcentaje: bienvenida.porcentaje, activo: bienvenida.activa,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TOPE") {
      return NextResponse.json({ error: `Ya tenés ${MAX_CUPONES_POR_CUENTA} cupones y el precio de bienvenida necesita uno. Borrá alguno que no uses.` }, { status: 409 });
    }
    console.error("[bienvenida] no se pudo guardar:", e);
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bienvenida });
}
