import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizarContenido } from "@/lib/pagina-venta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guarda el contenido de la página de venta de un producto.
 *
 * ── Lo único que hace de verdad ─────────────────────────────────────────────
 *
 * Pasar lo que llega por `normalizarContenido` y guardar el resultado. **Nunca
 * lo que llegó.** Esa función es la que sabe qué secciones existen, cuáles no se
 * pueden apagar y cuánto mide cada campo; sin ella, esta ruta guardaría lo que
 * el navegador quiera —incluida una página sin precio— y la pantalla pública
 * dibujaría eso.
 *
 * Por eso no hay validación escrita acá. Duplicarla sería tener dos reglas para
 * lo mismo, y la que se queda vieja es la que nadie mira.
 */

/** Tope del cuerpo del pedido. Ver el porqué abajo. */
const MAX_CUERPO = 64 * 1024;

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`pagina-venta:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Guardaste muchas veces seguidas. Esperá un momento." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/pagina");
  }

  const { id } = await ctx.params;

  /* ⚠️ El cuerpo se lee como texto y se mide ANTES de parsearlo. Una página
     normalizada no llega a 20 KB, así que arriba de esto es basura o alguien
     probando cuánto aguantamos — y `JSON.parse` de varios megas bloquea el hilo
     mientras corre. */
  const crudo = await req.text().catch(() => null);
  if (crudo === null || crudo.length > MAX_CUERPO) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  /* Que sea de esta cuenta, y que sea un PRINCIPAL: los bonos y los upsells
     viajan adentro de la página de su padre, no tienen una propia. El dueño va
     ADENTRO del `where` y no se filtra después — una consulta que ya no puede
     devolver lo ajeno no se puede olvidar de comprobarlo. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    select: { id: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  const pagina = normalizarContenido(cuerpo);

  await prisma.product.update({
    where: { id: producto.id },
    data: { paginaVenta: JSON.stringify(pagina) },
  });

  /* Se devuelve lo GUARDADO, no un `ok`. La pantalla se queda con esto, así que
     si el servidor recortó un texto o descartó una sección, se ve en el acto y
     no la próxima vez que alguien entre. */
  return NextResponse.json({ ok: true, pagina });
}
