"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ShoppingBag, Package, CheckCircle,
  Clock, XCircle, Truck, ChevronLeft, ChevronRight, Filter,
  TrendingUp, DollarSign,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; image: string | null };
  variant: { name: string; value: string } | null;
}

interface OrderCommission {
  id: string;
  amount: number;
  rate: number;
  status: string;
}

interface ReferredOrder {
  id: string;
  status: string;
  statusLabel: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  createdAt: string;
  store: { id: string; name: string; slug: string };
  commission: OrderCommission | null;
  items: OrderItem[];
}

interface PageData {
  orders: ReferredOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface StoreOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING:    { label: "Pendiente",   icon: <Clock className="h-3.5 w-3.5" />,       color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  CONFIRMED:  { label: "Confirmado",  icon: <CheckCircle className="h-3.5 w-3.5" />,  color: "text-blue-600 bg-blue-50 border-blue-200" },
  PROCESSING: { label: "Procesando",  icon: <Package className="h-3.5 w-3.5" />,      color: "text-purple-600 bg-purple-50 border-purple-200" },
  SHIPPED:    { label: "Enviado",     icon: <Truck className="h-3.5 w-3.5" />,        color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  DELIVERED:  { label: "Entregado",   icon: <CheckCircle className="h-3.5 w-3.5" />,  color: "text-green-600 bg-green-50 border-green-200" },
  CANCELLED:  { label: "Cancelado",   icon: <XCircle className="h-3.5 w-3.5" />,      color: "text-red-600 bg-red-50 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: null, color: "text-gray-600 bg-gray-50 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function CommissionBadge({ commission }: { commission: OrderCommission | null }) {
  if (!commission) return <span className="text-xs text-gray-400">Sin comisión</span>;
  const isPaid = commission.status === "PAID";
  return (
    <div className="text-right">
      <p className={`font-bold text-sm ${isPaid ? "text-green-600" : "text-yellow-600"}`}>
        +${commission.amount.toLocaleString("es-AR")}
      </p>
      <p className="text-xs text-gray-400">{commission.rate}% comisión {isPaid ? "· acreditada" : "· pendiente"}</p>
    </div>
  );
}

export default function PedidosPage() {
  const { status: sessionStatus } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [storeFilter, setStoreFilter] = useState("");

  const loadData = useCallback((p: number, sid: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (sid) params.set("storeId", sid);
    fetch(`/api/vendedoras/pedidos?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        const uniqueStores: StoreOption[] = (d.affiliates ?? []).map((a: any) => ({
          id: a.store?.id ?? "",
          name: a.store?.name ?? "",
        }));
        setStores(uniqueStores);
      });
    loadData(1, "");
  }, [sessionStatus, loadData]);

  function handlePageChange(p: number) {
    setPage(p);
    loadData(p, storeFilter);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStoreFilter(sid: string) {
    setStoreFilter(sid);
    setPage(1);
    loadData(1, sid);
  }

  const totalCommission = data?.orders.reduce((s, o) => s + (o.commission?.amount ?? 0), 0) ?? 0;
  const confirmedCount = data?.orders.filter((o) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(o.status)).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/vendedoras/billetera" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis pedidos referidos</h1>
            {data && <p className="text-sm text-gray-500 mt-0.5">{data.total} pedidos en total</p>}
          </div>
        </div>

        {/* Resumen */}
        {data && data.total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-white/10 p-4 text-center">
              <div className="flex justify-center mb-1"><ShoppingBag className="h-4 w-4 text-indigo-400" /></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{data.total}</p>
              <p className="text-xs text-gray-400">total pedidos</p>
            </div>
            <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-white/10 p-4 text-center">
              <div className="flex justify-center mb-1"><CheckCircle className="h-4 w-4 text-green-400" /></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{confirmedCount}</p>
              <p className="text-xs text-gray-400">confirmados</p>
            </div>
            <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-white/10 p-4 text-center">
              <div className="flex justify-center mb-1"><TrendingUp className="h-4 w-4 text-yellow-400" /></div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${totalCommission.toLocaleString("es-AR")}</p>
              <p className="text-xs text-gray-400">comisiones</p>
            </div>
          </div>
        )}

        {/* Filtro por tienda */}
        {stores.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleStoreFilter("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!storeFilter ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}
              >
                Todas
              </button>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStoreFilter(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${storeFilter === s.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : !data || data.orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aún no tenés pedidos referidos</p>
            <p className="text-gray-400 text-sm mt-1">Compartí tu link de venta para empezar a generar ventas.</p>
            <Link href="/vendedoras"
              className="inline-flex items-center gap-2 mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
              Ver mis tiendas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm"
              >
                {/* Cabecera del pedido */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{order.store.name}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("es-AR", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                  <CommissionBadge commission={order.commission} />
                </div>

                {/* Productos */}
                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product.image ? (
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                          <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-400">{item.variant.name}: {item.variant.value}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {item.quantity > 1 ? `${item.quantity} × ` : ""}${item.price.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    Total del pedido
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    ${order.total.toLocaleString("es-AR")}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Paginación */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                  Página {data.page} de {data.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === data.totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
