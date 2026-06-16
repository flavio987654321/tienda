import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// Límites de tamaño para evitar payloads gigantes
const MAX_ENDPOINT_LEN = 512;
const MAX_KEY_LEN = 256;

function isValidHttpsUrl(val: string): boolean {
  try {
    const u = new URL(val);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

// POST — visitante se suscribe a notificaciones de una tienda (sin autenticación)
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId, endpoint, keys } = body as Record<string, unknown>;

  // Validaciones de entrada
  if (
    typeof storeId !== "string" || storeId.length === 0 || storeId.length > 128 ||
    typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > MAX_ENDPOINT_LEN ||
    !isValidHttpsUrl(endpoint) ||
    typeof keys !== "object" || keys === null ||
    typeof (keys as Record<string, unknown>).auth !== "string" || (keys as Record<string, string>).auth.length > MAX_KEY_LEN ||
    typeof (keys as Record<string, unknown>).p256dh !== "string" || (keys as Record<string, string>).p256dh.length > MAX_KEY_LEN
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Verificar que la tienda existe, está activa y publicada
  const store = await prisma.store.findFirst({
    where: { id: storeId, isActive: true, isPublished: true },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  const { auth, p256dh } = keys as Record<string, string>;

  // Si hay sesión activa, linkear la suscripción al usuario
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;

  await prisma.storeSubscription.upsert({
    where: { endpoint },
    update: { auth, p256dh, storeId, ...(userId ? { userId } : {}) },
    create: { storeId, endpoint, auth, p256dh, ...(userId ? { userId } : {}) },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — visitante cancela su suscripción a una tienda
export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId, endpoint } = body as Record<string, unknown>;

  if (
    typeof storeId !== "string" || storeId.length === 0 ||
    typeof endpoint !== "string" || endpoint.length === 0
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Solo borra el registro si el endpoint corresponde a esa tienda (evita borrar de otra)
  await prisma.storeSubscription.deleteMany({
    where: { endpoint, storeId },
  });

  return NextResponse.json({ ok: true });
}
