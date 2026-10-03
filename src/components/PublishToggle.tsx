"use client";

import { useState } from "react";
import { Globe, EyeOff, Loader2, AlertTriangle } from "lucide-react";

export default function PublishToggle({
  initialPublished,
  hasProducts,
  hasPayment,
  hasTemplate,
}: {
  initialPublished: boolean;
  hasProducts: boolean;
  hasPayment: boolean;
  hasTemplate: boolean;
}) {
  const [published, setPublished] = useState(initialPublished);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = [
    !hasTemplate && "elegir el diseño de tu tienda",
    !hasProducts && "agregar al menos un producto",
    !hasPayment && "configurar un método de cobro (MercadoPago, transferencia o efectivo)",
  ].filter(Boolean) as string[];
  const canPublish = missing.length === 0;

  async function toggle() {
    if (loading) return;
    if (!published && !canPublish) {
      setError(`Para publicar tu tienda primero tenés que ${missing.join(" y ")}.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !published }),
      });
      if (res.ok) {
        setPublished((p) => !p);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo actualizar la publicación");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all disabled:opacity-70 ${
          published
            ? "border-emerald-200 panel-oscuro:border-emerald-500/30 bg-emerald-50 panel-oscuro:bg-emerald-500/10 hover:bg-emerald-100/70 panel-oscuro:hover:bg-emerald-500/15"
            : "border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-800/50 hover:bg-gray-100/70 panel-oscuro:hover:bg-gray-800"
        }`}
      >
        {/* Icon */}
        <div className={`rounded-lg p-1.5 shrink-0 ${published ? "bg-emerald-100 panel-oscuro:bg-emerald-500/15 text-emerald-600 panel-oscuro:text-emerald-400" : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-400 panel-oscuro:text-gray-500"}`}>
          {published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${published ? "text-emerald-800 panel-oscuro:text-emerald-300" : "text-gray-700 panel-oscuro:text-gray-300"}`}>
            {published ? "Tienda publicada" : "Tienda no publicada"}
          </p>
          <p className={`text-xs mt-0.5 ${published ? "text-emerald-600 panel-oscuro:text-emerald-400" : "text-gray-500 panel-oscuro:text-gray-400"}`}>
            {published
              ? "Visible en la página de tiendas · tocá para despublicar"
              : canPublish
                ? "Solo vos la ves · tocá para publicarla"
                : "Te falta completar algunos pasos antes de publicar"}
          </p>
        </div>

        {/* Toggle switch */}
        <div className="shrink-0">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 panel-oscuro:text-gray-500" />
          ) : (
            <div
              role="switch"
              aria-checked={published}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                published ? "bg-emerald-500" : "bg-gray-300 panel-oscuro:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  published ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
          )}
        </div>
      </button>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 panel-oscuro:text-amber-300 bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/30 rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
