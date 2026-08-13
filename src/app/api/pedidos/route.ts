import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* `tipoTiendaConfigurado` viaja junto con `tipoTienda` a propósito, en la
     misma respuesta y no en otro endpoint.
     Son la pregunta y la respuesta: `tipoTienda` arranca en "ROPA" por defecto
     desde que se crea la tienda, así que tener un valor NO significa que la
     dueña haya elegido nada. El único que sabe si eligió es este booleano. Si
     llegaran por dos fetch distintos, entre uno y otro habría un momento con
     rubro y sin saber si está confirmado — y ese hueco es justo el bug que
     esto viene a cerrar (ver el tour en DashboardLayout). */
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, tipoTienda: true, tipoTiendaConfigurado: true },
  });
  if (!store) return NextResponse.json({ pendingCount: 0, tipoTienda: "ROPA", tipoTiendaConfigurado: false });

  const pendingCount = await prisma.order.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  return NextResponse.json({
    pendingCount,
    tipoTienda: store.tipoTienda || "ROPA",
    tipoTiendaConfigurado: store.tipoTiendaConfigurado,
  });
}
