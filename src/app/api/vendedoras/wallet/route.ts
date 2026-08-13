import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";
import { sendWithdrawalRequestEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { verifyOtpToken } from "@/lib/otp-token";
import { despues } from "@/lib/despues";

const MIN_WITHDRAWAL = 100;
const BANK_LOCKOUT_HOURS = 72;

function isWithinLockout(bankUpdatedAt: Date | null): boolean {
  if (!bankUpdatedAt) return false;
  const ms = Date.now() - bankUpdatedAt.getTime();
  return ms < BANK_LOCKOUT_HOURS * 60 * 60 * 1000;
}

function isValidCbu(cbu: string): boolean {
  const c = cbu.trim().replace(/\s/g, "");
  if (!/^\d{22}$/.test(c)) return false;
  // Bloque 1: dígitos 0-6 × pesos [7,1,3,9,7,1,3], dígito verificador en posición 7
  const w1 = [7, 1, 3, 9, 7, 1, 3];
  let s1 = 0;
  for (let i = 0; i < 7; i++) s1 += parseInt(c[i]) * w1[i];
  if ((10 - (s1 % 10)) % 10 !== parseInt(c[7])) return false;
  // Bloque 2: dígitos 8-20 × pesos [3,9,7,1,3,9,7,1,3,9,7,1,3], dígito verificador en posición 21
  const w2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
  let s2 = 0;
  for (let i = 0; i < 13; i++) s2 += parseInt(c[8 + i]) * w2[i];
  if ((10 - (s2 % 10)) % 10 !== parseInt(c[21])) return false;
  return true;
}

function isValidCuil(cuil: string): boolean {
  const c = cuil.trim().replace(/[-\s]/g, "");
  if (!/^\d{11}$/.test(c)) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = mult.reduce((acc, m, i) => acc + parseInt(c[i]) * m, 0);
  const rem = sum % 11;
  if (rem === 1) return false; // CUIL inválido por definición
  const check = rem === 0 ? 0 : 11 - rem;
  return parseInt(c[10]) === check;
}

function isValidAlias(alias: string): boolean {
  return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9.\-]{6,20}$/.test(alias.trim());
}

