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
