import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { runOrderAction } from "@/lib/orderActions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await context.params;
  // Sin el `catch`, un cuerpo mal formado tiraba un 500 sin manejar en vez del
  // 400 que corresponde.
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Pedido mal formado" }, { status: 400 });
  const { action, trackingCode } = body;

  try {
    const order = await runOrderAction({ orderId: id, ownerId: user.id, action, trackingCode });
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el pedido" },
      { status: 400 }
    );
  }
}
