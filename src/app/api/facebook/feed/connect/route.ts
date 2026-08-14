import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { createProductFeed, buscarFeedPropio, decryptToken, dentroDelTopeGraph } from "@/lib/facebook";
import { PUBLIC_APP_URL } from "@/lib/site";

// POST /api/facebook/feed/connect
// Registra el feed XML de la tienda como product feed programado del catálogo conectado.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true, fbAccessToken: true, fbCatalogId: true },
  });
  if (!store?.fbAccessToken || !store.fbCatalogId) {
    return NextResponse.json({ error: "Conectá primero tu cuenta y portfolio comercial de Facebook" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  const feedUrl = `${PUBLIC_APP_URL}/api/store/feed?store=${encodeURIComponent(store.slug)}`;

  try {
    // Preguntar antes de crear: si el dueño ya se había conectado a este mismo
    // catálogo, el feed sigue estando del lado de Meta aunque nosotros hayamos
    // perdido el id. Crear a ciegas dejaba dos feeds tirando de la misma URL.
    const existente = await buscarFeedPropio(token, store.fbCatalogId, feedUrl);
    const feedId = existente ?? (await createProductFeed(token, store.fbCatalogId, feedUrl, `${store.name} — Feed diario`)).id;

    await prisma.store.update({
      where: { id: store.id },
      data: { fbFeedId: feedId },
    });

    return NextResponse.json({ ok: true, feedId, reutilizado: existente !== null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "(#200) Permissions error" solía significar "todavía no nos aprobaron el
    // acceso avanzado a catalog_management", y se devolvía como pendiente. Meta
    // lo aprobó el 12/08/2026, así que ese camino ya no existe: un #200 ahora es
    // un permiso de verdad faltante — token vencido, el dueño revocó el acceso
    // desde Facebook, o perdió el control del catálogo. Devolverlo como "todo
    // listo" dejaba al dueño creyendo que sincronizaba cuando no sincronizaba nada.
    if (/#200|Permissions error/i.test(msg)) {
      console.error("Facebook /feed/connect: permiso rechazado por Meta (#200)", msg);
      return NextResponse.json(
        { error: "Facebook rechazó el permiso. Desconectá tu cuenta más arriba y volvé a conectarla." },
        { status: 403 },
      );
    }
    console.error("Facebook /feed/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el catálogo con tu feed de productos" }, { status: 502 });
  }
}
