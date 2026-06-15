import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { description } = await req.json();
  if (typeof description !== "string" || description.length > 200) {
    return NextResponse.json({ error: "Descripción inválida" }, { status: 400 });
  }
  await prisma.store.update({
    where: { ownerId: user.id },
    data: { description: description.trim() || null },
  });
  return NextResponse.json({ ok: true });
}
