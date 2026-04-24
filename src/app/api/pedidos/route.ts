import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ pendingCount: 0 });

  const pendingCount = await prisma.order.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  return NextResponse.json({ pendingCount });
}
