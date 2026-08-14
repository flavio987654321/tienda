import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  /* La acción se valida contra la lista, no se confía en el tipo.
     El tipo de TypeScript es una promesa sobre lo que ESPERAMOS recibir; el
     cuerpo del pedido lo escribe cualquiera. Una acción inventada hoy termina
     rebotando igual —las tablas de abajo no la tienen y el UPDATE no engancha
     ninguna fila— pero eso es que sobreviva de casualidad, y esto decide sobre
     plata. Que rebote acá, con un motivo claro, y no tres pasos más adentro. */
  const ACCIONES = ["APPROVE", "REJECT", "PROCESSING"] as const;
  type Accion = (typeof ACCIONES)[number];
  const accionCruda = body.action ?? "APPROVE";
  if (!ACCIONES.includes(accionCruda)) {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }
  const action: Accion = accionCruda;

  const notes: string | undefined = typeof body.notes === "string" ? body.notes : undefined;
  const rejectionReason: string | undefined =
    typeof body.rejectionReason === "string" ? body.rejectionReason : undefined;

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

  /* Lo que va escrito en cada caso. Sale del `if` y se arma antes para que el
     UPDATE de abajo sea uno solo: es ese UPDATE el que hace de candado. */
  const notaLimpia = notes?.trim() || null;
  const cambioPorAccion: Record<string, Prisma.WalletWithdrawalUpdateManyMutationInput> = {
    REJECT: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: rejectionReason?.trim(),
      notes: notaLimpia,
    },
    PROCESSING: { status: "PROCESSING" },
    APPROVE: { status: "APPROVED", approvedAt: new Date(), notes: notaLimpia },
  };

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        /* El candado: la condición de estado va en el WHERE del propio UPDATE.
         *
         * Antes esto era un SELECT ("¿sigue PENDING?") y después un UPDATE sin
         * condición. Entre las dos consultas hay una ventana, y en PostgreSQL,
         * que por defecto lee lo ya confirmado, dos pedidos simultáneos LEEN LOS
         * DOS "PENDING" y siguen los dos de largo.
         *
         * En rechazar eso era plata de la nada: cada uno le devolvía el importe
         * a la billetera, así que un retiro rechazado dos veces al mismo tiempo
         * se acreditaba dos veces. No hacía falta mala intención — alcanzaba con
         * el botón en dos pestañas, o un clic mientras el primer pedido todavía
         * viajaba.
         *
         * Con la condición adentro del UPDATE la decide la base, que para eso
         * bloquea la fila: al segundo le vuelve `count: 0` y no toca nada.
         *
         * `Serializable` además, como en el pedido de retiro. El candado ya
         * alcanza para esta carrera; el nivel de aislamiento cubre las que
         * todavía no existen, cuando alguien sume otra escritura acá adentro. */
        const tomado = await tx.walletWithdrawal.updateMany({
          where: { id, status: { in: allowedFrom[action] ?? [] } },
          data: cambioPorAccion[action],
        });
        if (tomado.count === 0) throw new Error("Este retiro ya fue procesado");

        if (action === "REJECT") {
          // Devolver el saldo a la wallet
          await tx.wallet.update({
            where: { id: withdrawal.walletId },
            data: {
              balance: { increment: withdrawal.amount },
              totalWithdrawn: { decrement: withdrawal.amount },
            },
          });
        }

        const actualizado = await tx.walletWithdrawal.findUnique({ where: { id } });
        if (!actualizado) throw new Error("Retiro no encontrado");
        return actualizado;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    /* Los avisos, afuera de la transacción.
     *
     * Adentro estaban de más y además hacían daño: `createNotification` usa el
     * cliente de siempre, no el `tx`, así que nunca formó parte de esta
     * transacción —si algo fallaba después, el aviso quedaba igual—. Lo único
     * que lograba era tener la fila del retiro bloqueada mientras se escribía
     * una notificación, y con `Serializable` una transacción más larga es una
     * transacción que choca más. */
    const affiliateUserId = withdrawal.wallet.affiliate.userId;
    const monto = `$${withdrawal.amount.toLocaleString("es-AR")}`;
    const aviso = {
      REJECT: {
        type: "WITHDRAWAL_REJECTED",
        title: "Tu retiro fue rechazado",
        body: `Tu retiro de ${monto} fue rechazado. Motivo: ${rejectionReason?.trim()}. El saldo fue devuelto a tu panel de comisiones.`,
      },
      PROCESSING: {
        type: "WITHDRAWAL_PROCESSING",
        title: "Tu retiro está en proceso",
        body: `Tu retiro de ${monto} está siendo transferido. En breve se acreditará en tu cuenta.`,
      },
      APPROVE: {
        type: "WITHDRAWAL_COMPLETED",
        title: "Tu retiro fue procesado",
        body: `${monto} transferidos a tu cuenta bancaria.`,
      },
    }[action];

    despues(() => createNotification({
      userId: affiliateUserId,
      type: aviso.type,
      title: aviso.title,
      body: aviso.body,
      link: "/afiliados/billetera",
    }), `retiro ${action.toLowerCase()}: campanita al afiliado`);

    // Email al afiliado confirmando la transferencia (fire-and-forget)
    if (action === "APPROVE") {
      const affiliateUser = await prisma.user.findUnique({
        where: { id: withdrawal.wallet.affiliate.userId },
        select: { name: true, email: true },
      });
      if (affiliateUser?.email) {
        despues(() => sendWithdrawalApprovedEmail({
          affiliateEmail: affiliateUser.email,
          affiliateName: affiliateUser.name ?? "Afiliado",
          storeName: withdrawal.wallet.affiliate.store.name ?? "la tienda",
          amount: result.amount,
        }), "retiro aprobado: mail al afiliado");
      }
    }

    return NextResponse.json({ withdrawal: result });
  } catch (error) {
    /* `Serializable` puede abortar una transacción sana cuando dos chocan: no es
       un error de quien la pidió, y reintentar suele salir bien. Se contesta 409
       y no 400 —el mismo trato que en el pedido de retiro— para que la pantalla
       pueda distinguir "esto no se puede" de "probá de nuevo". */
    if ((error as { code?: string })?.code === "P2034") {
      return NextResponse.json(
        { error: "Solicitud en conflicto. Intentá de nuevo en unos segundos." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar el retiro" },
      { status: 400 }
    );
  }
}
