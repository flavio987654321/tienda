import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeOAuthCode, encryptToken } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// GET /api/mp/oauth/callback
// MercadoPago redirige acá después de que el dueño autoriza.
// Recibe ?code=...&state={nonce} — el storeId viene de la cookie firmada, no del parámetro público.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // Leer cookie con nonce:storeId guardada al iniciar el flujo
  const cookieValue = req.cookies.get("mp_oauth_state")?.value ?? "";
  const [cookieNonce, storeId] = cookieValue.split(":");

  // Verificar que el nonce coincide (protección CSRF)
  if (!code || !state || !cookieNonce || !storeId || state !== cookieNonce) {
    console.warn("MP OAuth callback: nonce inválido o faltante", { state, cookieNonce });
    return NextResponse.redirect(`${APP_URL}/dashboard/pagos?mp=error`);
  }

  try {
    const token = await exchangeOAuthCode(code);

    if (!token.access_token) throw new Error("Sin access token");

    await prisma.store.update({
      where: { id: storeId },
      data: {
        mpAccessToken:  encryptToken(token.access_token) ?? token.access_token,
        mpRefreshToken: token.refresh_token ? (encryptToken(token.refresh_token) ?? token.refresh_token) : null,
        mpSellerId:     String(token.user_id ?? ""),
        mpConnectedAt:  new Date(),
      },
    });

    const res = NextResponse.redirect(`${APP_URL}/dashboard/pagos?mp=connected`);
    // Borrar la cookie de estado una vez usada
    res.cookies.delete("mp_oauth_state");
    return res;
  } catch (err) {
    console.error("MP OAuth callback error:", err);
    return NextResponse.redirect(`${APP_URL}/dashboard/pagos?mp=error`);
  }
}
