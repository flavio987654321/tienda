"use client";

import { useState } from "react";
import { X, Check, Loader2, AlertTriangle } from "lucide-react";

export type VehicleStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface VehicleStatusData {
  vehicleStatus: VehicleStatus;
  soldPrice?: number | null;
  soldBuyerName?: string | null;
  soldBuyerPhone?: string | null;
  soldNotes?: string | null;
  soldAt?: string | null;
  isActive?: boolean;
}

interface Props {
  productId: string;
  productName: string;
  currentStatus: VehicleStatus;
  onSave: (data: VehicleStatusData) => void;
  onClose: () => void;
}

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  AVAILABLE: { label: "Disponible",  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  RESERVED:  { label: "Reservado",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-500"   },
  SOLD:      { label: "Vendido",     color: "text-gray-500",    bg: "bg-gray-100",   border: "border-gray-200",    dot: "bg-gray-400"    },
};

export function VehicleStatusBadge({ status, animate = false }: { status: VehicleStatus; animate?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.AVAILABLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border} ${animate ? "animate-pop-in" : ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === "AVAILABLE" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

export default function VehicleStatusModal({ productId, productName, currentStatus, onSave, onClose }: Props) {
  const [selected, setSelected]   = useState<VehicleStatus>(currentStatus);
  const [soldPrice, setSoldPrice] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [saved, setSaved]         = useState(false);

  const isSold = selected === "SOLD";

  async function handleSave() {
    if (saving || saved) return;
    if (isSold && !buyerName.trim()) {
      setError("Ingresá el nombre del comprador");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch(`/api/productos/${productId}/vehicle-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleStatus: selected,
        soldPrice:      isSold && soldPrice ? parseFloat(soldPrice) : null,
        soldBuyerName:  isSold ? buyerName.trim() : null,
        soldBuyerPhone: isSold ? buyerPhone.trim() : null,
        soldNotes:      isSold ? notes.trim() : null,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      return;
    }

    setSaved(true);
    onSave(data.product);
    await new Promise(r => setTimeout(r, 600));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-slide"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Estado del vehículo</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{productName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Estado selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["AVAILABLE", "RESERVED", "SOLD"] as VehicleStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const active = selected === s;
              return (
                <button
                  key={s}
                  onClick={() => { setSelected(s); setError(""); }}
                  className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? `${cfg.bg} ${cfg.border} ${cfg.color} scale-[1.03] shadow-sm`
                      : "border-gray-100 text-gray-400 hover:border-gray-200 hover:scale-[1.01]"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${active ? cfg.dot : "bg-gray-200"} ${active && s === "AVAILABLE" ? "animate-pulse" : ""}`} />
                  {cfg.label}
                  {active && (
                    <span className="absolute top-2 right-2 animate-pop-in">
                      <Check className={`h-3 w-3 ${cfg.color}`} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Campos solo para SOLD */}
          {isSold && (
            <div className="space-y-3 animate-fade-slide border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos de la venta</p>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Comprador <span className="text-red-400">*</span></label>
                <input
                  value={buyerName}
                  onChange={e => { setBuyerName(e.target.value); setError(""); }}
                  placeholder="Nombre y apellido"
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono del comprador</label>
                <input
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  type="tel"
                  maxLength={30}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Precio de venta ($)</label>
                <input
                  value={soldPrice}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9.]/g, "");
                    setSoldPrice(v);
                  }}
                  placeholder="Ej: 12500000"
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas internas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Señado el 10/6, financiado por banco..."
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                saved
                  ? "bg-emerald-500 scale-[1.02]"
                  : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              }`}
            >
              {saved    ? <><Check className="h-4 w-4" /> Guardado</> :
               saving   ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> :
               "Guardar estado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
