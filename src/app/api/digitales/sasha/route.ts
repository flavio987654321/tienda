import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, getSubscriptionStatus } from "@/lib/subscription";
import { getArgentinaDayKey, getArgentinaAhora } from "@/lib/fechas-comerciales";
import { permitirMensajeSasha, DIARIO_POR_PLAN } from "@/lib/sasha-digital-limites";
import { snapshotDigital } from "@/lib/sasha-digital-datos";
import { armarPromptDigital } from "@/lib/sasha-digital-prompt";
import type { TierDigital } from "@/lib/planes-digitales";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/sasha — la asistente del panel de Productos Digitales.
 *
 * Es prima de `/api/asistente` (la Sasha de tiendas) y comparte la forma,
 * pero no el cerebro ni el presupuesto: otro prompt, otros datos, y los topes
 * de `sasha-digital-limites` con claves de Redis propias. Ver ahí el porqué
 * de cada número.
 *
 * El orden de esta función no es casual: primero quién sos y qué plan tenés,
 * después el tope, y RECIÉN AHÍ se lee el body y se toca la base. Un pedido
 * rechazado no tiene que costar ni una consulta.
 */

const MAX_MENSAJES_CONTEXTO = 12;
const MAX_CHARS_POR_MENSAJE = 2_000;
const MAX_CHARS_TOTAL = 8_000;
/** La respuesta es corta a propósito: se paga por token de salida, y Sasha contesta en tres frases. */
const MAX_TOKENS_RESPUESTA = 500;
/** Lecturas del historial por minuto. No cuesta plata: es leer lo propio. */
const LECTURAS_POR_MINUTO = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * La charla de hoy, ARMADA EN EL SERVIDOR.
 *
 * ⚠️ El navegador manda SÓLO el mensaje nuevo. Lo anterior sale de la base,
 * que es lo único que sabe qué se dijo de verdad. Antes viajaba la charla
 * entera desde el navegador y se usaba tal cual: cualquiera podía inventar
 * mensajes "de Sasha" que ella nunca dijo y meterlos en su propio contexto
 * —para torcerla, o para hacerle repetir algo como si lo hubiera dicho el
 * panel—. Además, lo que viaja se paga: mandar la charla dos veces (ida y
 * contexto) era pagar por algo que ya teníamos guardado.
 *
 * Se recorta por los más viejos hasta entrar en el presupuesto, así una
 * charla larga sigue andando en vez de rechazarse.
 */
function charlaDeHoy(previos: ChatMessage[], nuevo: string): ChatMessage[] {
  let recientes = [...previos, { role: "user" as const, content: nuevo }].slice(-MAX_MENSAJES_CONTEXTO);
  let chars = recientes.reduce((n, m) => n + m.content.length, 0);
  while (chars > MAX_CHARS_TOTAL && recientes.length > 1) {
    chars -= recientes[0].content.length;
    recientes = recientes.slice(1);
  }
  return recientes;
}

/** El texto que escribió la persona, o `null` si el pedido no sirve. */
function leerMensaje(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const mensaje = (body as { mensaje?: unknown }).mensaje;
  if (typeof mensaje !== "string") return null;
  const limpio = mensaje.trim();
  if (limpio.length === 0 || limpio.length > MAX_CHARS_POR_MENSAJE) return null;
  return limpio;
}

