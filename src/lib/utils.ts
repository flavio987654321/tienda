export function money(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

export function statusLabel(status: string): string {
  const MAP: Record<string, string> = {
    PENDING:   "Pendiente",
    CONFIRMED: "Confirmado",
    SHIPPED:   "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    REJECTED:  "Rechazado",
    PAID:      "Pagado",
  };
  return MAP[status] ?? status;
}

export function statusColor(status: string): string {
  const MAP: Record<string, string> = {
    PENDING:   "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    SHIPPED:   "bg-indigo-100 text-indigo-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    REJECTED:  "bg-red-100 text-red-700",
    PAID:      "bg-green-100 text-green-700",
  };
  return MAP[status] ?? "bg-gray-100 text-gray-500";
}
