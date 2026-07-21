import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * El puntito de "Carritos abandonados" del sidebar.
 *
 * GET  → cuántos carritos tuvieron actividad desde la última vez que el dueño
 *        abrió la página.
 * POST → marca la página como vista (apaga el puntito).
 *
 * Cuenta actividad nueva y no pendientes a propósito: un carrito abandonado no
 * tiene forma de "resolverse" desde el panel —`recoveredAt` se llena solo si la
 * persona vuelve por su cuenta y compra— así que un contador de pendientes
 * quedaría prendido para siempre.
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, abandonedCartsSeenAt: true },
  });
  if (!store) return NextResponse.json({ count: 0 });

  const count = await prisma.abandonedCart.count({
    where: {
      storeId: store.id,
      recoveredAt: null,
      // Sin fecha guardada nunca abrió la página: todo lo que haya es nuevo.
      ...(store.abandonedCartsSeenAt ? { lastActivityAt: { gt: store.abandonedCartsSeenAt } } : {}),
    },
  });

  return NextResponse.json({ count });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // updateMany y no update: si la cuenta todavía no tiene tienda, no hay nada
  // que marcar y tampoco es un error — devuelve 0 filas y sigue.
  await prisma.store.updateMany({
    where: { ownerId: user.id },
    data: { abandonedCartsSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
