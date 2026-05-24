import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { decryptIfNeeded } from "@/lib/crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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
    const rawCbu = decryptIfNeeded(w.wallet.cbu);
    const rawCuil = decryptIfNeeded(w.wallet.cuil);
    const rawHolder = decryptIfNeeded(w.wallet.bankHolder);
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
      alias: w.wallet.alias ?? null,
      cuil: rawCuil ?? null,
      bankHolder: rawHolder ?? null,
    };
  });

  return NextResponse.json({ withdrawals: result });
}
