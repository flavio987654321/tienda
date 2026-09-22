import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { exchangeOAuthCode, encryptToken } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * A dónde vuelve la persona después de autorizar.
 *
 * Es una lista fija y NO una dirección guardada. La palabra viene de una cookie
 * nuestra —httpOnly, escrita por `/connect`— pero igual se traduce contra esta
 * tabla en vez de usarse tal cual: si algún día esa palabra llegara de otro
 * lado, lo peor que puede pasar es caer en el destino por defecto. Guardar la
 * dirección entera habría convertido este callback en una redirección abierta,
 * que es exactamente lo que un atacante quiere de una URL con nuestro dominio.
 */
const VUELTAS: Record<string, string> = {
  tienda: "/dashboard/pagos",
  digital: "/digitales/configuracion",
};
const VUELTA_POR_DEFECTO = "/dashboard/pagos";

// GET /api/mp/oauth/callback
// MercadoPago redirige acá después de que el dueño autoriza.
// Recibe ?code=...&state={nonce} — el storeId viene de la cookie, no del parámetro público.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // Leer cookie con nonce:storeId:vuelta guardada al iniciar el flujo
  const cookieValue = req.cookies.get("mp_oauth_state")?.value ?? "";
  const [cookieNonce, storeId, vueltaCruda] = cookieValue.split(":");

  /* Se resuelve ANTES de los chequeos: si algo falla, la persona tiene que
     volver al panel del que salió y no al de otro producto. Una cuenta digital
     que aterriza en /dashboard/pagos ve el panel que no le corresponde. */
  const destino = VUELTAS[vueltaCruda ?? ""] ?? VUELTA_POR_DEFECTO;

  /* La cookie del flujo se borra en TODAS las salidas, no sólo cuando anduvo:
     un nonce que quedó vivo después de un error es un nonce que todavía sirve. */
  const volver = (resultado: "connected" | "error") => {
    const res = NextResponse.redirect(`${APP_URL}${destino}?mp=${resultado}`);
    res.cookies.delete("mp_oauth_state");
    return res;
  };

  // Verificar que el nonce coincide (protección CSRF)
  if (!code || !state || !cookieNonce || !storeId || state !== cookieNonce) {
    console.warn("MP OAuth callback: nonce inválido o faltante", { state, cookieNonce });
    return volver("error");
  }

  /* La cookie sola no alcanza: dice QUÉ tienda, pero no prueba QUIÉN volvió.
     Una cookie no está firmada, y cualquiera que logre escribir una en este
     dominio podría hacer que la cuenta de Mercado Pago de otro quede conectada
     a una tienda ajena —y los cobros de esa tienda, yendo a esa cuenta—. Por
     eso acá se exige la sesión y que la tienda de la cookie sea SUYA: la
     sesión de Supabase viaja en esta vuelta (es una navegación de primer nivel
     y la cookie es `lax`), así que no le cuesta nada a quien conecta de verdad. */
  const user = await getCurrentUser();
  if (!user) {
    console.warn("MP OAuth callback: sin sesión al volver de Mercado Pago");
    return volver("error");
  }
  const propia = await prisma.store.findFirst({ where: { id: storeId, ownerId: user.id }, select: { id: true } });
  if (!propia) {
    console.warn("MP OAuth callback: la tienda de la cookie no es de quien volvió", { storeId, userId: user.id });
    return volver("error");
  }

  try {
    const token = await exchangeOAuthCode(code);

    if (!token.access_token) throw new Error("Sin access token");

    await prisma.store.update({
      where: { id: propia.id },
      data: {
        mpAccessToken:  encryptToken(token.access_token) ?? token.access_token,
        mpRefreshToken: token.refresh_token ? (encryptToken(token.refresh_token) ?? token.refresh_token) : null,
        mpSellerId:     String(token.user_id ?? ""),
        mpConnectedAt:  new Date(),
      },
    });

    return volver("connected");
  } catch (err) {
    console.error("MP OAuth callback error:", err);
    return volver("error");
  }
}
