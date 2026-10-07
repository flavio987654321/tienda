import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { leerSuscripcionPush } from "@/lib/suscripcionPush";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

/* Anotar / borrar el celular de la dueña para los avisos del panel.
   La dirección se valida (lib/suscripcionPush): sólo los servicios de avisos
   reales, nunca una url cualquiera a la que después le pegaría el servidor. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* Se re-anota sola al abrir el panel (asegurarSuscripcionDelPanel): treinta
     por hora es de sobra para una persona con varios aparatos. */
  const { permitido } = await checkRateLimitConRespaldo(`push-sub:${user.id}`, 30, 60 * 60_000, { limiteFallback: 30, limiteFallbackGlobal: 3000 });
  if (!permitido) return NextResponse.json({ error: "Demasiados intentos. Probá en un rato." }, { status: 429 });

  const sub = leerSuscripcionPush(await req.json().catch(() => null));
  if (!sub) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { auth: sub.auth, p256dh: sub.p256dh, userId: user.id },
    create: { userId: user.id, endpoint: sub.endpoint, auth: sub.auth, p256dh: sub.p256dh },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = (body as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint || endpoint.length > 1024) {
    return NextResponse.json({ error: "Endpoint requerido" }, { status: 400 });
  }
  // Borrar no le pega a nadie: no hace falta que sea de un servicio conocido
  // (así se pueden limpiar las viejas), sólo que sea de este usuario.
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
