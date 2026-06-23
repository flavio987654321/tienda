import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const day = getArgentinaDayKey();
  const mensajes = await prisma.asistenteMensaje.findMany({
    where: { userId: user.id, day },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  return NextResponse.json({
    messages: mensajes,
    yaSaludoHoy: mensajes.some((m) => m.role === "assistant"),
  });
}
