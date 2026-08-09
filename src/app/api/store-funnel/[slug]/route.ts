import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { esPasoRegistrado } from "@/lib/embudo";
import { visitaLegitima } from "@/lib/visita-legitima";

export const runtime = "nodejs";

/**
 * Cuántos pasos se le aceptan a una misma IP para la misma tienda por hora.
 *
 * Una persona real dispara dos como mucho —carrito y checkout— y el cliente
 * deduplica por día con localStorage. 10 deja lugar a una familia o una oficina
 * saliendo por la misma IP sin permitir que alguien infle el embudo a mano.
 *
 * El cupo es propio y no comparte clave con el de las visitas: si fuera el
 * mismo, alguien mirando mucho la tienda se quedaría sin visitas contadas.
 */
const MAX_PASOS_POR_IP = 10;

/**
 * POST /api/store-funnel/[slug] con `{ paso: "carrito" | "checkout" }`.
 *
 * Fire-and-forget desde el navegador, igual que las visitas. El dedup de una vez
 * por día por persona lo hace el cliente con localStorage; acá se filtra lo que
 * el cliente no puede filtrar.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!(await visitaLegitima(req, `store-funnel:${slug}`, MAX_PASOS_POR_IP))) {
    return NextResponse.json({ ok: true, contado: false });
  }

  // El paso se valida contra la lista cerrada ANTES de tocar la base: es parte
  // de la clave de la tabla, así que un `paso` libre dejaría que cualquiera con
  // la consola abierta invente escalones que después salen por pantalla.
  const cuerpo = await req.json().catch(() => null);
  const paso = cuerpo?.paso;
  if (!esPasoRegistrado(paso)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, isPublished: true },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });

  // Día del calendario argentino, el mismo que usan las visitas. Con días UTC
  // los dos extremos del embudo caerían en días distintos entre las 21:00 y la
  // medianoche, que son las horas de más venta.
  const date = getArgentinaDayKey();

  await prisma.storeFunnelStep.upsert({
    where: { storeId_date_step: { storeId: store.id, date, step: paso } },
    update: { count: { increment: 1 } },
    create: { storeId: store.id, date, step: paso, count: 1 },
  });

  return NextResponse.json({ ok: true, contado: true });
}
