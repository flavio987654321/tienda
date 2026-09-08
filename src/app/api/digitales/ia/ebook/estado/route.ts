import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { estadoDelBorrador } from "@/lib/ebook-borrador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cómo viene el ebook. Sólo mira: no escribe, no llama al modelo, no gasta nada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA MITAD QUE FALTABA CUANDO LA ESCRITURA PASÓ AL SERVIDOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta hoy la pantalla se enteraba del avance porque ella MISMA pedía cada
 * capítulo: la respuesta del pedido traía el estado nuevo. Ahora quien escribe
 * es la cadena del servidor (ver `ebook-cadena`) y la pantalla no pide nada, así
 * que necesita a dónde mirar.
 *
 * ⚠️ Por eso esto no es un endpoint "de más": sin él, mover el bucle al servidor
 * dejaría la barra congelada en "3 de 10" hasta recargar la página. Se vería
 * como que se colgó, justo cuando la promesa nueva es que no hace falta mirar.
 *
 * ── Por qué no devuelve el texto ───────────────────────────────────────────
 *
 * `estadoDelBorrador` deja afuera los capítulos escritos a propósito: son
 * decenas de miles de caracteres que la pantalla no dibuja —dibuja una barra— y
 * que acá viajarían **en cada vuelta del reloj**, no una vez.
 *
 * ── El freno ───────────────────────────────────────────────────────────────
 *
 * No lleva los topes de IA porque no hay IA. Sí un freno común, porque es lo que
 * más seguido se va a pedir de todo el ecosistema: la pantalla pregunta cada
 * pocos segundos mientras se escribe. El número es holgado a propósito —una
 * escritura larga con la ventana abierta son unas cien preguntas— y lo que corta
 * es un bucle roto, no el uso normal.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`ebook-estado:${user.id}`, 600, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiadas consultas seguidas." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/estado");
  }

  const productoId = req.nextUrl.searchParams.get("productoId") ?? "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  /* El dueño adentro del `where`, igual que en las otras cuatro: sin esto,
     mandando el id de otro se le espía el avance a un producto ajeno. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      ebookIA: {
        select: {
          estado: true, titulo: true, indice: true, capitulos: true,
          trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ebook: estadoDelBorrador(producto.ebookIA) });
}
