import webpush from "web-push";
import { endpointDePushValido } from "@/lib/suscripcionPush";

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

/** Opciones de entrega. `alta`: lo que la dueña tiene que ver ya (una consulta);
    Android lo entrega aunque el celular esté ahorrando batería. */
export type Urgencia = "normal" | "alta";
const opciones = (u: Urgencia = "normal") => ({ TTL: 60 * 60 * 24, urgency: u === "alta" ? ("high" as const) : ("normal" as const) });

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  storeName?: string;
}

// Envía push a todos los suscriptores de usuario (dashboard)
export async function sendPushToUser(userId: string, payload: PushPayload, urgencia: Urgencia = "normal") {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const { prisma } = await import("@/lib/prisma");
  /* Sólo a direcciones de servicios de avisos reales (lib/suscripcionPush):
     una fila vieja con una url cualquiera no recibe nada. */
  const subscriptions = (await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, auth: true, p256dh: true },
  })).filter((s) => endpointDePushValido(s.endpoint));

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        JSON.stringify(payload),
        opciones(urgencia)
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
    ? (await prisma.storeSubscription.findMany({
        where: { storeId, userId: { in: followerIds } },
        select: { id: true, endpoint: true, auth: true, p256dh: true },
      })).filter((s) => endpointDePushValido(s.endpoint))
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

/** El aviso de prueba del panel: a UN celular de este usuario, no a todos.
    "ok" llegó al servicio de avisos; "vencida" esa dirección ya no existe
    (se borra y hay que volver a activar); "no-esta" este celular no está anotado. */
export async function sendPushDePrueba(userId: string, endpoint: string, payload: PushPayload): Promise<"ok" | "vencida" | "no-esta" | "error"> {
  if (!pushConfigurado()) return "error";
  const { prisma } = await import("@/lib/prisma");
  const sub = await prisma.pushSubscription.findFirst({ where: { userId, endpoint }, select: { id: true, endpoint: true, auth: true, p256dh: true } });
  if (!sub || !endpointDePushValido(sub.endpoint)) return "no-esta";
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, JSON.stringify(payload), opciones("alta"));
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 410 || code === 404) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return "vencida";
    }
    console.error("[push] prueba:", e);
    return "error";
  }
}
