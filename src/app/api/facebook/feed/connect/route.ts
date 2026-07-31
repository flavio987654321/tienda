import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { createProductFeed, decryptToken } from "@/lib/facebook";
import { PUBLIC_APP_URL } from "@/lib/site";

// POST /api/facebook/feed/connect
// Registra el feed XML de la tienda como product feed programado del catálogo conectado.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    const feed = await createProductFeed(token, store.fbCatalogId, feedUrl, `${store.name} — Feed diario`);

    await prisma.store.update({
      where: { id: store.id },
      data: { fbFeedId: feed.id },
    });

    return NextResponse.json({ ok: true, feedId: feed.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "(#200) Permissions error": Meta bloquea registrar el feed programado
    // mientras la app está en "Acceso estándar", es decir ANTES de que la
    // Revisión de la app apruebe el acceso avanzado a catalog_management. El
    // catálogo ya quedó creado; el feed se activa solo cuando Meta aprueba —
    // no es un error del dueño, así que se devuelve como "pendiente de revisión".
    if (/#200|Permissions error/i.test(msg)) {
      console.warn("Facebook /feed/connect: feed pendiente del acceso avanzado de Meta (#200)");
      return NextResponse.json({ pendingReview: true });
    }
    console.error("Facebook /feed/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el catálogo con tu feed de productos" }, { status: 502 });
  }
}
