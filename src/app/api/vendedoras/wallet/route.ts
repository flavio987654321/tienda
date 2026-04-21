import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - ver billetera de la vendedora
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = (session.user as any).id;

  const affiliates = await prisma.affiliate.findMany({
    where: { userId },
    include: {
      store: { select: { name: true, slug: true } },
      wallet: { include: { withdrawals: { orderBy: { createdAt: "desc" }, take: 10 } } },
      commissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { order: { select: { total: true, createdAt: true } } },
      },
    },
  });

  const totalBalance = affiliates.reduce((sum, a) => sum + (a.wallet?.balance ?? 0), 0);
  const totalEarned = affiliates.reduce((sum, a) => sum + (a.wallet?.totalEarned ?? 0), 0);
  const totalWithdrawn = affiliates.reduce((sum, a) => sum + (a.wallet?.totalWithdrawn ?? 0), 0);

  return NextResponse.json({ affiliates, totalBalance, totalEarned, totalWithdrawn });
}

// POST - solicitar retiro
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { walletId, amount, notes } = await req.json();
  const userId = (session.user as any).id;

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: { affiliate: true },
  });

  if (!wallet || wallet.affiliate.userId !== userId) {
    return NextResponse.json({ error: "Billetera no encontrada" }, { status: 404 });
  }

  if (amount > wallet.balance) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  const withdrawal = await prisma.walletWithdrawal.create({
    data: { walletId, amount: parseFloat(amount), notes, status: "PENDING" },
  });

  await prisma.wallet.update({
    where: { id: walletId },
    data: {
      balance: { decrement: parseFloat(amount) },
      totalWithdrawn: { increment: parseFloat(amount) },
    },
  });

  return NextResponse.json({ withdrawal });
}
