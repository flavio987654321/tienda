import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { link, sortOrder, imageUrl } = await req.json();

  const data: { link?: string | null; sortOrder?: number; imageUrl?: string } = {};
  if (link !== undefined) {
    if (link !== null && typeof link !== "string") {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }
    data.link = link === null ? null : link.trim() || null;
  }
  if (sortOrder !== undefined) {
    if (typeof sortOrder !== "number" || !Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "Orden inválido" }, { status: 400 });
    }
    data.sortOrder = Math.round(sortOrder);
  }
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    }
    data.imageUrl = imageUrl.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const promotion = await prisma.promotion.update({ where: { id }, data });
  return NextResponse.json(promotion);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
