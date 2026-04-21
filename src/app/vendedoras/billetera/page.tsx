"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownLeft, Clock, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AffiliateData {
  id: string;
  status: string;
  isActive: boolean;
  store: { name: string; slug: string };
  wallet: {
    id: string;
    balance: number;
    totalEarned: number;
    totalWithdrawn: number;
    withdrawals: { id: string; amount: number; status: string; createdAt: string }[];
  } | null;
  commissions: {
    id: string;
    amount: number;
    rate: number;
    status: string;
    createdAt: string;
    order: { total: number; createdAt: string };
  }[];
}

export default function BilleteraPage() {
  const [data, setData] = useState<{
    affiliates: AffiliateData[];
    totalBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  async function handleWithdraw() {
    if (!withdrawAmount || !selectedWallet) return;
    setWithdrawing(true);
    await fetch("/api/vendedoras/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletId: selectedWallet, amount: withdrawAmount }),
    });
    const res = await fetch("/api/vendedoras/wallet");
    const d = await res.json();
    setData(d);
    setWithdrawing(false);
    setShowWithdraw(false);
    setWithdrawAmount("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/vendedoras" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mi billetera</h1>
        </div>

        {/* Resumen total */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-6"
        >
          <p className="text-indigo-200 text-sm mb-1">Saldo total disponible</p>
          <p className="text-4xl font-extrabold mb-4">
            ${(data?.totalBalance ?? 0).toLocaleString("es-AR")}
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-indigo-200 text-xs">Total ganado</p>
              <p className="font-bold text-lg">${(data?.totalEarned ?? 0).toLocaleString("es-AR")}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">Total retirado</p>
              <p className="font-bold text-lg">${(data?.totalWithdrawn ?? 0).toLocaleString("es-AR")}</p>
            </div>
          </div>
        </motion.div>

        {/* Botón retiro */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={(data?.totalBalance ?? 0) === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 text-sm"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Solicitar retiro
          </button>
        </div>

        {/* Modal retiro */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Solicitar retiro</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Billetera</label>
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccioná una tienda</option>
                    {data?.affiliates.map((a) => (
                      <option key={a.id} value={a.wallet?.id ?? ""}>
                        {a.store.name} — Saldo: ${(a.wallet?.balance ?? 0).toLocaleString("es-AR")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto a retirar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="1"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !selectedWallet || !withdrawAmount}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {withdrawing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {withdrawing ? "Solicitando..." : "Solicitar retiro"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Por tienda */}
        {data?.affiliates.map((affiliate) => (
          <div key={affiliate.id} className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{affiliate.store.name}</h3>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600">
                  ${(affiliate.wallet?.balance ?? 0).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-gray-400">disponible</p>
              </div>
            </div>

            {affiliate.status === "APPROVED" && affiliate.isActive ? (
              <div className="mb-4 rounded-xl bg-indigo-50 p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-1">Tu link de venta</p>
                <Link
                  href={`/tienda/${affiliate.store.slug}?ref=${affiliate.id}`}
                  className="break-all text-xs text-indigo-600 hover:underline"
                >
                  /tienda/{affiliate.store.slug}?ref={affiliate.id}
                </Link>
                <p className="mt-1 text-xs text-indigo-500">
                  Las compras hechas desde este link generan comision para vos cuando la tienda confirma el pago.
                </p>
              </div>
            ) : (
              <div className="mb-4 rounded-xl bg-yellow-50 p-3 text-xs text-yellow-700">
                Tu solicitud todavia no esta aprobada. El link de venta aparece cuando la dueña te da permiso.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">
                  ${(affiliate.wallet?.totalEarned ?? 0).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-gray-400">total ganado</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">
                  ${(affiliate.wallet?.totalWithdrawn ?? 0).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-gray-400">retirado</p>
              </div>
            </div>

            {affiliate.commissions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Últimas comisiones</p>
                <div className="space-y-2">
                  {affiliate.commissions.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {c.status === "PAID" ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm text-gray-700">
                            Venta de ${c.order.total.toLocaleString("es-AR")} — {c.rate}% comisión
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600 text-sm">
                        +${c.amount.toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {data?.affiliates.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Wallet className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">Aún no te uniste a ninguna tienda</p>
            <Link
              href="/vendedoras"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              Ver tiendas disponibles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
