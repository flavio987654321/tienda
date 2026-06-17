import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getOAuthUrl } from "@/lib/mp";

// GET /api/mp/oauth/connect
// Redirige al dueño de tienda a la página de autorización de MercadoPago.
// Genera un nonce aleatorio para proteger contra CSRF en el callback.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const nonce = randomBytes(16).toString("hex");

  const url = getOAuthUrl(nonce);
  const res = NextResponse.redirect(url);

  // Cookie corta (15 min) que asocia el nonce con el storeId del owner autenticado
  res.cookies.set("mp_oauth_state", `${nonce}:${store.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
  });

  return res;
}
