import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getOAuthUrl, FB_APP_ID } from "@/lib/facebook";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// GET /api/facebook/oauth/connect
// Redirige al dueño de tienda a la página de autorización de Facebook.
// Genera un nonce aleatorio para proteger contra CSRF en el callback.
export async function GET() {
  // Sin App de Meta configurada no hay adónde mandar al usuario — evitar
  // la página rota de Facebook ("Identificador de la app no válido").
  if (!FB_APP_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/aplicaciones/meta-catalogo?fb=error`);
  }

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
  res.cookies.set("fb_oauth_state", `${nonce}:${store.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
  });

  return res;
}
