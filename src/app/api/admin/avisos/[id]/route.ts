import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { getClientIp } from "@/lib/request-ip";
import { logAdminAction } from "@/lib/admin-log";
import { validarAviso } from "@/lib/avisos-admin";
import { avisosConNumeros, avisarQueCambiaron, conLaPersona } from "@/lib/avisos-admin-servidor";

/**
 * PATCH /api/admin/avisos/:id
 *   `{ activo: boolean }`  → lo prende o lo apaga, sin tocar nada más.
 *   el aviso entero        → lo edita, con la misma validación que al crearlo.
 *
 * Editar NO le vuelve a mostrar el aviso a quien ya lo cerró: el cierre es de
 * la persona, y un aviso corregido sigue siendo el mismo aviso.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const existe = await prisma.avisoAdmin.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "Ese aviso ya no está — recargá la página." }, { status: 404 });

  const cuerpo = await req.json().catch(() => null);
  if (cuerpo && typeof cuerpo === "object" && Object.keys(cuerpo).length === 1 && typeof cuerpo.activo === "boolean") {
    await prisma.avisoAdmin.update({ where: { id }, data: { activo: cuerpo.activo } });
    await logAdminAction({
      adminId: user.id, adminEmail: user.email, action: cuerpo.activo ? "AVISO_PRENDIDO" : "AVISO_APAGADO",
      targetId: id, targetType: "AVISO", ip: getClientIp(req),
    });
    await avisarQueCambiaron();
    return NextResponse.json(await avisosConNumeros());
  }

  const v = validarAviso(cuerpo);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const r = await conLaPersona(v.aviso);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  await prisma.avisoAdmin.update({ where: { id }, data: r.aviso });
  await logAdminAction({
    adminId: user.id, adminEmail: user.email, action: "AVISO_EDITADO",
    targetId: id, targetType: "AVISO", details: { titulo: r.aviso.titulo, roles: r.aviso.roles }, ip: getClientIp(req),
  });
  await avisarQueCambiaron();
  return NextResponse.json(await avisosConNumeros());
}

/** DELETE /api/admin/avisos/:id — se va con sus vistos (cascade). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;

  const borrado = await prisma.avisoAdmin.delete({ where: { id } }).catch(() => null);
  if (borrado) {
    await logAdminAction({
      adminId: user.id, adminEmail: user.email, action: "AVISO_BORRADO",
      targetId: id, targetType: "AVISO", details: { titulo: borrado.titulo }, ip: getClientIp(req),
    });
    await avisarQueCambiaron();
  }
  /* Ya borrado (otra pestaña) cuenta como hecho: lo que se pidió es que no esté. */
  return NextResponse.json(await avisosConNumeros());
}
