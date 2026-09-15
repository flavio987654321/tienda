import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { validarCuponNuevo, MAX_CUPONES_POR_CUENTA } from "@/lib/cupones-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/cupones — crear un cupón de la cuenta.
 *
 * La lista la trae la pantalla en el servidor; acá sólo se crea. Con tope de
 * cupones por cuenta (con más, la lista deja de ser una lista) y de ritmo.
 * El producto, si viene, tiene que ser un principal de ESTA cuenta: un id
 * ajeno no crea nada.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`cupones:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/cupones");
  }

  const r = validarCuponNuevo(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Primero cargá un producto." }, { status: 409 });

  if (r.datos.productId) {
    const propio = await prisma.product.findFirst({
      where: { id: r.datos.productId, deletedAt: null, rolDigital: "PRINCIPAL", storeId: store.id },
      select: { id: true },
    });
    if (!propio) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  }

  const cuantos = await prisma.cuponDigital.count({ where: { storeId: store.id } });
  if (cuantos >= MAX_CUPONES_POR_CUENTA) {
    return NextResponse.json({ error: `Ya tenés ${MAX_CUPONES_POR_CUENTA} cupones. Borrá alguno que no uses.` }, { status: 409 });
  }

  try {
    const creado = await prisma.cuponDigital.create({
      data: { storeId: store.id, ...r.datos },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: creado.id });
  } catch (e) {
    /* La clave única (tienda, código): el mismo código dos veces. */
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya tenés un cupón con ese código." }, { status: 409 });
    }
    console.error("[cupones] no se pudo crear:", e);
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}
