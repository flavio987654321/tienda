import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isAdminSection } from "@/lib/adminSections";

// Marca una sección del admin como vista: pone seenAt=now, lo que apaga su badge.
// La LECTURA de los contadores vive en /api/admin/badges (getNewCounts); acá solo
// está la escritura del "ya lo vi".
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const section = (body as { section?: unknown }).section;
  if (!isAdminSection(section)) {
    return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
  }

  await prisma.adminSectionView.upsert({
    where: { userId_section: { userId: user.id, section } },
    create: { userId: user.id, section, seenAt: new Date() },
    update: { seenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