// GET - ver billetera
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = user.id;

  const [affiliates, userWithBank] = await Promise.all([
    prisma.affiliate.findMany({
      where: { userId },
      include: {
        store: { select: { name: true, slug: true, commissionRate: true } },
        wallet: {
          include: {
            withdrawals: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        },
        commissions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { order: { select: { id: true, total: true, createdAt: true } } },
        },
        _count: { select: { commissions: true, orders: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        affiliateCbu: true,
        affiliateAlias: true,
        affiliateCuil: true,
        affiliateBankHolder: true,
        affiliateBankUpdatedAt: true,
      },
    }),
  ]);

  const totalBalance = affiliates.reduce((s, a) => s + (a.wallet?.balance ?? 0), 0);
  const totalEarned = affiliates.reduce((s, a) => s + (a.wallet?.totalEarned ?? 0), 0);
  const totalWithdrawn = affiliates.reduce((s, a) => s + (a.wallet?.totalWithdrawn ?? 0), 0);

  const affiliatesSafe = affiliates.map((a) => {
    const { _count, ...affiliateRest } = a;
    return {
      ...affiliateRest,
      totalCommissions: _count.commissions,
      totalOrders: _count.orders,
      wallet: a.wallet
        ? {
            id: a.wallet.id,
            balance: a.wallet.balance,
            totalEarned: a.wallet.totalEarned,
            totalWithdrawn: a.wallet.totalWithdrawn,
            withdrawals: a.wallet.withdrawals,
          }
        : null,
    };
  });

  // Datos bancarios globales (del usuario, no de la wallet)
  const rawCbu = decryptIfNeeded(userWithBank?.affiliateCbu ?? null);
  const bankLocked = isWithinLockout(userWithBank?.affiliateBankUpdatedAt ?? null);

  return NextResponse.json({
    affiliates: affiliatesSafe,
    totalBalance,
    totalEarned,
    totalWithdrawn,
    // Datos bancarios globales
    hasBankData: !!(userWithBank?.affiliateCbu || userWithBank?.affiliateAlias),
    bankAlias: userWithBank?.affiliateAlias ?? null,
    bankCbu: rawCbu ? `${"•".repeat(18)}${rawCbu.slice(-4)}` : null,
    bankHolder: userWithBank?.affiliateBankHolder
      ? decryptIfNeeded(userWithBank.affiliateBankHolder)
      : null,
    hasCuil: !!userWithBank?.affiliateCuil,
    bankLocked,
    bankLockedUntil: userWithBank?.affiliateBankUpdatedAt && bankLocked
      ? new Date(userWithBank.affiliateBankUpdatedAt.getTime() + BANK_LOCKOUT_HOURS * 3600000).toISOString()
      : null,
  });
}

// PUT - actualizar datos bancarios (globales: se guarda en User, no en Wallet)
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const otpToken = req.headers.get("x-otp-token");
  if (!verifyOtpToken(otpToken, user.id)) {
    return NextResponse.json({ error: "Se requiere verificación de identidad. Solicitá un código por email.", code: "OTP_REQUIRED" }, { status: 403 });
  }

  const body = await req.json();
  const { cbu, alias, cuil, bankHolder } = body;

  const cbuClean = cbu?.trim() || null;
  const aliasClean = alias?.trim() || null;
  const cuilClean = cuil?.replace(/[-\s]/g, "") || null;
  const holderClean = bankHolder?.trim() || null;

  if (!cbuClean && !aliasClean) {
    return NextResponse.json({ error: "Ingresá un CBU/CVU o un alias" }, { status: 400 });
  }
  if (cbuClean && !isValidCbu(cbuClean)) {
    return NextResponse.json({ error: "CBU/CVU inválido: verificá que los 22 dígitos sean correctos" }, { status: 400 });
  }
  if (aliasClean && !isValidAlias(aliasClean)) {
    return NextResponse.json({ error: "Alias inválido: solo letras, números, puntos y guiones (6-20 caracteres)" }, { status: 400 });
  }
  if (cuilClean && !isValidCuil(cuilClean)) {
    return NextResponse.json({ error: "CUIL inválido: formato XX-XXXXXXXX-X" }, { status: 400 });
  }
  if (!holderClean || holderClean.length < 3) {
    return NextResponse.json({ error: "Ingresá el nombre del titular de la cuenta" }, { status: 400 });
  }
  if (holderClean.length > 100) {
    return NextResponse.json({ error: "El nombre del titular no puede superar 100 caracteres" }, { status: 400 });
  }

  const updatedAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      affiliateCbu: encryptIfNeeded(cbuClean),
      affiliateAlias: aliasClean,
      // Solo sobreescribir CUIL si vino un valor nuevo — evita borrar el guardado al editar otros campos
      ...(cuilClean ? { affiliateCuil: encryptIfNeeded(cuilClean) } : {}),
      affiliateBankHolder: encryptIfNeeded(holderClean),
      affiliateBankUpdatedAt: updatedAt,
    },
  });

  return NextResponse.json({
    ok: true,
    bankLocked: true,
    bankLockedUntil: new Date(updatedAt.getTime() + BANK_LOCKOUT_HOURS * 3600000).toISOString(),
  });
}

