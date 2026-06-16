import MercadoPagoConfig, { Preference, OAuth } from "mercadopago";
import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";

export const MP_APP_ID = process.env.MP_APP_ID ?? "1932706286466391";
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET ?? "";
const MP_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/mp/oauth/callback`;

// Cliente de la plataforma (para disbursements y OAuth)
export function platformClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN ?? "",
  });
}

// Cliente usando el token del dueño de la tienda (para cobrar con split)
export function sellerClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

// URL de autorización OAuth para que el dueño conecte su cuenta MP
export function getOAuthUrl(storeId: string) {
  const params = new URLSearchParams({
    client_id: MP_APP_ID,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: MP_REDIRECT_URI,
    state: storeId,
  });
  return `https://auth.mercadopago.com.ar/authorization?${params.toString()}`;
}

// Intercambio del code por access_token + refresh_token
export async function exchangeOAuthCode(code: string) {
  const client = platformClient();
  const oauth = new OAuth(client);
  return oauth.create({
    body: {
      client_id: MP_APP_ID,
      client_secret: MP_CLIENT_SECRET,
      code,
      redirect_uri: MP_REDIRECT_URI,
    },
  });
}

// Renovar access_token usando refresh_token
export async function refreshOAuthToken(refreshToken: string) {
  const client = platformClient();
  const oauth = new OAuth(client);
  return oauth.refresh({
    body: {
      client_secret: MP_CLIENT_SECRET,
      refresh_token: refreshToken,
    },
  });
}

// Cifrar y descifrar tokens (reutiliza la crypto existente del proyecto)
export const encryptToken = encryptIfNeeded;
export const decryptToken = decryptIfNeeded;

// Crear preferencia de pago con split para Marketplace
export async function createCheckoutPreference(opts: {
  sellerAccessToken: string;
  items: { id: string; title: string; unit_price: number; quantity: number }[];
  marketplaceFee: number;     // comisión que queda en la plataforma
  externalReference: string;  // orderId
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
}) {
  const client = sellerClient(opts.sellerAccessToken);
  const preference = new Preference(client);

  return preference.create({
    body: {
      items: opts.items,
      marketplace: MP_APP_ID,
      marketplace_fee: opts.marketplaceFee,
      external_reference: opts.externalReference,
      back_urls: opts.backUrls,
      auto_return: "approved",
      notification_url: opts.notificationUrl,
    },
  });
}
