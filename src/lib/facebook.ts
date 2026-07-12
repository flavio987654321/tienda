import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const FB_APP_ID = process.env.FB_APP_ID ?? "";
const FB_APP_SECRET = process.env.FB_APP_SECRET ?? "";
// ID de configuración de "Facebook Login for Business" (paquete de permisos
// definido en el panel de Meta). Con esto el dialog no acepta `scope` suelto.
const FB_LOGIN_CONFIG_ID = process.env.FB_LOGIN_CONFIG_ID ?? "";
const FB_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/oauth/callback`;

// Solo lo que el flujo usa de verdad: listar negocios y administrar catálogos.
// Pedir permisos de más es motivo de rechazo en el App Review de Meta.
const FB_SCOPES = ["business_management", "catalog_management"].join(",");

// URL de autorización OAuth. `state` es un nonce aleatorio (no storeId) — anti-CSRF.
export function getOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: FB_REDIRECT_URI,
    state,
    response_type: "code",
  });
  if (FB_LOGIN_CONFIG_ID) {
    params.set("config_id", FB_LOGIN_CONFIG_ID);
  } else {
    params.set("scope", FB_SCOPES);
  }
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet<T>(path: string, token: string, extraParams?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ access_token: token, ...extraParams });
  const res = await fetch(`${GRAPH_URL}${path}?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Graph API error en ${path}`);
  return data as T;
}

async function graphPost<T>(path: string, token: string, body: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ access_token: token, ...body });
  const res = await fetch(`${GRAPH_URL}${path}`, { method: "POST", body: params });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Graph API error en ${path}`);
  return data as T;
}

// Llamadas al endpoint de intercambio de tokens — no llevan `access_token` (todavía no hay uno).
async function oauthTokenRequest(params: Record<string, string>): Promise<{ access_token: string }> {
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${new URLSearchParams(params).toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Error al intercambiar el token de Facebook");
  return data;
}

// Intercambia el `code` de la redirección OAuth por un access token de corta duración.
export async function exchangeOAuthCode(code: string): Promise<{ access_token: string }> {
  return oauthTokenRequest({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: FB_REDIRECT_URI,
    code,
  });
}

// Cambia el token corto por uno de larga duración (~60 días).
export async function getLongLivedToken(shortToken: string): Promise<{ access_token: string }> {
  return oauthTokenRequest({
    grant_type: "fb_exchange_token",
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    fb_exchange_token: shortToken,
  });
}

export async function getMe(token: string): Promise<{ id: string; name: string }> {
  return graphGet("/me", token, { fields: "id,name" });
}

export async function listOwnedBusinesses(token: string): Promise<{ data: { id: string; name: string; created_time?: string }[] }> {
  return graphGet("/me/businesses", token, { fields: "id,name,created_time" });
}

export async function listOwnedCatalogs(token: string, businessId: string): Promise<{ data: { id: string; name: string }[] }> {
  return graphGet(`/${businessId}/owned_product_catalogs`, token, { fields: "id,name" });
}

export async function createCatalog(token: string, businessId: string, name: string): Promise<{ id: string }> {
  return graphPost(`/${businessId}/owned_product_catalogs`, token, { name });
}

export async function listOwnedPixels(token: string, businessId: string): Promise<{ data: { id: string; name: string }[] }> {
  return graphGet(`/${businessId}/adspixels`, token, { fields: "id,name" });
}

export async function createPixel(token: string, businessId: string, name: string): Promise<{ id: string }> {
  return graphPost(`/${businessId}/adspixels`, token, { name });
}

export async function listOwnedWhatsAppAccounts(token: string, businessId: string): Promise<{ data: { id: string; name: string }[] }> {
  return graphGet(`/${businessId}/owned_whatsapp_business_accounts`, token, { fields: "id,name" });
}

// Conecta el catálogo de productos ya existente (creado por Catálogo de Meta) a
// una WhatsApp Business Account. A diferencia del resto de las llamadas de este
// archivo, Meta no documenta con la misma claridad un único endpoint estable para
// esto — queda a confirmar/ajustar contra developers.facebook.com apenas haya
// acceso real para probarlo (recién ahí se puede validar contra una WABA real).
export async function connectCatalogToWaba(token: string, wabaId: string, catalogId: string): Promise<{ success: boolean }> {
  return graphPost(`/${wabaId}`, token, { whatsapp_business_catalog_id: catalogId });
}

export async function createProductFeed(token: string, catalogId: string, feedUrl: string, name: string): Promise<{ id: string }> {
  return graphPost(`/${catalogId}/product_feeds`, token, {
    name,
    schedule: JSON.stringify({ interval: "DAILY", url: feedUrl, hour: 6 }),
  });
}

// Cifrar y descifrar tokens (reutiliza la crypto existente del proyecto)
export const encryptToken = encryptIfNeeded;
export const decryptToken = decryptIfNeeded;
