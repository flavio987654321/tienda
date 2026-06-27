import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lectura pública para el link "?recuperar=<id>" del email de recordatorio —
// nunca devuelve email/teléfono, solo lo necesario para reconstruir el carrito.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cart = await prisma.abandonedCart.findUnique({
    where: { id },
    select: { storeId: true, items: true, total: true },
  });
  if (!cart) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let items: unknown[] = [];
  try {
    items = JSON.parse(cart.items);
  } catch { /* noop */ }

  return NextResponse.json({ storeId: cart.storeId, items, total: cart.total });
}
