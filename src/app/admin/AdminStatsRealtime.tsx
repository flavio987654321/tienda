"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Store, ShoppingBag, MessageSquare, TrendingUp, Ban, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Stats = {
  totalUsers: number; totalOwners: number; totalAffiliates: number; totalBuyers: number;
  totalStores: number; activeStores: number;
  totalOrders: number; pendingOrders: number;
  totalTestimonials: number; pendingTestimonials: number;
  activeSubscriptions: number;
  totalBanned: number; totalDeleted: number;
};

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pink:   "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

// Tablas a escuchar en Realtime
const WATCHED_TABLES = ["User", "Store", "Order", "Subscription", "Testimonial"];

export default function AdminStatsRealtime({ initial }: { initial: Stats }) {
  const [stats, setStats] = useState<Stats>(initial);
  const [pulse, setPulse] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    } catch {}
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase.channel("admin-stats-realtime");

    WATCHED_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        { event: "*", schema: "public", table },
        () => fetchStats()
      );
    });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  const cards = [
    {
      label: "Usuarios activos", value: stats.totalUsers, icon: Users, color: "indigo",
      sub: `${stats.totalOwners} dueños · ${stats.totalAffiliates} afiliados · ${stats.totalBuyers} clientes`,
      href: "/admin/usuarios?f=activos",
    },
    {
      label: "Tiendas", value: stats.totalStores, icon: Store, color: "purple",
      sub: `${stats.activeStores} publicadas y activas`,
      href: "/admin/tiendas",
    },
    {
      label: "Pedidos totales", value: stats.totalOrders, icon: ShoppingBag, color: "emerald",
      sub: `${stats.pendingOrders} pendientes de procesar`,
    },
    {
      label: "Suscripciones activas", value: stats.activeSubscriptions, icon: TrendingUp, color: "amber",
      sub: "Trial + activas",
    },
    {
      label: "Testimonios", value: stats.totalTestimonials, icon: MessageSquare, color: "pink",
      sub: `${stats.pendingTestimonials} esperando aprobación`,
      alert: stats.pendingTestimonials > 0,
      href: "/admin/testimonios",
    },
  ];

  return (
    <div className={`transition-all duration-500 ${pulse ? "opacity-70" : "opacity-100"}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(({ label, value, icon: Icon, color, sub, alert, href }) => {
          const inner = (
            <>
              {alert && (
                <span className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
                  {value}
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${COLOR_MAP[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-4xl font-black text-white mb-1">{value.toLocaleString("es-AR")}</p>
              <p className="text-white font-semibold text-sm mb-1">{label}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
              {href && <p className="text-indigo-400 text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle →</p>}
            </>
          );
          const cls = `relative bg-gray-900/50 border rounded-2xl p-6 transition-all ${alert ? "border-yellow-500/30" : "border-white/5"} ${href ? "hover:border-indigo-500/40 hover:bg-gray-900/80 cursor-pointer group" : ""}`;
          return href ? (
            <Link key={label} href={href} className={cls}>{inner}</Link>
          ) : (
            <div key={label} className={cls}>{inner}</div>
          );
        })}
      </div>

      {/* Baneados / Eliminados */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link href="/admin/usuarios?f=baneados" className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 hover:border-red-500/40 hover:bg-red-500/10 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Ban className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{stats.totalBanned}</p>
            <p className="text-xs text-red-400 font-medium mt-0.5">Usuarios baneados</p>
          </div>
        </Link>
        <Link href="/admin/usuarios?f=eliminados" className="bg-gray-500/5 border border-gray-500/20 rounded-2xl p-5 flex items-center gap-4 hover:border-gray-400/40 hover:bg-gray-500/10 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{stats.totalDeleted}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Cuentas eliminadas</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
