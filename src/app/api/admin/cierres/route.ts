import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { isValidClosureReason } from "@/lib/store-closure";

// Motivos que dejan las dueñas al cerrar su tienda. Mismo patrón que
// /api/admin/denuncias: ?count=1 para el badge, ?status= para filtrar, PATCH para
// marcar leído.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  // Cortocircuito para el badge del sidebar: cuenta y nada más.
  if (searchParams.get("count") === "1") {
    const count = await prisma.storeClosure.count({ where: { status: "PENDING" } });
    return NextResponse.json({ count });
  }

  const status = searchParams.get("status") ?? "PENDING";
  const reason = searchParams.get("reason");

  const closures = await prisma.storeClosure.findMany({
    where: {
      ...(status === "ALL" ? {} : { status }),
      // El motivo se filtra contra la whitelist: si llega cualquier cosa, se
      // ignora en vez de mandarla a la query.
      ...(reason && isValidClosureReason(reason) ? { reason } : {}),
    },
    orderBy: { createdAt: "desc" },
    // La tienda se incluye solo para saber si sigue cerrada y linkearla; el
    // nombre y el email salen de los snapshots de la propia fila, porque si la
    // cuenta se eliminó la relación devuelve "Tienda eliminada".
    include: { store: { select: { slug: true, closedAt: true } } },
  });

  return NextResponse.json({ closures });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };

  if (!id || typeof id !== "string" || !status || !["PENDING", "REVIEWED"].includes(status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const closure = await prisma.storeClosure.update({ where: { id }, data: { status } });
  return NextResponse.json({ closure });
}
