import { createHmac } from "crypto";

// Token de sesión OTP para las operaciones sensibles de la billetera: lo emite
// `POST /api/vendedoras/wallet/otp` cuando el código llega bien, y lo exige
// `/api/vendedoras/wallet` para cobrar o cambiar datos bancarios.
//
// Vive acá y no en el archivo de la ruta porque un `route.ts` de Next solo puede
// exportar los handlers HTTP y un puñado de claves de configuración. Exportar
// estas dos funciones desde ahí rompía `next build` en el chequeo de tipos
// ("Property 'makeOtpToken' is incompatible with index signature"), aunque
// `tsc --noEmit` no lo viera: ese chequeo lo genera Next durante el build.

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

export function makeOtpToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET!;
  const ts = Date.now().toString();
  const sig = createHmac("sha256", secret).update(`${userId}:${ts}`).digest("hex");
  return `${userId}:${ts}:${sig}`;
}

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
