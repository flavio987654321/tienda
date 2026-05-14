"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut, BarChart2, Tag, UserCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: TrendingUp },
  { href: "/dashboard/metricas", label: "Métricas", icon: BarChart2 },
  { href: "/dashboard/productos", label: "Productos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/vendedoras", label: "Afiliados", icon: Users },
  { href: "/dashboard/cupones", label: "Cupones", icon: Tag },
  { href: "/dashboard/configuracion", label: "Mi tienda", icon: Store },
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
  const { signOut } = useAuth();
  const [pendingAffiliateCount, setPendingAffiliateCount] = useState(initialPendingAffiliateCount);
  const [lowStockCount, setLowStockCount] = useState(initialLowStockCount);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  useEffect(() => {
    setPendingAffiliateCount(initialPendingAffiliateCount);
  }, [initialPendingAffiliateCount]);

  useEffect(() => {
    setLowStockCount(initialLowStockCount);
  }, [initialLowStockCount]);

  useEffect(() => {
    function fetchAffiliateCount() {
      fetch("/api/vendedoras")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const pendingCount = Array.isArray(data?.affiliates)
            ? data.affiliates.filter((a: { status?: string }) => a.status === "PENDING").length
            : 0;
          setPendingAffiliateCount(pendingCount);
        })
        .catch(() => {});
    }
    fetchAffiliateCount();
    const interval = setInterval(fetchAffiliateCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPendingOrderCount(data?.pendingCount ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/productos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const count = Array.isArray(data?.products)
          ? data.products.filter((p: { variants: { stock: number }[] }) => {
              const total = p.variants.reduce((s: number, v: { stock: number }) => s + v.stock, 0);
              return total === 0;
            }).length
          : 0;
        setLowStockCount(count);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar — collapsed (w-14) por defecto, se expande al hover (w-60) como overlay */}
      <aside className="group fixed left-0 top-0 h-full w-14 hover:w-60 bg-white border-r border-gray-100 flex flex-col z-40 transition-[width] duration-200 overflow-hidden hover:shadow-xl">

        {/* Logo */}
        <div className="flex items-center gap-3 h-[61px] px-[15px] border-b border-gray-100 shrink-0">
          <ShoppingBag className="h-6 w-6 text-indigo-600 shrink-0" />
          <span className="font-bold text-gray-900 whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
            MiTienda
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const showAffiliateBadge = href === "/dashboard/vendedoras" && pendingAffiliateCount > 0;
            const showStockBadge = href === "/dashboard/productos" && lowStockCount > 0;
            const showOrderBadge = href === "/dashboard/pedidos" && pendingOrderCount > 0;
            const hasBadge = showAffiliateBadge || showStockBadge || showOrderBadge;
            const badgeCount = showAffiliateBadge ? pendingAffiliateCount : showStockBadge ? lowStockCount : pendingOrderCount;
            const badgeColor = showAffiliateBadge ? "bg-red-500" : showStockBadge ? "bg-orange-500" : "bg-yellow-500";
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
            href="/dashboard/configuracion"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              Configuración
            </span>
          </Link>
          <button
            onClick={() => signOut("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-200">
              Cerrar sesión
            </span>
          </button>
          {/* Info de usuario — solo visible expandido */}
          <div className="max-h-0 group-hover:max-h-16 overflow-hidden transition-[max-height] duration-200 px-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
              <Link
                href="/dashboard/perfil"
                title="Mi perfil"
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <UserCircle className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className={`ml-14 flex-1 flex flex-col ${fullHeight ? "overflow-hidden h-full" : ""}`}>
        {/* Topbar con campana */}
        <header className="h-[61px] shrink-0 border-b border-gray-100 bg-white flex items-center justify-end px-4 gap-2">
          {userId && <NotificationBell userId={userId} />}
        </header>
        <main className={`flex-1 p-4 bg-gray-50 ${fullHeight ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
