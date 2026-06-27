"use client";

import { useBulkOrders } from "./BulkOrdersContext";

// Solo se ve cuando el modo selección está activo — el resto del tiempo el dueño
// ve la lista de pedidos igual que siempre, sin un checkbox de más en cada card.
export default function OrderCheckbox({ orderId }: { orderId: string }) {
  const { active, selected, toggleOne } = useBulkOrders();
  if (!active) return null;

  const checked = selected.has(orderId);
  return (
    <label className="flex shrink-0 items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleOne(orderId)}
        aria-label="Seleccionar pedido"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}
