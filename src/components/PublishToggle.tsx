"use client";

import { useState } from "react";
import { Globe, EyeOff, Loader2 } from "lucide-react";

export default function PublishToggle({ initialPublished }: { initialPublished: boolean }) {
  const [published, setPublished] = useState(initialPublished);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !published }),
      });
      if (res.ok) setPublished((p) => !p);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
      published
        ? "border-green-200 bg-green-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      <div className={`rounded-lg p-1.5 ${published ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
        {published ? <Globe className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${published ? "text-green-800" : "text-amber-800"}`}>
          {published ? "Tienda publicada" : "Tienda no publicada"}
        </p>
        <p className={`text-xs ${published ? "text-green-600" : "text-amber-600"}`}>
          {published
            ? "Visible en la página de tiendas"
            : "Solo vos podés ver tu tienda con el link directo"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
          published
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {published ? "Despublicar" : "Publicar"}
      </button>
    </div>
  );
}
