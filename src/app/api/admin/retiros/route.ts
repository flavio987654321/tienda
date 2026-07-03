import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { decryptIfNeeded } from "@/lib/crypto";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("count") === "1") {
    const count = await prisma.walletWithdrawal.count({ where: { status: "PENDING" } });
    return NextResponse.json({ count });
  }

  const withdrawals = await prisma.walletWithdrawal.findMany({
    where: { status: "PENDING" },
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

  const result = withdrawals.map((w) => {
    const aff = w.wallet.affiliate;
    // Datos bancarios del momento del retiro (snapshot)
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
    };
  });

  return NextResponse.json({ withdrawals: result });
}
