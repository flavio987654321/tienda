import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, city: true, phone: true },
  });

  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, city, phone } = await req.json();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name?.trim() || null,
      city: city?.trim() || null,
      phone: phone?.trim() || null,
    },
    select: { id: true, name: true, email: true, city: true, phone: true },
  });

  return NextResponse.json({ profile: updated });
}
