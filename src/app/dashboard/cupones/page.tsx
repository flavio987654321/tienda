"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check, Download, Eye } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

function discountLabel(c: Coupon) {
  return c.discountType === "percentage" ? `${c.discountValue}% off` : `$${c.discountValue.toLocaleString("es-AR")} off`;
}

export default function CuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cupones")
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons || []))
      .finally(() => setLoading(false));
  }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/cupones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error al crear el cupón"); return; }
    setCoupons((prev) => [data.coupon, ...prev]);
    setShowForm(false);
    setForm({ code: "", discountType: "percentage", discountValue: "", minOrderAmount: "", maxUses: "", expiresAt: "" });
  }

  async function toggleCoupon(id: string, isActive: boolean) {
    const res = await fetch(`/api/cupones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      setCoupons((prev) => prev.map((c) => (c.id === id ? data.coupon : c)));
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm("¿Eliminar este cupón?")) return;
    const res = await fetch(`/api/cupones/${id}`, { method: "DELETE" });
    if (res.ok) setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cupones de descuento</h1>
            <p className="mt-1 text-sm text-gray-500">Creá códigos que tus clientes ingresan al comprar</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo cupón
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <form onSubmit={createCoupon} className="mb-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">Crear cupón</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Código</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="VERANO20"
                  required
                  maxLength={20}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Tipo de descuento</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  {form.discountType === "percentage" ? "Porcentaje (ej: 20)" : "Monto (ej: 5000)"}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === "percentage" ? "20" : "5000"}
                  required
                  min={1}
                  max={form.discountType === "percentage" ? 100 : undefined}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Compra mínima ($)</label>
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="0"
                  min={0}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Usos máximos (vacío = ilimitado)</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Sin límite"
                  min={1}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Fecha de vencimiento (opcional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Crear cupón"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <Tag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-500">No tenés cupones creados</p>
            <p className="mt-1 text-sm text-gray-400">Creá uno para ofrecer descuentos a tus clientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
              return (
                <div key={c.id} className={`rounded-2xl border bg-white p-4 ${!c.isActive || expired || exhausted ? "opacity-60" : "border-gray-100"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-black tracking-widest text-indigo-700">
                          {c.code}
                        </code>
                        <button onClick={() => copyCode(c.code, c.id)}
                          className="text-gray-400 hover:text-gray-600">
                          {copiedId === c.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          {discountLabel(c)}
                        </span>
                        {!c.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactivo</span>}
                        {expired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Vencido</span>}
                        {exhausted && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">Agotado</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        {c.minOrderAmount > 0 && <span>Mínimo ${c.minOrderAmount.toLocaleString("es-AR")}</span>}
                        <span>{c.usedCount} uso{c.usedCount !== 1 ? "s" : ""}{c.maxUses ? ` / ${c.maxUses}` : ""}</span>
                        {c.expiresAt && <span>Vence {new Date(c.expiresAt).toLocaleDateString("es-AR")}</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`/api/cupones/${c.id}/imagen`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver imagen
                        </a>
                        <a
                          href={`/api/cupones/${c.id}/imagen?download=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleCoupon(c.id, c.isActive)} title={c.isActive ? "Desactivar" : "Activar"}>
                        {c.isActive
                          ? <ToggleRight className="h-6 w-6 text-indigo-500" />
                          : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                      </button>
                      <button onClick={() => deleteCoupon(c.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
