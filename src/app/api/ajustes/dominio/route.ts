import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription } from "@/lib/subscription";

async function addDomainToVercel(domain: string) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;

  const teamId = process.env.VERCEL_TEAM_ID;
  const qs = teamId ? `?teamId=${teamId}` : "";

  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains${qs}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Vercel add domain error:", data);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Vercel API error:", e);
    return null;
  }
}

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
  if (existing) return NextResponse.json({ error: "Ese dominio ya está en uso por otra tienda" }, { status: 409 });

  await addDomainToVercel(cleaned);

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: cleaned },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.store.update({
    where: { ownerId: user.id },
    data: { customDomain: null },
  });

  return NextResponse.json({ success: true });
}
