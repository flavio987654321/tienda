import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { enviarCorreo } from "@/lib/correos-compradores-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/correos/[id]/seguir — retomar un envío que se cortó.
 *
 * Sólo si es de esta cuenta y quedó en ENVIANDO: uno LISTO no se vuelve a
 * mandar por acá, que sería mandárselo dos veces a todo el mundo.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    if (!(await checkRateLimit(`correos-seguir:${user.id}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/correos/seguir");
  }

  const { id } = await params;
  const correo = await prisma.correoDigital.findFirst({
    where: { id, estado: "ENVIANDO", store: { ownerId: user.id } },
    select: { id: true },
  });
  if (!correo) return NextResponse.json({ error: "Ese envío ya terminó." }, { status: 409 });

  const resultado = await enviarCorreo(correo.id);
  return NextResponse.json({ ok: true, ...resultado });
}
