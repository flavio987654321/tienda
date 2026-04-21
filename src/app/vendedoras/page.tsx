"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Loader2, Send, Store, TrendingUp, Users, Wallet, XCircle } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  commissionRate: number;
  primaryColor: string;
  _count: { products: number };
  owner: { name: string | null };
  affiliates: { id: string; status: string; isActive: boolean }[];
}

const statusCopy: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  PENDING: { label: "Solicitud pendiente", className: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Aprobada", className: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rechazada", className: "bg-red-100 text-red-700", icon: XCircle },
  PAUSED: { label: "Pausada", className: "bg-gray-100 text-gray-600", icon: Clock },
};

export default function VendedorasPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    applicationMessage: "",
    experience: "",
    cvUrl: "",
    socialUrl: "",
  });

  useEffect(() => {
    fetch("/api/vendedoras?mode=tiendas-disponibles")
      .then((r) => r.json())
      .then(({ stores }) => {
        setStores(stores ?? []);
        setLoading(false);
      });
  }, []);

  function openApplication(store: StoreItem) {
    if (!session) {
      router.push("/login");
      return;
    }
    setSelectedStore(store);
    setForm({ applicationMessage: "", experience: "", cvUrl: "", socialUrl: "" });
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStore) return;

    setSubmitting(true);
    const res = await fetch("/api/vendedoras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: selectedStore.id, ...form }),
    });

    if (res.ok) {
      const data = await res.json();
      setStores((prev) =>
        prev.map((store) =>
          store.id === selectedStore.id
            ? { ...store, affiliates: [{ id: data.affiliate.id, status: data.affiliate.status, isActive: data.affiliate.isActive }] }
            : store
        )
      );
      setSelectedStore(null);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4" />
            Vende para marcas activas y cobra comisiones
          </div>
          <h1 className="text-4xl font-extrabold mb-4">Postulate como vendedora</h1>
          <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
            Elegi tiendas, manda tu presentacion y espera la aprobacion de la dueña. Cuando te acepten, vas a tener tu link propio y tu porcentaje visible.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/vendedoras/billetera" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700">
              Mi billetera
            </Link>
            <Link href="/registro" className="rounded-xl bg-white/15 px-5 py-3 text-sm font-bold text-white">
              Crear cuenta de vendedora
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Solicitudes con aprobacion", desc: "La dueña revisa tu perfil antes de darte permiso.", icon: Users },
            { label: "Porcentaje visible", desc: "Cada tienda muestra la comision que paga por venta.", icon: TrendingUp },
            { label: "Retiros cuando quieras", desc: "Tus comisiones aprobadas quedan en tu billetera.", icon: Wallet },
          ].map(({ label, desc, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-5">
              <Icon className="h-5 w-5 text-indigo-600 mb-3" />
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tiendas que aceptan vendedoras</h2>
          <span className="text-sm text-gray-400">{stores.length} tienda{stores.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No hay tiendas disponibles por ahora</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => {
              const application = store.affiliates[0];
              const status = application ? statusCopy[application.status] ?? statusCopy.PENDING : null;
              const StatusIcon = status?.icon;

              return (
                <motion.div key={store.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-24 flex items-center justify-center" style={{ backgroundColor: store.primaryColor }}>
                    <Store className="h-8 w-8 text-white opacity-70" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{store.name}</h3>
                        <p className="text-xs text-gray-400">por {store.owner.name ?? "Anonimo"}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                        {store.commissionRate}%
                      </span>
                    </div>
                    {store.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{store.description}</p>}
                    <p className="text-xs text-gray-400 mb-4">{store._count.products} productos disponibles</p>

                    {status && StatusIcon ? (
                      <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Link href={`/tienda/${store.slug}`} className="flex-1 text-center text-sm py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                        Ver tienda
                      </Link>
                      {application?.status === "APPROVED" ? (
                        <Link href="/vendedoras/billetera" className="flex-1 text-center text-sm py-2 rounded-lg bg-green-600 text-white font-medium">
                          Ver link
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openApplication(store)}
                          disabled={Boolean(application)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Postularme
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setSelectedStore(null)} className="absolute inset-0 bg-black/40" />
          <form onSubmit={submitApplication} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Solicitud de vendedora</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedStore.name}</h3>
              <p className="text-sm text-gray-400">Comision ofrecida: {selectedStore.commissionRate}%</p>
            </div>
            <textarea
              required
              value={form.applicationMessage}
              onChange={(e) => setForm((p) => ({ ...p, applicationMessage: e.target.value }))}
              rows={4}
              placeholder="Contale a la dueña por qué querés vender esta tienda..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={form.experience}
              onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
              rows={3}
              placeholder="Experiencia vendiendo, redes, zona, disponibilidad..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={form.socialUrl}
              onChange={(e) => setForm((p) => ({ ...p, socialUrl: e.target.value }))}
              placeholder="Instagram, TikTok o portfolio"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={form.cvUrl}
              onChange={(e) => setForm((p) => ({ ...p, cvUrl: e.target.value }))}
              placeholder="Link a CV o presentacion (opcional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedStore(null)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Enviar solicitud"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
