import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

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
    data: {
      gaRefreshToken: null,
      gaAccountId: null,
      gaPropertyId: null,
      gaConnectedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
