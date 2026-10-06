import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

/* PATCH /api/busquedas/[id] — la dueña marca que ya le avisó por un vehículo,
   o cierra / reabre la búsqueda. Sólo las de SU tienda (otra da 404).
   { accion: "avisado", productoId } | { accion: "cerrar" } | { accion: "reabrir" } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const b = await prisma.busquedaGuardada.findFirst({ where: { id, store: { ownerId: user.id } }, select: { id: true, storeId: true, avisadoIds: true } });
  if (!b) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body?.accion === "avisado") {
    const productoId = typeof body.productoId === "string" ? body.productoId : "";
    // Que el vehículo sea de la misma tienda: el id viaja desde el navegador.
    const p = productoId ? await prisma.product.findFirst({ where: { id: productoId, storeId: b.storeId }, select: { id: true } }) : null;
    if (!p) return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    if (!b.avisadoIds.includes(p.id)) await prisma.busquedaGuardada.update({ where: { id: b.id }, data: { avisadoIds: { push: p.id } } });
    return NextResponse.json({ ok: true });
  }
  if (body?.accion === "cerrar" || body?.accion === "reabrir") {
    /* Reabrir le renueva la vigencia: si no, una de hace 100 días se volvería
       a cerrar sola en la próxima revisión. */
    await prisma.busquedaGuardada.update({
      where: { id: b.id },
      data: body.accion === "cerrar" ? { status: "CERRADA" } : { status: "ACTIVA", createdAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
