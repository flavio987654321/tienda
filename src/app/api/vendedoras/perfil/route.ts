import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, instagramHandle: true, phone: true },
  });
  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const b = await req.json();
  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
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
