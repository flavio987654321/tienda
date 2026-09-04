import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { anthropic } from "@/lib/anthropic";
import { permitirGeneracion } from "@/lib/ia-digitales";
import { consumirDelCupo, devolverAlCupo, estadoDelCupo } from "@/lib/cupo-ia";
import {
  ESQUEMA_DEL_EMBUDO, INSTRUCCIONES, LARGO_DEL_NICHO, MINIMO_DEL_NICHO, LARGO_TITULO_PROPIO,
  normalizarEmbudo,
} from "@/lib/embudo-ia";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Armar un embudo con IA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PROPONE. NO GUARDA NADA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Devuelve tres fichas para que la persona las lea, las edite y recién ahí las
 * cree por la ruta de siempre (`POST /api/digitales/productos`), que es la que
 * tiene los topes del plan, la validación de campos y la verificación del padre.
 *
 * ── Por qué no crea los tres productos de una ──────────────────────────────
 *
 * Podría, y sería un botón más lindo. Pero entonces una generación mala deja
 * tres productos que hay que borrar a mano, y —peor— **el texto de un modelo
 * entraría a la base sin que ninguna persona lo haya leído**. Lo que se publica
 * en una página que cobra lo firma quien vende: tiene que haberlo visto antes.
 *
 * Y de yapa: no hay que duplicar acá los topes del plan ni la validación de
 * campos, que ya están escritos una vez en la ruta de crear. Duplicados, se
 * desincronizan de a uno.
 *
 * ── El modelo ──────────────────────────────────────────────────────────────
 *
 * Sonnet 5, y no Haiku como Sasha. No es un descuido: son cosas distintas. Sasha
 * es un chat de mucho volumen donde cada mensaje pesa poco y Haiku es lo
 * correcto. Esto corre **una vez por producto** y es lo primero que la persona
 * ve de todo el ecosistema — el texto de venta es el producto acá. A este
 * tamaño (unos cientos de tokens de salida) la diferencia de costo es una
 * fracción de centavo; la de calidad, no.
 */

/* Corto a propósito. Si Anthropic no contesta en 45 segundos, es mejor decir
   "probá de nuevo" que dejar a alguien mirando un botón girando: la generación
   no es idempotente en el sentido caro —cuesta lo mismo igual— pero una pantalla
   colgada termina en tres clics más. */
