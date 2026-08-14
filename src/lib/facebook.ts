import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

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

async function graphDelete<T>(path: string, token: string): Promise<T> {
  const params = new URLSearchParams({ access_token: token });
  const res = await fetch(`${GRAPH_URL}${path}?${params.toString()}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Graph API error borrando ${path}`);
  return data as T;
}

/** `expires_in` viene en segundos. A veces Meta no lo manda: ver `vencimientoDe`. */
export type TokenDeMeta = { access_token: string; expires_in?: number };

/** Los de larga duración duran 60 días. Es el valor que usa Meta cuando no dice otra cosa. */
const DIAS_TOKEN_LARGO = 60;

/**
 * Cuándo vence un token, a partir de lo que contestó Meta.
 *
 * `expires_in` no siempre viene —para algunas cuentas Meta devuelve un token sin
 * vencimiento declarado— así que se cae a los 60 días de tabla. Preferimos una
 * fecha conservadora antes que ninguna: si sobra, el cron renueva un poco antes
 * de tiempo y no pasa nada; si falta, la conexión se muere sin que nadie mire.
 */
export function vencimientoDe(token: TokenDeMeta, desde = new Date()): Date {
  const segundos = typeof token.expires_in === "number" && token.expires_in > 0
    ? token.expires_in
    : DIAS_TOKEN_LARGO * 24 * 60 * 60;
  return new Date(desde.getTime() + segundos * 1000);
}

