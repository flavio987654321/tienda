import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedPixels, createPixel, decryptToken } from "@/lib/facebook";

// POST /api/facebook/pixel/connect  { businessId }
// Conecta el Pixel (conjunto de datos) del Business Portfolio elegido: reusa
// uno existente o crea uno nuevo. Guarda el id en storeConfig.analytics.facebookPixelId
// — el mismo campo de siempre, así StoreTrackingScripts no cambia.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, fbAccessToken: true, storeConfig: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    const { data: existing } = await listOwnedPixels(token, businessId);
    const pixelId = existing[0]?.id ?? (await createPixel(token, businessId, `${store.name} — Pixel`)).id;

    let config: Record<string, unknown> = {};
    try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* config inválido, se trata como vacío */ }
    const analytics = { ...(config.analytics as Record<string, unknown> | undefined), facebookPixelId: pixelId };

    await prisma.store.update({
      where: { id: store.id },
      data: { fbBusinessId: businessId, storeConfig: JSON.stringify({ ...config, analytics }) },
    });

    return NextResponse.json({ ok: true, pixelId });
  } catch (err) {
    console.error("Facebook /pixel/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el píxel" }, { status: 502 });
  }
}
