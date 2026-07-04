import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const minAge = new Date(now.getTime() - 1 * 60 * 60 * 1000); // al menos 1h inactivo
  const maxAge = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // no molestar con carritos de +7 días

  const carts = await prisma.abandonedCart.findMany({
    where: {
      recoveredAt: null,
      reminderSentAt: null,
      lastActivityAt: { lte: minAge, gte: maxAge },
    },
    include: { store: { select: { name: true, slug: true } } },
  });

  let sent = 0;
  for (const cart of carts) {
    let items: SnapshotItem[] = [];
    try {
      items = JSON.parse(cart.items);
    } catch { /* noop */ }

    if (items.length > 0) {
      sendAbandonedCartEmail({
        to: cart.customerEmail,
        customerName: cart.customerName,
        storeName: cart.store.name,
        items,
        total: cart.total,
        recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
      }).catch((e) => console.error("[abandonedCart] email:", e));
      sent++;
    }

    // Se marca enviado aunque el email falle: evita reintentos infinitos.
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: now },
    });
  }

  return NextResponse.json({ found: carts.length, sent, ranAt: now.toISOString() });
}
