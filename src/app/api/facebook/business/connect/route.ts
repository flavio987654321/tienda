import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/facebook";

// POST /api/facebook/business/connect  { businessId }
// Guarda el Business Portfolio elegido. El catálogo NO se elige acá: lo elige el
// dueño a mano en el paso siguiente (/api/facebook/catalogs). Meta rechazó el
// App Review de catalog_management porque la app conectaba un catálogo sin
// mostrarlo nunca en pantalla — el revisor tiene que ver la lista y la elección.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { businessId } = await req.json().catch(() => ({}));
  if (!businessId || typeof businessId !== "string") {
    return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbBusinessId: true },
  });
  if (!store?.fbAccessToken) {
    return NextResponse.json({ error: "Facebook no está conectado" }, { status: 400 });
  }

  const token = decryptToken(store.fbAccessToken);
  if (!token) return NextResponse.json({ error: "Credenciales de Facebook inválidas" }, { status: 500 });

  try {
    // Cambiar de portfolio invalida el catálogo elegido antes: pertenece al anterior.
    await prisma.store.update({
      where: { id: store.id },
      data: {
        fbBusinessId: businessId,
        ...(store.fbBusinessId && store.fbBusinessId !== businessId
          ? { fbCatalogId: null, fbFeedId: null }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, businessId });
  } catch (err) {
    console.error("Facebook /business/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el portfolio comercial" }, { status: 502 });
  }
}
