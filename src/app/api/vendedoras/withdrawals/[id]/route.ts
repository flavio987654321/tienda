import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";
import { sendWithdrawalApprovedEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action: "APPROVE" | "REJECT" = body.action ?? "APPROVE";
  const notes: string | undefined = body.notes;
  const rejectionReason: string | undefined = body.rejectionReason;

  if (action === "REJECT" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "Ingresá el motivo del rechazo" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id },
        include: {
          wallet: {
            include: {
              affiliate: {
                select: {
                  userId: true,
                  store: { select: { ownerId: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (!withdrawal) throw new Error("Retiro no encontrado");
      if (withdrawal.status !== "PENDING") throw new Error("Este retiro ya fue procesado");

      if (user.role === "OWNER" && withdrawal.wallet.affiliate.store.ownerId !== user.id) {
        throw new Error("No autorizado");
      }

      const affiliateUserId = withdrawal.wallet.affiliate.userId;

      if (action === "REJECT") {
        // Devolver el saldo a la wallet
        await tx.wallet.update({
          where: { id: withdrawal.walletId },
          data: {
            balance: { increment: withdrawal.amount },
            totalWithdrawn: { decrement: withdrawal.amount },
          },
        });

        await createNotification({
          userId: affiliateUserId,
          type: "WITHDRAWAL_REJECTED",
          title: "Tu retiro fue rechazado",
          body: `Tu retiro de $${withdrawal.amount.toLocaleString("es-AR")} fue rechazado. Motivo: ${rejectionReason}. El saldo fue devuelto a tu billetera.`,
          link: "/vendedoras/billetera",
        }).catch((err) => console.error("[notify] withdrawal rejected", err));

        return tx.walletWithdrawal.update({
          where: { id },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionReason: rejectionReason!.trim(),
            notes: notes || null,
          },
        });
      }

      // APPROVE
      await createNotification({
        userId: affiliateUserId,
        type: "WITHDRAWAL_COMPLETED",
        title: "Tu retiro fue procesado",
        body: `$${withdrawal.amount.toLocaleString("es-AR")} transferidos a tu cuenta bancaria.`,
        link: "/afiliados/billetera",
      }).catch((err) => console.error("[notify] withdrawal paid", err));

      return tx.walletWithdrawal.update({
        where: { id },
        data: {
          status: "PAID",
          approvedAt: new Date(),
          notes: notes || null,
        },
      });
    });

    // Email al afiliado confirmando la transferencia (fire-and-forget)
    if (action === "APPROVE") {
      const affiliateUser = await prisma.user.findUnique({
        where: { id: withdrawal.wallet.affiliate.userId },
        select: { name: true, email: true },
      });
      if (affiliateUser?.email) {
        sendWithdrawalApprovedEmail({
          affiliateEmail: affiliateUser.email,
          affiliateName: affiliateUser.name ?? "Afiliada",
          storeName: withdrawal.wallet.affiliate.store.name ?? "la tienda",
          amount: result.amount,
        }).catch((err) => console.error("[email] sendWithdrawalApprovedEmail failed:", err));
      }
    }

    return NextResponse.json({ withdrawal: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar el retiro" },
      { status: 400 }
    );
  }
}
