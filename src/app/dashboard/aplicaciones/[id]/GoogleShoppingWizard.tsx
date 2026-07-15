"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Unlink } from "lucide-react";

// Estado de la app una vez instalada. No hay pasos que completar: el opt-in es
// todo lo que hace falta, porque el feed y la cuenta de Merchant Center son
// centrales de la plataforma.
export default function GoogleShoppingWizard() {
  const router = useRouter();
  const [uninstalling, setUninstalling] = useState(false);
  const [error, setError] = useState(false);

  async function uninstall() {
    setUninstalling(true);
    setError(false);
    const res = await fetch("/api/google/shopping/uninstall", { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
    }
    setUninstalling(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        <h3 className="text-sm font-semibold text-slate-900">Tus productos se están publicando</h3>
      </div>
      <div className="px-5 pb-5 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500 mb-3">
          Google revisa tu catálogo una vez por día. Tus productos pueden tardar hasta 3 días
          en aparecer en las búsquedas la primera vez — después se actualizan solos.
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Cuando alguien te encuentre en Google, entra directo a tu tienda y te compra a vos, como siempre.
          </p>
          <button
            onClick={uninstall}
            disabled={uninstalling}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0 ml-4"
          >
            {uninstalling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Desinstalar
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">No se pudo desinstalar. Intentá de nuevo.</p>}
      </div>
    </div>
  );
}
