"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut, BarChart2, Tag, UserCircle, Loader2, MessageCircle, BadgeCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

const LEADS_STORE_TYPES = ["VEHICULOS", "INMOBILIARIA"];

const allNavItems = [
  { href: "/dashboard", label: "Inicio", icon: TrendingUp },
  { href: "/dashboard/metricas", label: "Métricas", icon: BarChart2 },
  { href: "/dashboard/productos", label: "Productos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/consultas", label: "Consultas", icon: MessageCircle, onlyFor: LEADS_STORE_TYPES },
  { href: "/dashboard/vendedoras", label: "Afiliados", icon: Users },
  { href: "/dashboard/cupones", label: "Cupones", icon: Tag },
  { href: "/dashboard/configuracion", label: "Mi tienda", icon: Store },
  { href: "/dashboard/mi-plan", label: "Mi plan", icon: CreditCard },
];

export default function DashboardLayout({
  children,
  userName,
  userEmail,
  userId,
  initialPendingAffiliateCount = 0,
  initialLowStockCount = 0,
  fullHeight = false,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  initialPendingAffiliateCount?: number;
  initialLowStockCount?: number;
  fullHeight?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  const [pendingAffiliateCount, setPendingAffiliateCount] = useState(initialPendingAffiliateCount);
  const [lowStockCount, setLowStockCount] = useState(initialLowStockCount);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  const [storeType, setStoreType] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setPendingAffiliateCount(initialPendingAffiliateCount);
  }, [initialPendingAffiliateCount]);

  useEffect(() => {
    fetch("/api/verificacion")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.store?.isVerified) setIsVerified(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLowStockCount(initialLowStockCount);
  }, [initialLowStockCount]);

  // I-07: indicador de conexión
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // K-05: solo Realtime para afiliadas — sin polling duplicado
  const fetchAffiliateCount = useCallback(() => {
    fetch("/api/vendedoras")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const pendingCount = Array.isArray(data?.affiliates)
          ? data.affiliates.filter((a: { status?: string }) => a.status === "PENDING").length
          : 0;
        setPendingAffiliateCount(pendingCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel("dashboard-layout-affiliates");
    channel.on(
      "postgres_changes" as Parameters<typeof channel.on>[0],
      { event: "*", schema: "public", table: "Affiliate" },
      () => fetchAffiliateCount()
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAffiliateCount]);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setPendingOrderCount(data?.pendingCount ?? 0);
        if (data?.tipoTienda) setStoreType(data.tipoTienda);
      })
      .catch(() => {});
  }, []);

  // I-08: badge de leads pendientes para Consultas
  useEffect(() => {
    if (!storeType || !LEADS_STORE_TYPES.includes(storeType)) return;
    fetch("/api/leads?status=PENDING&count=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPendingLeadsCount(data?.count ?? 0))
      .catch(() => {});
  }, [storeType]);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden text-gray-900 [color-scheme:light]">
      {/* Sidebar — collapsed (w-14) por defecto, se expande al hover (w-60) como overlay */}
      <aside className="group fixed left-0 top-0 h-full w-14 hover:w-60 bg-white border-r border-gray-100 flex flex-col z-[60] transition-[width] duration-200 overflow-hidden hover:shadow-xl">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 h-[61px] px-[15px] border-b border-gray-100 shrink-0 hover:bg-gray-50 transition-colors">
          <ShoppingBag className="h-6 w-6 text-indigo-600 shrink-0" />
          <span className="font-bold text-gray-900 whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
            TiendaApps
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {allNavItems.filter(({ onlyFor }) => !onlyFor || (storeType && onlyFor.includes(storeType))).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const showAffiliateBadge = href === "/dashboard/vendedoras" && pendingAffiliateCount > 0;
            const showStockBadge = href === "/dashboard/productos" && lowStockCount > 0;
            const showOrderBadge = href === "/dashboard/pedidos" && pendingOrderCount > 0;
            const showLeadsBadge = href === "/dashboard/consultas" && pendingLeadsCount > 0;
            const hasBadge = showAffiliateBadge || showStockBadge || showOrderBadge || showLeadsBadge;
            const badgeCount = showAffiliateBadge ? pendingAffiliateCount : showStockBadge ? lowStockCount : showLeadsBadge ? pendingLeadsCount : pendingOrderCount;
            const badgeColor = showAffiliateBadge ? "bg-red-500" : showStockBadge ? "bg-orange-500" : showLeadsBadge ? "bg-red-500" : "bg-yellow-500";
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
                  {label}
                </span>
                {hasBadge && (
                  <>
                    {/* Punto indicador en modo colapsado */}
                    <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${badgeColor} group-hover:hidden`} />
                    {/* Badge con número en modo expandido */}
                    <span className={`hidden group-hover:inline-flex shrink-0 min-w-5 rounded-full ${badgeColor} px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white`}>
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sección inferior */}
        <div className="p-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <Link
            href="/dashboard/ajustes"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              Configuración
            </span>
          </Link>
          <button
            onClick={async () => { setSigningOut(true); await signOut("/"); }}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
            <span className="whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </span>
          </button>
          {/* Info de usuario — icono siempre visible, texto solo expandido */}
          <Link
            href="/dashboard/perfil"
            title={isVerified ? "Perfil — Verificado" : "Perfil — Sin verificar"}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <div className="relative shrink-0">
              <UserCircle className="h-4 w-4" />
              <BadgeCheck className={`absolute -bottom-1 -right-1 h-3 w-3 bg-white rounded-full ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
            </div>
            <div className="flex-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-gray-700 truncate whitespace-nowrap">{userName}</p>
                <BadgeCheck className={`h-3 w-3 shrink-0 ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
              </div>
              <p className="text-xs text-gray-400 truncate whitespace-nowrap">{userEmail}</p>
            </div>
          </Link>
        </div>

        {/* I-07: indicador de reconexión */}
        {!isOnline && (
          <div className="mx-2 mb-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
            <p className="text-[11px] font-semibold text-orange-600 leading-tight">Sin conexión</p>
            <p className="text-[10px] text-orange-400 leading-tight">Los datos pueden estar desactualizados</p>
          </div>
        )}
      </aside>

      <main className={`ml-14 flex-1 flex flex-col bg-gray-50 ${fullHeight ? "overflow-hidden h-full" : "overflow-y-auto"}`}>
        <div className="flex justify-end items-center px-4 pt-3 pb-0 shrink-0">
          {userId && <NotificationBell userId={userId} />}
        </div>
        <div className={`flex-1 ${fullHeight ? "overflow-hidden min-h-0" : "p-4 pt-2"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
