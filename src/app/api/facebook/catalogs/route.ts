import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { listOwnedCatalogs, decryptToken } from "@/lib/facebook";

// GET /api/facebook/catalogs
// Lista los catálogos de productos del portfolio comercial ya conectado, con su
// nombre y su ID, para que el dueño elija uno a mano en el wizard.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    const { data } = await listOwnedCatalogs(token, store.fbBusinessId);
    return NextResponse.json({ catalogs: data });
  } catch (err) {
    console.error("Facebook /catalogs error:", err);
    return NextResponse.json({ error: "No se pudo obtener tus catálogos de Meta" }, { status: 502 });
  }
}
