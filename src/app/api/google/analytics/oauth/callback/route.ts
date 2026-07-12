import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { exchangeOAuthCode, encryptToken } from "@/lib/googleAnalytics";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Igual patrón que el callback de Facebook: si se abrió en un popup, avisa a
// la ventana que lo abrió por postMessage y se cierra sola; si no, redirige.
function popupCloseResponse(status: "connected" | "error") {
  const target = `${APP_URL}/dashboard/aplicaciones/google-analytics?ga=${status}`;
  const html = `<!DOCTYPE html>
<html><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "ga-oauth", status: ${JSON.stringify(status)} }, ${JSON.stringify(APP_URL)});
    window.close();
  } else {
    window.location.replace(${JSON.stringify(target)});
  }
</script>
<p style="font-family:sans-serif;font-size:14px;color:#475569;text-align:center;margin-top:40px">
  Podés cerrar esta ventana.
</p>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// GET /api/google/analytics/oauth/callback
// Google redirige acá después de que el dueño autoriza.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieValue = req.cookies.get("ga_oauth_state")?.value ?? "";
  const [cookieNonce] = cookieValue.split(":");

  // El nonce protege contra CSRF; la tienda a la que se guarda el token se
  // resuelve SIEMPRE desde la sesión del dueño, nunca desde un valor de la
  // cookie/URL (que podría fabricarse con el storeId público de otra tienda).
  if (!code || !state || !cookieNonce || state !== cookieNonce) {
    console.warn("Google OAuth callback: nonce inválido o faltante", { state, cookieNonce });
    return popupCloseResponse("error");
  }

  const user = await getCurrentUser();
  if (!user) return popupCloseResponse("error");
  const sessionStore = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!sessionStore) return popupCloseResponse("error");

  try {
    const tokens = await exchangeOAuthCode(code);
    if (!tokens.refresh_token) {
      // No debería pasar con access_type=offline + prompt=consent, pero sin
      // refresh_token no podemos volver a pedir un access token más adelante.
      throw new Error("Google no devolvió un refresh_token");
    }

    await prisma.store.update({
      where: { id: sessionStore.id },
      data: {
        gaRefreshToken: encryptToken(tokens.refresh_token),
        gaConnectedAt: new Date(),
      },
    });

    const res = popupCloseResponse("connected");
    res.cookies.delete("ga_oauth_state");
    return res;
  } catch (err) {
    console.error("Google Analytics OAuth callback error:", err);
    return popupCloseResponse("error");
  }
}
