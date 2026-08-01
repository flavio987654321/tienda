import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@tiendaapps.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Si el push está configurado en este entorno.
 *
 * Sin las claves VAPID, las dos funciones de abajo devuelven 0 sin intentar
 * nada — que es correcto, pero indistinguible de "mandé y no lo recibió nadie".
 * El dueño ve "0 enviados" y se pone a buscar por qué sus seguidores no reciben,
 * cuando el problema es una variable de entorno que falta. Quien llama necesita
 * poder decir cuál de las dos cosas pasó.
 */
export function pushConfigurado(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  storeName?: string;
}

// Envía push a todos los suscriptores de usuario (dashboard)
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const { prisma } = await import("@/lib/prisma");
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, auth: true, p256dh: true },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        JSON.stringify(payload)
      )
    )
  );

  const expired: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) expired.push(subscriptions[i].id);
      else console.error("[push] sendPushToUser failed:", err);
    }
  });

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } }).catch(() => {});
  }
}

// Envía push a los seguidores autenticados de una tienda (StoreFollow).
// Retorna la cantidad de mensajes enviados con éxito.
export async function sendPushToStore(storeId: string, payload: PushPayload): Promise<number> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 0;

  const { prisma } = await import("@/lib/prisma");

  // Obtener userIds de los seguidores de la tienda
  const follows = await prisma.storeFollow.findMany({
    where: { storeId },
    select: { userId: true },
  });
  const followerIds = follows.map((f) => f.userId);

  // Obtener los endpoints push de esos usuarios
  const subscriptions = followerIds.length > 0
    ? await prisma.storeSubscription.findMany({
        where: { storeId, userId: { in: followerIds } },
        select: { id: true, endpoint: true, auth: true, p256dh: true },
      })
    : [];

  if (subscriptions.length === 0) return 0;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        JSON.stringify(payload)
      )
    )
  );

  const expired: string[] = [];
  let sent = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
    } else {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        expired.push(subscriptions[i].id);
      } else {
        console.error("[push] sendPushToStore failed:", err);
      }
    }
  });

  if (expired.length > 0) {
    await prisma.storeSubscription.deleteMany({ where: { id: { in: expired } } }).catch(() => {});
  }

  return sent;
}
