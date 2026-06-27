import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { runOrderAction } from "@/lib/orderActions";
import { BULK_ORDER_ACTIONS, type BulkOrderAction } from "@/lib/orders";

const MAX_BULK_ORDERS = 50;

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { orderIds, action, trackingCode } = await req.json();

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: "Seleccioná al menos un pedido" }, { status: 400 });
  }
  if (orderIds.length > MAX_BULK_ORDERS) {
    return NextResponse.json({ error: `No se pueden procesar más de ${MAX_BULK_ORDERS} pedidos a la vez` }, { status: 400 });
  }
  if (!BULK_ORDER_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Acción no válida para procesamiento en lote" }, { status: 400 });
  }

  // Secuencial (no Promise.all): cada pedido corre su propia transacción con efectos
  // sobre stock, comisiones y emails — procesarlos de a uno aísla los errores sin
  // arriesgar carreras entre transacciones del mismo pedido o la misma tienda.
  const results: { orderId: string; ok: boolean; error?: string }[] = [];
  for (const orderId of orderIds as string[]) {
    try {
      await runOrderAction({ orderId, ownerId: user.id, action: action as BulkOrderAction, trackingCode });
      results.push({ orderId, ok: true });
    } catch (error) {
      results.push({ orderId, ok: false, error: error instanceof Error ? error.message : "Error desconocido" });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({ succeeded, failed: results.length - succeeded, results });
}
