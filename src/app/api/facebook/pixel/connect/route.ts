import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  listOwnedPixels, createPixel, decryptToken,
  traducirErrorGraph, dentroDelTopeGraph,
} from "@/lib/facebook";

// POST /api/facebook/pixel/connect  { pixelId } | { name }
//
// `pixelId`: usa un píxel que el dueño eligió de la lista.
// `name`: crea uno nuevo en el portfolio conectado y lo deja elegido.
//
// Antes esto recibía un `businessId` y resolvía solo:
//
//     const pixelId = existing[0]?.id ?? (await createPixel(...)).id;
//
// O sea que agarraba el PRIMERO que devolviera Meta. Un negocio con varios
// píxeles —el de la web vieja, el de la agencia, el de una campaña— terminaba
// midiendo en cualquiera, sin pantalla donde verlo ni forma de cambiarlo. Es el
// mismo error por el que Meta nos rechazó el App Review del catálogo: conectar
// algo sin mostrarlo nunca.
const MAX_NOMBRE = 100;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const pixelId = typeof body.pixelId === "string" ? body.pixelId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NOMBRE) : "";
  if (!pixelId && !name) {
    return NextResponse.json({ error: "Elegí un píxel o poné un nombre para crear uno" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbBusinessId: true, storeConfig: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }
  if (!store.fbBusinessId) {
    return NextResponse.json({ error: "Elegí primero tu portfolio comercial" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    let elegido: string;

    if (pixelId) {
      // El ID llega del navegador: confirmarlo contra los píxeles del portfolio
      // para no enganchar la tienda a uno que no le pertenece.
      const { data } = await listOwnedPixels(token, store.fbBusinessId);
      if (!data.some((p) => p.id === pixelId)) {
        return NextResponse.json({ error: "Ese píxel no pertenece a tu portfolio comercial" }, { status: 400 });
      }
      elegido = pixelId;
    } else {
      elegido = (await createPixel(token, store.fbBusinessId, name)).id;
    }

    // El píxel se guarda en storeConfig.analytics, el mismo campo de siempre,
    // así `StoreTrackingScripts` no cambia. Se relee acá adentro y no antes para
    // achicar la ventana entre leer y escribir: si el dueño estaba tocando otra
    // cosa de la configuración en otra pestaña, una de las dos escrituras pisa a
    // la otra. Sigue sin ser atómico — ver el arreglo 08.
    const fresco = await prisma.store.findUnique({
      where: { id: store.id },
      select: { storeConfig: true },
    });
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(fresco?.storeConfig || "{}"); } catch { /* config inválido, se trata como vacío */ }
    const analytics = { ...(config.analytics as Record<string, unknown> | undefined), facebookPixelId: elegido };

    await prisma.store.update({
      where: { id: store.id },
      data: { storeConfig: JSON.stringify({ ...config, analytics }) },
    });

    return NextResponse.json({ ok: true, pixelId: elegido });
  } catch (err) {
    console.error("Facebook /pixel/connect error:", err);
    const { error, status } = traducirErrorGraph(err, "pixeles");
    return NextResponse.json({ error }, { status });
  }
}
