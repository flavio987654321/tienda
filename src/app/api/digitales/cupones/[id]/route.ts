import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { PREFIJO_DE_LA_OFERTA } from "@/lib/cupones-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH apaga o prende un cupón; DELETE lo borra. Las dos con el dueño
 * adentro del `where` (`updateMany` / `deleteMany`): un id ajeno no encuentra
 * nada. Apagar y no borrar es lo normal: un cupón que ya se usó en ventas es
 * historia (`Order.cuponCodigo` lo nombra) y borrarlo no borra esas ventas.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (typeof body?.activo !== "boolean") return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });
  const { count } = await prisma.cuponDigital.updateMany({
    where: { id, store: { ownerId: user.id } },
    data: { activo: body.activo },
  });
  if (count === 0) return NextResponse.json({ error: "Ese cupón no existe." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await ctx.params;
  /* El de la oferta de salida no se borra desde acá: se apaga la oferta.
     La pantalla no muestra el botón, y la ruta no lo permite igual. */
  const { count } = await prisma.cuponDigital.deleteMany({ where: { id, store: { ownerId: user.id }, NOT: { codigo: { startsWith: PREFIJO_DE_LA_OFERTA } } } });
  if (count === 0) return NextResponse.json({ error: "Ese cupón no existe, o es el de la oferta de salida: se apaga desde esa pantalla." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
