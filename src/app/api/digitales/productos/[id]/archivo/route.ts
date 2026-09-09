import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { rutaDeRef } from "@/lib/subida-digital";
import { configDeposito, enlaceDeDescarga } from "@/lib/deposito-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bajar el archivo del producto, **siendo el dueño**.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES LA RUTA DE ENTREGA, Y NO SE PARECE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `/api/digitales/descargar/[token]` entrega lo que alguien pagó: la
 * autorización es el token, no hay sesión —quien compra no tiene cuenta— y cada
 * visita **descuenta una descarga** de las cinco.
 *
 * Ésta es la otra: la usa quien vende, con su sesión, para mirar su propio
 * archivo. No descuenta nada, no tiene token y no se puede compartir — el
 * enlace firmado que devuelve dura cinco minutos y se pide de nuevo cada vez.
 *
 * ── Por qué faltaba, y por qué importa ─────────────────────────────────────
 *
 * Porque hasta hoy, cuando la IA terminaba de escribir un ebook, el archivo
 * aparecía en la tarjeta **como un renglón de texto**: "Archivo: guia.pdf ·
 * 2,1 MB". Se podía leer el nombre y nada más. Quien acaba de pagar una
 * generación quiere **abrirlo y leerlo** —y la ventana se lo pide, "leelo antes
 * de publicarlo"— y no tenía con qué. La única forma de ver el propio ebook era
 * comprárselo.
 *
 * ── Redirección, no el archivo ─────────────────────────────────────────────
 *
 * Igual que en la entrega: el PDF baja **derecho de Supabase al navegador**. Si
 * lo sirviéramos nosotros, uno de 50 MB chocaría contra el techo de 4,5 MB de la
 * plataforma y encima pagaríamos el tránsito dos veces.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* Un freno común: cada visita firma un enlace contra Supabase, y esto es un
     botón que se puede apretar seguido sin querer. */
  try {
    if (!(await checkRateLimit(`archivo-propio:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiadas descargas seguidas. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/archivo");
  }

  const { id } = await ctx.params;

  /* ⚠️ El dueño va adentro del `where`. Sin esto, mandando el id de otro se
     baja el producto que esa persona vende — el archivo entero, gratis. Es el
     agujero más caro que puede tener este panel. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, store: { ownerId: user.id } },
    select: { archivoPath: true, archivoNombre: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "No encontramos ese producto." }, { status: 404 });
  }

  const ruta = rutaDeRef(producto.archivoPath);
  if (!ruta) {
    return NextResponse.json({ error: "Este producto todavía no tiene archivo." }, { status: 404 });
  }

  const config = configDeposito();
  if (!config) {
    return NextResponse.json({ error: "Falta configurar Supabase Storage." }, { status: 500 });
  }

  const enlace = await enlaceDeDescarga(config, ruta);
  if (!enlace) {
    return NextResponse.json({ error: "No pudimos preparar la descarga. Probá de nuevo." }, { status: 502 });
  }

  /* ⚠️ Sin caché. El enlace vence en cinco minutos: uno guardado en el caché del
     navegador —o peor, en el de un intermediario— se entrega vencido y el botón
     "falla" sin motivo visible. */
  return NextResponse.redirect(enlace, {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
