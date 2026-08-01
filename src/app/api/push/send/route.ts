import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { sendPushToStore, pushConfigurado } from "@/lib/push";
import { PUSH_CAMPAIGNS_PER_WEEK as CAMPAIGNS_PER_WEEK } from "@/lib/planLimits";
import { enviarCampanaPorMail, contarSuscriptores } from "@/lib/newsletter";
import { recortar } from "@/lib/texto";

const TITLE_MAX = 50;
const BODY_MAX = 150;
/** Cuántas campañas trae el historial del panel. Va con el total al lado. */
const HISTORIAL_MAX = 200;
const EXPIRY_OPTIONS_DAYS = [3, 7, 14, 30] as const;
const DEFAULT_EXPIRY_DAYS = 7;

// Elimina caracteres de control y recorta espacios.
//
// El rango \x00-\x1F no toca los emojis: son code points muy por arriba de ese
// rango. Lo que saca son saltos de línea y caracteres invisibles de control, que
// en una notificación push no se ven pero pueden desarmar el layout.
function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, " ").trim();
}

async function assertPremium(userId: string) {
  const sub = await getUserSubscription(userId);
  if (!sub || sub.tier !== "PREMIUM" || !isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0])) {
    return NextResponse.json({ error: "Requiere Plan Premium", code: "NOT_PREMIUM" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const premiumError = await assertPremium(user.id);
  if (premiumError) return premiumError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title: rawTitle, message: rawMessage, url: rawUrl, expiresInDays: rawExpiresInDays } = body as Record<string, unknown>;

  if (typeof rawTitle !== "string" || rawTitle.trim().length === 0) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  }
  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
  }

  // `recortar` y no `.slice()`: con un emoji justo en el corte, slice parte el
  // carácter al medio y lo que sale es un rombito con un signo de pregunta en
  // el celular de cada seguidor.
  const title = recortar(sanitize(rawTitle), TITLE_MAX);
  const message = recortar(sanitize(rawMessage), BODY_MAX);

  if (title.length === 0 || message.length === 0) {
    return NextResponse.json({ error: "Título o mensaje vacío después de sanitizar" }, { status: 400 });
  }

  // Validar URL opcional
  let url: string | undefined;
  if (typeof rawUrl === "string" && rawUrl.trim().length > 0) {
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
      url = parsed.href.slice(0, 512);
    } catch {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }
  }

  // Obtener tienda del owner autenticado
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true, slug: true, name: true, logo: true, accentColor: true,
      owner: { select: { email: true } },
    },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // SIN filtrar por `deletedAt`, y es el punto de todo el borrado blando: una
  // campaña borrada del historial ya se envió, así que sigue contando. Si se
  // filtrara acá, borrar devolvería el cupo y el tope no toparía nada.
  const recentCount = await prisma.pushCampaign.count({
    where: { storeId: store.id, createdAt: { gte: weekAgo } },
  });
  if (recentCount >= CAMPAIGNS_PER_WEEK) {
    return NextResponse.json(
      { error: `Límite alcanzado: podés enviar ${CAMPAIGNS_PER_WEEK} notificaciones por semana.` },
      { status: 429 }
    );
  }

  // URL de destino: si no viene una, apuntar a la tienda
  const targetUrl = url ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/tienda/${store.slug}`;

  const expiresInDays = EXPIRY_OPTIONS_DAYS.includes(rawExpiresInDays as never)
    ? (rawExpiresInDays as number)
    : DEFAULT_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  // Una campaña sale por dos canales, y hay que tener a alguien en al menos uno.
  //
  // Antes esto miraba sólo los seguidores: con la lista de mail llena y cero
  // seguidores, el dueño se comía un "no tenés seguidores todavía" y no podía
  // escribirle a nadie.
  const [followerCount, emailCount] = await Promise.all([
    prisma.storeFollow.count({ where: { storeId: store.id } }),
    contarSuscriptores(store.id),
  ]);
  if (followerCount === 0 && emailCount === 0) {
    return NextResponse.json(
      { error: "Todavía no tenés seguidores ni suscriptores. La notificación no fue enviada." },
      { status: 400 }
    );
  }

  // Guardar en historial ANTES de enviar el push: así cuando el dispositivo
  // recibe la notificación y fetchea las campañas, el registro ya existe en la DB.
  const campaign = await prisma.pushCampaign.create({
    data: {
      storeId: store.id, title, body: message, url: targetUrl, sentCount: 0, expiresAt,
      // PENDIENTE sólo si hay a quién mandarle. Si no, queda SIN_MAIL y el
      // drenado no la levanta nunca.
      emailStatus: emailCount > 0 ? "PENDIENTE" : "SIN_MAIL",
    },
  });

  let sentCount = 0;
  if (followerCount > 0) {
    try {
      sentCount = await sendPushToStore(store.id, {
        title,
        body: message,
        url: targetUrl,
        icon: store.logo ?? undefined,
        tag: `store-${store.id}`,
        storeName: store.name ?? undefined,
      });
    } catch (err) {
      console.error("[push] sendPushToStore failed:", err);
      // El push falló, pero si hay lista de mail la campaña NO se borra: el
      // canal que sí puede salir tiene que salir. Borrarla acá dejaría al dueño
      // sin campaña y sin envío, habiendo consumido igual su cupo semanal.
      if (emailCount === 0) {
        await prisma.pushCampaign.delete({ where: { id: campaign.id } }).catch(() => {});
        return NextResponse.json({ error: "Error al enviar las notificaciones. Intentá de nuevo." }, { status: 500 });
      }
    }
  }

  // Actualizar el conteo real de entregas
  if (sentCount > 0) {
    await prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: { sentCount },
    }).catch((err) => console.error("[push] failed to update sentCount:", err));
  }

  // ── Canal mail ──────────────────────────────────────────────────────────
  // Se espera a que termine (o a que se acabe el presupuesto de tiempo) en vez
  // de soltarlo en segundo plano: en serverless, lo que queda corriendo después
  // de responder se muere con la función. Un `void` acá sería un envío que a
  // veces sale y a veces no, sin manera de saber cuál fue.
  //
  // Si no llega a terminar, la campaña queda en ENVIANDO con el cursor puesto y
  // el dueño ve el botón de continuar. Ver `enviarCampanaPorMail`.
  let sentEmail = 0;
  let faltanMails = false;
  if (emailCount > 0) {
    try {
      const r = await enviarCampanaPorMail(store.id, campaign.id, {
        storeName: store.name,
        storeUrl: targetUrl,
        logo: store.logo,
        accent: store.accentColor,
        title,
        body: message,
        ownerEmail: store.owner?.email ?? null,
      });
      sentEmail = r.enviados;
      faltanMails = r.falta;
    } catch (err) {
      console.error("[newsletter] envío de campaña:", err);
      faltanMails = true;
    }
  }

  return NextResponse.json({
    ok: true, sentCount, sentEmail, faltanMails, campaignId: campaign.id,
    pushConfigurado: pushConfigurado(),
  });
}

// GET — devuelve info para el panel: suscriptores, campañas recientes, cuántas quedan esta semana
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const premiumError = await assertPremium(user.id);
  if (premiumError) return premiumError;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [followerCount, emailCount, pendientesEmail, recentUsed, totalCampanas, campaigns] = await Promise.all([
    prisma.storeFollow.count({ where: { storeId: store.id } }),
    contarSuscriptores(store.id),
    // Cuántos confirmaron pero todavía no: es el número que explica por qué la
    // lista "no le llega a todos". Sin mostrarlo, el dueño ve 20 suscriptores y
    // 12 envíos y no tiene forma de entender la diferencia.
    prisma.newsletterSubscriber.count({ where: { storeId: store.id, confirmed: false, bajaEn: null } }),
    // El cupo consumido cuenta también las borradas (ver el POST).
    prisma.pushCampaign.count({ where: { storeId: store.id, createdAt: { gte: weekAgo } } }),
    prisma.pushCampaign.count({ where: { storeId: store.id, deletedAt: null } }),
    prisma.pushCampaign.findMany({
      // El historial sí las esconde: para el dueño, borrada es borrada.
      where: { storeId: store.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: HISTORIAL_MAX,
      select: {
        id: true, title: true, body: true, sentCount: true, createdAt: true, expiresAt: true,
        sentEmail: true, emailStatus: true,
      },
    }),
  ]);

  return NextResponse.json({
    // `subscriberCount` conserva el nombre y el significado viejo —seguidores
    // con push— para no romper nada que ya lo lea. El total y el desglose van
    // aparte.
    subscriberCount: followerCount,
    followerCount,
    emailCount,
    // Para que el panel pueda decir "el push no está configurado" en vez de
    // dejar al dueño mirando un 0 sin explicación.
    pushConfigurado: pushConfigurado(),
    pendientesEmail,
    totalAlcance: followerCount + emailCount,
    weeklyLimit: CAMPAIGNS_PER_WEEK,
    weeklyUsed: recentUsed,
    weeklyRemaining: Math.max(0, CAMPAIGNS_PER_WEEK - recentUsed),
    campaigns,
    // Cuántas hay en total, para que el historial pueda decir que está cortado
    // en vez de dar a entender que esas son todas. A 3 por semana se llega al
    // tope en poco más de un año.
    totalCampanas,
    historialMax: HISTORIAL_MAX,
  });
}

// DELETE — borra campañas del store del owner autenticado
// ?id=<campaignId> → borra esa campaña; sin params borra todas
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const premiumError = await assertPremium(user.id);
  if (premiumError) return premiumError;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Borrado BLANDO en los tres casos: la fila queda para que el límite semanal
  // la siga contando. Ver el comentario de `deletedAt` en el schema.
  // El `deletedAt: null` en el where evita repisar la fecha de una que ya estaba
  // borrada, así el registro conserva cuándo se borró de verdad.
  const marcarBorradas = (where: object) =>
    prisma.pushCampaign.updateMany({
      where: { ...where, storeId: store.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

  if (id) {
    const { count } = await marcarBorradas({ id });
    return NextResponse.json({ ok: true, deleted: count });
  }

  // Borrado múltiple: { ids: string[] } en el body
  const ids = await req.json().then((b) => (Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : null)).catch(() => null);
  if (ids) {
    const { count } = await marcarBorradas({ id: { in: ids } });
    return NextResponse.json({ ok: true, deleted: count });
  }

  const { count } = await marcarBorradas({});
  return NextResponse.json({ ok: true, deleted: count });
}
