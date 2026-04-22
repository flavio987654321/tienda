import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_WITHDRAWAL = 500;
const BANK_LOCKOUT_HOURS = 72;

function sessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id;
}

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = sessionUserId(session);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
      ? {
          ...a.wallet,
          cbu: a.wallet.cbu ? `${"•".repeat(18)}${a.wallet.cbu.slice(-4)}` : null,
          hasBankData: !!(a.wallet.cbu || a.wallet.alias),
          bankLocked: isWithinLockout(a.wallet.bankUpdatedAt),
          bankLockedUntil: a.wallet.bankUpdatedAt
            ? new Date(a.wallet.bankUpdatedAt.getTime() + BANK_LOCKOUT_HOURS * 3600000).toISOString()
            : null,
        }
      : null,
  }));

  return NextResponse.json({ affiliates: affiliatesSafe, totalBalance, totalEarned, totalWithdrawn });
}

// PUT - actualizar datos bancarios
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = sessionUserId(session);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  if (cuilClean && !isValidCuil(cuil?.trim() || "")) {
    return NextResponse.json({ error: "CUIL inválido: formato XX-XXXXXXXX-X" }, { status: 400 });
  }

  if (!holderClean || holderClean.length < 3) {
    return NextResponse.json({ error: "Ingresá el nombre del titular de la cuenta" }, { status: 400 });
  }

  const updated = await prisma.wallet.update({
    where: { id: walletId },
    data: {
      cbu: cbuClean,
      alias: aliasClean,
      cuil: cuilClean,
      bankHolder: holderClean,
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = sessionUserId(session);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { walletId, amount: rawAmount } = body;

  if (!walletId || typeof walletId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json(
      { error: `El monto mínimo de retiro es $${MIN_WITHDRAWAL.toLocaleString("es-AR")}` },
      { status: 400 }
    );
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      affiliate: { select: { userId: true } },
      withdrawals: { where: { status: "PENDING" }, take: 1 },
    },
  });

  if (!wallet || wallet.affiliate.userId !== userId) {
    return NextResponse.json({ error: "Billetera no encontrada" }, { status: 404 });
  }

  // Verificar datos bancarios
  if (!wallet.cbu && !wallet.alias) {
    return NextResponse.json(
      { error: "Debés cargar tu CBU/CVU o alias antes de solicitar un retiro" },
      { status: 400 }
    );
  }

  // 72h lockout tras cambiar datos bancarios
  if (isWithinLockout(wallet.bankUpdatedAt)) {
    const unlocksAt = new Date(wallet.bankUpdatedAt!.getTime() + BANK_LOCKOUT_HOURS * 3600000);
    return NextResponse.json(
      {
        error: `Por seguridad, los retiros están bloqueados 72hs después de cambiar datos bancarios. Podés retirar a partir del ${unlocksAt.toLocaleString("es-AR")}`,
      },
      { status: 403 }
    );
  }

  // Solo un retiro pendiente a la vez
  if (wallet.withdrawals.length > 0) {
    return NextResponse.json(
      { error: "Ya tenés un retiro pendiente. Esperar que sea procesado antes de solicitar otro" },
      { status: 400 }
    );
  }

  if (amount > wallet.balance) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  // Transacción atómica: crear retiro y descontar saldo
  const [withdrawal] = await prisma.$transaction([
    prisma.walletWithdrawal.create({
      data: {
        walletId,
        amount,
        status: "PENDING",
        notes: `CBU: ${wallet.cbu ?? ""} | Alias: ${wallet.alias ?? ""} | CUIL: ${wallet.cuil ?? ""} | Titular: ${wallet.bankHolder ?? ""}`,
      },
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: { decrement: amount },
        totalWithdrawn: { increment: amount },
      },
    }),
  ]);

  return NextResponse.json({ withdrawal, message: "Retiro solicitado. Lo procesamos en 1-3 días hábiles." });
}
