import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// Desconectar es un apagado completo: corta el permiso de administración Y
// el ID de Analytics ya instalado, para que "Instalada" refleje la realidad
// y la tienda deje de mandar visitas a una cuenta que ya no controlamos.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, storeConfig: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(store.storeConfig || "{}"); } catch { /* config inválido, se trata como vacío */ }
  const analytics = { ...(config.analytics as Record<string, unknown> | undefined) };
  delete analytics.googleAnalyticsId;

  await prisma.store.update({
    where: { id: store.id },
    data: {
      gaRefreshToken: null,
      gaAccountId: null,
      gaPropertyId: null,
      gaConnectedAt: null,
      storeConfig: JSON.stringify({ ...config, analytics }),
    },
  });

  return NextResponse.json({ ok: true });
}
