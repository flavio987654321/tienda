import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { borrarProductFeed, decryptToken } from "@/lib/facebook";

// POST /api/facebook/oauth/disconnect
//
// Desconectar borraba seis columnas nuestras y nada más: ni una llamada a Meta.
// El feed programado seguía registrado del lado de ellos apuntando a nuestra
// URL, así que Meta le seguía leyendo los productos al dueño todos los días a
// las 6 de la mañana. Desconectaba, la pantalla decía que estaba desconectado, y
// seguía sincronizando igual. Encima, al borrar `fbFeedId` perdíamos la única
// referencia para encontrarlo y pararlo.
//
// Ahora se intenta darlo de baja primero, mientras el token todavía sirve.
//
// Lo que NO se toca, a propósito: el catálogo y los productos que ya subimos.
// Son del dueño, viven en su portfolio, y borrárselos porque desconectó una
// integración sería decidir por él. Si los quiere sacar, se hace desde Commerce
// Manager — y eso hay que decírselo en pantalla (ver el aviso de desconexión).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbFeedId: true },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Si falla, `borrarProductFeed` lo registra y devuelve false: desconectar no
  // se puede bloquear porque Meta esté caída o el token ya no sirva.
  let feedDadoDeBaja = false;
  if (store.fbFeedId && store.fbAccessToken) {
    const token = decryptToken(store.fbAccessToken);
    if (token) feedDadoDeBaja = await borrarProductFeed(token, store.fbFeedId);
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      fbAccessToken: null,
      fbUserId:      null,
      fbBusinessId:  null,
      fbCatalogId:   null,
      fbFeedId:      null,
      fbConnectedAt: null,
      fbTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true, feedDadoDeBaja });
}
