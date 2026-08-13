"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, MousePointerClick, ShoppingBag,
  TrendingUp, BarChart3, Package, Star, Zap,
  TrendingDown, DollarSign, Receipt, CalendarDays, Store,
  Clock, Wallet, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

interface TopProduct {
  product: { id: string; name: string; images: string; price: number } | null;
  orderCount: number;
  totalRevenue: number;
}

interface ClickDay {
  date: string;
  clicks: number;
}

interface ChannelStat {
  channel: string;
  clicks: number;
}

interface AffiliateStats {
  affiliateId: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  totalClicks: number;
  totalOrders: number;
  totalCommissionsAmount: number;
  commissionsPending: number;
  commissionsToCollect: number;
  commissionsDisbursed: number;
  commissionsThisMonth: number;
  revenueGenerated: number;
  avgTicket: number;
  clicksLast30: number;
  clicksThisWeek: number;
  weekTrend: number;
  ordersLast30: number;
  conversionRate: number;
  clicksTimeline: ClickDay[];
  channelBreakdown: ChannelStat[];
  topProducts: TopProduct[];
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  x: "X (Twitter)",
  directo: "Link directo / otros",
};

function channelLabel(channel: string) {
  return CHANNEL_LABELS[channel.toLowerCase()] ?? channel;
}

function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : arr[0]?.url ?? null;
  } catch { return null; }
}

function fmt(n: number) {
  return n.toLocaleString("es-AR");
}

function MiniBarChart({ data }: { data: ClickDay[] }) {
  const max = Math.max(...data.map((d) => d.clicks), 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-sm transition-all group-hover:bg-indigo-600"
            style={{ height: `${Math.max((d.clicks / max) * 100, 4)}%` }}
          />
          <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
            {d.clicks} clicks · {new Date(d.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, trend, trendLabel }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; trend?: number; trendLabel?: string;
}) {
  const showTrend = trend !== undefined && trend !== 0;
  const isUp = (trend ?? 0) > 0;
  return (
    <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-white/10 p-4">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {showTrend && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? "+" : ""}{trend}% {trendLabel}
        </div>
      )}
    </div>
  );
}

