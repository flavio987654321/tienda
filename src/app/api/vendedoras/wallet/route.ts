import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { encryptIfNeeded, decryptIfNeeded } from "@/lib/crypto";
import { sendWithdrawalRequestEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const MIN_WITHDRAWAL = 500;
const BANK_LOCKOUT_HOURS = 72;

function isWithinLockout(bankUpdatedAt: Date | null): boolean {
  if (!bankUpdatedAt) return false;
  const ms = Date.now() - bankUpdatedAt.getTime();
  return ms < BANK_LOCKOUT_HOURS * 60 * 60 * 1000;
}

// Valida CBU/CVU: exactamente 22 dígitos
function isValidCbu(cbu: string): boolean {
  return /^\d{22}$/.test(cbu.trim());
}

// Valida CUIL: formato XX-XXXXXXXX-X o XXXXXXXXXXXXXX (11 dígitos)
function isValidCuil(cuil: string): boolean {
  return /^\d{2}-?\d{8}-?\d{1}$/.test(cuil.trim());
}

// Alias: solo letras, números, puntos y guiones, 6-20 chars
function isValidAlias(alias: string): boolean {
  return /^[a-zA-Z0-9.\-]{6,20}$/.test(alias.trim());
}

// GET - ver billetera
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = user.id;

  const affiliates = await prisma.affiliate.findMany({
    where: { userId },
    include: {
      store: { select: { name: true, slug: true } },
      wallet: {
        include: {
          withdrawals: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      commissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { order: { select: { total: true, createdAt: true } } },
      },
      _count: { select: { commissions: true, orders: true } },
    },
  });

  const totalBalance = affiliates.reduce((s, a) => s + (a.wallet?.balance ?? 0), 0);
  const totalEarned = affiliates.reduce((s, a) => s + (a.wallet?.totalEarned ?? 0), 0);
  const totalWithdrawn = affiliates.reduce((s, a) => s + (a.wallet?.totalWithdrawn ?? 0), 0);

  // No exponer datos bancarios completos en el GET general
  const affiliatesSafe = affiliates.map((a) => ({
    ...a,
    totalCommissions: a._count.commissions,
    totalOrders: a._count.orders,
    wallet: a.wallet
      ? (() => {
          const rawCbu = decryptIfNeeded(a.wallet.cbu);
          return {
            ...a.wallet,
            cbu: rawCbu ? `${"•".repeat(18)}${rawCbu.slice(-4)}` : null,
            cuil: null, // nunca exponer CUIL al frontend
            bankHolder: a.wallet.bankHolder ? decryptIfNeeded(a.wallet.bankHolder) : null,
            hasBankData: !!(a.wallet.cbu || a.wallet.alias),
            bankLocked: isWithinLockout(a.wallet.bankUpdatedAt),
            bankLockedUntil: a.wallet.bankUpdatedAt
              ? new Date(a.wallet.bankUpdatedAt.getTime() + BANK_LOCKOUT_HOURS * 3600000).toISOString()
              : null,
          };
        })()
      : null,
  }));

  return NextResponse.json({ affiliates: affiliatesSafe, totalBalance, totalEarned, totalWithdrawn });
}

// PUT - actualizar datos bancarios
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { walletId, cbu, alias, cuil, bankHolder } = body;

  if (!walletId || typeof walletId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Verificar que la billetera pertenece al usuario
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: { affiliate: { select: { userId: true } } },
  });

  if (!wallet || wallet.affiliate.userId !== userId) {
    return NextResponse.json({ error: "Billetera no encontrada" }, { status: 404 });
  }

  // Validar que tenga al menos CBU o alias
  const cbuClean = cbu?.trim() || null;
  const aliasClean = alias?.trim() || null;
  const cuilClean = cuil?.replace(/[-\s]/g, "") || null;
  const holderClean = bankHolder?.trim() || null;

  if (!cbuClean && !aliasClean) {
    return NextResponse.json({ error: "Ingresá un CBU/CVU o un alias" }, { status: 400 });
  }

  if (cbuClean && !isValidCbu(cbuClean)) {
    return NextResponse.json({ error: "CBU/CVU inválido: debe tener exactamente 22 dígitos" }, { status: 400 });
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

  const updated = await prisma.wallet.update({
    where: { id: walletId },
    data: {
      cbu: encryptIfNeeded(cbuClean),
      alias: aliasClean, // el alias es semi-público, no se cifra
      cuil: encryptIfNeeded(cuilClean),
      bankHolder: encryptIfNeeded(holderClean),
      bankUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    bankLocked: true,
    bankLockedUntil: new Date(updated.bankUpdatedAt!.getTime() + BANK_LOCKOUT_HOURS * 3600000).toISOString(),
  });
}

// POST - solicitar retiro
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { walletId, amount: rawAmount } = body;

  if (!walletId || typeof walletId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

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

  const walletFull = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      affiliate: {
        include: {
          store: {
            include: { owner: { select: { id: true, email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!walletFull || walletFull.affiliate.userId !== userId) {
    return NextResponse.json({ error: "Billetera no encontrada" }, { status: 404 });
  }

  // Verificar datos bancarios
  if (!walletFull.cbu && !walletFull.alias) {
    return NextResponse.json(
      { error: "Debés cargar tu CBU/CVU o alias antes de solicitar un retiro" },
      { status: 400 }
    );
  }

  // 72h lockout tras cambiar datos bancarios
  if (isWithinLockout(walletFull.bankUpdatedAt)) {
    const unlocksAt = new Date(walletFull.bankUpdatedAt!.getTime() + BANK_LOCKOUT_HOURS * 3600000);
    return NextResponse.json(
      {
        error: `Por seguridad, los retiros están bloqueados 72hs después de cambiar datos bancarios. Podés retirar a partir del ${unlocksAt.toLocaleString("es-AR")}`,
      },
      { status: 403 }
    );
  }

  if (amount > walletFull.balance) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  // Transacción serializable para eliminar race condition
  let withdrawal;
  try {
    [withdrawal] = await prisma.$transaction(
      async (tx) => {
        const pendingCount = await tx.walletWithdrawal.count({
          where: { walletId, status: "PENDING" },
        });
        if (pendingCount > 0) throw new Error("PENDING_EXISTS");

        const newWithdrawal = await tx.walletWithdrawal.create({
          data: {
            walletId,
            amount,
            status: "PENDING",
            // No guardar datos bancarios en texto plano — el email al dueño ya los envía
            notes: walletFull.alias ? `Alias: ${walletFull.alias}` : null,
          },
        });

        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balance: { decrement: amount },
            totalWithdrawn: { increment: amount },
          },
        });

        return [newWithdrawal];
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e: any) {
    if (e.message === "PENDING_EXISTS") {
      return NextResponse.json(
        { error: "Ya tenés un retiro pendiente. Esperá que sea procesado antes de solicitar otro" },
        { status: 400 }
      );
    }
    // P2034 = serialization failure de Postgres (dos requests simultáneas a la misma wallet)
    if (e.code === "P2034") {
      return NextResponse.json(
        { error: "Solicitud en conflicto. Intentá de nuevo en unos segundos." },
        { status: 409 }
      );
    }
    throw e;
  }

  // Notificar al dueño de la tienda automáticamente con los datos bancarios (fire-and-forget)
  const owner = walletFull.affiliate.store.owner;
  if (owner?.email) {
    const rawCbu = decryptIfNeeded(walletFull.cbu);
    const rawCuil = decryptIfNeeded(walletFull.cuil);
    const rawHolder = decryptIfNeeded(walletFull.bankHolder);
    const affiliateUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    sendWithdrawalRequestEmail({
      ownerEmail: owner.email,
      ownerName: owner.name ?? "",
      storeName: walletFull.affiliate.store.name,
      affiliateName: affiliateUser?.name ?? "Afiliada",
      affiliateEmail: affiliateUser?.email ?? "",
      amount,
      cbu: rawCbu ?? null,
      alias: walletFull.alias ?? null,
      cuil: rawCuil ?? null,
      bankHolder: rawHolder ?? null,
    }).catch((err) => console.error("[email] sendWithdrawalRequestEmail failed:", err));
  }

  // Notificación in-app a la afiliada
  createNotification({
    userId,
    type: "WITHDRAWAL_REQUESTED",
    title: "Retiro en proceso",
    body: `Tu retiro de $${amount.toLocaleString("es-AR")} fue solicitado y el dueño de la tienda está procesando la transferencia.`,
    link: "/vendedoras/billetera",
  });

  return NextResponse.json({
    withdrawal,
    message: "Retiro solicitado. El dueño de la tienda recibirá los datos para realizar la transferencia.",
  });
}
