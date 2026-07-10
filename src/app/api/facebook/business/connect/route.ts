import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedCatalogs, createCatalog, decryptToken } from "@/lib/facebook";

// POST /api/facebook/business/connect  { businessId }
// Conecta el Business Portfolio elegido: reusa un catálogo existente o crea uno nuevo.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, fbAccessToken: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    const { data: existing } = await listOwnedCatalogs(token, businessId);
    const catalogId = existing[0]?.id ?? (await createCatalog(token, businessId, `${store.name} — Catálogo`)).id;

    await prisma.store.update({
      where: { id: store.id },
      data: { fbBusinessId: businessId, fbCatalogId: catalogId },
    });

    return NextResponse.json({ ok: true, catalogId });
  } catch (err) {
    console.error("Facebook /business/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el portfolio comercial" }, { status: 502 });
  }
}
