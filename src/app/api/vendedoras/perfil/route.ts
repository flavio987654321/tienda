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

const PLACA_TEMPLATE_IDS = ["clasica", "minimal", "oferta"];

const PROFILE_SELECT = {
  id: true, name: true, email: true, image: true, bio: true, city: true,
  instagramHandle: true, phone: true, notifyNewStores: true, preferredPlacaTemplate: true,
};

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: PROFILE_SELECT,
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

  // Validar plantilla de placa
  if (b.preferredPlacaTemplate != null && !PLACA_TEMPLATE_IDS.includes(b.preferredPlacaTemplate)) {
    return NextResponse.json({ error: "Plantilla de placa inválida" }, { status: 400 });
  }

  // Solo se actualizan los campos presentes en el body — evita pisar con null
  // el resto del perfil cuando se manda una actualización parcial (ej: solo la plantilla de placa).
  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      ...(b.name !== undefined ? { name: b.name?.trim() || null } : {}),
      ...(b.bio !== undefined ? { bio: b.bio?.trim() || null } : {}),
      ...(b.city !== undefined ? { city: b.city?.trim() || null } : {}),
      ...(b.instagramHandle !== undefined ? { instagramHandle: b.instagramHandle?.trim() || null } : {}),
      ...(b.phone !== undefined ? { phone: b.phone?.trim() || null } : {}),
      ...(b.image !== undefined ? { image: b.image?.trim() || null } : {}),
      ...(typeof b.notifyNewStores === "boolean" ? { notifyNewStores: b.notifyNewStores } : {}),
      ...(b.preferredPlacaTemplate !== undefined ? { preferredPlacaTemplate: b.preferredPlacaTemplate } : {}),
    },
    select: PROFILE_SELECT,
  });
  return NextResponse.json({ user });
}