export default function EstadisticasPage() {
  const { status: sessionStatus } = useAuth();
  const [stats, setStats] = useState<AffiliateStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? []);
        setSelected(d.stats?.[0]?.affiliateId ?? "");
        setLoading(false);
      });
  }, [sessionStatus]);

  const current = stats.find((s) => s.affiliateId === selected) ?? stats[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/afiliados" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis estadísticas</h1>
            <p className="text-sm text-gray-500">Rendimiento de tus ventas como afiliado</p>
          </div>
        </div>

        {stats.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <BarChart3 className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aún no hay estadísticas</p>
            <p className="text-gray-400 text-sm mt-1">Unite a una tienda para empezar a generar datos.</p>
          </div>
        ) : (
          <>
            {/* Selector de tienda */}
            {stats.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {stats.map((s) => (
                  <button key={s.affiliateId} onClick={() => setSelected(s.affiliateId)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selected === s.affiliateId ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"}`}>
                    {s.storeName}
                  </button>
                ))}
              </div>
            )}

            {current && (
              <motion.div key={current.affiliateId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MousePointerClick className="h-4 w-4 text-indigo-600" />}
                    label="Clicks totales"
                    value={fmt(current.totalClicks)}
                    sub={`${fmt(current.clicksLast30)} en los últimos 30 días`}
                    color="bg-indigo-50 dark:bg-indigo-900/30"
                  />
                  <StatCard
                    icon={<ShoppingBag className="h-4 w-4 text-green-600" />}
                    label="Ventas generadas"
                    value={fmt(current.totalOrders)}
                    sub={`${fmt(current.ordersLast30)} en los últimos 30 días`}
                    color="bg-green-50 dark:bg-green-900/30"
                  />
                  <StatCard
                    icon={<Zap className="h-4 w-4 text-amber-600" />}
                    label="Tasa de conversión"
                    value={`${current.conversionRate}%`}
                    sub="Clicks que se convierten en ventas"
                    color="bg-amber-50 dark:bg-amber-900/30"
                  />
                  <StatCard
                    icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                    label="Clicks esta semana"
                    value={fmt(current.clicksThisWeek)}
                    sub="Últimos 7 días"
                    color="bg-emerald-50 dark:bg-emerald-900/30"
                    trend={current.weekTrend}
                    trendLabel="vs semana anterior"
                  />
                  <StatCard
                    icon={<CalendarDays className="h-4 w-4 text-purple-600" />}
                    label="Comisiones este mes"
                    value={`$${fmt(current.commissionsThisMonth)}`}
                    sub="Lo que ganaste en el mes actual"
                    color="bg-purple-50 dark:bg-purple-900/30"
                  />
                  <StatCard
                    icon={<Store className="h-4 w-4 text-sky-600" />}
                    label="Volumen generado"
                    value={current.revenueGenerated > 0 ? `$${fmt(current.revenueGenerated)}` : "—"}
                    sub="Total facturado gracias a vos"
                    color="bg-sky-50 dark:bg-sky-900/30"
                  />
                </div>

                {/* Desglose de comisiones */}
                <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Tus comisiones</p>
                      <p className="text-xs text-gray-400 mt-0.5">Total histórico y estado de cada parte</p>
                    </div>
                    <DollarSign className="h-4 w-4 text-gray-300" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    ${fmt(current.totalCommissionsAmount)}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pendientes de confirmación</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        ${fmt(current.commissionsPending)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">En comisiones (a retirar)</span>
                      </div>
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        ${fmt(current.commissionsToCollect)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Enviadas a tu Mercado Pago</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        ${fmt(current.commissionsDisbursed)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-500">Ticket promedio por venta</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {current.avgTicket > 0 ? `$${fmt(current.avgTicket)}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfico de clicks últimos 14 días */}
                <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Clicks últimos 14 días</p>
                      <p className="text-xs text-gray-400 mt-0.5">Visitas a tu link de afiliado</p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-gray-300" />
                  </div>
                  <MiniBarChart data={current.clicksTimeline} />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {new Date(current.clicksTimeline[0]?.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-xs text-gray-400">Hoy</span>
                  </div>
                </div>

                {/* Desglose por canal */}
                {current.channelBreakdown.length > 0 && (
                  <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-indigo-400" />
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Clicks por canal</p>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const maxClicks = Math.max(...current.channelBreakdown.map((c) => c.clicks), 1);
                        return current.channelBreakdown.map((c) => (
                          <div key={c.channel}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{channelLabel(c.channel)}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.clicks}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.max((c.clicks / maxClicks) * 100, 4)}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Últimos 30 días. &quot;Link directo&quot; incluye clicks sin canal identificado.</p>
                  </div>
                )}

                {/* Productos más vendidos */}
                {current.topProducts.length > 0 && (
                  <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="h-4 w-4 text-amber-400" />
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Tus productos más vendidos</p>
                    </div>
                    <div className="space-y-3">
                      {current.topProducts.map((tp, i) => {
                        if (!tp.product) return null;
                        const img = parseFirstImage(tp.product.images);
                        return (
                          <div key={tp.product.id} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4">{i + 1}</span>
                            {img ? (
                              <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                                <Image src={img} alt={tp.product.name} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-gray-300" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{tp.product.name}</p>
                              <p className="text-xs text-gray-400">{tp.orderCount} {tp.orderCount === 1 ? "venta" : "ventas"}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                              ${fmt(tp.totalRevenue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Consejo si conversión baja */}
                {current.conversionRate < 2 && current.clicksLast30 > 5 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Tip para mejorar tus ventas</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Tu tasa de conversión es baja. Probá compartir links directos a productos específicos en lugar de solo la tienda general. Los posts con precio visible convierten 3x más.
                    </p>
                  </div>
                )}

              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
