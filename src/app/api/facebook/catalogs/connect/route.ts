import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  listOwnedCatalogs, createCatalog, assignCatalogToUser, decryptToken,
  traducirErrorGraph, dentroDelTopeGraph,
} from "@/lib/facebook";

// Meta corta los nombres largos igual; el techo es para no mandarle basura y
// para que un campo sin límite no sea una vía de abuso barata.
const MAX_NOMBRE = 100;

// POST /api/facebook/catalogs/connect  { catalogId } | { name }
// `catalogId`: usa un catálogo que el dueño eligió de la lista.
// `name`: crea uno nuevo en el portfolio conectado y lo deja elegido.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const catalogId = typeof body.catalogId === "string" ? body.catalogId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NOMBRE) : "";
  if (!catalogId && !name) {
    return NextResponse.json({ error: "Elegí un catálogo o poné un nombre para crear uno" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbAccessToken: true, fbBusinessId: true, fbUserId: true },
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

      // Sin esto el dueño no puede administrar en Meta el catálogo que acaba de
      // crear. No es motivo para cortar la conexión: si falla, el catálogo ya
      // existe y quedó elegido, y el permiso se puede dar a mano después.
      if (store.fbUserId) {
        try {
          await assignCatalogToUser(token, created.id, store.fbUserId);
        } catch (err) {
          console.warn("Facebook /catalogs/connect: no se pudo asignar el catálogo al dueño:", err);
        }
      }
    }

    await prisma.store.update({
      where: { id: store.id },
      // El feed viejo apuntaba al catálogo anterior: se rearma en el último paso.
      data: { fbCatalogId: chosen.id, fbFeedId: null },
    });

    return NextResponse.json({ ok: true, catalog: chosen });
  } catch (err) {
    console.error("Facebook /catalogs/connect error:", err);
    const { error, status } = traducirErrorGraph(err, "catalogos");
    return NextResponse.json({ error }, { status });
  }
}
