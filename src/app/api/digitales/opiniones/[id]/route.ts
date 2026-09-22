import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { esEstadoDeOpinion } from "@/lib/opiniones-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/digitales/opiniones/[id] — publicar, esconder o volver a
 * pendiente una opinión verificada. Sólo el estado: el texto no se toca
 * nunca desde acá (lo que se publica es lo que la persona escribió).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`opiniones:${user.id}`, 60, 60_000))) {
      return NextResponse.json({ error: "Demasiados cambios seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/opiniones/[id]");
  }

  const body = await req.json().catch(() => null);
  const estado = body && typeof body === "object" ? (body as { estado?: unknown }).estado : undefined;
  if (!esEstadoDeOpinion(estado)) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });

  const { id } = await ctx.params;
  /* Sólo una opinión de un producto de ESTA cuenta: un id ajeno no cambia nada. */
  const { count } = await prisma.opinionDigital.updateMany({ where: { id, store: { ownerId: user.id } }, data: { estado } });
  if (count === 0) return NextResponse.json({ error: "Esa opinión no existe." }, { status: 404 });
  return NextResponse.json({ ok: true, estado });
}
