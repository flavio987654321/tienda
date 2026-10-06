import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { enteroDe } from "@/lib/tasaciones";

/* PATCH /api/tasaciones/[id] — la dueña responde una tasación.
   { accion: "ofertar", monto, nota? } → OFERTADA, con el número guardado
   { accion: "aceptada" | "descartar" | "reabrir" }
   Sólo las de SU tienda: una ajena da 404, igual que una que no existe. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const t = await prisma.tasacion.findFirst({ where: { id, store: { ownerId: user.id } }, select: { id: true, status: true, ofertaMonto: true } });
  if (!t) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const accion = body?.accion;

  if (accion === "ofertar") {
    const monto = enteroDe(body.monto);
    if (monto == null || monto <= 0 || monto > 10_000_000_000) {
      return NextResponse.json({ error: "Poné el monto de la oferta (sólo números)." }, { status: 400 });
    }
    const nota = typeof body.nota === "string" ? body.nota.trim().slice(0, 300) || null : null;
    const r = await prisma.tasacion.update({
      where: { id: t.id },
      data: { status: "OFERTADA", ofertaMonto: monto, ofertaNota: nota, ofertadaAt: new Date() },
    });
    return NextResponse.json({ tasacion: { status: r.status, ofertaMonto: r.ofertaMonto, ofertaNota: r.ofertaNota } });
  }

  const destino = accion === "aceptada" ? "ACEPTADA" : accion === "descartar" ? "DESCARTADA" : accion === "reabrir" ? null : undefined;
  if (destino === undefined) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  /* "Aceptó" sólo tiene sentido después de una oferta: sin número no hay
     nada que aceptar. Reabrir vuelve a donde estaba (con oferta o sin ella). */
  if (destino === "ACEPTADA" && t.status !== "OFERTADA") {
    return NextResponse.json({ error: "Primero cargá la oferta que le hiciste." }, { status: 409 });
  }
  const r = await prisma.tasacion.update({
    where: { id: t.id },
    data: destino
      ? { status: destino }
      : { status: t.ofertaMonto != null ? "OFERTADA" : "PENDIENTE" },
  });
  return NextResponse.json({ tasacion: { status: r.status, ofertaMonto: r.ofertaMonto, ofertaNota: r.ofertaNota } });
}
