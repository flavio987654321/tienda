import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === current.id) {
    return NextResponse.json({ error: "No podés modificar tu propia cuenta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "No podés modificar otra cuenta admin" }, { status: 400 });
  }

  const { banned } = await req.json();

  const user = await prisma.user.update({
    where: { id },
    data: { banned: Boolean(banned) },
    select: { id: true, banned: true },
  });

  return NextResponse.json(user);
}
