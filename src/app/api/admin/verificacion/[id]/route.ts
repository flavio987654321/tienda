import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail, sendVerificationRevokedEmail, sendVerificationBannedEmail } from "@/lib/resend";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { action, note, ban } = await req.json();

  if (action !== "APPROVE" && action !== "REJECT" && action !== "REVOKE") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  if ((action === "REJECT" || action === "REVOKE") && !note?.trim()) {
    return NextResponse.json({ error: "Indicá el motivo" }, { status: 400 });
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { storeId: true, status: true },
  });

  if (!request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (action === "REVOKE" && request.status !== "APPROVED") {
    return NextResponse.json({ error: "Solo se pueden revocar verificaciones aprobadas" }, { status: 400 });
  }
  if ((action === "APPROVE" || action === "REJECT") && request.status !== "PENDING") {
    return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id: request.storeId },
    select: { ownerId: true, owner: { select: { email: true, name: true } } },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  if (action === "APPROVE") {
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewNote: null },
      }),
      prisma.store.update({
        where: { id: request.storeId },
        data: { isVerified: true },
      }),
      ...(store ? [prisma.notification.create({
        data: {
          userId: store.ownerId,
          type: "VERIFICACION_APROBADA",
          title: "¡Tu identidad fue verificada!",
          body: "Tu tienda ahora muestra el badge azul de verificación. Activá los datos que querés mostrar al público desde Perfil.",
          link: "/dashboard/perfil",
        },
      })] : []),
    ]);
    if (store?.owner) {
      sendVerificationApprovedEmail({ to: store.owner.email, userName: store.owner.name ?? "" }).catch(() => {});
    }
  } else if (action === "REVOKE") {
    const isBan = ban === true;
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: note.trim() },
      }),
      prisma.store.update({
        where: { id: request.storeId },
        data: { isVerified: false, ...(isBan && { verificationBanned: true }) },
      }),
      ...(store ? [prisma.notification.create({
        data: {
          userId: store.ownerId,
          type: "VERIFICACION_RECHAZADA",
          title: isBan ? "Tu cuenta fue inhabilitada para verificación" : "Tu verificación fue revocada",
          body: note.trim(),
          link: "/dashboard/perfil",
        },
      })] : []),
    ]);
    if (store?.owner) {
      if (isBan) {
        sendVerificationBannedEmail({ to: store.owner.email, userName: store.owner.name ?? "", reason: note.trim() }).catch(() => {});
      } else {
        sendVerificationRevokedEmail({ to: store.owner.email, userName: store.owner.name ?? "", reason: note.trim() }).catch(() => {});
      }
    }
  } else {
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: note.trim() },
      }),
      ...(store ? [prisma.notification.create({
        data: {
          userId: store.ownerId,
          type: "VERIFICACION_RECHAZADA",
          title: "Solicitud de verificación rechazada",
          body: note.trim(),
          link: "/dashboard/perfil",
        },
      })] : []),
    ]);
    if (store?.owner) {
      sendVerificationRejectedEmail({ to: store.owner.email, userName: store.owner.name ?? "", reason: note.trim() }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
