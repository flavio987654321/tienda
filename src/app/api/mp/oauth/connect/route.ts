import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getOAuthUrl } from "@/lib/mp";

// GET /api/mp/oauth/connect
// Redirige al dueño de tienda a la página de autorización de MercadoPago
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const url = getOAuthUrl(store.id);
  return NextResponse.redirect(url);
}
