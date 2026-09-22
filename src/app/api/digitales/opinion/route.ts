import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { leerTokenDeOpinion } from "@/lib/opinion-firma";
import { validarOpinion } from "@/lib/opiniones-digitales";
import { createNotification } from "@/lib/notifications";
import { despues } from "@/lib/despues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/digitales/opinion — quien compró deja (o cambia) su opinión.
 *
 * Pública: llega desde el link firmado del mail. Lo que la protege es el
 * token (`opinion-firma`): dice qué compra, y sin la firma no vale. Acá
 * además se mira que la compra esté COBRADA, sea de una cuenta digital, y se
 * escribe UNA por compra (`orderId` único: cambiarla vuelve a PENDIENTE).
 * Ver `lib/opiniones-digitales`.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    if (!(await checkRateLimit(`digital-opinion:${ip}`, 10, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un rato." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/opinion");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });
  const { token } = body as { token?: unknown };

  const leido = leerTokenDeOpinion(token);
  if (!leido) return NextResponse.json({ error: "Este link no sirve. Usá el que te llegó por mail." }, { status: 403 });

  const orden = await prisma.order.findFirst({
    where: { id: leido.orderId, status: "CONFIRMED", store: { owner: { role: "DIGITAL" } } },
    select: {
      id: true, storeId: true,
      buyer: { select: { name: true } },
      store: { select: { ownerId: true } },
      items: { select: { product: { select: { id: true, name: true, rolDigital: true } } } },
    },
  });
  const principal = orden?.items.find((i) => i.product.rolDigital === "PRINCIPAL")?.product;
  if (!orden || !principal) return NextResponse.json({ error: "Esta compra no está cobrada o ya no existe." }, { status: 404 });

  const r = validarOpinion(body, orden.buyer.name);
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });

  const previa = await prisma.opinionDigital.findUnique({ where: { orderId: orden.id }, select: { id: true } });
  await prisma.opinionDigital.upsert({
    where: { orderId: orden.id },
    create: { storeId: orden.storeId, productId: principal.id, orderId: orden.id, nombre: r.datos.nombre, texto: r.datos.texto, estado: "PENDIENTE" },
    /* Cambiarla la vuelve a revisión: lo publicado es lo que la vendedora
       leyó, no otra cosa. */
    update: { nombre: r.datos.nombre, texto: r.datos.texto, estado: "PENDIENTE" },
  });

  /* El aviso a quien vende, sin frenar la respuesta. En la campanita, no
     push: no es plata, se lee al entrar. */
  despues(
    () => createNotification({
      userId: orden.store.ownerId,
      type: "DIGITAL_OPINION",
      title: previa ? `Cambiaron una opinión de «${principal.name}»` : `Nueva opinión de «${principal.name}»`,
      body: `${r.datos.nombre}: «${r.datos.texto.slice(0, 90)}${r.datos.texto.length > 90 ? "…" : ""}». Leela y publicala, o dejala guardada.`,
      link: "/digitales/clientes/opiniones",
    }),
    "[digitales] aviso de opinión",
  );

  return NextResponse.json({ ok: true, cambiada: !!previa });
}
