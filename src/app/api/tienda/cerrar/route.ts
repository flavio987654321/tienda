import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createNotificationMany } from "@/lib/notifications";
import { sendStoreClosedOwnerEmail, sendStoreClosedAffiliateEmail } from "@/lib/resend";
import {
  getClosureBlockers,
  isBlocked,
  isValidClosureReason,
  applyStoreClosure,
  CLOSURE_REASONS,
  CLOSURE_COMMENT_MAX,
} from "@/lib/store-closure";

// Cierre voluntario de la tienda. NO es lo mismo que eliminar la cuenta
// (/api/cuenta DELETE): acá no se borra ni se anonimiza nada, la tienda sale de
// línea y todo queda tal cual para poder reactivarla. Es lo que los términos ya
// prometen desde siempre ("la tienda se ocultará pero tus datos no se borran —
// podés reactivarla en cualquier momento") y el código no cumplía.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el dueño de una tienda puede cerrarla" }, { status: 403 });
  }

  // Por usuario y no por IP: cerrar exige sesión, y así una IP compartida
  // (oficina, wifi pública) no bloquea a nadie más.
  if (!(await checkRateLimit(`cerrar-tienda:${user.id}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { reason, comment, confirm } = body as { reason?: unknown; comment?: unknown; confirm?: unknown };

  if (!isValidClosureReason(reason)) {
    return NextResponse.json({ error: "Elegí un motivo válido" }, { status: 400 });
  }

  const cleanComment = typeof comment === "string" ? comment.trim() : "";
  if (cleanComment.length > CLOSURE_COMMENT_MAX) {
    return NextResponse.json(
      { error: `El comentario no puede superar los ${CLOSURE_COMMENT_MAX} caracteres` },
      { status: 400 }
    );
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, closedAt: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // La confirmación se valida acá y no solo en el modal: el modal es UX, esto es
  // lo que de verdad protege. (El DELETE del admin todavía no hace esto — queda
  // pendiente emparejarlo.)
  if (typeof confirm !== "string" || confirm.trim() !== store.name) {
    return NextResponse.json(
      { error: "El nombre ingresado no coincide con el de tu tienda" },
      { status: 400 }
    );
  }

  if (store.closedAt) {
    return NextResponse.json({ error: "Tu tienda ya está cerrada" }, { status: 409 });
  }

  const blockers = await getClosureBlockers(prisma, store.id);
  if (isBlocked(blockers)) {
    return NextResponse.json({ error: "Bloqueado", ...blockers }, { status: 409 });
  }

  // Se leen ANTES de pausarlas: después del update ya no son isActive y no habría
  // a quién avisarle.
  const affiliates = await prisma.affiliate.findMany({
    where: { storeId: store.id, isActive: true },
    select: { userId: true, user: { select: { email: true, name: true } } },
  });

  await prisma.$transaction(async (tx) => {
    // Compartido con el cierre automático del cron: mismas escrituras, un solo
    // lugar. Deja la tienda offline y las afiliadas en PAUSED reversible.
    await applyStoreClosure(tx, store.id);

    // Esto sí es propio del cierre voluntario: no se le sigue cobrando una tienda
    // que ella misma cerró. (El del cron no la toca: ya está vencida.)
    //
    // `cancelAtPeriodEnd: true` es lo que separa este cierre de una cancelación
    // del admin: dice "no renueva", no "cortale el acceso". Los días que ya pagó
    // siguen siendo suyos, así que si reactiva antes del vencimiento entra sin
    // pagar de nuevo. Sin esta marca, cerrar el día 30 de un plan anual y volver
    // el día 60 le pedía el año entero otra vez.
    await tx.subscription.updateMany({
      where: { userId: user.id },
      data: { status: "CANCELLED", cancelAtPeriodEnd: true },
    });

    // storeName/ownerEmail/ownerName son snapshots: si más adelante elimina la
    // cuenta, la relación devolvería "Tienda eliminada" y un email anonimizado.
    await tx.storeClosure.create({
      data: {
        storeId: store.id,
        storeName: store.name,
        ownerEmail: user.email,
        ownerName: user.name ?? null,
        reason,
        comment: cleanComment || null,
      },
    });
  });

  // Todo lo de afuera va DESPUÉS del commit: no se avisa de un cierre que podría
  // haber hecho rollback.
  if (affiliates.length > 0) {
    await createNotificationMany(
      affiliates.map((a) => ({
        userId: a.userId,
        type: "STORE_CLOSED",
        title: `${store.name} cerró su tienda`,
        body: "Tu link quedó pausado. El saldo que ya tenías acreditado sigue disponible para retirar, y si la tienda vuelve a abrir recuperás tu lugar.",
        link: "/afiliados",
      }))
    );

    await Promise.all(
      affiliates.map((a) =>
        sendStoreClosedAffiliateEmail({
          to: a.user.email,
          affiliateName: a.user.name ?? "",
          storeName: store.name,
        }).catch((e) => console.error("[email] store closed affiliate:", a.user.email, e))
      )
    );
  }

  // Con await: es el comprobante de que cerró su tienda y de cómo recuperarla. Si
  // falla, el cierre igual quedó hecho, así que no se rompe la respuesta.
  await sendStoreClosedOwnerEmail({
    to: user.email,
    userName: user.name ?? "",
    storeName: store.name,
    reason: CLOSURE_REASONS[reason],
  }).catch((e) => console.error("[email] store closed owner:", e));

  console.info("[tienda] cerrada", { storeId: store.id, slug: store.slug, reason, ip: getClientIp(req) });

  return NextResponse.json({ ok: true });
}
