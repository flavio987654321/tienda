import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";
import { sendWithdrawalApprovedEmail } from "@/lib/email";
import { despues } from "@/lib/despues";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action: "APPROVE" | "REJECT" | "PROCESSING" = body.action ?? "APPROVE";
  const notes: string | undefined = body.notes;
  const rejectionReason: string | undefined = body.rejectionReason;

  if (action === "REJECT" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "Ingresá el motivo del rechazo" }, { status: 400 });
  }
  if (rejectionReason && rejectionReason.length > 500) {
    return NextResponse.json({ error: "El motivo no puede superar 500 caracteres" }, { status: 400 });
  }
  if (notes && notes.length > 500) {
    return NextResponse.json({ error: "Las notas no pueden superar 500 caracteres" }, { status: 400 });
  }

  const withdrawal = await prisma.walletWithdrawal.findUnique({
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

  if (!withdrawal) return NextResponse.json({ error: "Retiro no encontrado" }, { status: 404 });
  const allowedFrom: Record<string, string[]> = {
    APPROVE: ["PENDING", "PROCESSING"],
    REJECT: ["PENDING", "PROCESSING"],
    PROCESSING: ["PENDING"],
  };
  if (!allowedFrom[action]?.includes(withdrawal.status)) {
    return NextResponse.json({ error: "Este retiro ya fue procesado" }, { status: 400 });
  }
  if (user.role === "OWNER" && withdrawal.wallet.affiliate.store.ownerId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check status inside tx to avoid race conditions
      const fresh = await tx.walletWithdrawal.findUnique({ where: { id }, select: { status: true } });
      if (!fresh) throw new Error("Retiro no encontrado");
      const validFrom = allowedFrom[action] ?? [];
      if (!validFrom.includes(fresh.status)) throw new Error("Este retiro ya fue procesado");

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
          body: `Tu retiro de $${withdrawal.amount.toLocaleString("es-AR")} fue rechazado. Motivo: ${rejectionReason}. El saldo fue devuelto a tu panel de comisiones.`,
          link: "/afiliados/billetera",
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

      // PROCESSING
      if (action === "PROCESSING") {
        await createNotification({
          userId: affiliateUserId,
          type: "WITHDRAWAL_PROCESSING",
          title: "Tu retiro está en proceso",
          body: `Tu retiro de $${withdrawal.amount.toLocaleString("es-AR")} está siendo transferido. En breve se acreditará en tu cuenta.`,
          link: "/afiliados/billetera",
        }).catch((err) => console.error("[notify] withdrawal processing", err));

        return tx.walletWithdrawal.update({
          where: { id },
          data: { status: "PROCESSING" },
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
          status: "APPROVED",
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
        despues(() => sendWithdrawalApprovedEmail({
          affiliateEmail: affiliateUser.email,
          affiliateName: affiliateUser.name ?? "Afiliada",
          storeName: withdrawal.wallet.affiliate.store.name ?? "la tienda",
          amount: result.amount,
        }), "retiro aprobado: mail a la afiliada");
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
