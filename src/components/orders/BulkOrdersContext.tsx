"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ListChecks, X } from "lucide-react";

type OrderMeta = { id: string; status: string };

type BulkOrdersState = {
  active: boolean;
  setActive: (value: boolean) => void;
  orders: OrderMeta[];
  selected: Set<string>;
  toggleOne: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
};

const BulkOrdersCtx = createContext<BulkOrdersState | null>(null);

export function useBulkOrders() {
  const ctx = useContext(BulkOrdersCtx);
  if (!ctx) throw new Error("useBulkOrders debe usarse dentro de BulkOrdersProvider");
  return ctx;
}

// Provider liviano: solo recibe id + status de cada pedido de la página actual
// (no duplica el resto de los datos del pedido, que ya vive en el server component).
export function BulkOrdersProvider({ orders, children }: { orders: OrderMeta[]; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const setActiveMode = useCallback((value: boolean) => {
    setActive(value);
    if (!value) clearSelection();
  }, [clearSelection]);

  const value = useMemo<BulkOrdersState>(
    () => ({ active, setActive: setActiveMode, orders, selected, toggleOne, selectAll, clearSelection }),
    [active, orders, selected, setActiveMode, toggleOne, selectAll, clearSelection]
  );

  return <BulkOrdersCtx.Provider value={value}>{children}</BulkOrdersCtx.Provider>;
}

// Botón de activar/salir del modo selección — se ubica junto al resto de acciones
// del encabezado de la página (ej. al lado de "Exportar CSV").
export function BulkModeToggle() {
  const { active, setActive } = useBulkOrders();
  return (
    <button
      type="button"
      onClick={() => setActive(!active)}
      className={`self-start sm:self-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {active ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
      {active ? "Cancelar selección" : "Seleccionar varios"}
    </button>
  );
}
