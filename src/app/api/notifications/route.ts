import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// GET - obtener notificaciones del usuario
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH - marcar todas como leídas (o una específica con ?id=xxx)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
