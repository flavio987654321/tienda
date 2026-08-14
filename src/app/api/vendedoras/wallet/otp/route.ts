import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendOtpEmail } from "@/lib/email";
import { makeOtpToken, registrarOtpToken } from "@/lib/otp-token";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_OTP_ATTEMPTS = 5;
const MAX_PEDIDOS = 5;
const VENTANA_PEDIDOS_MS = 60 * 60_000; // 1 hora

function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${code}:${salt}`).digest("hex");
}

// POST — solicitar código OTP
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* El techo que le faltaba a este endpoint, y era el único de la billetera sin
     uno.

     Lo que se protegía mal: cada llamada manda un mail. Sin tope, un script con
     la sesión abierta le llenaba la casilla a la persona y nos gastaba la cuota
     del proveedor de envío —el mismo dominio que usan todas las tiendas para
     mandar sus pedidos, así que quemarlo no es un problema de una cuenta sola—.

     Y algo menos visible: cada pedido nuevo dejaba `otpAttempts` en cero. El
     tope de 5 intentos fallidos de más abajo se reseteaba pidiendo otro código,
     así que en la práctica no había ningún tope.

     Va por CUENTA y no por IP a propósito: lo que se cuida es la casilla de esta
     persona, y sigue siendo suya aunque cambie de red. Al revés que en un login,
     donde el atacante elige a quién apuntar, acá sólo se puede atacar uno mismo.

     Con respaldo y no con el limitador pelado, por lo mismo que el newsletter:
     el pelado tira cuando Redis no contesta y devolvería 500, dejando a todo el
     mundo sin poder cobrar durante la caída. La ventana es de una hora, corta
     para lo que aguanta un contador en memoria. */
  const { permitido } = await checkRateLimitConRespaldo(
    `otp-pedido:${user.id}`,
    MAX_PEDIDOS,
    VENTANA_PEDIDOS_MS,
    { limiteFallback: MAX_PEDIDOS, limiteFallbackGlobal: 50 }
  );
  if (!permitido) {
    return NextResponse.json(
      { error: "Pediste demasiados códigos seguidos. Esperá una hora antes de intentar de nuevo." },
      { status: 429 }
    );
  }

  const code = randomInt(100000, 1000000).toString();
  const saltBuf = randomInt(0, 2147483647).toString(36);
  const hash = hashOtp(code, saltBuf);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: `${hash}:${saltBuf}`, otpExpiresAt: expiresAt, otpPurpose: "bank_data", otpAttempts: 0 },
  });

  try {
    await sendOtpEmail({ to: user.email, name: user.name ?? null, code });
  } catch (err) {
    console.error("[otp] sendOtpEmail failed:", err);
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
    });
    return NextResponse.json({ error: "No pudimos enviar el código. Intentá de nuevo en unos minutos." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, expiresAt });
}

// PUT — verificar código y devolver token de sesión
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { otpCode: true, otpExpiresAt: true, otpAttempts: true, otpPurpose: true },
  });

  if (!dbUser?.otpCode || !dbUser?.otpExpiresAt) {
    return NextResponse.json({ error: "No hay un código activo. Solicitá uno nuevo." }, { status: 400 });
  }
  /* En esas mismas columnas puede haber guardado un token ya emitido en vez de
     un código pendiente (ver `otp-token.ts`). Sin este corte, el token entraría
     al comparador de abajo, no coincidiría con ningún código, y le gastaría
     intentos a la persona por un error que no cometió. */
  if (dbUser.otpPurpose !== "bank_data") {
    return NextResponse.json({ error: "No hay un código activo. Solicitá uno nuevo." }, { status: 400 });
  }
  if (new Date() > dbUser.otpExpiresAt) {
    await prisma.user.update({ where: { id: user.id }, data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 } });
    return NextResponse.json({ error: "El código expiró. Solicitá uno nuevo." }, { status: 400 });
  }
  const attempts = dbUser.otpAttempts ?? 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.user.update({ where: { id: user.id }, data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 } });
    return NextResponse.json({ error: "Demasiados intentos fallidos. Solicitá un nuevo código." }, { status: 429 });
  }

  const [storedHash, salt] = dbUser.otpCode.split(":");
  const inputHash = hashOtp(code.trim(), salt);
  if (inputHash !== storedHash) {
    await prisma.user.update({ where: { id: user.id }, data: { otpAttempts: { increment: 1 } } });
    const remaining = MAX_OTP_ATTEMPTS - attempts - 1;
    return NextResponse.json({ error: `Código incorrecto. Te quedan ${remaining} intento${remaining !== 1 ? "s" : ""}.` }, { status: 400 });
  }

  /* El código se consume y en su lugar queda anotado el token. Antes acá se
     limpiaba todo y el token salía "al aire": válido por su firma durante 30
     minutos, sin nada del lado del servidor que supiera si ya se había usado.
     Ahora la base guarda su huella, y `quemarOtpToken` la borra cuando la
     operación termina bien. */
  const token = makeOtpToken(user.id);
  await registrarOtpToken(user.id, token);

  return NextResponse.json({ ok: true, token });
}
