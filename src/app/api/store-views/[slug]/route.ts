import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { clasificarOrigen } from "@/lib/origen-visita";
import { visitaLegitima } from "@/lib/visita-legitima";

export const runtime = "nodejs";

/**
 * Cuántas visitas se le aceptan a una misma IP para la misma tienda por hora.
 *
 * Una persona real dispara UNA por día (el cliente deduplica con localStorage).
 * 5 deja lugar a los casos legítimos —una familia o una oficina salen por la
 * misma IP— sin permitir que alguien infle el número a mano.
 */
const MAX_VISITAS_POR_IP = 5;

// POST /api/store-views/[slug]
// Registra una visita a la tienda. Se llama desde el browser (fire-and-forget).
// La deduplicación de una visita por día por persona se hace en el cliente con
// localStorage; acá se filtra lo que el cliente no puede filtrar.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Bots, visitas forjadas y el límite por IP. Están en `lib/visita-legitima`
  // porque el embudo escribe métricas desde el navegador igual que esto: con los
  // filtros copiados, un día se arregla un agujero en uno y no en el otro.
  if (!(await visitaLegitima(req, `store-view:${slug}`, MAX_VISITAS_POR_IP))) {
    return NextResponse.json({ ok: true, contada: false });
  }

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, isPublished: true },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });

  // Día del calendario argentino, no UTC. Guardado en UTC, una visita de las
  // 22:00 quedaba anotada al día siguiente —y en el gráfico de Métricas el pico
  // de la noche aparecía corrido un día—.
  //
  // OJO: las filas escritas antes de este cambio están en días UTC y no se
  // pueden reclasificar (la fila guarda "fecha + cantidad", sin hora: repartirla
  // sería inventar a qué hora pasó cada visita). Arriba de ~3 meses de historia
  // la diferencia se diluye; en el corto plazo puede haber un día de borde algo
  // corrido. Está documentado en METRICAS.md.
  const date = getArgentinaDayKey();

  await prisma.storeView.upsert({
    where: { storeId_date: { storeId: store.id, date } },
    update: { count: { increment: 1 } },
    create: { storeId: store.id, date, count: 1 },
  });

  // ── De dónde vino ──
  // Va en su propio try y DESPUÉS del total, no antes y no en la misma
  // transacción. El total es el número que no se puede perder: si esta escritura
  // falla, la visita ya quedó contada y lo único que pasa es que no se sabe de
  // dónde vino. Al revés —una transacción que abarque las dos— un problema
  // clasificando haría perder la visita entera.
  //
  // La clasificación es del servidor y no del cliente: lo que sale de acá se
  // escribe en la base y se compara con lo ya escrito, así que tiene que salir
  // de una lista cerrada y no de lo que decida mandar un navegador.
  try {
    const cuerpo = await req.json().catch(() => null);
    const referente = typeof cuerpo?.referente === "string" ? cuerpo.referente : null;
    const utmSource = typeof cuerpo?.utmSource === "string" ? cuerpo.utmSource : null;
    const source = clasificarOrigen(referente, utmSource, req.headers.get("host"));

    await prisma.storeViewSource.upsert({
      where: { storeId_date_source: { storeId: store.id, date, source } },
      update: { count: { increment: 1 } },
      create: { storeId: store.id, date, source, count: 1 },
    });
  } catch {
    // Ver arriba: la visita ya está contada. Esto es información de más.
  }

  return NextResponse.json({ ok: true, contada: true });
}
