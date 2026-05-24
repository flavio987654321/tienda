import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH - solo el admin de la plataforma marca un retiro como completado
export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  const { notes } = await req.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id },
        include: {
          wallet: {
            include: { affiliate: { select: { userId: true } } },
          },
        },
      });

      if (!withdrawal) throw new Error("Retiro no encontrado");
      if (withdrawal.status !== "PENDING") {
        throw new Error("Este retiro ya fue procesado");
      }

      // Notificar a la afiliada que su retiro fue procesado
      await createNotification({
        userId: withdrawal.wallet.affiliate.userId,
        type: "WITHDRAWAL_COMPLETED",
        title: "Tu retiro fue procesado",
        body: `$${withdrawal.amount.toLocaleString("es-AR")} transferidos a tu cuenta bancaria.`,
        link: "/vendedoras/billetera",
      });

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
