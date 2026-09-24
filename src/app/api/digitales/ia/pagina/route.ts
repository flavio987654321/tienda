import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { permitirGeneracion } from "@/lib/ia-digitales";
import { consumirDelCupo, devolverAlCupo, estadoDelCupo } from "@/lib/cupo-ia";
import { esquemaDeLaPagina, INSTRUCCIONES_PAGINA, fusionarPaginaIA } from "@/lib/pagina-ia";
import { normalizarContenido } from "@/lib/pagina-venta";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";
import { laDireccionMuestraTuDiseno } from "@/lib/landing-del-producto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Escribir la página de venta de un producto con IA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEVUELVE LA PÁGINA. NO LA GUARDA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Igual que la del embudo, y por el mismo motivo: lo que se publica en una
 * página que cobra lo firma quien vende, así que tiene que haberlo visto antes.
 * El editor la recibe como borrador, la persona la mira en la previa que ya
 * existe, y guarda con el botón de siempre.
 *
 * Y así tampoco hay que duplicar acá la validación de guardar: la ruta del
 * editor sigue siendo la única que escribe `paginaVenta`.
 *
 * ── Lo que NO escribe, y es lo importante ──────────────────────────────────
 *
 * Opiniones, garantía y las dos de urgencia. Ver `lib/pagina-ia`: no es alcance,
 * es la línea entre escribir una página y fabricar prueba.
 *
 * ── El costo ───────────────────────────────────────────────────────────────
 *
 * Es la generación más cara de las baratas: son ocho secciones con listas
 * adentro, o sea varias veces el texto de las tres fichas del embudo. Sigue
 * estando a años luz del ebook (US$2–4). El `console.log` de abajo deja el
 * número real de cada llamada para poder revisarlo con uso de verdad.
 */