// POST - solicitar retiro (se auto-distribuye entre wallets del usuario, mayor saldo primero)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const otpToken = req.headers.get("x-otp-token");
  if (!verifyOtpToken(otpToken, user.id)) {
    return NextResponse.json({ error: "Se requiere verificación de identidad. Solicitá un código por email.", code: "OTP_REQUIRED" }, { status: 403 });
  }

  const userId = user.id;

  const body = await req.json();
  const { amount: rawAmount } = body;

  const MAX_WITHDRAWAL = 10_000_000;
  const amount = Math.round(parseFloat(rawAmount) * 100) / 100;
  if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json(
      { error: `El monto mínimo de retiro es $${MIN_WITHDRAWAL.toLocaleString("es-AR")}` },
      { status: 400 }
    );
  }
  if (amount > MAX_WITHDRAWAL) {
    return NextResponse.json(
      { error: `El monto máximo de retiro es $${MAX_WITHDRAWAL.toLocaleString("es-AR")}` },
      { status: 400 }
    );
  }

  // Leer datos bancarios y todas las wallets del usuario en paralelo
  const [affiliatesData, userBank] = await Promise.all([
    prisma.affiliate.findMany({
      where: { userId },
      include: {
        wallet: true,
        store: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        affiliateCbu: true,
        affiliateAlias: true,
        affiliateCuil: true,
        affiliateBankHolder: true,
        affiliateBankUpdatedAt: true,
      },
    }),
  ]);

  if (!userBank?.affiliateCbu && !userBank?.affiliateAlias) {
    return NextResponse.json(
      { error: "Debés cargar tu CBU/CVU o alias antes de solicitar un retiro" },
      { status: 400 }
    );
  }

  if (isWithinLockout(userBank?.affiliateBankUpdatedAt ?? null)) {
    const unlocksAt = new Date(userBank!.affiliateBankUpdatedAt!.getTime() + BANK_LOCKOUT_HOURS * 3600000);
    return NextResponse.json(
      { error: `Por seguridad, los retiros están bloqueados 72hs después de cambiar datos bancarios. Podés retirar a partir del ${unlocksAt.toLocaleString("es-AR")}` },
      { status: 403 }
    );
  }

  // Fraud check: tasa de chargeback >5% con al menos 5 comisiones confirmadas
  const affiliateIds = affiliatesData.map((a) => a.id);
  if (affiliateIds.length > 0) {
    const commStats = await prisma.commission.groupBy({
      by: ["status"],
      where: { affiliateId: { in: affiliateIds }, status: { in: ["PAID", "REVERSED", "DISBURSED"] } },
      _count: { id: true },
    });
    const total = commStats.reduce((s, r) => s + r._count.id, 0);
    const reversed = commStats.find((r) => r.status === "REVERSED")?._count.id ?? 0;
    if (total >= 5 && reversed / total > 0.05) {
      return NextResponse.json(
        { error: `Tu cuenta tiene una tasa de devoluciones de cargo elevada (${Math.round((reversed / total) * 100)}%). Los retiros están suspendidos preventivamente. Escribí a marketplacemitienda@gmail.com para resolverlo.` },
        { status: 403 }
      );
    }
  }

  // Wallets con saldo, ordenadas de mayor a menor
  const walletsWithBalance = affiliatesData
    .filter((a) => a.wallet && a.wallet.balance > 0)
    .map((a) => ({
      walletId: a.wallet!.id,
      balance: a.wallet!.balance,
      storeName: a.store.name,
    }))
    .sort((a, b) => b.balance - a.balance);

  const totalAvailable = walletsWithBalance.reduce((s, w) => s + w.balance, 0);
  if (totalAvailable < amount) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  // Distribuir el monto entre wallets (de mayor saldo a menor)
  const allocations: { walletId: string; amount: number; storeName: string }[] = [];
  let remaining = amount;
  for (const w of walletsWithBalance) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, w.balance);
    allocations.push({ walletId: w.walletId, amount: take, storeName: w.storeName });
    remaining -= take;
  }

  // Snapshot de datos bancarios del momento del retiro
  const rawCbuSnap = decryptIfNeeded(userBank?.affiliateCbu ?? null);
  const rawCuilSnap = decryptIfNeeded(userBank?.affiliateCuil ?? null);
  const rawHolderSnap = decryptIfNeeded(userBank?.affiliateBankHolder ?? null);

  let withdrawals: { id: string }[];
  try {
    withdrawals = await prisma.$transaction(
      async (tx) => {
        const created: { id: string }[] = [];
        for (const alloc of allocations) {
          const freshWallet = await tx.wallet.findUnique({
            where: { id: alloc.walletId },
            select: { balance: true },
          });
          if (!freshWallet || freshWallet.balance < alloc.amount) {
            throw new Error("INSUFFICIENT_BALANCE");
          }

          const pendingCount = await tx.walletWithdrawal.count({
            where: { walletId: alloc.walletId, status: { in: ["PENDING", "PROCESSING"] } },
          });
          if (pendingCount > 0) throw new Error(`PENDING_EXISTS:${alloc.storeName}`);

          const newWithdrawal = await tx.walletWithdrawal.create({
            data: {
              walletId: alloc.walletId,
              amount: alloc.amount,
              status: "PENDING",
              snapshotCbu: userBank?.affiliateCbu ?? null,
              snapshotAlias: userBank?.affiliateAlias ?? null,
              snapshotCuil: userBank?.affiliateCuil ?? null,
              snapshotHolder: userBank?.affiliateBankHolder ?? null,
            },
          });

          const updated = await tx.wallet.update({
            where: { id: alloc.walletId },
            data: {
              balance: { decrement: alloc.amount },
              totalWithdrawn: { increment: alloc.amount },
            },
          });
          if (updated.balance < 0) throw new Error("BALANCE_NEGATIVE");

          created.push({ id: newWithdrawal.id });
        }
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "INSUFFICIENT_BALANCE" || message === "BALANCE_NEGATIVE") {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }
    if (message.startsWith("PENDING_EXISTS:")) {
      const storeName = message.slice("PENDING_EXISTS:".length);
      return NextResponse.json(
        { error: `Tenés un retiro pendiente en ${storeName}. Esperá que sea procesado antes de solicitar otro.` },
        { status: 400 }
      );
    }
    if ((e as { code?: string })?.code === "P2034") {
      return NextResponse.json(
        { error: "Solicitud en conflicto. Intentá de nuevo en unos segundos." },
        { status: 409 }
      );
    }
    throw e;
  }

  const storeNames = allocations.map((a) => a.storeName).join(" + ");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } });

  if (admin?.email) {
    despues(() => sendWithdrawalRequestEmail({
      ownerEmail: admin.email,
      ownerName: admin.name ?? "Admin",
      storeName: storeNames,
      affiliateName: userBank?.name ?? "Afiliado",
      affiliateEmail: userBank?.email ?? "",
      amount,
      cbu: rawCbuSnap ?? null,
      alias: userBank?.affiliateAlias ?? null,
      cuil: rawCuilSnap ?? null,
      bankHolder: rawHolderSnap ?? null,
    }), "retiro: mail al admin");
  }

  if (admin?.id) {
    despues(() => createNotification({
      userId: admin.id,
      type: "WITHDRAWAL_REQUESTED",
      title: "Nueva solicitud de retiro",
      body: `${userBank?.name ?? "Un afiliado"} solicitó retirar $${amount.toLocaleString("es-AR")} — ${storeNames}`,
      link: "/admin/retiros",
    }), "retiro: campanita al admin");
  }

  despues(() => createNotification({
    userId,
    type: "WITHDRAWAL_REQUESTED",
    title: "Retiro en proceso",
    body: `Tu retiro de $${amount.toLocaleString("es-AR")} fue solicitado. Lo procesaremos en 1 a 3 días hábiles.`,
    link: "/afiliados/billetera",
  }), "retiro: campanita al afiliado");

  return NextResponse.json({
    withdrawals,
    message: "Retiro solicitado. Lo procesaremos en 1 a 3 días hábiles.",
  });
}
