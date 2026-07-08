import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await checkRateLimit(`activity-feed:${user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const events = await prisma.storeActivityEvent.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, data: true, createdAt: true },
  });

  return NextResponse.json(
    events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))
  );
}
