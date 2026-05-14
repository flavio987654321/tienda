import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH - dueño aprueba o rechaza un retiro de afiliado
export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await context.params;
  const { status, notes } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que el retiro pertenece a un afiliado de la tienda del dueño
      const withdrawal = await tx.walletWithdrawal.findUnique({
        where: { id },
        include: {
          wallet: {
            include: {
              affiliate: {
                include: { store: { select: { ownerId: true } } },
              },
            },
          },
        },
      });

      if (!withdrawal) throw new Error("Retiro no encontrado");
      if (withdrawal.wallet.affiliate.store.ownerId !== user.id) {
        throw new Error("No autorizado");
      }
      if (withdrawal.status !== "PENDING") {
        throw new Error(`El retiro ya fue ${withdrawal.status === "APPROVED" ? "aprobado" : "rechazado"}`);
      }

      // Si se rechaza, devolver el saldo a la billetera
      if (status === "REJECTED") {
        await tx.wallet.update({
          where: { id: withdrawal.walletId },
          data: {
            balance: { increment: withdrawal.amount },
            totalWithdrawn: { decrement: withdrawal.amount },
          },
        });
      }

      return tx.walletWithdrawal.update({
        where: { id },
        data: { status, notes: notes || null },
      });
    });

    return NextResponse.json({ withdrawal: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar el retiro" },
      { status: 400 }
    );
  }
}
