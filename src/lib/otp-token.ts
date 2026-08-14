import { createHash, createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

// Token de sesión OTP para las operaciones sensibles de la billetera: lo emite
// `POST /api/vendedoras/wallet/otp` cuando el código llega bien, y lo exige
// `/api/vendedoras/wallet` para cobrar o cambiar datos bancarios.
//
// Vive acá y no en el archivo de la ruta porque un `route.ts` de Next solo puede
// exportar los handlers HTTP y un puñado de claves de configuración. Exportar
// estas dos funciones desde ahí rompía `next build` en el chequeo de tipos
// ("Property 'makeOtpToken' is incompatible with index signature"), aunque
// `tsc --noEmit` no lo viera: ese chequeo lo genera Next durante el build.
//
// ── Por qué la firma sola no alcanza ─────────────────────────────────────────
//
// El token es un HMAC: se verifica con la clave, sin preguntarle nada a la base.
// Eso lo hace barato, pero también lo hace REPETIBLE — una firma válida sigue
// siendo válida hasta que vence, y no hay forma de "usarla".
//
// El agujero que abría: quien conseguía el token de otra persona (la sesión
// abierta en una compu prestada, sessionStorage leído por un script) tenía media
// hora para cambiarle el CBU, aunque la dueña de la cuenta ya hubiera terminado
// su trámite y se hubiera ido.
//
// Por eso el token además se ANOTA en la base, y se borra cuando la operación
// sale bien. La firma dice "esto lo emití yo y no venció"; la huella en la base
// dice "y todavía no se usó". Hacen falta las dos.
//
// La huella se guarda en las columnas de OTP que ya existían (`otpCode`,
// `otpPurpose`, `otpExpiresAt`) en vez de agregar una nueva: son del mismo
// trámite y nunca conviven — mientras hay un código pendiente no hay token
// emitido, y al emitirlo el código ya se consumió. `otpPurpose` distingue cuál
// de los dos está guardado.

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const TOKEN_PURPOSE = "bank_token";

export function makeOtpToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET!;
  const ts = Date.now().toString();
  const sig = createHmac("sha256", secret).update(`${userId}:${ts}`).digest("hex");
  return `${userId}:${ts}:${sig}`;
}

/**
 * Lo que se guarda en la base: el hash del token, nunca el token entero.
 *
 * Si alguien llega a leer la fila —un backup, un dump, una consulta de más— se
 * lleva una huella que no sirve para firmar nada. El prefijo `tok:` es para que
 * se vea de un vistazo que esa fila tiene un token y no un código de 6 dígitos.
 */
function huella(token: string): string {
  return `tok:${createHash("sha256").update(token).digest("hex")}`;
}

/** Sólo la firma y el vencimiento. No mira la base: no sabe si ya se usó. */
export function verifyOtpToken(token: string | null | undefined, expectedUserId: string): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [userId, ts, sig] = parts;
  if (userId !== expectedUserId) return false;
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Date.now() - tsNum > TOKEN_TTL_MS) return false;
  const secret = process.env.NEXTAUTH_SECRET!;
  const expected = createHmac("sha256", secret).update(`${userId}:${ts}`).digest("hex");
  return sig === expected;
}

/** Deja anotado el token recién emitido como el único válido para esa cuenta. */
export async function registrarOtpToken(userId: string, token: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpCode: huella(token),
      otpExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      otpPurpose: TOKEN_PURPOSE,
      otpAttempts: 0,
    },
  });
}

/**
 * El chequeo completo: firma válida, no vencido, y todavía sin usar.
 *
 * Es el que tienen que llamar las rutas de la billetera. `verifyOtpToken` a
 * secas deja pasar un token ya quemado.
 */
export async function otpTokenVigente(
  token: string | null | undefined,
  expectedUserId: string
): Promise<boolean> {
  if (!verifyOtpToken(token, expectedUserId)) return false;

  const fila = await prisma.user.findUnique({
    where: { id: expectedUserId },
    select: { otpCode: true, otpPurpose: true, otpExpiresAt: true },
  });

  if (fila?.otpPurpose !== TOKEN_PURPOSE) return false;
  if (!fila.otpExpiresAt || fila.otpExpiresAt.getTime() < Date.now()) return false;
  return fila.otpCode === huella(token!);
}

/**
 * Quema el token. Se llama cuando la operación YA salió bien, no antes.
 *
 * El orden importa y es al revés de lo que parece: si se quemara al validar,
 * un error común y esperable —"saldo insuficiente", un CBU mal tipeado— le
 * costaría a la persona pedir otro código por mail para reintentar. Quemándolo
 * al final, equivocarse es gratis y repetir la operación no lo es.
 *
 * El `updateMany` con la huella en el WHERE lo hace atómico: si dos pedidos con
 * el mismo token llegan juntos, la base le da el `count: 1` a uno solo.
 */
export async function quemarOtpToken(userId: string, token: string): Promise<boolean> {
  const r = await prisma.user.updateMany({
    where: { id: userId, otpCode: huella(token), otpPurpose: TOKEN_PURPOSE },
    data: { otpCode: null, otpPurpose: null, otpExpiresAt: null },
  });
  return r.count === 1;
}
