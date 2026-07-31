import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedCatalogs, createCatalog, decryptToken } from "@/lib/facebook";

// POST /api/facebook/catalogs/connect  { catalogId } | { name }
// `catalogId`: usa un catálogo que el dueño eligió de la lista.
// `name`: crea uno nuevo en el portfolio conectado y lo deja elegido.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const catalogId = typeof body.catalogId === "string" ? body.catalogId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!catalogId && !name) {
    return NextResponse.json({ error: "Elegí un catálogo o poné un nombre para crear uno" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbBusinessId: true },
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
    let chosen: { id: string; name: string };

    if (catalogId) {
      // El ID llega del navegador: confirmarlo contra los catálogos del portfolio
      // para que nadie enganche la tienda a un catálogo que no le pertenece.
      const { data } = await listOwnedCatalogs(token, store.fbBusinessId);
      const match = data.find((c) => c.id === catalogId);
      if (!match) {
        return NextResponse.json({ error: "Ese catálogo no pertenece a tu portfolio comercial" }, { status: 400 });
      }
      chosen = match;
    } else {
      const created = await createCatalog(token, store.fbBusinessId, name);
      chosen = { id: created.id, name };
    }

    await prisma.store.update({
      where: { id: store.id },
      // El feed viejo apuntaba al catálogo anterior: se rearma en el último paso.
      data: { fbCatalogId: chosen.id, fbFeedId: null },
    });

    return NextResponse.json({ ok: true, catalog: chosen });
  } catch (err) {
    console.error("Facebook /catalogs/connect error:", err);
    return NextResponse.json({ error: "No se pudo conectar el catálogo" }, { status: 502 });
  }
}
