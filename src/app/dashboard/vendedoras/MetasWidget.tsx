"use client";

import { useCallback, useEffect, useState } from "react";
import { Target, Loader2, Check, X, Trash2 } from "lucide-react";

interface GoalData {
  id: string;
  targetAmount: number;
  month: string;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string) {
  const [year, month] = m.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export default function MetasWidget() {
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const month = currentMonth();

  const loadGoal = useCallback(() => {
    fetch(`/api/vendedoras/metas?owner=1&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setGoal(d.goal ?? null); setLoading(false); });
  }, [month]);

  useEffect(() => { loadGoal(); }, [loadGoal]);

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/vendedoras/metas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, targetAmount }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
    setGoal(data.goal);
    setEditing(false);
  }

  async function handleDelete() {
    if (deleting) return;
    if (!confirm("¿Eliminar la meta de este mes?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/vendedoras/metas?month=${month}`, { method: "DELETE" });
      setGoal(null);
    } finally {
      setDeleting(false);
    }
  }

  function startEdit() {
    setTargetAmount(goal ? String(goal.targetAmount) : "");
    setError("");
    setEditing(true);
  }

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
      {/* En angosto el titulo se lleva su propio renglon y los botones van abajo.
          Compartiendo renglón, "Meta de ventas — agosto de 2026" se partía en dos
          y encima a "Crear meta" le quedaba una columna tan finita que también se
          partía, en "Crear / meta". */}
      <div className="flex flex-col items-start gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">Meta de ventas — {monthLabel(month)}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {goal && !editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <button onClick={editing ? () => setEditing(false) : startEdit}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            {editing ? "Cancelar" : (goal ? "Editar" : "Crear meta")}
          </button>
        </div>
      </div>

      {!editing && !goal && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">No hay meta para este mes.</p>
          <p className="text-xs text-gray-300 mt-1">
            Fijá un objetivo de comisiones del mes. Tus afiliados lo ven en su panel con
            cuánto llevan.
          </p>
        </div>
      )}

      {!editing && goal && (
        <div className="space-y-3">
          {/* Acá había un segundo número, "Bonus por cumplir: +X%", y abajo la
              frase "los afiliados que superen este monto reciben un X% extra".
              Nadie paga ese extra: `bonusRate` no lo lee ningún proceso que
              acredite plata. Se sacó porque prometer plata que no se acredita
              es lo peor que puede hacer esta pantalla, y encima contra los
              propios términos, que prohíben arreglar compensaciones por fuera.
              Para que exista de verdad primero hay que resolver de dónde sale:
              la comisión normal se retiene de la venta, y un premio de fin de
              mes no tiene venta de la cual retenerse. */}
          <div className="p-3 bg-indigo-50 rounded-xl">
            <p className="text-xs text-indigo-600 font-medium">Objetivo del mes</p>
            <p className="text-xl font-bold text-indigo-700">${goal.targetAmount.toLocaleString("es-AR")}</p>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Cada afiliado ve este objetivo en su panel, con cuánto lleva generado en el mes.
          </p>
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          {/* Queda un solo campo: se fue el de "Bonus si cumplen (%)". Pedirle
              al dueño que escriba un porcentaje que después nadie liquida es
              hacerle creer que se comprometió a algo que la plataforma no va a
              ejecutar. */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo de comisiones del mes ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Guardando..." : "Guardar meta"}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
