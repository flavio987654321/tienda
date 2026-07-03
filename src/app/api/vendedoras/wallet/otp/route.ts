import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendOtpEmail } from "@/lib/email";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${code}:${salt}`).digest("hex");
}

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

// POST — solicitar código OTP
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    select: { otpCode: true, otpExpiresAt: true, otpAttempts: true },
  });

  if (!dbUser?.otpCode || !dbUser?.otpExpiresAt) {
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

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiresAt: null, otpPurpose: null, otpAttempts: 0 },
  });

  const token = makeOtpToken(user.id);
  return NextResponse.json({ ok: true, token });
}
