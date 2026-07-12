import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { connectCatalogToWaba, decryptToken } from "@/lib/facebook";

// POST /api/facebook/whatsapp/connect  { wabaId }
// Conecta el catálogo de productos (creado por Catálogo de Meta) a la WhatsApp
// Business Account elegida. No crea nada nuevo: reusa fbCatalogId ya existente.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { wabaId } = await req.json().catch(() => ({}));
  if (!wabaId || typeof wabaId !== "string") {
    return NextResponse.json({ error: "wabaId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbCatalogId: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }
  if (!store.fbCatalogId) {
    return NextResponse.json({ error: "Conectá primero la app Catálogo de Meta" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    await connectCatalogToWaba(token, wabaId, store.fbCatalogId);

    await prisma.store.update({
      where: { id: store.id },
      data: { fbWabaId: wabaId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Facebook /whatsapp/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el catálogo a WhatsApp" }, { status: 502 });
  }
}
