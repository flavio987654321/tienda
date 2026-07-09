import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getClientIp } from "@/lib/request-ip";

// GET — indica si el usuario logueado aceptó una versión vieja (o ninguna)
// de los Términos y Condiciones / Política de Privacidad generales.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ needsAcceptance: false }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { termsVersion: true },
  });

  return NextResponse.json({
    needsAcceptance: profile?.termsVersion !== CURRENT_TERMS_VERSION,
    currentVersion: CURRENT_TERMS_VERSION,
  });
}

// POST — registra la re-aceptación de la versión vigente.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const ip = getClientIp(req);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedIp: ip,
    },
  });

  return NextResponse.json({ ok: true });
}