// Llamadas al endpoint de intercambio de tokens — no llevan `access_token` (todavía no hay uno).
async function oauthTokenRequest(params: Record<string, string>): Promise<TokenDeMeta> {
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${new URLSearchParams(params).toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Error al intercambiar el token de Facebook");
  return data;
}

// Intercambia el `code` de la redirección OAuth por un access token de corta duración.
export async function exchangeOAuthCode(code: string): Promise<TokenDeMeta> {
  return oauthTokenRequest({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: FB_REDIRECT_URI,
    code,
  });
}

/**
 * Cambia un token por uno de larga duración (~60 días).
 *
 * Sirve para las dos cosas: convertir el corto que sale del OAuth, y RENOVAR uno
 * largo que está por vencer — Meta acepta el mismo intercambio con un token
 * largo todavía vivo y devuelve otro con la cuenta de días desde cero. Por eso
 * el cron puede mantener la conexión al día sin molestar al dueño, siempre que
 * llegue antes del vencimiento. Después ya no hay vuelta: hay que reconectar a
 * mano.
 */
export async function getLongLivedToken(token: string): Promise<TokenDeMeta> {
  return oauthTokenRequest({
    grant_type: "fb_exchange_token",
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    fb_exchange_token: token,
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

// Un catálogo creado por API queda a nombre del negocio y sin ninguna persona
// asignada: el dueño lo ve en Commerce Manager como "Sin acceso" y no puede
// tocar ni la programación del feed, aunque tenga control total del portfolio.
// Hay que asignarlo explícitamente. Usa business_management, ya aprobado.
export async function assignCatalogToUser(token: string, catalogId: string, userId: string): Promise<{ success: boolean }> {
  return graphPost(`/${catalogId}/assigned_users`, token, {
    user: userId,
    tasks: JSON.stringify(["MANAGE"]),
  });
}

export async function listOwnedPixels(token: string, businessId: string): Promise<{ data: { id: string; name: string }[] }> {
  return graphGet(`/${businessId}/adspixels`, token, { fields: "id,name" });
}

export async function createPixel(token: string, businessId: string, name: string): Promise<{ id: string }> {
  return graphPost(`/${businessId}/adspixels`, token, { name });
}

// Acá vivían `listOwnedWhatsAppAccounts` y `connectCatalogToWaba`, que vinculaban
// el catálogo a una cuenta de WhatsApp Business. Se borraron el 14/08/2026: las
// dos necesitan `whatsapp_business_management` con acceso avanzado, que la app no
// tiene, así que devolvían error #200 para todas las tiendas.
//
// No es que falte pedirlo. Meta da ese permiso por el carril de Tech Provider, y
// esa revisión pide demostrar en video envío de mensajes y creación de plantillas
// — cosas que esta plataforma no hace ni va a hacer. Encima el endpoint de
// `connectCatalogToWaba` nunca estuvo confirmado en la documentación.
//
// El vínculo ahora lo hace la dueña desde el panel de Meta, guiada desde la ficha
// de la app (ver `lib/apps/whatsapp-vinculo`). Si algún día Meta lo abre, esto
// vuelve del historial de git.

type ProductFeed = { id: string; name?: string; schedule?: { url?: string } };

export async function listProductFeeds(token: string, catalogId: string): Promise<{ data: ProductFeed[] }> {
  return graphGet(`/${catalogId}/product_feeds`, token, { fields: "id,name,schedule" });
}

export async function createProductFeed(token: string, catalogId: string, feedUrl: string, name: string): Promise<{ id: string }> {
  return graphPost(`/${catalogId}/product_feeds`, token, {
    name,
    schedule: JSON.stringify({ interval: "DAILY", url: feedUrl, hour: 6 }),
  });
}

/**
 * El feed que YA tenemos sobre este catálogo, si existe.
 *
 * Se busca por la URL programada y no por el nombre, porque el nombre lo puede
 * cambiar el dueño desde Commerce Manager y la URL no: es nuestra.
 *
 * Existe para no crear un feed nuevo cada vez. Al desconectar borrábamos
 * `fbFeedId` de nuestra base, así que al reconectar creábamos otro sobre el
 * mismo catálogo y quedaban dos tirando de la misma URL. Preguntando primero,
 * el flujo es idempotente aunque se repita.
 */
export async function buscarFeedPropio(token: string, catalogId: string, feedUrl: string): Promise<string | null> {
  const { data } = await listProductFeeds(token, catalogId);
  return data.find((f) => f.schedule?.url === feedUrl)?.id ?? null;
}

/**
 * Intenta borrar el feed programado. Devuelve si lo logró.
 *
 * NUNCA tira: se usa mientras se desconecta una cuenta o se cambia de catálogo,
 * y que Meta falle no puede impedir ninguna de las dos cosas — el dueño pidió
 * desconectarse y tiene que poder hacerlo igual.
 *
 * CONFIRMADO el 14/08/2026 contra una cuenta real (girly-store): Meta acepta el
 * DELETE sobre el nodo del feed y devuelve éxito. La documentación no servía
 * —la página del nodo devuelve 500 y la del edge dice que ahí no se puede—, así
 * que se probó desconectando de verdad y mirando la respuesta.
 *
 * Igual `buscarFeedPropio` sigue existiendo y no sobra: cubre los feeds que
 * quedaron huérfanos ANTES de este arreglo, y el caso de que el borrado falle
 * por una caída de Meta.
 */
export async function borrarProductFeed(token: string, feedId: string): Promise<boolean> {
  try {
    await graphDelete(`/${feedId}`, token);
    return true;
  } catch (err) {
    console.warn(`Facebook: no se pudo borrar el product feed ${feedId}:`, err);
    return false;
  }
}

// Cifrar y descifrar tokens (reutiliza la crypto existente del proyecto)
export const encryptToken = encryptIfNeeded;
export const decryptToken = decryptIfNeeded;

/* ── Errores de la Graph API en cristiano ───────────────────────────────────
   Las pantallas mostraban siempre "No se pudieron cargar tus catálogos de Meta.
   Recargá la página", que además de no ser cierto (recargar no arregla nada si
   falta un permiso) escondía la causa real. Como el wizard se traba justo ahí,
   el dueño no tiene forma de saber si le falta un rol en Meta Business, si se
   le venció el token, o si de verdad fue un problema de red.

   Solo traducimos los errores que tienen una acción concreta del otro lado.
   El resto cae en el genérico, y el mensaje crudo de Meta queda en el log. */

/* ── Tope de llamadas a la Graph API ────────────────────────────────────────
   Ninguna ruta de /api/facebook tenía tope. Son endpoints con sesión, así que
   no los puede tocar cualquiera, pero cada llamada consume cuota de la app
   contra Meta — una sola cuota compartida por TODAS las tiendas. Un dueño
   martillando "Reintentar" (o un script con su sesión) se come la cuota de
   todos, y Meta responde cortando la app entera, no a esa tienda.

   El tope va por usuario, no por IP: la sesión ya identifica a la persona, y
   por IP se penalizaría a dos dueños atrás del mismo NAT.

   30 por minuto es holgado para uso humano — el wizard hace 1 o 2 llamadas por
   paso — y corta cualquier bucle. */
const LIMITE_GRAPH = 30;
const VENTANA_GRAPH_MS = 60_000;

export async function dentroDelTopeGraph(userId: string): Promise<boolean> {
  const { permitido } = await checkRateLimitConRespaldo(
    `fb-graph:${userId}`,
    LIMITE_GRAPH,
    VENTANA_GRAPH_MS,
    { limiteFallback: LIMITE_GRAPH, limiteFallbackGlobal: 300 },
  );
  return permitido;
}

export type ContextoGraph = "portfolios" | "catalogos" | "pixeles";

export function traducirErrorGraph(err: unknown, contexto: ContextoGraph): { error: string; status: number } {
  const msg = err instanceof Error ? err.message : String(err);

  // Token vencido, o el dueño le sacó el acceso a la app desde Facebook.
  if (/expired|Session has been invalidated|Error validating access token/i.test(msg)) {
    return {
      error: "Tu conexión con Facebook venció. Desconectá tu cuenta más arriba y volvé a conectarla.",
      status: 401,
    };
  }

  // La cuenta entró bien pero no tiene el rol necesario sobre ese portfolio.
  // Es el caso más común y el más confuso: la conexión "anduvo", pero Meta no
  // deja listar nada porque la persona no es administradora del portfolio.
  // `#200\b` y no `#200`: sin el borde también matchea #2000 y #2001, que son
  // errores distintos de Meta.
  if (/#200\b|Permissions error|do(es)? not have permission|requires .* permission/i.test(msg)) {
    const porContexto: Record<ContextoGraph, string> = {
      catalogos:
        "Tu cuenta de Facebook no tiene permiso para administrar catálogos en este portfolio comercial. Entrá a Meta Business, date acceso de administrador sobre el portfolio, y volvé a intentar.",
      portfolios:
        "Tu cuenta de Facebook no tiene permiso para ver portfolios comerciales. Revisá en Meta Business que seas administradora del portfolio.",
      // Los píxeles viven del lado de publicidad y piden otro permiso que el
      // catálogo, así que este error puede aparecer incluso con el portfolio
      // bien configurado.
      pixeles:
        "Tu cuenta de Facebook no tiene permiso para administrar píxeles en este portfolio comercial. Entrá a Meta Business, date acceso de administrador sobre los orígenes de datos, y volvé a intentar.",
    };
    return { error: porContexto[contexto], status: 403 };
  }

  // El portfolio se borró, o dejó de estar accesible para esta cuenta.
  if (/#803\b|does not exist|cannot be loaded|Unsupported get request/i.test(msg)) {
    return {
      error: "El portfolio comercial que elegiste ya no está disponible para tu cuenta. Elegí otro más arriba.",
      status: 404,
    };
  }

  const queNoVino: Record<ContextoGraph, string> = {
    catalogos: "tus catálogos",
    portfolios: "tus portfolios",
    pixeles: "tus píxeles",
  };
  return {
    error: `No pudimos traer ${queNoVino[contexto]} de Meta. Puede ser un problema momentáneo de Facebook.`,
    status: 502,
  };
}
