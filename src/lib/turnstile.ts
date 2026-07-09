// Verifica un token de Cloudflare Turnstile contra la API de Cloudflare.
// Si TURNSTILE_SECRET_KEY no está configurada (ej. desarrollo local sin claves),
// deja pasar con un aviso — mismo criterio que ya usa src/lib/email.ts para SMTP
// no configurado, para no romper el proyecto entero si falta la clave.
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY no configurada — verificación omitida");
    return true;
  }
  if (typeof token !== "string" || !token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] error al verificar:", e);
    return false;
  }
}
