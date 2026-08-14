import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { exchangeOAuthCode, getLongLivedToken, getMe, encryptToken, vencimientoDe } from "@/lib/facebook";
import { SITE_URL } from "@/lib/site";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * El origen REAL por el que entró este pedido.
 *
 * Antes acá se usaba `NEXT_PUBLIC_APP_URL`, y eso rompía el flujo entero de una
 * forma muy difícil de ver: el `postMessage` de abajo sólo se entrega si su
 * `targetOrigin` coincide EXACTO con el origen de la ventana que abrió el
 * popup, y del otro lado el listener además compara `e.origin` contra el suyo.
 * Si la variable no era exactamente el origen donde estaba parado el dueño
 * —el apex cuando navega con www, u otro puerto en local— el navegador
 * descartaba el aviso en silencio, sin error en consola, y el botón quedaba en
 * "Esperando a Facebook…" para siempre.
 *
 * Sacándolo del pedido no hay nada que configurar mal: siempre es el origen por
 * el que el dueño llegó. Se leen los `x-forwarded-*` porque detrás del proxy de
 * Vercel el host original viaja ahí.
 *
 * El host lo propone el cliente, así que NO se usa tal cual: este mismo valor es
 * el destino del `window.location.replace` de más abajo, y aceptar cualquier
 * host sería un redirect abierto. Se acepta sólo si es un dominio nuestro —el
 * público, un preview de Vercel, o localhost— y si no, se cae al dominio real.
 */
function esHostPropio(host: string): boolean {
  const sinPuerto = host.split(":")[0].toLowerCase();
  return (
    sinPuerto === "tiendaapps.com" ||
    sinPuerto.endsWith(".tiendaapps.com") ||
    sinPuerto.endsWith(".vercel.app") ||
    sinPuerto === "localhost" ||
    sinPuerto === "127.0.0.1"
  );
}

function origenDelPedido(req: NextRequest): string {
  const respaldo = SITE_URL || APP_URL;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || !esHostPropio(host)) return respaldo;
  const esLocal = /^(localhost|127\.0\.0\.1)(:|$)/i.test(host);
  const proto = req.headers.get("x-forwarded-proto") ?? (esLocal ? "http" : "https");
  return `${proto}://${host}`;
}

// El flujo se abre en un popup desde el dashboard. Esta respuesta avisa a la
// ventana que lo abrió (postMessage) y se cierra sola; si por algún motivo no
// hay opener (se abrió como pestaña completa), cae al redirect tradicional.
function popupCloseResponse(status: "connected" | "error", origen: string) {
  const target = `${origen}/dashboard/aplicaciones/meta-catalogo?fb=${status}`;
  // La cookie del nonce se borra SIEMPRE, salga bien o mal. Antes sólo se
  // limpiaba en el camino feliz, así que un intento fallido dejaba el nonce
  // vivo quince minutos. No es explotable —el `code` de Facebook es de un solo
  // uso y sin él el nonce no sirve para nada— pero un valor de un solo uso que
  // sobrevive a su uso es una invitación a que alguna vez sí importe.
  const html = `<!DOCTYPE html>
<html><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "fb-oauth", status: ${JSON.stringify(status)} }, ${JSON.stringify(origen)});
    window.close();
  } else {
    window.location.replace(${JSON.stringify(target)});
  }
</script>
<p style="font-family:sans-serif;font-size:14px;color:#475569;text-align:center;margin-top:40px">
  Podés cerrar esta ventana.
</p>
</body></html>`;
  const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  res.cookies.delete("fb_oauth_state");
  return res;
}

// GET /api/facebook/oauth/callback
// Facebook redirige acá después de que el dueño autoriza.
// Recibe ?code=...&state={nonce} — el storeId viene de la cookie firmada, no del parámetro público.
//
// Es la única ruta de /api/facebook SIN tope de llamadas, y es a propósito: acá
// no entra el dueño, entra Facebook redirigiendo. Ponerle techo sería arriesgar
// cortar una conexión legítima a mitad de camino. El abuso ya está acotado
// aguas arriba: sin un `code` válido de Facebook y el nonce de la cookie, esto
// no pasa de la primera línea, y quien reparte esos `code` es `oauth/connect`,
// que sí tiene tope.
export async function GET(req: NextRequest) {
  const origen = origenDelPedido(req);
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
    return popupCloseResponse("error", origen);
  }

  const user = await getCurrentUser();
  if (!user) return popupCloseResponse("error", origen);
  const sessionStore = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!sessionStore) return popupCloseResponse("error", origen);

  try {
    const shortToken = await exchangeOAuthCode(code);
    if (!shortToken.access_token) throw new Error("Sin access token");

    const longToken = await getLongLivedToken(shortToken.access_token);
    // Si el intercambio a largo falló pero el corto sirve, se guarda ese: dura
    // un par de horas, alcanza para terminar el wizard, y el cron lo renueva.
    const conseguido = longToken.access_token ? longToken : shortToken;
    const accessToken = conseguido.access_token;

    const me = await getMe(accessToken);

    await prisma.store.update({
      where: { id: sessionStore.id },
      data: {
        fbAccessToken:    encryptToken(accessToken),
        fbUserId:         me.id,
        fbConnectedAt:    new Date(),
        fbTokenExpiresAt: vencimientoDe(conseguido),
      },
    });

    return popupCloseResponse("connected", origen);
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return popupCloseResponse("error", origen);
  }
}
