import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createNotification } from "@/lib/notifications";

type TrackItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

type TrackBody = {
  storeId: string;
  email: string;
  name?: string;
  phone?: string;
  items: TrackItem[];
  total: number;
};

// Snapshot de un carrito con email capturado durante el checkout que todavía
// no se completó en una compra — usado luego para el recordatorio de
// recuperación. No bloquea ni devuelve datos sensibles: el storefront lo
// llama en fire-and-forget y no necesita leer la respuesta.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`cart-track:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = (await req.json()) as TrackBody;
  const storeId = String(body.storeId ?? "");
  const email = String(body.email ?? "").toLowerCase().trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!storeId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || items.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true, ownerId: true } });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });

  const data = {
    customerName: body.name?.trim() || null,
    customerPhone: body.phone?.trim() || null,
    items: JSON.stringify(items),
    total: Number(body.total) || 0,
    lastActivityAt: new Date(),
    reminderSentAt: null,
    recoveredAt: null,
  };

  // Se pregunta si ya existía ANTES del upsert, porque después no hay forma de
  // saber si creó o actualizó. Es el dato que decide si se avisa: mientras la
  // persona sigue en el checkout, cada vez que toca algo se vuelve a llamar acá
  // y el carrito se actualiza. Avisando en cada actualización, un solo visitante
  // indeciso llenaría la campanita de avisos del mismo carrito.
  const yaExistia = await prisma.abandonedCart.findUnique({
    where: { storeId_customerEmail: { storeId, customerEmail: email } },
    select: { id: true },
  });

  await prisma.abandonedCart.upsert({
    where: { storeId_customerEmail: { storeId, customerEmail: email } },
    create: { storeId, customerEmail: email, ...data },
    update: data,
  });

  // El puntito del menú solo se recalcula al navegar entre pantallas del panel,
  // así que si la dueña está parada en una no se entera de nada hasta que se
  // mueve. La campanita sí avisa. Y era una inconsistencia: llegaba aviso por una
  // reseña y no por alguien que dejó su email con el carrito lleno, que vale
  // bastante más.
  //
  // Con `await`, no fire-and-forget. Es la misma lección que ya está escrita en
  // `api/gamification/spin`: en serverless la función se puede congelar apenas
  // devuelve la respuesta, y una promesa que quedó pendiente no se resuelve — el
  // aviso se pierde, o aparece mucho después cuando el contenedor se reutiliza.
  // Justamente el síntoma que se vio probando esto: el aviso del carrito tardó
  // en llegar sin que nadie tocara nada.
  //
  // Lo que cuesta es un insert, y el visitante ya está esperando el upsert de
  // arriba. Cambiar un aviso confiable por unos milisegundos es un mal negocio,
  // sobre todo cuando el aviso es la única forma en que la dueña se entera.
  if (!yaExistia) {
    const quien = data.customerName || email;
    const cuanto = Math.round(data.total).toLocaleString("es-AR");
    await createNotification({
      userId: store.ownerId,
      type: "ABANDONED_CART",
      title: "Carrito abandonado",
      body: `${quien} dejó su contacto con $${cuanto} en el carrito y no terminó la compra.`,
      link: "/dashboard/carritos-abandonados",
    });
  }

  return NextResponse.json({ ok: true });
}
