import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, getSubscriptionStatus } from "@/lib/subscription";
import { getArgentinaDayKey, getArgentinaAhora } from "@/lib/fechas-comerciales";
import { permitirMensajeSasha } from "@/lib/sasha-digital-limites";
import { snapshotDigital } from "@/lib/sasha-digital-datos";
import { armarPromptDigital } from "@/lib/sasha-digital-prompt";
import type { TierDigital } from "@/lib/planes-digitales";
import { anthropic } from "@/lib/anthropic";

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

const MAX_MENSAJES_ABS = 200;
const MAX_MENSAJES_CONTEXTO = 12;
const MAX_CHARS_POR_MENSAJE = 2_000;
const MAX_CHARS_TOTAL = 8_000;
/** La respuesta es corta a propósito: se paga por token de salida, y Sasha contesta en tres frases. */
const MAX_TOKENS_RESPUESTA = 500;

type ChatMessage = { role: "user" | "assistant"; content: string };

function validarMensajes(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body === null) return null;
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length > MAX_MENSAJES_ABS) return null;
  const validados: ChatMessage[] = [];
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length === 0 || content.length > MAX_CHARS_POR_MENSAJE) return null;
    validados.push({ role, content });
  }
  /* Una charla larga no se rechaza: se recorta por los mensajes más viejos
     hasta entrar en el presupuesto. Lo que se manda se paga. */
  let recientes = validados.slice(-MAX_MENSAJES_CONTEXTO);
  let chars = recientes.reduce((n, m) => n + m.content.length, 0);
  while (chars > MAX_CHARS_TOTAL && recientes.length > 1) {
    chars -= recientes[0].content.length;
    recientes = recientes.slice(1);
  }
  return recientes;
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
  const historial = validarMensajes(body);
  if (historial === null || historial.length === 0) {
    return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });
  }
  const ultima = historial[historial.length - 1];
  if (ultima.role !== "user") return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });

  const snapshot = await snapshotDigital(user.id, tier);
  const prompt = armarPromptDigital({
    snapshot,
    nombreDeQuienVende: user.name?.split(" ")[0] ?? null,
    pregunta: ultima.content,
    momento,
  });

  await prisma.asistenteMensaje.create({ data: { userId: user.id, role: "user", content: ultima.content, day } });

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

        salida.on("text", (delta) => controller.enqueue(encoder.encode(delta)));

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
        controller.enqueue(encoder.encode("\n\nSasha no está disponible en este momento, probá de nuevo en un minuto."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
