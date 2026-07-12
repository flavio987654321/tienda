import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { exchangeOAuthCode, getLongLivedToken, getMe, encryptToken } from "@/lib/facebook";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// El flujo se abre en un popup desde el dashboard. Esta respuesta avisa a la
// ventana que lo abrió (postMessage) y se cierra sola; si por algún motivo no
// hay opener (se abrió como pestaña completa), cae al redirect tradicional.
function popupCloseResponse(status: "connected" | "error") {
  const target = `${APP_URL}/dashboard/aplicaciones/meta-catalogo?fb=${status}`;
  const html = `<!DOCTYPE html>
<html><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "fb-oauth", status: ${JSON.stringify(status)} }, ${JSON.stringify(APP_URL)});
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

// GET /api/facebook/oauth/callback
// Facebook redirige acá después de que el dueño autoriza.
// Recibe ?code=...&state={nonce} — el storeId viene de la cookie firmada, no del parámetro público.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // Leer cookie con el nonce guardado al iniciar el flujo
  const cookieValue = req.cookies.get("fb_oauth_state")?.value ?? "";
  const [cookieNonce] = cookieValue.split(":");

  // El nonce protege contra CSRF; la tienda a la que se guarda el token se
  // resuelve SIEMPRE desde la sesión del dueño, nunca desde un valor de la
  // cookie/URL (que podría fabricarse con el storeId público de otra tienda).
  if (!code || !state || !cookieNonce || state !== cookieNonce) {
    console.warn("Facebook OAuth callback: nonce inválido o faltante", { state, cookieNonce });
    return popupCloseResponse("error");
  }

  const user = await getCurrentUser();
  if (!user) return popupCloseResponse("error");
  const sessionStore = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!sessionStore) return popupCloseResponse("error");

  try {
    const shortToken = await exchangeOAuthCode(code);
    if (!shortToken.access_token) throw new Error("Sin access token");

    const longToken = await getLongLivedToken(shortToken.access_token);
    const accessToken = longToken.access_token ?? shortToken.access_token;

    const me = await getMe(accessToken);

    await prisma.store.update({
      where: { id: sessionStore.id },
      data: {
        fbAccessToken: encryptToken(accessToken),
        fbUserId:      me.id,
        fbConnectedAt: new Date(),
      },
    });

    const res = popupCloseResponse("connected");
    // Borrar la cookie de estado una vez usada
    res.cookies.delete("fb_oauth_state");
    return res;
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return popupCloseResponse("error");
  }
}
