// ─── Sincronización de hostnames del widget (dominios propios de tiendas) ────
// El widget de Turnstile solo funciona en los hostnames registrados en Cloudflare.
// Cuando una tienda conecta su dominio propio hay que sumarlo a esa lista — si no,
// el captcha falla en esa tienda y sus formularios de contacto/reseñas/ruleta
// quedan con el botón deshabilitado para siempre, sin ningún aviso.

type TurnstileWidgetConfig = {
  name?: string;
  domains?: string[];
  mode?: string;
  bot_fight_mode?: boolean;
  clearance_level?: string;
  offlabel?: boolean;
  region?: string;
};

function turnstileAdminConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_TURNSTILE_API_TOKEN;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!accountId || !apiToken || !siteKey) return null;
  return { accountId, apiToken, siteKey };
}

// Agrega o quita un hostname de la lista del widget. Fail-soft: si falta la config
// o la API de Cloudflare falla, loguea y devuelve false — conectar el dominio de la
// tienda nunca se bloquea por esto.
export async function syncTurnstileHostname(hostname: string, op: "add" | "remove"): Promise<boolean> {
  const cfg = turnstileAdminConfig();
  if (!cfg) {
    console.warn(`[turnstile] CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_TURNSTILE_API_TOKEN no configurados — hostname "${hostname}" no sincronizado (${op})`);
    return false;
  }

  // Turnstile cubre subdominios automáticamente: registrar el dominio pelado
  // alcanza para www. y cualquier otro subdominio.
  const domain = hostname.replace(/^www\./, "");

  const headers = { Authorization: `Bearer ${cfg.apiToken}`, "Content-Type": "application/json" };
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/challenges/widgets/${cfg.siteKey}`;

  try {
    const getRes = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    const getData = await getRes.json() as { success?: boolean; result?: TurnstileWidgetConfig };
    if (!getData.success || !getData.result) {
      console.error("[turnstile] no se pudo leer la config del widget:", getData);
      return false;
    }

    const current = getData.result.domains ?? [];
    if (op === "add" && current.includes(domain)) return true;
    if (op === "remove" && !current.includes(domain)) return true;

    const domains = op === "add" ? [...current, domain] : current.filter((d) => d !== domain);

    const r = getData.result;
    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name: r.name,
        mode: r.mode,
        domains,
        ...(r.bot_fight_mode !== undefined ? { bot_fight_mode: r.bot_fight_mode } : {}),
        ...(r.clearance_level ? { clearance_level: r.clearance_level } : {}),
        ...(r.offlabel !== undefined ? { offlabel: r.offlabel } : {}),
        ...(r.region ? { region: r.region } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const putData = await putRes.json() as { success?: boolean; errors?: unknown };
    if (!putData.success) {
      // El plan gratuito permite ~10 hostnames por widget — si la lista está llena,
      // esto falla y hay que definir plan B (otro widget o plan pago).
      console.error(`[turnstile] no se pudo ${op === "add" ? "agregar" : "quitar"} el hostname "${domain}" (¿límite de hostnames alcanzado?):`, putData.errors);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[turnstile] error sincronizando hostname:", e);
    return false;
  }
}

// Verifica un token de Cloudflare Turnstile contra la API de Cloudflare.
// Si TURNSTILE_SECRET_KEY no está configurada (ej. desarrollo local sin claves),
// deja pasar con un aviso — mismo criterio que ya usa src/lib/email.ts para SMTP
// no configurado, para no romper el proyecto entero si falta la clave.
// expectedAction: el mismo string que el formulario pasó a useTurnstile(...) — viaja
// dentro del token, así un token resuelto en un formulario no sirve para otro.
export async function verifyTurnstile(token: unknown, ip: string, expectedAction?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY no configurada — verificación omitida");
    return true;
  }
  // Claves desparejas: con secreta pero sin clave pública, el cliente nunca puede
  // generar un token y se rechazaría todo el sitio — fail-open con aviso.
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    console.warn("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY no configurada — verificación omitida");
    return true;
  }
  // Un token real mide hasta 2048 caracteres (spec de Turnstile) — no reenviar basura
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    // remoteip es opcional — mandarlo solo cuando hay una IP real
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (data.success === true) {
      return !expectedAction || data.action === expectedAction;
    }

    // Secreta inválida es un error de configuración nuestro, no del visitante —
    // no castigar al usuario: fail-open con log fuerte.
    const codes = data["error-codes"] ?? [];
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      console.error("[turnstile] clave secreta inválida — verificación omitida:", codes);
      return true;
    }
    return false;
  } catch (e) {
    // Cloudflare caído o lento no puede tirar abajo registro/contacto/ruleta:
    // fail-open con log. La protección de fondo sigue siendo el rate limit, el
    // honeypot y el email obligatorio. El rechazo real es solo con success:false.
    console.error("[turnstile] siteverify inaccesible — verificación omitida:", e);
    return true;
  }
}
