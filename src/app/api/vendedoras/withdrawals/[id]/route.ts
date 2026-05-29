import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const notes: string | undefined = body.notes;

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
                  store: { select: { ownerId: true } },
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

      await createNotification({
        userId: withdrawal.wallet.affiliate.userId,
        type: "WITHDRAWAL_COMPLETED",
        title: "Tu retiro fue procesado",
        body: `$${withdrawal.amount.toLocaleString("es-AR")} transferidos a tu cuenta bancaria.`,
        link: "/vendedoras/billetera",
      }).catch((err) => console.error("[notify] withdrawal paid", err));

      return tx.walletWithdrawal.update({
        where: { id },
        data: { status: "APPROVED", notes: notes || null },
      });
    });

    return NextResponse.json({ withdrawal: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar el retiro" },
      { status: 400 }
    );
  }
}
