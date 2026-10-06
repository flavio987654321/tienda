import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validarSeguimiento, etapaResultante } from "@/lib/seguimiento";

/* PATCH /api/leads/[id]/seguimiento — etapa, nota, recordatorio y visita de
   una consulta. Ver `lib/seguimiento`.

   { contactado: true } es el toque de WhatsApp o Llamar desde el panel: la
   pasa a "Contactado" SÓLO si todavía estaba nueva (no baja una que ya
   estaba negociando) y anota cuándo se la atendió por primera vez. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, store: { ownerId: user.id } },
    select: { id: true, storeId: true, seguimiento: true },
  });
  if (!lead) return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const ahora = new Date();
  const previo = lead.seguimiento;

  if (body?.contactado === true) {
    const s = await prisma.seguimientoConsulta.upsert({
      where: { leadId: lead.id },
      create: { leadId: lead.id, storeId: lead.storeId, etapa: "CONTACTADO", contactadoAt: ahora },
      update: {
        ...(previo?.etapa ? {} : { etapa: "CONTACTADO" }),
        ...(previo?.contactadoAt ? {} : { contactadoAt: ahora }),
      },
    });
    return NextResponse.json({ seguimiento: s });
  }

  const v = validarSeguimiento(body, ahora);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const c = v.cambios;
  const etapa = etapaResultante(previo?.etapa, c);
  const datos = {
    etapa,
    ...(c.nota !== undefined ? { nota: c.nota } : {}),
    ...(c.recordarEl !== undefined ? { recordarEl: c.recordarEl } : {}),
    ...(c.visitaEl !== undefined ? { visitaEl: c.visitaEl, visitaTipo: c.visitaTipo ?? null } : {}),
    // Pasar a cualquier etapa es haberla atendido.
    ...(etapa && !previo?.contactadoAt ? { contactadoAt: ahora } : {}),
  };
  const s = await prisma.seguimientoConsulta.upsert({
    where: { leadId: lead.id },
    create: { leadId: lead.id, storeId: lead.storeId, ...datos },
    update: datos,
  });
  return NextResponse.json({ seguimiento: s });
}
