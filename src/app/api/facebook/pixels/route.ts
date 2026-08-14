import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedPixels, decryptToken, traducirErrorGraph, dentroDelTopeGraph } from "@/lib/facebook";

// GET /api/facebook/pixels
// Lista los píxeles del portfolio comercial ya conectado, para que el dueño
// elija uno a mano.
//
// Existe porque antes no se elegía nada: `pixel/connect` agarraba `existing[0]`
// —el primero que devolviera Meta— y lo enchufaba. Un negocio con varios píxeles
// terminaba midiendo en el equivocado sin enterarse. Además es el mismo motivo
// por el que Meta nos rechazó el App Review del catálogo la primera vez: la app
// conectaba algo sin mostrarlo nunca en pantalla.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await dentroDelTopeGraph(user.id))) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un minuto." }, { status: 429 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { fbAccessToken: true, fbBusinessId: true },
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
    const { data } = await listOwnedPixels(token, store.fbBusinessId);
    return NextResponse.json({ pixels: data });
  } catch (err) {
    console.error("Facebook /pixels error:", err);
    const { error, status } = traducirErrorGraph(err, "pixeles");
    return NextResponse.json({ error }, { status });
  }
}
