/**
 * Valida que una URL sea segura (no inyecta javascript:, data:, etc.)
 *
 * isSafeUrl      — permite http/https y rutas relativas (/ruta). Para links internos del editor de tienda.
 * isSafeExternal — solo http/https absolutos. Para links externos (CV, redes sociales).
 *
 * urlDeDescargaPermitida — para cuando el SERVIDOR va a ir a buscar la url. Es
 * otra pregunta y por eso está aparte: ver el comentario largo más abajo.
 */

export function isSafeUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return url.startsWith("/");
  }
}

export function isSafeExternalUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * Cuando el servidor va a DESCARGAR la url, no solo a mostrarla como link.
 *
 * Las dos de arriba responden otra pregunta: "¿esto es seguro para poner en un
 * href?". Ahí lo que importa es que no sea `javascript:` ni `data:`. El host da
 * igual, porque el que entra es el visitante desde su propia máquina.
 *
 * Acá el que entra es el SERVIDOR, y eso cambia todo. El servidor está adentro de
 * la red: puede llegar a direcciones que nadie de afuera alcanza. Si la url la
 * eligió el comerciante —y el logo, la portada y el banner los elige él— entonces
 * cualquiera que se registre puede hacer que el servidor golpee una dirección
 * interna: `http://localhost`, `http://10.0.0.5`, o la 169.254.169.254 de los
 * metadatos de la nube. Eso es SSRF, y la validación de protocolo no lo frena:
 * `http://169.254.169.254/` es http perfectamente válido.
 *
 * Se bloquea lo que apunta adentro y se dejan pasar los hosts públicos: hay logos
 * legítimos fuera del storage y romperlos sería peor que el riesgo.
 * ─────────────────────────────────────────────────────────────────────────── */

/** ¿El host apunta a la red interna, a loopback o a link-local? */
function apuntaAdentro(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;          // este host, privada, loopback
    if (a === 192 && b === 168) return true;                     // privada
    if (a === 172 && b >= 16 && b <= 31) return true;            // privada
    if (a === 169 && b === 254) return true;                     // link-local (metadatos)
    if (a === 100 && b >= 64 && b <= 127) return true;           // carrier-grade NAT
  }

  if (/^f[cd]/.test(h)) return true;   // IPv6 única local
  if (/^fe80:/.test(h)) return true;   // IPv6 link-local

  return false;
}

/**
 * La url ya parseada si el servidor puede ir a buscarla, o `null` si no.
 *
 * Devuelve el `URL` en vez de un booleano a propósito: quien la use tiene que
 * pasarle ESTE objeto al `fetch` y no el string original, así no queda lugar a
 * que se valide una cosa y se descargue otra.
 *
 * Y en el `fetch` va también `redirect: "error"`. Sin eso queda la puerta de
 * atrás: una url pública que responde 302 hacia una dirección interna pasa esta
 * guarda —que solo vio la primera— y el servidor termina yendo igual.
 */
export function urlDeDescargaPermitida(url: unknown): URL | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (apuntaAdentro(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}
