import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { decryptIfNeeded } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("count") === "1") {
    const count = await prisma.walletWithdrawal.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } });
    return NextResponse.json({ count });
  }

  const withdrawals = await prisma.walletWithdrawal.findMany({
    where: { status: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "asc" },
    include: {
      wallet: {
        include: {
          affiliate: {
            include: {
              user: { select: { name: true, email: true } },
              store: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  // Chargeback stats por afiliado (bulk)
  const affiliateIds = [...new Set(withdrawals.map((w) => w.wallet.affiliateId))];
  const commStats = affiliateIds.length > 0
    ? await prisma.commission.groupBy({
        by: ["affiliateId", "status"],
        where: { affiliateId: { in: affiliateIds }, status: { in: ["PAID", "REVERSED", "DISBURSED"] } },
        _count: { id: true },
      })
    : [];

  const chargebackMap: Record<string, { total: number; reversed: number; rate: number }> = {};
  for (const id of affiliateIds) {
    const rows = commStats.filter((c) => c.affiliateId === id);
    const total = rows.reduce((s, r) => s + r._count.id, 0);
    const reversed = rows.find((r) => r.status === "REVERSED")?._count.id ?? 0;
    chargebackMap[id] = { total, reversed, rate: total > 0 ? (reversed / total) * 100 : 0 };
  }

  const result = withdrawals.map((w) => {
    const aff = w.wallet.affiliate;
    const rawCbu = decryptIfNeeded(w.snapshotCbu);
    const rawCuil = decryptIfNeeded(w.snapshotCuil);
    const rawHolder = decryptIfNeeded(w.snapshotHolder);
    const alias = w.snapshotAlias;
    return {
      id: w.id,
      amount: w.amount,
      status: w.status,
      notes: w.notes,
      createdAt: w.createdAt,
      affiliateName: aff.user.name,
      affiliateEmail: aff.user.email,
      storeName: aff.store.name,
      storeSlug: aff.store.slug,
      cbu: rawCbu ?? null,
      alias: alias ?? null,
      cuil: rawCuil ?? null,
      bankHolder: rawHolder ?? null,
      chargebackStats: chargebackMap[w.wallet.affiliateId] ?? { total: 0, reversed: 0, rate: 0 },
    };
  });

  return NextResponse.json({ withdrawals: result });
}
