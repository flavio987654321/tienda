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

  // Los mails se juntan y se esperan al final, en vez de dispararse sueltos
  // adentro del `for`.
  //
  // Sueltos había dos problemas. Uno: nada los esperaba, así que al volver el
  // handler la plataforma podía congelar la función con los envíos a medio
  // hacer — el mail no salía y no quedaba rastro. Dos: `sent` se incrementaba
  // al TIRAR el mail, no al mandarlo, así que el cron podía informar "mandé 12"
  // habiendo mandado cero. Un cron que miente sobre lo que hizo es peor que uno
  // que falla, porque nadie va a ir a buscar el problema.
  //
  // Juntarlos y esperarlos con `allSettled` arregla los dos y no los serializa:
  // siguen saliendo todos a la vez.
  const envios: Promise<boolean>[] = [];
  for (const cart of carts) {
    let items: SnapshotItem[] = [];
    try {
      items = JSON.parse(cart.items);
    } catch { /* noop */ }

    if (items.length > 0) {
      envios.push(
        sendAbandonedCartEmail({
          to: cart.customerEmail,
          customerName: cart.customerName,
          storeName: cart.store.name,
          items,
          total: cart.total,
          recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
        }).then(() => true).catch((e) => {
          console.error("[abandonedCart] email:", e);
          return false;
        })
      );
    }

    // Se marca enviado aunque el email falle: evita reintentos infinitos.
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: now },
    });
  }

  const sent = (await Promise.all(envios)).filter(Boolean).length;

  return NextResponse.json({
    found: carts.length,
    intentados: envios.length,
    sent,
    ranAt: now.toISOString(),
  });
}
