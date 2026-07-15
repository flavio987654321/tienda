import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// POST /api/google/shopping/install
// Opt-in explícito del dueño: a partir de acá sus productos entran al feed
// central que lee el Merchant Center de la plataforma. No hay OAuth ni token
// — el dominio ya está reclamado por la cuenta central de TiendaApps, así que
// lo único que hace falta es el permiso de la tienda.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  await prisma.store.update({
    where: { id: store.id },
    data: { gsEnabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