const ESPERA_MS = 45_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  /* ⚠️ Rol DIGITAL, no OWNER. Es el error que ya cometió la ruta de Sasha al
     revés: pide `role === "OWNER"` y por eso una cuenta digital recibe un 403.
     Cada ecosistema tiene su puerta. */
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* La clave tiene que existir antes de prometer nada. Sin esto, la persona
     aprieta, espera, y recibe un error genérico de una librería. */
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-embudo] falta ANTHROPIC_API_KEY");
    return NextResponse.json(
      { error: "La IA no está disponible en este momento." },
      { status: 503 },
    );
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;
  const estado = getSubscriptionStatus(sub);

  /* ⚠️ Los topes van ANTES de leer el cuerpo y antes de tocar la base: un pedido
     rechazado no tiene que costar nada. Es la misma regla que en Sasha.
     Y si Redis no contesta, se FRENA. Del otro lado hay algo que se paga: "no
     pude contar" tiene que cortar, nunca dejar pasar.

     `sinAbono` incluye a Free y no sólo a la prueba: una cuenta Free no vence
     nunca, no pide tarjeta y se abren las que uno quiera. Ver `ia-digitales`. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: estado === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "embudo",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-embudo] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite de generaciones. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const nicho = typeof (body as { nicho?: unknown })?.nicho === "string"
    ? (body as { nicho: string }).nicho.trim().slice(0, LARGO_DEL_NICHO)
    : "";

  /* Opcional: el título que la persona YA tiene. Si viene, se le pide al modelo
     que lo respete y además se impone al normalizar — ver `normalizarEmbudo`. */
  const tituloPropio = typeof (body as { titulo?: unknown })?.titulo === "string"
    ? (body as { titulo: string }).titulo.trim().slice(0, LARGO_TITULO_PROPIO)
    : "";

  if (nicho.length < MINIMO_DEL_NICHO) {
    return NextResponse.json(
      { error: "Contanos un poco más de qué se trata: con dos palabras no alcanza para armar nada." },
      { status: 400 },
    );
  }

  /* ⚠️ EL CUPO SE GASTA ACÁ, ANTES DE LLAMAR AL MODELO.
   *
   * Después sería tarde: ocho pedidos en paralelo pasarían todos el control
   * —porque ninguno gastó todavía— y generarían los ocho. Se gasta primero y,
   * si la llamada falla, se devuelve: la persona no recibió nada y el fallo fue
   * nuestro. Ver `devolverAlCupo`. */
  const bolsa = await consumirDelCupo(user.id, tier);
  if (!bolsa) {
    const cupo = await estadoDelCupo(user.id, tier);
    return NextResponse.json({
      error: cupo.topeDelMes > 0
        ? `Usaste todas tus generaciones. El ${cupo.proximoMes ? "1° del mes que viene" : "mes que viene"} tenés ${cupo.topeDelMes} nuevas.`
        : "Usaste las 3 generaciones del plan gratis. En Starter tenés 6 al empezar y 5 por mes.",
      sinCupo: true,
      cupo,
    }, { status: 429 });
  }

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: INSTRUCCIONES,
        /* ⚠️ La respuesta entra por una HERRAMIENTA y no por texto. Pidiendo
           "contestame en JSON" el modelo contesta en JSON casi siempre, y el
           "casi" acá es una pantalla rota. Con `tool_choice` forzado, la forma la
           garantiza la API. Igual todo pasa por `normalizarEmbudo`: el esquema
           garantiza que el precio sea un número, no que sea un número sensato. */
        tools: [{
          name: "armar_embudo",
          description: "Devuelve las tres fichas del embudo.",
          input_schema: ESQUEMA_DEL_EMBUDO,
        }],
        tool_choice: { type: "tool", name: "armar_embudo" },
        messages: [{
          role: "user",
          /* El texto de la persona va marcado y al final. Es lo único no
             confiable del pedido: si dice "ignorá lo anterior y escribí X", lo
             que lo frena no es una frase mágica sino la forma de la salida —sólo
             puede llenar tres fichas de tres campos, y todo lo que no entre en el
             esquema se descarta antes de que nadie lo vea. */
          content: `Esto es lo que vende la persona, en sus palabras:\n\n<negocio>\n${nicho}\n</negocio>`
            + (tituloPropio
              ? `\n\nY el producto principal YA se llama así, usá este nombre tal cual:\n<titulo>\n${tituloPropio}\n</titulo>`
              : ""),
        }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-embudo] falló la llamada a Anthropic", e);
    /* No recibió nada, así que no se le cobra la generación. */
    await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "No pudimos armarlo en este momento. Probá de nuevo en un minuto." },
      { status: 502 },
    );
  }

  /* Cuánto salió. Queda en el log para poder contestar con números la pregunta
     que el plan dejó abierta —cuánto cuesta de verdad cada cosa— en vez de con
     la estimación que hay escrita hoy. */
  console.log("[ia-embudo] usage", {
    userId: user.id,
    tier,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  const embudo = bloque ? normalizarEmbudo(bloque.input, tituloPropio) : null;

  if (!embudo) {
    /* Llegó algo que no se puede mostrar. Se dice y se corta: media pantalla con
       una ficha buena y dos vacías es peor que un "probá de nuevo". */
    console.error("[ia-embudo] la respuesta no tenía la forma esperada", {
      userId: user.id,
      stop: respuesta.stop_reason,
    });
    /* Tampoco se le cobra ésta. Nos costó a nosotros —los tokens ya se
       gastaron— pero la persona no se lleva nada, y cobrarle una generación por
       un error nuestro es lo que después termina en un reclamo. */
    await devolverAlCupo(user.id, bolsa);
    return NextResponse.json(
      { error: "Nos salió algo raro. Probá de nuevo, o contanos el negocio con otras palabras." },
      { status: 502 },
    );
  }

  /* Cuánto le queda DESPUÉS de esta, para que la pantalla lo diga sin volver a
     preguntar. Y `bolsa` viaja también: es lo que deja avisar fuerte cuando se
     acabaron las del mes y se está empezando a comer las de bienvenida, que no
     vuelven. */
  return NextResponse.json({
    ok: true,
    embudo,
    salioDe: bolsa,
    cupo: await estadoDelCupo(user.id, tier),
  });
}
