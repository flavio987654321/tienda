import type { StorefrontProduct } from "@/hooks/useStorefront";

/** Respeta la elección guardada; si ya no sirve, elige el mejor vehículo libre. */
export function elegirFoco(productos: StorefrontProduct[], seleccionado?: string): StorefrontProduct | null {
  const disponibles = productos.filter(p => p.vehicleStatus !== "RESERVED" && p.vehicleStatus !== "SOLD");
  if (seleccionado) {
    const elegido = disponibles.find(p => p.id === seleccionado);
    if (elegido) return elegido;
  }
  return disponibles.find(p => /destacad/i.test(p.badge ?? ""))
    ?? disponibles.find(p => p.badge)
    ?? disponibles[0]
    ?? null;
}
