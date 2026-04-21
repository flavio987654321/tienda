"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Store, Users, TrendingUp, Wallet, CheckCircle, Loader2, ShoppingBag } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  commissionRate: number;
  primaryColor: string;
  _count: { products: number };
  owner: { name: string | null };
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function VendedorasPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [joined, setJoined] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/vendedoras?mode=tiendas-disponibles")
      .then((r) => r.json())
      .then(({ stores }) => { setStores(stores ?? []); setLoading(false); });
  }, []);

  async function handleJoin(storeId: string) {
    if (!session) { window.location.href = "/login"; return; }
    setJoining(storeId);
    const res = await fetch("/api/vendedoras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    if (res.ok) setJoined((p) => [...p, storeId]);
    setJoining(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
          >
            <TrendingUp className="h-4 w-4" />
            Generá ingresos extra desde casa
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold mb-4"
          >
            Convertite en vendedora
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-indigo-200 text-lg max-w-xl mx-auto mb-8"
          >
            Elegí las tiendas que quieras promover. Cada venta que generés se acumula
            en tu billetera y podés retirar cuando quieras.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 flex-wrap text-sm"
          >
            {[
              { icon: <Store className="h-4 w-4" />, text: "Elegís las tiendas" },
              { icon: <ShoppingBag className="h-4 w-4" />, text: "Compartís tus links" },
              { icon: <Wallet className="h-4 w-4" />, text: "Ganás comisión automática" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                {item.icon}
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="max-w-5xl mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/vendedoras/billetera", label: "Mi billetera", icon: Wallet, desc: "Ver mi saldo y retiros", color: "bg-white" },
            { href: "/vendedoras/mis-tiendas", label: "Mis tiendas", icon: Store, desc: "Tiendas en las que estoy", color: "bg-white" },
            { href: "/dashboard", label: "Dashboard", icon: TrendingUp, desc: "Ver mis ventas y stats", color: "bg-white" },
          ].map(({ href, label, icon: Icon, desc, color }) => (
            <Link key={href} href={href} className={`${color} rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow`}>
              <div className="bg-indigo-50 p-2.5 rounded-lg">
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tiendas disponibles */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tiendas disponibles</h2>
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
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {stores.map((store) => {
              const isJoined = joined.includes(store.id);
              return (
                <motion.div
                  key={store.id}
                  variants={fadeUp}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Banner de color */}
                  <div
                    className="h-20 flex items-center justify-center"
                    style={{ backgroundColor: store.primaryColor }}
                  >
                    <Store className="h-8 w-8 text-white opacity-60" />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{store.name}</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        {store.commissionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">por {store.owner.name ?? "Anónimo"}</p>
                    {store.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{store.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mb-4">
                      {store._count.products} producto{store._count.products !== 1 ? "s" : ""}
                    </p>

                    <div className="flex gap-2">
                      <Link
                        href={`/tienda/${store.slug}`}
                        className="flex-1 text-center text-sm py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                      >
                        Ver tienda
                      </Link>
                      <button
                        onClick={() => handleJoin(store.id)}
                        disabled={joining === store.id || isJoined}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium transition-colors ${
                          isJoined
                            ? "bg-green-100 text-green-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        }`}
                      >
                        {joining === store.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isJoined ? (
                          <><CheckCircle className="h-3.5 w-3.5" /> Unida</>
                        ) : (
                          "Unirme"
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
