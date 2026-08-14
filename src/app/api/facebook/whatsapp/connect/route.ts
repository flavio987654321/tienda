import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  connectCatalogToWaba, listOwnedWhatsAppAccounts, decryptToken, dentroDelTopeGraph,
} from "@/lib/facebook";

// POST /api/facebook/whatsapp/connect  { wabaId }
// Conecta el catálogo de productos (creado por Catálogo de Meta) a la WhatsApp
// Business Account elegida. No crea nada nuevo: reusa fbCatalogId ya existente.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const { wabaId } = await req.json().catch(() => ({}));
  if (!wabaId || typeof wabaId !== "string") {
    return NextResponse.json({ error: "wabaId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbCatalogId: true, fbBusinessId: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }
  if (!store.fbBusinessId) {
    return NextResponse.json({ error: "Elegí primero tu portfolio comercial" }, { status: 400 });
  }
  if (!store.fbCatalogId) {
    return NextResponse.json({ error: "Conectá primero la app Catálogo de Meta" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    // Mismo chequeo que el resto: el id llega del navegador y antes se guardaba
    // sin confirmar que fuera de este portfolio.
    const { data } = await listOwnedWhatsAppAccounts(token, store.fbBusinessId);
    if (!data.some((w) => w.id === wabaId)) {
      return NextResponse.json(
        { error: "Esa cuenta de WhatsApp Business no pertenece a tu portfolio comercial." },
        { status: 400 },
      );
    }

    await connectCatalogToWaba(token, wabaId, store.fbCatalogId);

    await prisma.store.update({
      where: { id: store.id },
      data: { fbWabaId: wabaId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Facebook /whatsapp/connect error:", err);
    // Sin `traducirErrorGraph` a propósito: esta app todavía no tiene el permiso
    // `whatsapp_business_management`, así que lo que va a devolver Meta acá no
    // es ninguno de los casos que sabemos traducir, y traducirlo mal sería peor
    // que un mensaje honesto. Se revisa cuando el permiso esté aprobado.
    return NextResponse.json({ error: "No se pudo conectar el catálogo a WhatsApp" }, { status: 502 });
  }
}
