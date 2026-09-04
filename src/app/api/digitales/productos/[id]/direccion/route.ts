import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizarSlug, validarSlug } from "@/lib/configuracion-digital";
import { estaLibre, reservarSlug, direccionDelProducto } from "@/lib/direccion-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La dirección de un producto: mirar si un nombre está libre, y quedárselo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * GET mira. POST se lo queda. Y mirar NO reserva.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Entre que el GET dice "libre" y el POST guarda, otro se lo puede haber
 * llevado. Por eso el que garantiza es el POST —con el candado adentro, ver
 * `direccion-digital`— y el GET es sólo para no hacer escribir en vano.
 *
 * ── Por qué las dos piden dueño ────────────────────────────────────────────
 *
 * El POST es obvio. El GET también, y no es paranoia: sin dueño sería una
 * ventanilla abierta para preguntar por cualquier nombre de la plataforma. Los
 * subdominios son públicos igual —se ven entrando—, pero una lista se arma
 * distinto que una consulta de a una.
 */

/** Todas las respuestas de acá adentro necesitan lo mismo: el producto es tuyo. */
async function elProducto(id: string, userId: string) {
  return prisma.product.findFirst({
    /* ⚠️ El dueño adentro del `where`, y sólo un PRINCIPAL: un bono no tiene
       dirección porque no es una página que alguien visite. */
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: userId } },
    select: { id: true, name: true, slugDigital: true, isActive: true },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const producto = await elProducto(id, user.id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  const pedido = req.nextUrl.searchParams.get("slug") ?? "";
  const problema = validarSlug(pedido);
  if (problema) return NextResponse.json({ libre: false, motivo: problema });

  const slug = normalizarSlug(pedido);

  /* El propio nombre del producto cuenta como libre: si no, no se puede guardar
     sin cambiarlo y la pantalla diría "ocupado" señalando a sí misma. */
  const libre = await estaLibre(slug, producto.id);

  return NextResponse.json({
    libre,
    slug,
    direccion: direccionDelProducto(slug),
    motivo: libre ? null : "Esa dirección ya está en uso. Probá con otra.",
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  /* Escribe y toma un candado de la base. Va con freno aunque no cueste plata:
     un candado tomado mil veces por minuto es un problema para todos. */
  try {
    if (!(await checkRateLimit(`direccion:${user.id}`, 40, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/direccion");
  }

  const { id } = await ctx.params;
  const producto = await elProducto(id, user.id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const pedido = typeof body?.slug === "string" ? body.slug : "";

  const resultado = await reservarSlug(producto.id, pedido);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    slug: resultado.slug,
    direccion: direccionDelProducto(resultado.slug),
  });
}
