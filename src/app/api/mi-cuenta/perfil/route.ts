import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, phone: true, instagramHandle: true, createdAt: true },
  });

  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, bio, city, phone, instagramHandle } = await req.json();

  if (name !== undefined && (!name.trim() || name.trim().length < 2)) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(bio !== undefined && { bio: bio?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(instagramHandle !== undefined && { instagramHandle: instagramHandle?.trim() || null }),
    },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, phone: true, instagramHandle: true },
  });

  return NextResponse.json(updated);
}
