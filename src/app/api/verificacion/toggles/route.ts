import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, isVerified: true },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  if (!store.isVerified) return NextResponse.json({ error: "La tienda no está verificada" }, { status: 403 });

  const body = await req.json();
  const allowed = ["verifiedShowName", "verifiedShowCity", "verifiedShowPhone", "verifiedShowSince"] as const;
  const data: Record<string, boolean> = {};

  for (const key of allowed) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data,
    select: {
      verifiedShowName: true,
      verifiedShowCity: true,
      verifiedShowPhone: true,
      verifiedShowSince: true,
    },
  });

  return NextResponse.json({ ok: true, toggles: updated });
}
