import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeOAuthCode, encryptToken } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// GET /api/mp/oauth/callback
// MercadoPago redirige acá después de que el dueño autoriza.
// Recibe ?code=...&state={storeId}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const storeId = searchParams.get("state");

  if (!code || !storeId) {
    return NextResponse.redirect(`${APP_URL}/dashboard/ajustes?mp=error`);
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

    return NextResponse.redirect(`${APP_URL}/dashboard/ajustes?mp=connected`);
  } catch (err) {
    console.error("MP OAuth callback error:", err);
    return NextResponse.redirect(`${APP_URL}/dashboard/ajustes?mp=error`);
  }
}
