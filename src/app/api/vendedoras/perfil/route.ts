import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, instagramHandle: true, phone: true },
  });
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const b = await req.json();
  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      name:            b.name            || null,
      bio:             b.bio             || null,
      city:            b.city            || null,
      instagramHandle: b.instagramHandle || null,
      phone:           b.phone           || null,
      image:           b.image           || null,
    },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, instagramHandle: true, phone: true },
  });
  return NextResponse.json({ user });
}
