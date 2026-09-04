import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { anthropic } from "@/lib/anthropic";
import { contarConTope } from "@/lib/rate-limit";
import {
  permitirGeneracion, MARGEN_DE_INTENTOS, VENTANA_DEL_EBOOK_MS,
} from "@/lib/ia-digitales";
import {
  INSTRUCCIONES_CAPITULO, ESQUEMA_DEL_CAPITULO, normalizarCapitulo,
  leerIndice, leerCapitulos, elCapituloQueSigue, pedidoDelCapitulo,
} from "@/lib/ebook-ia";
import { estadoDelBorrador, tomarElCandado, guardarCapitulo, soltarElCandado } from "@/lib/ebook-borrador";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Escribir el capítulo que sigue.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTA RUTA NO COBRA — Y ES LA QUE MÁS PLATA GASTA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El cupo se gastó al armar el temario. Acá se escribe lo que ya está pagado,
 * un capítulo por pedido, porque diez capítulos no entran en los 60 segundos
 * que dura una función en este plan.
 *
 * O sea que **el freno de acá no es el cupo, son otros dos**:
 *
 * 1. **El candado.** Dos pedidos a la vez escribirían dos veces el mismo
 *    capítulo. Vence solo, así que un pedido muerto no traba el ebook.
 * 2. **El presupuesto de llamadas de ESE ebook.** Es el único agujero sin
 *    fondo que tiene esta función: una pantalla con un bucle mal escrito —o
 *    alguien apretando F5— puede pedir "escribime el que falta" para siempre.
 *    Cada intento fallido no le gasta cupo a la persona, pero nos cuesta plata
 *    igual.
 *
 * ── Lo que devuelve ────────────────────────────────────────────────────────
 *
 * El estado entero del borrador, para que la pantalla dibuje la barra y sepa si
 * tiene que volver a llamar. **Sin el texto de los capítulos**: son decenas de
 * miles de caracteres que viajarían en cada vuelta para nada.
 */

/* 50 segundos: por debajo de los 60 que dura la función, así el error lo damos
   nosotros con un mensaje y no la plataforma con una pantalla en blanco. */