/**
 * GET /api/digitales/sasha — la charla de hoy y cuántos mensajes quedan.
 *
 * Los que quedan salen de contar las respuestas guardadas de hoy y no del
 * contador de Redis: mirar Redis sin sumar necesitaría otra clave, y este
 * número es para mostrar, no para frenar. El que frena es el de `permitir…`.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  /* Un tope flojo, sólo para que nadie pueda martillar la base abriendo y
     cerrando. ⚠️ Acá, si Redis no contesta, SE DEJA PASAR — al revés que en
     el POST: esto no llama a ningún modelo ni cuesta plata, y dejar a alguien
     sin ver su propia charla porque se cayó el contador sería peor que el
     problema que evita. Lo que frena el gasto es el tope del POST. */
  try {
    if (!(await checkRateLimit(`sasha-digital-leer:${user.id}`, LECTURAS_POR_MINUTO, 60_000))) {
      return NextResponse.json({ error: "Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[sasha-digital] sin limitador al leer el historial; se deja pasar (no cuesta plata)");
  }

  const sub = await getUserSubscription(user.id);
  const tier = (sub?.tier ?? "FREE") as TierDigital;
  const tope = DIARIO_POR_PLAN[tier] ?? 0;
  const day = getArgentinaDayKey();

  /* Free no tiene chat: no se trae ninguna charla. */
  if (tope <= 0) return NextResponse.json({ tier, tope: 0, usados: 0, mensajes: [] });

  const [mensajes, usados] = await Promise.all([
    prisma.asistenteMensaje.findMany({
      where: { userId: user.id, day },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
      take: 200,
    }),
    prisma.asistenteMensaje.count({ where: { userId: user.id, day, role: "assistant" } }),
  ]);
  return NextResponse.json({ tier, tope, usados: Math.min(usados, tope), mensajes });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const sub = await getUserSubscription(user.id);
  const estado = sub ? getSubscriptionStatus(sub) : null;
  if (estado === "EXPIRED" || estado === "CANCELLED") {
    return NextResponse.json({ error: "Tu suscripción no está activa" }, { status: 403 });
  }
  const tier = (sub?.tier ?? "FREE") as TierDigital;

  const day = getArgentinaDayKey();
  const momento = getArgentinaAhora();

  /* Si Redis no contesta, Sasha se apaga. Del otro lado hay algo que se paga:
     "no pude contar" corta y nunca deja pasar. El resto del panel sigue
     andando; esto apaga el chat, nada más. */
  let veredicto;
  try {
    veredicto = await permitirMensajeSasha({ userId: user.id, tier, day, hora: momento.hora });
  } catch (err) {
    console.error("[sasha-digital] sin limitador (Redis no contesta), se apaga el chat", err);
    return NextResponse.json({ error: "Sasha no está disponible en este momento, probá de nuevo en un minuto." }, { status: 503 });
  }
  if (!veredicto.permitido) {
    /* 402 cuando el plan no la incluye y 429 cuando se acabó el cupo: la
       pantalla dibuja distinto "pasate a Starter" que "volvé mañana". */
    return NextResponse.json({ error: veredicto.mensaje, motivo: veredicto.motivo }, { status: veredicto.motivo === "plan" ? 402 : 429 });
  }

  const body = await req.json().catch(() => null);
  const mensaje = leerMensaje(body);
  if (mensaje === null) return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });

  const snapshot = await snapshotDigital(user.id, tier);
  /* Una cuenta que la dueña cerró no tiene panel, pero la ruta sí sigue
     existiendo, y cerrar NO cancela la suscripción: el plan queda en Pro. Sin
     esto, una cuenta cerrada podía seguir gastando mensajes desde afuera del
     panel. Va acá y no antes porque el dato viene con el resumen, sin pagar
     una consulta de más, y todavía estamos ANTES de llamar al modelo. */
  if (snapshot.cerrada) {
    return NextResponse.json({ error: "Tu cuenta está cerrada. Reabrila para volver a usar el panel." }, { status: 403 });
  }

  /* Lo dicho hasta ahora, de la base. Se lee DESPUÉS del tope y del corte por
     cuenta cerrada: un pedido que se va a rechazar no tiene que costar una
     consulta. */
  const previos = await prisma.asistenteMensaje.findMany({
    where: { userId: user.id, day },
    orderBy: { createdAt: "desc" },
    select: { role: true, content: true },
    take: MAX_MENSAJES_CONTEXTO,
  });
  const historial = charlaDeHoy(
    previos.reverse().map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content })),
    mensaje,
  );

  const prompt = armarPromptDigital({
    snapshot,
    nombreDeQuienVende: user.name?.split(" ")[0] ?? null,
    pregunta: mensaje,
    momento,
  });

  /* Se guarda DESPUÉS de leer los previos: si no, el mensaje nuevo entraría
     dos veces al contexto. */
  await prisma.asistenteMensaje.create({ data: { userId: user.id, role: "user", content: mensaje, day } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const salida = anthropic.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: MAX_TOKENS_RESPUESTA,
          /* Dos bloques, y el corte es dónde pega el caché: el primero es
             igual para todas las cuentas y a partir del segundo mensaje se
             paga al 10%. Si se mezclan, cada mensaje cuesta el triple. */
          system: [
            { type: "text", text: prompt.estatico, cache_control: { type: "ephemeral" } },
            { type: "text", text: prompt.variable },
          ],
          messages: historial,
        });

        /* Si quien pregunta cierra el chat a mitad de la respuesta, el canal
           ya no acepta nada y `enqueue` tira. Se ignora a propósito: el
           pedido a Anthropic ya se pagó, así que lo que importa es seguir
           hasta el final para GUARDAR la respuesta y sus tokens. Sin este
           try, esa excepción se llevaba puesto el guardado y el gasto
           quedaba sin medir. */
        let cerrado = false;
        salida.on("text", (delta) => {
          if (cerrado) return;
          try {
            controller.enqueue(encoder.encode(delta));
          } catch {
            cerrado = true;
          }
        });

        const final = await salida.finalMessage();
        const texto = final.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
        const uso = {
          tokensEntrada: final.usage.input_tokens,
          tokensSalida: final.usage.output_tokens,
          tokensCacheLeido: final.usage.cache_read_input_tokens ?? 0,
          tokensCacheEscrito: final.usage.cache_creation_input_tokens ?? 0,
        };
        /* `tokensCacheLeido` en cero mensaje tras mensaje es la señal de que
           algo del bloque estático se volvió variable y se está pagando el
           prompt entero cada vez. Queda guardado, no sólo en el log: así
           cuánto cuesta un plan por mes es una consulta. */
        console.log("[sasha-digital] usage", { userId: user.id, tier, usados: veredicto.usados, tope: veredicto.tope, ...uso });
        if (texto) {
          await prisma.asistenteMensaje.create({ data: { userId: user.id, role: "assistant", content: texto, day, ...uso } });
        }
      } catch (err) {
        console.error("[sasha-digital] error llamando a Anthropic", err);
        try {
          controller.enqueue(encoder.encode("\n\nSasha no está disponible en este momento, probá de nuevo en un minuto."));
        } catch { /* el canal ya estaba cerrado: no hay a quién avisarle */ }
      } finally {
        try { controller.close(); } catch { /* ya estaba cerrado */ }
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
