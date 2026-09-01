import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getOAuthUrl } from "@/lib/mp";
import { espacioDigital } from "@/lib/espacio-digital";

// GET /api/mp/oauth/connect
// Redirige al dueño a la página de autorización de MercadoPago.
// Genera un nonce aleatorio para proteger contra CSRF en el callback.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* De qué panel salió, para saber a cuál volver.
   *
   * Sale del ROL y no de un parámetro de la URL a propósito: un destino que
   * viaja en el pedido lo puede cambiar cualquiera, y el callback termina
   * redirigiendo a donde le digan. Acá el destino es una palabra nuestra
   * —"tienda" o "digital"— que el callback traduce contra una lista fija, así
   * que ni siquiera existe una dirección que se pueda inyectar.
   *
   * Una cuenta digital todavía puede no tener su espacio creado: se crea con el
   * primer producto, y conectar el cobro antes de cargar nada es de lo más
   * razonable que puede hacer alguien que recién entra. */
  let storeId: string;
  if (user.role === "DIGITAL") {
    const espacio = await espacioDigital(user.id);
    if ("error" in espacio) return NextResponse.json({ error: espacio.error }, { status: 409 });
    storeId = espacio.storeId;
  } else {
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    storeId = store.id;
  }

  const vuelta = user.role === "DIGITAL" ? "digital" : "tienda";
  const nonce = randomBytes(16).toString("hex");

  const url = getOAuthUrl(nonce);
  const res = NextResponse.redirect(url);

  // Cookie corta (15 min) que asocia el nonce con el storeId del owner autenticado
  res.cookies.set("mp_oauth_state", `${nonce}:${storeId}:${vuelta}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
  });

  return res;
}
