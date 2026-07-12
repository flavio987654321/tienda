import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";

const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const CLIENT_ID = process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_SECRET ?? "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/analytics/oauth/callback`;

// Solo lo que el flujo usa: leer y crear propiedades/streams de Analytics.
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.edit";

// URL de autorización OAuth. `access_type=offline` + `prompt=consent` son
// necesarios para que Google devuelva un refresh_token (si no, solo la
// primera vez que el usuario da consentimiento se entrega uno).
export function getOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: GA_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(params: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description ?? "Error al intercambiar el token de Google");
  return data;
}

export async function exchangeOAuthCode(code: string) {
  return tokenRequest({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken(refreshToken: string) {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
  });
}

async function adminGet<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${ADMIN_API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Google Analytics API error en ${path}`);
  return data as T;
}

async function adminPost<T>(path: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${ADMIN_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Google Analytics API error en ${path}`);
  return data as T;
}

export type AccountSummary = {
  account: string; // "accounts/123"
  displayName: string;
  propertySummaries?: { property: string; displayName: string }[];
};

// Lista cuentas + propiedades existentes en una sola llamada.
export async function listAccountSummaries(accessToken: string): Promise<{ accountSummaries?: AccountSummary[] }> {
  return adminGet("/accountSummaries", accessToken, { pageSize: "200" });
}

export async function createProperty(accessToken: string, accountId: string, displayName: string): Promise<{ name: string }> {
  return adminPost("/properties", accessToken, {
    parent: accountId, // "accounts/123"
    displayName,
    timeZone: "America/Argentina/Buenos_Aires",
    currencyCode: "ARS",
  });
}

export async function createWebDataStream(
  accessToken: string,
  propertyId: string, // "properties/456"
  storeUrl: string,
  displayName: string
): Promise<{ name: string; webStreamData?: { measurementId?: string } }> {
  return adminPost(`/${propertyId}/dataStreams`, accessToken, {
    type: "WEB_DATA_STREAM",
    displayName,
    webStreamData: { defaultUri: storeUrl },
  });
}

// Devuelve un access token válido para la tienda, refrescándolo si hace
// falta — a diferencia de Facebook, el access token de Google dura solo 1h.
export async function getValidAccessToken(encryptedRefreshToken: string): Promise<string> {
  const refreshToken = decryptToken(encryptedRefreshToken);
  if (!refreshToken) throw new Error("Refresh token inválido");
  const { access_token } = await refreshAccessToken(refreshToken);
  return access_token;
}

export const encryptToken = encryptIfNeeded;
export const decryptToken = decryptIfNeeded;