const ESPERA_MS = 50_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-ebook-paso] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "La IA no está disponible en este momento." }, { status: 503 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;

  /* La ráfaga de los capítulos es más alta que la del botón de una sola
     llamada, y no toca los globales: el ebook los tocó al empezar. Ver
     `ia-digitales`. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: getSubscriptionStatus(sub) === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "capitulo",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ebook-paso] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  /* El dueño va adentro del `where`, igual que en la ruta de empezar. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      ebookIA: {
        select: {
          id: true, estado: true, titulo: true, tema: true, publico: true,
          indice: true, capitulos: true, trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  const ebook = producto.ebookIA;
  const indice = leerIndice(ebook.indice);
  const escritos = leerCapitulos(ebook.capitulos);
  const sigue = elCapituloQueSigue(indice, escritos);

  /* Ya está completo: se contesta que sí sin llamar al modelo. Que la pantalla
     pida uno de más no puede costar plata. */
  if (!sigue) {
    return NextResponse.json({ ok: true, listo: true, ebook: estadoDelBorrador(ebook) });
  }

  /* ⚠️ EL PRESUPUESTO DE ESTE EBOOK. Es el número de capítulos más un margen:
     alcanza para que cada capítulo falle una vez y se reintente, y no para
     mucho más. Va contra el id del ebook y no contra la cuenta, así que un
     ebook que se descontrola no le come el presupuesto a otro.

     Con ventana de dos horas: que se olvide es correcto — quien retoma su
     ebook al día siguiente arranca con el margen entero, que es justo el caso
     para el que se guardó el borrador. */
  try {
    const presupuesto = await contarConTope(
      `ia-ebook-llamadas:${ebook.id}`,
      indice.length + MARGEN_DE_INTENTOS,
      VENTANA_DEL_EBOOK_MS,
    );
    if (!presupuesto.permitido) {
      console.error("[ia-ebook-paso] un ebook se pasó de su presupuesto de llamadas", {
        ebookId: ebook.id, userId: user.id, cuenta: presupuesto.cuenta,
      });
      return NextResponse.json({
        error: "Este ebook tuvo demasiados intentos seguidos. Esperá un rato y seguí, o volvé a empezarlo.",
      }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ebook-paso] no se pudo contar el presupuesto, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  /* ⚠️ El candado. Si otro pedido está escribiendo, este se va sin gastar. */
  const marca = await tomarElCandado(ebook.id);
  if (!marca) {
    return NextResponse.json({
      ok: true,
      esperando: true,
      ebook: estadoDelBorrador(ebook),
    });
  }

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 3000,
        system: INSTRUCCIONES_CAPITULO,
        tools: [{
          name: "escribir_capitulo",
          description: "Devuelve el capítulo en pedazos: párrafos, subtítulos y viñetas.",
          input_schema: ESQUEMA_DEL_CAPITULO,
        }],
        tool_choice: { type: "tool", name: "escribir_capitulo" },
        messages: [{
          role: "user",
          content: pedidoDelCapitulo(ebook.titulo, ebook.tema, ebook.publico, indice, sigue.numero),
        }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-ebook-paso] falló la llamada a Anthropic", e);
    /* Se suelta el candado ya: sin esto habría que esperar los 90 segundos del
       vencimiento para reintentar, y quien mira la barra no entiende por qué el
       botón no hace nada. */
    await soltarElCandado(ebook.id, marca);
    return NextResponse.json({
      error: `No pudimos escribir el capítulo ${sigue.numero}. Probá de nuevo: lo que ya está escrito no se pierde.`,
    }, { status: 502 });
  }

  console.log("[ia-ebook-paso] usage", {
    userId: user.id, ebookId: ebook.id, capitulo: sigue.numero,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  const capitulo = bloque ? normalizarCapitulo(bloque.input, sigue.capitulo.titulo) : null;

  if (!capitulo) {
    console.error("[ia-ebook-paso] el capítulo no tenía la forma esperada", {
      ebookId: ebook.id, capitulo: sigue.numero, stop: respuesta.stop_reason,
    });
    await soltarElCandado(ebook.id, marca);
    return NextResponse.json({
      error: `El capítulo ${sigue.numero} salió incompleto. Probá de nuevo: lo anterior no se pierde.`,
    }, { status: 502 });
  }

  const nuevos = [...escritos, capitulo];
  /* COMPLETO quiere decir "están todos los capítulos, falta el PDF". No es lo
     mismo que LISTO, que es cuando el archivo ya está colgado del producto. */
  const nuevoEstado = nuevos.length >= indice.length ? "COMPLETO" : "ESCRIBIENDO";

  const guardado = await guardarCapitulo(ebook.id, marca, JSON.stringify(nuevos), nuevoEstado);
  if (!guardado) {
    /* Perdimos el candado mientras escribíamos: otro pedido escribió este
       capítulo. Se tira lo nuestro — costó plata, pero está peor pisar lo del
       otro. Se relee para contestar con lo que de verdad hay. */
    console.warn("[ia-ebook-paso] se perdió el candado, se descarta el capítulo escrito", {
      ebookId: ebook.id, capitulo: sigue.numero,
    });
    const fresco = await prisma.ebookIA.findUnique({
      where: { id: ebook.id },
      select: {
        estado: true, titulo: true, indice: true, capitulos: true,
        trabajandoDesde: true, error: true, reintentos: true,
      },
    });
    return NextResponse.json({
      ok: true,
      ebook: fresco ? estadoDelBorrador(fresco) : estadoDelBorrador(ebook),
    });
  }

  return NextResponse.json({
    ok: true,
    listo: nuevoEstado === "COMPLETO",
    ebook: estadoDelBorrador({
      ...ebook,
      estado: nuevoEstado,
      capitulos: JSON.stringify(nuevos),
      trabajandoDesde: null,
      error: null,
    }),
  });
}
