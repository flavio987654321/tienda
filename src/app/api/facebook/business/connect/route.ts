import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  listOwnedBusinesses, decryptToken, borrarProductFeed,
  traducirErrorGraph, dentroDelTopeGraph,
} from "@/lib/facebook";

// POST /api/facebook/business/connect  { businessId }
// Guarda el Business Portfolio elegido. El catálogo NO se elige acá: lo elige el
// dueño a mano en el paso siguiente (/api/facebook/catalogs). Meta rechazó el
// App Review de catalog_management porque la app conectaba un catálogo sin
// mostrarlo nunca en pantalla — el revisor tiene que ver la lista y la elección.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbBusinessId: true, fbFeedId: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    // El ID llega del navegador y antes se guardaba tal cual. No era explotable
    // —Meta después rechaza cualquier operación sobre un portfolio ajeno— pero
    // quedaba en la base un dato que nunca habíamos verificado, y el error
    // recién aparecía dos pasos más adelante, lejos de donde se había elegido.
    // Es el mismo chequeo que ya hacían catalogs/connect y pixel/connect.
    const { data } = await listOwnedBusinesses(token);
    if (!data.some((b) => b.id === businessId)) {
      return NextResponse.json(
        { error: "Ese portfolio comercial no está en tu cuenta de Facebook. Elegí uno de la lista." },
        { status: 400 },
      );
    }

    const cambiaDePortfolio = !!store.fbBusinessId && store.fbBusinessId !== businessId;

    // Tercera puerta al mismo agujero del feed huérfano: cambiar de portfolio
    // también soltaba el catálogo y el feed, y el feed quedaba corriendo contra
    // nuestra URL sin que nos quedara la referencia. Se da de baja acá igual que
    // al desconectar la cuenta o al cambiar de catálogo.
    if (cambiaDePortfolio && store.fbFeedId) {
      await borrarProductFeed(token, store.fbFeedId);
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        fbBusinessId: businessId,
        // Cambiar de portfolio invalida el catálogo elegido antes: pertenece al anterior.
        ...(cambiaDePortfolio ? { fbCatalogId: null, fbFeedId: null } : {}),
      },
    });

    return NextResponse.json({ ok: true, businessId });
  } catch (err) {
    console.error("Facebook /business/connect error:", err);
    const { error, status } = traducirErrorGraph(err, "portfolios");
    return NextResponse.json({ error }, { status });
  }
}
