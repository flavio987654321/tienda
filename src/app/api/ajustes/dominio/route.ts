import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription } from "@/lib/subscription";
import { syncTurnstileHostname } from "@/lib/turnstile";

// El captcha (Turnstile) valida el hostname: sin esto, en una tienda con dominio
// propio los formularios de contacto/reseñas/ruleta quedarían deshabilitados.
// Antes de quitar un hostname, verificar que ninguna otra tienda use el mismo apex.
async function removeTurnstileHostnameIfUnused(oldDomain: string, exceptOwnerId: string) {
  const apex = oldDomain.replace(/^www\./, "");
  const stillUsed = await prisma.store.findFirst({
    where: { customDomain: { endsWith: apex }, NOT: { ownerId: exceptOwnerId } },
    select: { id: true },
  });
  if (!stillUsed) await syncTurnstileHostname(oldDomain, "remove");
}

async function addDomainToVercel(domain: string) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;

  const teamId = process.env.VERCEL_TEAM_ID;
  const qs = teamId ? `?teamId=${teamId}` : "";

  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains${qs}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Vercel add domain error:", data);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Vercel API error:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.tier !== "PREMIUM") {
    return NextResponse.json({ error: "Esta función requiere el plan Tienda Premium" }, { status: 403 });
  }

  const { domain } = await req.json();
  if (!domain || typeof domain !== "string" || !domain.includes(".")) {
    return NextResponse.json({ error: "Dominio inválido" }, { status: 400 });
  }

  const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const existing = await prisma.store.findUnique({ where: { customDomain: cleaned } });
  if (existing) return NextResponse.json({ error: "Ese dominio ya está en uso por otra tienda" }, { status: 409 });

  const previous = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { customDomain: true },
  });

  await addDomainToVercel(cleaned);
  await syncTurnstileHostname(cleaned, "add");

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: cleaned },
  });

  // Si la tienda tenía otro dominio conectado antes, liberar su hostname del widget
  if (previous?.customDomain && previous.customDomain !== cleaned) {
    await removeTurnstileHostnameIfUnused(previous.customDomain, user.id);
  }

  return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- req required by Next.js route handler signature
export async function DELETE(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const previous = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { customDomain: true },
  });

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: null },
  });

  if (previous?.customDomain) {
    await removeTurnstileHostnameIfUnused(previous.customDomain, user.id);
  }

  return NextResponse.json({ success: true });
}