const ESPERA_MS = 90_000;
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-pagina] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "La IA no está disponible en este momento." }, { status: 503 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;
  const estado = getSubscriptionStatus(sub);

  /* Los topes primero, antes de leer el cuerpo y antes de tocar la base: un
     pedido rechazado no tiene que costar nada. Y si Redis no contesta, se frena:
     del otro lado hay algo que se paga. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: estado === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "pagina",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-pagina] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite de generaciones. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const productoId = typeof (body as { productoId?: unknown })?.productoId === "string"
    ? (body as { productoId: string }).productoId
    : "";
  if (!ID_RE.test(productoId)) {
    return NextResponse.json({ error: "No sabemos de qué producto es." }, { status: 400 });
  }

  /* ⚠️ El producto tiene que ser SUYO, y se pide con el dueño adentro del
     `where`. Sin esto, cualquier cuenta digital le escribe —y le lee— la página
     al producto de otra persona con sólo cambiar el identificador. */
  const producto = await prisma.product.findFirst({
    where: {
      id: productoId,
      deletedAt: null,
      rolDigital: "PRINCIPAL",
      store: { ownerId: user.id },
    },
    select: {
      id: true, name: true, description: true, price: true, paginaVenta: true, landingPropia: true,
      /* Los bonos y upsells, para que la sección de bonos hable de los que hay
         de verdad en vez de inventar regalos que nadie va a recibir. */
      hijos: {
        where: { deletedAt: null },
        select: { name: true, description: true, rolDigital: true },
        take: 10,
      },
    },
  });

  /* "No es tuyo" y "no existe" contestan lo mismo: distinguirlos deja averiguar
     qué productos hay del otro lado. */
  if (!producto) {
    return NextResponse.json({ error: "No encontramos ese producto." }, { status: 404 });
  }
  /* Con su propio diseño EN PANTALLA, esta página no la ve nadie: escribirla
     con IA gasta una generación (y plata nuestra) en vano. El botón está
     apagado en el panel; acá se cierra también, por si el pedido viene de
     otro lado.

     "En pantalla" y no "prendido": son dos cosas distintas desde el 24/09/26.
     Con el interruptor prendido y el plan caído a Free, la dirección muestra
     ESTA página — y acá se cortaba igual, o sea que se le negaba escribir la
     única página que le estaba vendiendo. Ver `landing-del-producto`. */
  if (laDireccionMuestraTuDiseno(producto.landingPropia, sub)) {
    return NextResponse.json({ error: "Tu dirección está mostrando tu propio diseño: esta página está apagada y no gasta generaciones. Apagá tu diseño para escribirla con IA." }, { status: 409 });
  }
  /**
   * ⚠️ ACÁ LA PRIMERA PÁGINA DE CADA PRODUCTO ERA GRATIS. SE SACÓ EL 08/09/26.
   *
   * ── Por qué existía ────────────────────────────────────────────────────
   *
   * Porque armar el embudo NO escribía la página: creaba las tres fichas y se
   * detenía. Sin el regalo, tener el embudo completo costaba dos generaciones y
   * quien probaba el producto por primera vez se quedaba a mitad de camino sin
   * entender por qué. Era un parche del flujo partido en dos.
   *
   * ── Por qué se fue ─────────────────────────────────────────────────────
   *
   * **Ese flujo se juntó en uno el mismo día**: armar el embudo ahora escribe la
   * página en el mismo paso (ver `EmbudoIA`). El parche sobrevivió al problema
   * que parchaba.
   *
   * ⚠️ Y mientras sobrevivía era el ÚNICO agujero de los cinco caminos de IA que
   * tiene el ecosistema. El comentario que estaba acá decía que no se podía
   * abusar *"porque hay un producto por página del plan, y borrar uno para
   * recrearlo cuesta una generación del cupo en el embudo"*. Eso es cierto sólo
   * si se recrea CON el embudo: **crear un producto a mano no gasta nada**. El
   * bucle era crear a mano → página gratis → borrar → repetir, sin techo.
   *
   * Lo único que lo frenaba eran los topes de ráfaga —8 cada 10 minutos por
   * cuenta, 150 por día para todo Free junto—, así que la plata estaba acotada;
   * el daño real era que **una sola cuenta se comiera el presupuesto diario de
   * Free** y dejara sin IA a las demás.
   *
   * ── Lo que se hizo en vez de ponerle techo ─────────────────────────────
   *
   * Nada. Se borró la regla. Un techo hubiera sido un contador más que mantener,
   * y con la excepción afuera **no queda ningún camino gratis**: no hay nada que
   * farmear, nada que contar y nada que bloquear.
   *
   * El único ajuste fue del otro lado: Free pasó de 3 generaciones a 4, para que
   * un embudo completo —que ahora cuesta 2— entre dos veces. Ver `CUPO_EMBUDO`.
   */
  const bolsa = await consumirDelCupo(user.id, tier);
  if (!bolsa) {
    const cupo = await estadoDelCupo(user.id, tier);
    return NextResponse.json({
      error: cupo.topeDelMes > 0
        ? `Usaste todas tus generaciones. El 1° del mes que viene tenés ${cupo.topeDelMes} nuevas.`
        : `Usaste las ${cupo.topeDeBienvenida} generaciones del plan gratis. En Starter tenés 6 al empezar y 5 por mes.`,
      sinCupo: true,
      cupo,
    }, { status: 429 });
  }

  const bonos = producto.hijos.filter((h) => h.rolDigital === "BONO");
  const upsells = producto.hijos.filter((h) => h.rolDigital === "UPSELL");

  /* Lo que el modelo sabe del producto. Va marcado y al final, igual que en el
     embudo: es lo único no confiable del pedido, y lo que de verdad lo frena no
     es una frase sino la forma de la salida — sólo puede llenar los campos que
     el esquema declara. */
  const contexto = [
    `<producto>`,
    `Nombre: ${producto.name}`,
    producto.description ? `Descripción: ${producto.description.slice(0, 2000)}` : "",
    `Precio: $${Math.round(producto.price)} pesos argentinos`,
    bonos.length
      ? `Bonos que van de regalo: ${bonos.map((b) => b.name).join(" | ")}`
      : "No tiene bonos de regalo cargados.",
    upsells.length ? `Oferta posterior: ${upsells.map((u) => u.name).join(" | ")}` : "",
    `</producto>`,
  ].filter(Boolean).join("\n");

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        /* Ocho secciones con listas adentro: hay que dejarle lugar. Corto de
           más, la respuesta se trunca a la mitad de una sección y no sirve. */
        max_tokens: 8000,
        system: INSTRUCCIONES_PAGINA,
        tools: [{
          name: "escribir_pagina",
          description: "Llená todas las secciones de la página de venta.",
          /* ⚠️ El esquema se DERIVA del catálogo, no está escrito a mano: un
             campo nuevo en el editor entra solo, y uno que se saca deja de
             pedirse. Ver `esquemaDeLaPagina`. */
          input_schema: esquemaDeLaPagina(),
        }],
        tool_choice: { type: "tool", name: "escribir_pagina" },
        messages: [{ role: "user", content: `Escribí la página de venta de esto:\n\n${contexto}` }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-pagina] falló la llamada a Anthropic", e);
    if (bolsa) await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "No pudimos escribirla en este momento. Probá de nuevo en un minuto." },
      { status: 502 },
    );
  }

  console.log("[ia-pagina] usage", {
    userId: user.id,
    tier,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  /* ⚠️ MERGE sobre lo que ya tenía, nunca reemplazo: el estilo, la paleta, el
     orden y las secciones que la IA no toca quedan como estaban. Regenerar el
     texto no puede borrar el diseño. */
  const actual = normalizarContenido(producto.paginaVenta);
  const pagina = bloque ? fusionarPaginaIA(actual, bloque.input) : null;

  if (!pagina) {
    console.error("[ia-pagina] la respuesta no tenía la forma esperada", {
      userId: user.id,
      stop: respuesta.stop_reason,
    });
    if (bolsa) await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "Nos salió algo raro. Probá de nuevo en un minuto." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    pagina,
    /* De qué bolsa salió —la del mes o la de bienvenida—, para que la pantalla
       diga cuál se gastó. Ya no puede ser `null`: desde que se sacó la primera
       gratis, escribir una página siempre sale de alguna. */
    salioDe: bolsa,
    cupo: await estadoDelCupo(user.id, tier),
  });
}
