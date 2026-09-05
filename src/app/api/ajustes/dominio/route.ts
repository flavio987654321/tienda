import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, hasActivePremium } from "@/lib/subscription";
import { syncTurnstileHostname } from "@/lib/turnstile";
import { dominioLibre } from "@/lib/dominio-digital";

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

  // Con el plan al día, no solo con el plan: miraba `tier` a secas, así que una
  // suscripción Premium vencida seguía pudiendo conectar dominios nuevos.
  const sub = await getUserSubscription(user.id);
  if (!hasActivePremium(sub)) {
    return NextResponse.json({ error: "Esta función requiere el plan Tienda Premium" }, { status: 403 });
  }

  const { domain } = await req.json();
  if (!domain || typeof domain !== "string" || !domain.includes(".")) {
    return NextResponse.json({ error: "Dominio inválido" }, { status: 400 });
  }

  const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const previous = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { customDomain: true },
  });

  /* ⚠️ Las DOS tablas, no sólo `Store`. Un dominio propio también puede ser de
     un producto digital (`Product.dominioPropio`), y son dos índices únicos
     distintos: la base aceptaba el mismo dominio en las dos sin quejarse, y el
     middleware desempata a favor de la tienda. O sea que escribir acá el
     dominio de un producto ajeno le sacaba la dirección a su dueño, con el
     certificado ya emitido a nombre de él. Ver `lib/dominio-digital`.

     Y se saltea si es EL QUE YA TENÍAS: la consulta de antes tampoco excluía la
     tienda propia, así que volver a guardar el mismo dominio contestaba que ya
     estaba en uso. Con el texto viejo —"por otra tienda"— era raro; con el
     nuevo —"en otra cuenta"— sería directamente falso. */
  if (previous?.customDomain !== cleaned && !(await dominioLibre(cleaned))) {
    return NextResponse.json({ error: "Ese dominio ya está conectado en otra cuenta" }, { status: 409 });
  }

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

// `_req` no se usa: lo pide la firma del route handler de Next.
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
