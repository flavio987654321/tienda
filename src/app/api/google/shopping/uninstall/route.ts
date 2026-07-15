import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// POST /api/google/shopping/uninstall
// Revoca el opt-in: los productos de la tienda salen del feed central en la
// próxima lectura de Google (Google los da de baja solo al no encontrarlos).
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
    data: { gsEnabledAt: null },
  });

  return NextResponse.json({ ok: true });
}
