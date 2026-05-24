import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isSafeExternalUrl } from "@/lib/url-utils";

const MAX_LENGTHS: Record<string, number> = {
  name: 80,
  bio: 500,
  city: 80,
  instagramHandle: 60,
  phone: 30,
};

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

  // Validar longitudes
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    if (b[field] && typeof b[field] === "string" && b[field].length > max) {
      return NextResponse.json({ error: `El campo ${field} excede el máximo de ${max} caracteres` }, { status: 400 });
    }
  }

  // Validar URL de imagen
  if (b.image && !isSafeExternalUrl(b.image)) {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      name:            b.name?.trim()            || null,
      bio:             b.bio?.trim()             || null,
      city:            b.city?.trim()            || null,
      instagramHandle: b.instagramHandle?.trim() || null,
      phone:           b.phone?.trim()           || null,
      image:           b.image?.trim()           || null,
    },
    select: { id: true, name: true, email: true, image: true, bio: true, city: true, instagramHandle: true, phone: true },
  });
  return NextResponse.json({ user });
}
