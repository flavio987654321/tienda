import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { getUserSubscription, getSubscriptionStatus } from "@/lib/subscription";
import { getStoreSnapshot, getChecklistEstado } from "@/lib/asistente-insights";
import { getUpcomingDates, getArgentinaAhora, getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { buildSystemPrompt } from "@/lib/asistente-prompt";
import { anthropic } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

const MAX_MENSAJES_ABS = 200; // límite duro anti-abuso, no debería alcanzarse en uso normal
const MAX_MENSAJES_CONTEXTO = 20; // cuántos mensajes recientes se le mandan al modelo
const MAX_CHARS_POR_MENSAJE = 2000;
const MAX_CHARS_TOTAL = 12_000;

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Cada mensaje de Sasha cuesta plata (tokens). Estos son los dos topes que
 * evitan que alguien vacíe el crédito de Anthropic, y por eso se chequean ANTES
 * de leer el body y antes de tocar la base.
 */
const LIMITE_RAFAGA = 30;
const VENTANA_RAFAGA_MS = 10 * 60_000;
const LIMITE_DIARIO = 150;

/**
 * Topes de emergencia para cuando Redis no contesta.
 *
 * El global (por instancia) es el que realmente frena: un contador por usuario
 * no sirve contra pedidos en paralelo, porque cada instancia nueva arranca en
 * cero. Con esto, el único multiplicador que le queda a un ataque es cuántas
 * instancias logre levantar.
 */
const LIMITE_RAFAGA_SIN_REDIS = 5;
const LIMITE_GLOBAL_SIN_REDIS = 20;

/**
 * El tope diario vive sólo en Redis, y a propósito.
 *
 * Un contador en memoria no puede sostener una ventana de 24hs: la instancia se
 * recicla y el contador vuelve a cero. Si Redis no contestó, el respaldo de la
 * ráfaga ya puso un techo — y volver a llamar al respaldo acá gastaría dos veces
 * del presupuesto global por un solo mensaje, dejándolo en la mitad.
 */
async function dentroDelTopeDiario(userId: string): Promise<boolean> {
  try {
    return await checkRateLimit(`asistente-dia:${userId}`, LIMITE_DIARIO, 24 * 60 * 60_000);
  } catch {
    return true;
  }
}

// Una conversación larga en el día no debe romperse: en vez de rechazar el pedido entero,
// nos quedamos con los mensajes más recientes (recortando los más viejos primero) hasta
// entrar dentro del presupuesto de mensajes/caracteres por request.
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

  let recientes = validados.slice(-MAX_MENSAJES_CONTEXTO);
  let totalChars = recientes.reduce((sum, m) => sum + m.content.length, 0);
  while (totalChars > MAX_CHARS_TOTAL && recientes.length > 1) {
    totalChars -= recientes[0].content.length;
    recientes = recientes.slice(1);
  }
  return recientes;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      tipoTienda: true,
      tipoTiendaConfigurado: true,
      isPublished: true,
      isVerified: true,
      logo: true,
      storeConfig: true,
      mpConnectedAt: true,
      _count: { select: { products: true } },
    },
  });
  if (!store) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!store.tipoTiendaConfigurado) {
    return NextResponse.json({ error: "Completá la configuración de tu tienda primero" }, { status: 403 });
  }

  const sub = await getUserSubscription(user.id);
  if (sub) {
    const status = getSubscriptionStatus(sub);
    if (status === "EXPIRED" || status === "CANCELLED") {
      return NextResponse.json({ error: "Tu suscripción no está activa" }, { status: 403 });
    }
  }

  const rafaga = await checkRateLimitConRespaldo(
    `asistente:${user.id}`,
    LIMITE_RAFAGA,
    VENTANA_RAFAGA_MS,
    { limiteFallback: LIMITE_RAFAGA_SIN_REDIS, limiteFallbackGlobal: LIMITE_GLOBAL_SIN_REDIS }
  );
  if (!rafaga.permitido) {
    return NextResponse.json({ error: "Mandaste muchos mensajes, esperá un momento." }, { status: 429 });
  }
  if (rafaga.conRedis && !(await dentroDelTopeDiario(user.id))) {
    return NextResponse.json({ error: "Llegaste al límite de mensajes de hoy con Sasha." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const greet = (body as { greet?: unknown }).greet === true;
  const historial = validarMensajes(body);
  if (historial === null) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  if (!greet && historial.length === 0) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const day = getArgentinaDayKey();

  // Guarda el mensaje nuevo del usuario (el último del historial que mandó el cliente).
  // El saludo automático ("greet") no genera un mensaje de usuario visible en el chat.
  if (!greet) {
    const ultimo = historial[historial.length - 1];
    if (ultimo.role === "user") {
      await prisma.asistenteMensaje.create({
        data: { userId: user.id, role: "user", content: ultimo.content, day },
      });
    }
  }

  // El plan se resuelve ANTES del snapshot: hace falta para saber si los topes de
  // cupones y promociones aplican (Premium no tiene tope) y así Sasha no le dice
  // "te quedan 2 lugares" a alguien que no tiene límite.
  const planTier: "BASIC" | "PREMIUM" = sub?.tier === "PREMIUM" ? "PREMIUM" : "BASIC";

  let snapshot, upcomingDates;
  try {
    [snapshot, upcomingDates] = await Promise.all([
      getStoreSnapshot(store.id, store.tipoTienda, { esPremium: planTier === "PREMIUM" }),
      Promise.resolve(getUpcomingDates(21)),
    ]);
  } catch (err) {
    console.error("[asistente] error leyendo datos de la tienda", err);
    return NextResponse.json({ error: "No pudimos cargar el asistente, intentá de nuevo." }, { status: 500 });
  }

  const checklist = getChecklistEstado({
    isPublished: store.isPublished,
    logo: store.logo,
    storeConfig: store.storeConfig,
    mpConnectedAt: store.mpConnectedAt,
    productCount: store._count.products,
    isVerified: store.isVerified,
  });

  const system = buildSystemPrompt({
    storeName: store.name,
    tipoTienda: store.tipoTienda,
    ownerFirstName: user.name?.split(" ")[0] ?? null,
    snapshot,
    upcomingDates,
    planTier,
    checklist,
    momento: getArgentinaAhora(),
    // Misma condición que el menú (DashboardLayout). Si se lee de otro lado,
    // Sasha termina mandando a una sección que la dueña no tiene.
    appsEnabled: process.env.NEXT_PUBLIC_APPS_ENABLED === "1",
  });

  const messages: ChatMessage[] = greet
    ? [{ role: "user", content: "Saludame y contame, brevemente, lo más importante para mi tienda hoy (una sola cosa, no una lista)." }]
    : historial;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 600,
          // El prompt va partido en dos bloques y el `cache_control` marca dónde
          // corta el caché. El primero son ~11.000 tokens iguales para todas las
          // tiendas: cachearlo baja el costo por mensaje a menos de la mitad.
          // Si se vuelven a mezclar los dos bloques, el caché deja de pegar.
          system: [
            { type: "text", text: system.estatico, cache_control: { type: "ephemeral" } },
            { type: "text", text: system.variable },
          ],
          messages,
        });

        anthropicStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        const final = await anthropicStream.finalMessage();
        // `cacheLeido` es la prueba de que el caché está pegando: si viene en 0
        // mensaje tras mensaje, algo del bloque estático se volvió variable y se
        // está pagando el prompt entero cada vez.
        console.log("[asistente] usage", {
          userId: user.id,
          storeId: store.id,
          input: final.usage.input_tokens,
          output: final.usage.output_tokens,
          cacheEscrito: final.usage.cache_creation_input_tokens ?? 0,
          cacheLeido: final.usage.cache_read_input_tokens ?? 0,
          conRedis: rafaga.conRedis,
        });

        const textoFinal = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("");
        if (textoFinal) {
          await prisma.asistenteMensaje.create({
            data: { userId: user.id, role: "assistant", content: textoFinal, day },
          });
        }
      } catch (err) {
        console.error("[asistente] error llamando a Anthropic", err);
        controller.enqueue(encoder.encode("\n\nSasha no está disponible en este momento, probá de nuevo en un minuto."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
