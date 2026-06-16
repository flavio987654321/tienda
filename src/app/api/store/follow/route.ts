import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// GET — estado de follow del usuario en la tienda (?storeId=xxx)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ following: false });

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const follow = await prisma.storeFollow.findUnique({
    where: { userId_storeId: { userId: user.id, storeId } },
    select: { id: true },
  });

  return NextResponse.json({ following: !!follow });
}

// POST — seguir una tienda
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para seguir esta tienda" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId } = body as Record<string, unknown>;
  if (typeof storeId !== "string" || storeId.length === 0) {
    return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, isActive: true, isPublished: true },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  await prisma.storeFollow.upsert({
    where: { userId_storeId: { userId: user.id, storeId } },
    update: {},
    create: { userId: user.id, storeId },
  });

  return NextResponse.json({ ok: true, following: true });
}

// DELETE — dejar de seguir una tienda
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId } = body as Record<string, unknown>;
  if (typeof storeId !== "string" || storeId.length === 0) {
    return NextResponse.json({ error: "storeId requerido" }, { status: 400 });
  }

  await prisma.storeFollow.deleteMany({
    where: { userId: user.id, storeId },
  });

  return NextResponse.json({ ok: true, following: false });
}
