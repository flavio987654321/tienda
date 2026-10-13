import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  listOwnedCatalogs, createCatalog, assignCatalogToUser, decryptToken,
  traducirErrorGraph, dentroDelTopeGraph, borrarProductFeed,
} from "@/lib/facebook";

// Meta corta los nombres largos igual; el techo es para no mandarle basura y
// para que un campo sin límite no sea una vía de abuso barata.
const MAX_NOMBRE = 100;

// POST /api/facebook/catalogs/connect  { catalogId } | { name, tipo? }
// `catalogId`: usa un catálogo que el dueño eligió de la lista.
// `name`: crea uno nuevo en el portfolio conectado y lo deja elegido.
// `tipo: "vehiculos"` (sólo tiendas de autos): lo crea como catálogo de
// vehículos de Meta. El feed que se le engancha después sale del tipo del
// catálogo (ver feed/connect), así que alcanza con crearlo bien acá.
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
    select: { id: true, tipoTienda: true, fbAccessToken: true, fbBusinessId: true, fbUserId: true, fbCatalogId: true, fbFeedId: true },
  });
  const deVehiculos = body.tipo === "vehiculos" && store?.tipoTienda === "AUTOS";
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
      let created: { id: string };
      try {
        created = await createCatalog(token, store.fbBusinessId, name, deVehiculos ? "vehicles" : undefined);
      } catch (err) {
        // Meta no habilita los catálogos de vehículos en todos los países. Si lo
        // rechaza, que se entienda y quede la salida del catálogo común.
        // Un token vencido o un permiso faltante no es eso: siguen su camino.
        // Que Meta tarde tampoco: eso no dice nada sobre los vehículos.
        const porTiempo = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
        if (deVehiculos && !porTiempo && traducirErrorGraph(err, "catalogos").status === 502) {
          console.error("Facebook /catalogs/connect: Meta rechazó el catálogo de vehículos:", err);
          return NextResponse.json({
            error: "Meta no nos dejó crear un catálogo de vehículos en tu portfolio. Podés crear uno común: tus autos entran como productos, con foto, precio y link.",
            sinVehiculos: true,
          }, { status: 422 });
        }
        throw err;
      }
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

    // Cambiar de catálogo dejaba el feed anterior corriendo sobre el catálogo
    // viejo: le poníamos `null` acá y nunca más lo veíamos. Se da de baja antes
    // de soltarlo, igual que al desconectar la cuenta. Si el catálogo elegido es
    // el mismo de antes no hay nada que dar de baja.
    if (store.fbFeedId && store.fbCatalogId && store.fbCatalogId !== chosen.id) {
      await borrarProductFeed(token, store.fbFeedId);
    }

    await prisma.store.update({
      where: { id: store.id },
      // El feed se rearma en el último paso del wizard, contra el catálogo nuevo.
      data: { fbCatalogId: chosen.id, fbFeedId: null },
    });

    return NextResponse.json({ ok: true, catalog: chosen });
  } catch (err) {
    console.error("Facebook /catalogs/connect error:", err);
    const { error, status } = traducirErrorGraph(err, "catalogos");
    return NextResponse.json({ error }, { status });
  }
}
