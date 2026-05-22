import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sub = await getUserSubscription(user.id);
  if (!sub || (sub as any).tier !== "PREMIUM") {
    return NextResponse.json({ error: "Esta función requiere el plan Tienda Premium" }, { status: 403 });
  }

  const { domain } = await req.json();
  if (!domain || typeof domain !== "string" || !domain.includes(".")) {
    return NextResponse.json({ error: "Dominio inválido" }, { status: 400 });
  }

  const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const existing = await prisma.store.findUnique({ where: { customDomain: cleaned } });
  if (existing) return NextResponse.json({ error: "Ese dominio ya está en uso" }, { status: 409 });

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: cleaned },
  });

  return NextResponse.json({ success: true });
}
