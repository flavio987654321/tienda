import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { normalizarCodigoPedido } from "@/lib/codigo-pedido";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`seguimiento:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas consultas. Esperá un momento." }, { status: 429 });
  }

  // Sólo letras y números. Antes se miraba nada más el largo, y eso dejaba
  // pasar los comodines de `LIKE`: Prisma no los escapa en `endsWith`, así que
  // `?codigo=______` armaba `LIKE '%______'` —seis "cualquier carácter"— y
  // devolvía el primer pedido que encontrara la base, de cualquier tienda, con
  // nombre, email, teléfono y dirección de una persona real. Ver `lib/codigo-pedido`.
  const codigo = normalizarCodigoPedido(req.nextUrl.searchParams.get("codigo"));
  if (!codigo) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { id: { endsWith: codigo } },
    // Con un código corto puede haber más de un pedido que termine igual. Sin
    // orden, `take: 1` devolvía uno cualquiera —el que la base tuviera más a
    // mano— así que la misma búsqueda podía dar distinto de una vez a otra.
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      trackingCode: true,
      shippingMethod: true,
      shippingAddress: true,
      total: true,
      subtotal: true,
      discountAmount: true,
      shippingCost: true,
      coupon: { select: { code: true } },
      payment: { select: { provider: true, status: true } },
      store: { select: { name: true, slug: true, logo: true, storeConfig: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          lineTotal: true,
          product: { select: { name: true } },
          variant: { select: { value: true, name: true } },
        },
      },
      statusLogs: {
        orderBy: { changedAt: "asc" },
        select: { toStatus: true, changedAt: true },
      },
    },
    take: 1,
  });

  const order = orders[0];
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let whatsapp: string | null = null;
  try {
    const cfg = JSON.parse(order.store.storeConfig || "{}");
    if (cfg.whatsapp?.enabled && cfg.whatsapp?.number) whatsapp = cfg.whatsapp.number;
  } catch { /* noop */ }

  const { name, slug, logo } = order.store;
  return NextResponse.json({ order: { ...order, store: { name, slug, logo, whatsapp } } });
}
