"use client";

import { useEffect, useCallback, useState } from "react";
import { CheckCircle, Loader2, Copy, Wallet } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  affiliateName: string | null;
  affiliateEmail: string;
  storeName: string;
  storeSlug: string;
  cbu: string | null;
  alias: string | null;
  cuil: string | null;
  bankHolder: string | null;
};

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function AdminRetirosPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const fetchWithdrawals = useCallback(() => {
    fetch("/api/admin/retiros")
      .then((r) => r.json())
      .then((d) => setWithdrawals(d.withdrawals ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchWithdrawals();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-retiros-rt")
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "WalletWithdrawal" },
        () => fetchWithdrawals()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchWithdrawals]);

  async function markSent(id: string) {
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/vendedoras/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Transferencia procesada por admin." }),
      });
      if (!res.ok) throw new Error("Error");
      setDone((d) => ({ ...d, [id]: true }));
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Retiros pendientes</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Hacé la transferencia bancaria y luego marcá como enviado. La afiliada recibe una notificación automática.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      )}

      {!loading && withdrawals.length === 0 && (
        <div className="text-center py-16">
          <Wallet className="h-12 w-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No hay retiros pendientes.</p>
        </div>
      )}

      <div className="space-y-4">
        {withdrawals.map((w) => (
          <div key={w.id} className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white font-bold text-lg">{w.affiliateName ?? w.affiliateEmail}</p>
                <p className="text-gray-400 text-sm">{w.affiliateEmail}</p>
                <p className="text-gray-500 text-xs mt-0.5">Tienda: {w.storeName}</p>
                <p className="text-gray-500 text-xs">
                  Solicitado: {new Date(w.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="text-3xl font-black text-amber-400">${w.amount.toLocaleString("es-AR")}</p>
            </div>

            {/* Datos bancarios */}
            <div className="mt-4 bg-gray-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {w.bankHolder && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Titular</p>
                  <p className="text-white font-mono text-sm">{w.bankHolder}</p>
                </div>
              )}
              {w.cuil && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">CUIL</p>
                  <p className="text-white font-mono text-sm">{w.cuil}</p>
                </div>
              )}
              {w.cbu && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-500 mb-0.5">CBU / CVU</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm break-all">{w.cbu}</p>
                    <button
                      onClick={() => copy(w.cbu!)}
                      className="shrink-0 text-gray-500 hover:text-indigo-400 transition-colors"
                      title="Copiar CBU"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {w.alias && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Alias</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm">{w.alias}</p>
                    <button
                      onClick={() => copy(w.alias!)}
                      className="text-gray-500 hover:text-indigo-400 transition-colors"
                      title="Copiar alias"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              {done[w.id] ? (
                <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                  <CheckCircle className="h-4 w-4" /> Marcado como enviado
                </span>
              ) : (
                <button
                  onClick={() => markSent(w.id)}
                  disabled={processing[w.id]}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {processing[w.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Transferí — marcar como enviado
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
