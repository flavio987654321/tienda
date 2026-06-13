"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut,
  BarChart2, Tag, UserCircle, Loader2, MessageCircle, BadgeCheck,
  CreditCard, Menu, X, Wallet,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

const LEADS_STORE_TYPES = ["VEHICULOS", "INMOBILIARIA"];

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onlyFor?: string[];
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard",            label: "Inicio",     icon: TrendingUp,    exact: true },
      { href: "/dashboard/pedidos",    label: "Pedidos",    icon: ShoppingBag },
      { href: "/dashboard/consultas",  label: "Consultas",  icon: MessageCircle, onlyFor: LEADS_STORE_TYPES },
      { href: "/dashboard/productos",  label: "Productos",  icon: Package },
      { href: "/dashboard/cupones",    label: "Cupones",    icon: Tag },
      { href: "/dashboard/vendedoras", label: "Afiliados",  icon: Users },
    ],
  },
  {
    label: "Mi tienda",
    items: [
      { href: "/dashboard/configuracion", label: "Diseño",         icon: Store },
      { href: "/dashboard/ajustes",       label: "Configuración",  icon: Settings },
      { href: "/dashboard/pagos",         label: "Pagos",          icon: Wallet },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/metricas",  label: "Estadísticas", icon: BarChart2 },
      { href: "/dashboard/mi-plan",   label: "Mi plan",      icon: CreditCard },
    ],
  },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const [pendingAffiliateCount, setPendingAffiliateCount] = useState(initialPendingAffiliateCount);
  const [lowStockCount, setLowStockCount] = useState(initialLowStockCount);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  const [storeType, setStoreType] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { setPendingAffiliateCount(initialPendingAffiliateCount); }, [initialPendingAffiliateCount]);
  useEffect(() => { setLowStockCount(initialLowStockCount); }, [initialLowStockCount]);

  useEffect(() => {
    fetch("/api/verificacion")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.store?.isVerified) setIsVerified(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const fetchAffiliateCount = useCallback(() => {
    fetch("/api/vendedoras")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const n = Array.isArray(data?.affiliates)
          ? data.affiliates.filter((a: { status?: string }) => a.status === "PENDING").length
          : 0;
        setPendingAffiliateCount(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel("dashboard-layout-affiliates");
    ch.on("postgres_changes" as Parameters<typeof ch.on>[0], { event: "*", schema: "public", table: "Affiliate" }, () => fetchAffiliateCount());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
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

  useEffect(() => {
    if (!storeType || !LEADS_STORE_TYPES.includes(storeType)) return;
    fetch("/api/leads?status=PENDING&count=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPendingLeadsCount(data?.count ?? 0))
      .catch(() => {});
  }, [storeType]);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function getBadge(href: string) {
    const isAffil = href === "/dashboard/vendedoras" && pendingAffiliateCount > 0;
    const isStock = href === "/dashboard/productos"  && lowStockCount > 0;
    const isOrder = href === "/dashboard/pedidos"    && pendingOrderCount > 0;
    const isLeads = href === "/dashboard/consultas"  && pendingLeadsCount > 0;
    const count   = isAffil ? pendingAffiliateCount : isStock ? lowStockCount : isLeads ? pendingLeadsCount : pendingOrderCount;
    const color   = isAffil || isLeads ? "bg-red-500" : isStock ? "bg-orange-500" : "bg-yellow-500";
    return { has: isAffil || isStock || isOrder || isLeads, count, color };
  }

  const anyBadge = pendingAffiliateCount > 0 || pendingOrderCount > 0 || lowStockCount > 0 || pendingLeadsCount > 0;

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -60) setMobileOpen(false);
    touchStartX.current = null;
  }

  function filterItems(items: NavItem[]) {
    return items.filter(({ onlyFor }) => !onlyFor || (storeType && onlyFor.includes(storeType)));
  }

  function renderDesktopLink(item: NavItem) {
    const { href, label, icon: Icon, exact } = item;
    const active = isActive(href, exact);
    const { has, count, color } = getBadge(href);
    return (
      <Link
        key={href}
        href={href}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
          {label}
        </span>
        {has && (
          <>
            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${color} group-hover:hidden`} />
            <span className={`hidden group-hover:inline-flex shrink-0 min-w-5 rounded-full ${color} px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white`}>
              {count > 9 ? "9+" : count}
            </span>
          </>
        )}
      </Link>
    );
  }

  function renderMobileLink(item: NavItem, onNavigate: () => void) {
    const { href, label, icon: Icon, exact } = item;
    const active = isActive(href, exact);
    const { has, count, color } = getBadge(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98] ${
          active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{label}</span>
        {has && (
          <span className={`shrink-0 min-w-5 rounded-full ${color} px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden text-gray-900 [color-scheme:light]">

      {/* ── DESKTOP Sidebar (lg+) ─────────────────────────────────────────── */}
      <aside className="group hidden lg:flex fixed left-0 top-0 h-full w-14 hover:w-60 bg-white border-r border-gray-100 flex-col z-[60] transition-[width] duration-200 overflow-hidden hover:shadow-xl">
        <Link href="/" className="flex items-center gap-3 h-[61px] px-[15px] border-b border-gray-100 shrink-0 hover:bg-gray-50 transition-colors">
          <ShoppingBag className="h-6 w-6 text-indigo-600 shrink-0" />
          <span className="font-bold text-gray-900 whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
            TiendaApps
          </span>
        </Link>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-0.5">
          {NAV_GROUPS.map((group, gi) => {
            const visible = filterItems(group.items);
            if (visible.length === 0) return null;
            return (
              <div key={gi}>
                {gi > 0 && (
                  <div className="flex items-center gap-2 pt-3 pb-1 px-1">
                    <div className="h-px bg-gray-100 flex-1" />
                    {group.label && (
                      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200 text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                        {group.label}
                      </span>
                    )}
                    <div className="h-px bg-gray-100 flex-1" />
                  </div>
                )}
                <div className="space-y-0.5">
                  {visible.map(renderDesktopLink)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <button
            onClick={async () => { setSigningOut(true); await signOut("/login"); }}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
            <span className="whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </span>
          </button>
          <Link href="/dashboard/perfil" title={isVerified ? "Perfil — Verificado" : "Perfil"} className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
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
          {!isOnline && (
            <div className="mx-2 mb-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
              <p className="text-[11px] font-semibold text-orange-600 leading-tight">Sin conexión</p>
              <p className="text-[10px] text-orange-400 leading-tight">Los datos pueden estar desactualizados</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE Top Bar (< lg) ────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] h-14 bg-white border-b border-gray-100 flex items-center justify-between px-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-gray-600" />
          {anyBadge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <Link href="/" className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-indigo-600" />
          <span className="font-bold text-gray-900 text-sm">TiendaApps</span>
        </Link>

        {userId && <NotificationBell userId={userId} />}
      </header>

      {/* ── MOBILE Drawer (< lg) ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col shadow-2xl animate-slide-in-left"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-gray-900 text-sm">TiendaApps</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
              {NAV_GROUPS.map((group, gi) => {
                const visible = filterItems(group.items);
                if (visible.length === 0) return null;
                return (
                  <div key={gi}>
                    {gi > 0 && (
                      <div className="pt-3 pb-1 px-3">
                        {group.label && (
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {group.label}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {visible.map((item) => renderMobileLink(item, () => setMobileOpen(false)))}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="p-3 border-t border-gray-100 space-y-0.5 shrink-0">
              <button
                onClick={async () => { setSigningOut(true); await signOut("/login"); }}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
              >
                {signingOut ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <LogOut className="h-5 w-5 shrink-0" />}
                <span>{signingOut ? "Cerrando..." : "Cerrar sesión"}</span>
              </button>
              <Link
                href="/dashboard/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="relative shrink-0">
                  <UserCircle className="h-5 w-5" />
                  <BadgeCheck className={`absolute -bottom-1 -right-1 h-3 w-3 bg-white rounded-full ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-gray-700 truncate">{userName}</p>
                    <BadgeCheck className={`h-3 w-3 shrink-0 ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
                  </div>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
              </Link>
              {!isOnline && (
                <div className="mt-1 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-orange-600">Sin conexión</p>
                  <p className="text-[11px] text-orange-400 leading-tight mt-0.5">Los datos pueden estar desactualizados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className={`lg:ml-14 flex-1 flex flex-col bg-gray-50 pt-14 lg:pt-0 overflow-x-hidden ${fullHeight ? "overflow-hidden h-full" : "overflow-y-auto"}`}>
        <div className="hidden lg:flex justify-end items-center px-4 pt-3 pb-0 shrink-0">
          {userId && <NotificationBell userId={userId} />}
        </div>
        <div className={`flex-1 ${fullHeight ? "overflow-hidden min-h-0" : "p-4 pt-2"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
