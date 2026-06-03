import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { action, note } = await req.json();

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  if (action === "REJECT" && !note?.trim()) {
    return NextResponse.json({ error: "Indicá el motivo del rechazo" }, { status: 400 });
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { storeId: true, status: true },
  });

  if (!request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 400 });
  }

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
    ]);
  } else {
    await prisma.verificationRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: note.trim() },
    });
  }

  return NextResponse.json({ ok: true });
}
