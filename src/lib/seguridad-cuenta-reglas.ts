/**
 * Reglas de la verificación en dos pasos que no tocan la base ni la red. Viven
 * aparte de `seguridad-cuenta.ts` para que el chequeo las pueda probar sin
 * Prisma, y para que el navegador pueda importar los plazos y los textos sin
 * arrastrar código de servidor.
 *
 * El diseño completo está en `seguridad-cuenta.ts`.
 */

/** Cuántos códigos de respaldo se dan al activar. */
export const CANTIDAD_CODIGOS = 8;

/** Espera de "Perdí mi celular" si al pedirlo había entrado con la contraseña. */
export const DIAS_ESPERA_CON_CONTRASENA = 7;
/**
 * Espera si entró sin contraseña (Google o código por mail). Es el doble porque
 * quien entra así sólo demostró tener el mail, y "me robaron el mail" es
 * justamente lo que esta espera tiene que aguantar. Con la contraseña, además
 * del mail sabe algo que el ladrón del mail no puede cambiar: Supabase no deja
 * cambiar la contraseña sin el segundo paso.
 */
export const DIAS_ESPERA_SIN_CONTRASENA = 14;
/** Después de una recuperación, días sin poder tocar los datos de cobro. */
export const DIAS_DINERO_TRABADO = 7;
/** Después de usar un código de respaldo, horas sin poder tocar los datos de cobro. */
export const HORAS_TRABA_POR_RESPALDO = 48;
/** El link de confirmación del mail de "Perdí mi celular" vence a la hora. */
export const MINUTOS_LINK_CONFIRMAR = 60;
/** Cuánto vale una verificación para hacer algo delicado (cambiar el CBU, apagar el doble paso). */
export const MINUTOS_VERIFICACION_RECIENTE = 5;
/** Lo que se ve en "Actividad de seguridad". */
export const DIAS_HISTORIAL = 90;

const DIA_MS = 24 * 60 * 60 * 1000;

export function diasDeEspera(conContrasena: boolean): number {
  return conContrasena ? DIAS_ESPERA_CON_CONTRASENA : DIAS_ESPERA_SIN_CONTRASENA;
}

export function venceLaEspera(desde: Date, conContrasena: boolean): Date {
  return new Date(desde.getTime() + diasDeEspera(conContrasena) * DIA_MS);
}

/**
 * Alfabeto de los códigos de respaldo: sin 0/o, 1/l/i ni u. Se anotan a mano en
 * un papel y se copian de vuelta; un código que se lee de dos maneras es un
 * código que no entra.
 */
const ALFABETO = "abcdefghjkmnpqrstvwxyz23456789";

/** "k7mq-4hzt": 8 letras en dos grupos. 31^8 ≈ 850 mil millones de combinaciones. */
export function formatearCodigo(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[bytes[i] % ALFABETO.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Lo que escribió la persona, llevado a la forma en que se guardó. */
export function normalizarCodigoRespaldo(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  const limpio = entrada.toLowerCase().replace(/[\s-]/g, "");
  if (limpio.length !== 8) return null;
  for (const c of limpio) if (!ALFABETO.includes(c)) return null;
  return `${limpio.slice(0, 4)}-${limpio.slice(4)}`;
}

/**
 * "Chrome en Windows". Para que la persona reconozca SU compu en la lista, no
 * para identificar a nadie: no se guarda el user-agent entero.
 */
export function describirDispositivo(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconocido";
  if (/vercel|node|undici|curl|python|go-http/i.test(ua)) return "Desde nuestro servidor (código por mail)";
  const sistema =
    /iphone/i.test(ua) ? "iPhone" :
    /ipad/i.test(ua) ? "iPad" :
    /android/i.test(ua) ? "Android" :
    /windows/i.test(ua) ? "Windows" :
    /mac os x|macintosh/i.test(ua) ? "Mac" :
    /cros/i.test(ua) ? "Chromebook" :
    /linux/i.test(ua) ? "Linux" : null;
  const navegador =
    /edg\//i.test(ua) ? "Edge" :
    /opr\/|opera/i.test(ua) ? "Opera" :
    /samsungbrowser/i.test(ua) ? "Samsung Internet" :
    /firefox|fxios/i.test(ua) ? "Firefox" :
    /chrome|crios/i.test(ua) ? "Chrome" :
    /safari/i.test(ua) ? "Safari" : null;
  if (navegador && sistema) return `${navegador} en ${sistema}`;
  return navegador ?? sistema ?? "Dispositivo desconocido";
}

/** Los tipos de `EventoCuenta`, con el texto que ve la persona. */
export const TEXTO_EVENTO: Record<string, string> = {
  huella_activada: "Activaste la huella o la cara",
  app_activada: "Activaste la app de códigos",
  huella_quitada: "Quitaste una huella o cara",
  app_quitada: "Quitaste la app de códigos",
  dos_pasos_apagado: "Apagaste la verificación en dos pasos",
  codigos_nuevos: "Generaste códigos de respaldo nuevos",
  ingreso_verificado: "Entraste con el segundo paso",
  codigo_respaldo_usado: "Entraste con un código de respaldo",
  recuperacion_pedida: "Se pidió quitar la verificación (Perdí mi celular)",
  recuperacion_confirmada: "Se confirmó desde el mail el pedido de quitar la verificación",
  recuperacion_cancelada: "Se canceló el pedido de quitar la verificación",
  recuperacion_congelada: "TiendaApps frenó el pedido de quitar la verificación",
  recuperacion_completada: "Se quitó la verificación al terminar la espera",
  sesiones_cerradas: "Cerraste las sesiones de los otros dispositivos",
};

/** Lo que muestra el nivel de la pestaña Seguridad. */
export function nivelDeSeguridad(e: { huellas: number; apps: number; codigosLibres: number }): {
  nivel: "basico" | "bueno" | "alto";
  texto: string;
} {
  const factores = e.huellas + e.apps;
  if (factores === 0) return { nivel: "basico", texto: "Básico: sólo tu contraseña o tu mail" };
  if (e.codigosLibres === 0) return { nivel: "bueno", texto: "Bueno: falta tener códigos de respaldo" };
  return { nivel: "alto", texto: "Alto: segundo paso y códigos de respaldo" };
}

/** Los nombres con que Supabase anota el segundo paso en el `amr`. */
const METODOS_SEGUNDO_PASO = new Set(["totp", "mfa/totp", "webauthn", "mfa/webauthn"]);

type Amr = { method?: unknown; timestamp?: unknown } | string;

/** Cuándo pasó el segundo paso por última vez (ms), según la sesión. */
export function segundoPasoDesde(amr: readonly Amr[] | null | undefined): number | null {
  let ultimo: number | null = null;
  for (const e of amr ?? []) {
    if (typeof e !== "object" || e === null || !METODOS_SEGUNDO_PASO.has(String(e.method))) continue;
    if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp)) continue;
    const ms = e.timestamp * 1000;
    if (ultimo === null || ms > ultimo) ultimo = ms;
  }
  return ultimo;
}
