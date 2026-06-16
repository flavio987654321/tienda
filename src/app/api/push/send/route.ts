import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { sendPushToStore } from "@/lib/push";

const TITLE_MAX = 50;
const BODY_MAX = 150;
const CAMPAIGNS_PER_WEEK = 3;

// Elimina caracteres de control y recorta espacios
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

  const { title: rawTitle, message: rawMessage, url: rawUrl } = body as Record<string, unknown>;

  if (typeof rawTitle !== "string" || rawTitle.trim().length === 0) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  }
  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
  }

  const title = sanitize(rawTitle).slice(0, TITLE_MAX);
  const message = sanitize(rawMessage).slice(0, BODY_MAX);

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
    select: { id: true, slug: true, name: true, logo: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

  // Verificar que haya seguidores con push activo antes de crear la campaña
  const followerCount = await prisma.storeFollow.count({ where: { storeId: store.id } });
  if (followerCount === 0) {
    return NextResponse.json(
      { error: "No tenés seguidores todavía. La notificación no fue enviada." },
      { status: 400 }
    );
  }

  // Guardar en historial ANTES de enviar el push: así cuando el dispositivo
  // recibe la notificación y fetchea las campañas, el registro ya existe en la DB.
  const campaign = await prisma.pushCampaign.create({
    data: { storeId: store.id, title, body: message, url: targetUrl, sentCount: 0 },
  });

  let sentCount = 0;
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
    await prisma.pushCampaign.delete({ where: { id: campaign.id } }).catch(() => {});
    return NextResponse.json({ error: "Error al enviar las notificaciones. Intentá de nuevo." }, { status: 500 });
  }

  // Actualizar el conteo real de entregas
  if (sentCount > 0) {
    await prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: { sentCount },
    }).catch((err) => console.error("[push] failed to update sentCount:", err));
  }

  return NextResponse.json({ ok: true, sentCount });
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

  const [subscriberCount, recentUsed, campaigns] = await Promise.all([
    prisma.storeFollow.count({ where: { storeId: store.id } }),
    prisma.pushCampaign.count({ where: { storeId: store.id, createdAt: { gte: weekAgo } } }),
    prisma.pushCampaign.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, body: true, sentCount: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    subscriberCount,
    weeklyLimit: CAMPAIGNS_PER_WEEK,
    weeklyUsed: recentUsed,
    weeklyRemaining: Math.max(0, CAMPAIGNS_PER_WEEK - recentUsed),
    campaigns,
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

  if (id) {
    await prisma.pushCampaign.deleteMany({ where: { id, storeId: store.id } });
    return NextResponse.json({ ok: true, deleted: 1 });
  }

  const { count } = await prisma.pushCampaign.deleteMany({ where: { storeId: store.id } });
  return NextResponse.json({ ok: true, deleted: count });
}
