// Máquina de estados: qué estado de origen requiere cada acción.
// Única fuente de verdad — la usan tanto el endpoint individual como el de lote,
// y la UI de selección múltiple para saber qué pedidos son elegibles por acción.
export const ORDER_ACTION_TRANSITIONS: Record<string, string[]> = {
  confirmPayment: ["PENDING"],
  markShipped:    ["CONFIRMED"],
  markDelivered:  ["SHIPPED"],
  cancel:         ["PENDING", "CONFIRMED"],
  updateTracking: ["SHIPPED", "DELIVERED"],
};

// Acciones habilitadas para procesamiento en lote — updateTracking queda afuera
// porque requiere un código de seguimiento distinto por pedido, no aplica a varios a la vez.
export const BULK_ORDER_ACTIONS = ["confirmPayment", "markShipped", "markDelivered", "cancel"] as const;
export type BulkOrderAction = (typeof BULK_ORDER_ACTIONS)[number];

export const BULK_ACTION_LABEL: Record<BulkOrderAction, string> = {
  confirmPayment: "Confirmar pago",
  markShipped:    "Marcar enviado",
  markDelivered:  "Marcar entregado",
  cancel:         "Cancelar",
};

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING:   "Pendiente",
    CONFIRMED: "En preparación",
    SHIPPED:   "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
}

export function statusClass(status: string) {
  if (status === "CONFIRMED") return "bg-green-100 text-green-700";
  if (status === "SHIPPED")   return "bg-blue-100 text-blue-700";
  if (status === "DELIVERED") return "bg-gray-900 text-white";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

// Borde lateral de la card de pedido en el dashboard — mismo color que el badge
// de estado, para que cada pedido se distinga del resto de un vistazo.
export function statusBorderClass(status: string) {
  if (status === "CONFIRMED") return "border-l-4 border-l-green-400";
  if (status === "SHIPPED")   return "border-l-4 border-l-blue-400";
  if (status === "DELIVERED") return "border-l-4 border-l-gray-900";
  if (status === "CANCELLED") return "border-l-4 border-l-red-300";
  return "border-l-4 border-l-yellow-400";
}

export function parseAddress(value: string) {
  try {
    return JSON.parse(value) as {
      name?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    };
  } catch {
    return {};
  }
}
