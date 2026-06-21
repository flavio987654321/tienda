import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, getSubscriptionStatus } from "@/lib/subscription";
import { getNovedad } from "@/lib/asistente-novedades";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ disponible: false, tieneNovedad: false, tipo: null });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, tipoTienda: true, tipoTiendaConfigurado: true },
  });
  if (!store || !store.tipoTiendaConfigurado) {
    return NextResponse.json({ disponible: false, tieneNovedad: false, tipo: null });
  }

  const sub = await getUserSubscription(user.id);
  if (sub) {
    const status = getSubscriptionStatus(sub);
    if (status === "EXPIRED" || status === "CANCELLED") {
      return NextResponse.json({ disponible: false, tieneNovedad: false, tipo: null });
    }
  }

  try {
    const novedad = await getNovedad(store.id, store.tipoTienda);
    return NextResponse.json({ disponible: true, ...novedad });
  } catch (err) {
    console.error("[asistente/novedad] error", err);
    return NextResponse.json({ disponible: true, tieneNovedad: false, tipo: null });
  }
}
