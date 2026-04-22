"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: TrendingUp },
  { href: "/dashboard/productos", label: "Productos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/vendedoras", label: "Afiliados", icon: Users },
  { href: "/dashboard/configuracion", label: "Mi tienda", icon: Store },
];

export default function DashboardLayout({
  children,
  userName,
  userEmail,
  initialPendingAffiliateCount = 0,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  initialPendingAffiliateCount?: number;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [pendingAffiliateCount, setPendingAffiliateCount] = useState(initialPendingAffiliateCount);

  useEffect(() => {
    setPendingAffiliateCount(initialPendingAffiliateCount);
  }, [initialPendingAffiliateCount]);

  useEffect(() => {
    fetch("/api/vendedoras")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const pendingCount = Array.isArray(data?.affiliates)
          ? data.affiliates
              .filter((affiliate: { status?: string }) => affiliate.status === "PENDING")
              .length
          : 0;
        setPendingAffiliateCount(pendingCount);
      })
      .catch(() => setPendingAffiliateCount(0));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-40">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-gray-900">MiTienda</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const showAffiliateBadge = href === "/dashboard/vendedoras" && pendingAffiliateCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {showAffiliateBadge && (
                  <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                    {pendingAffiliateCount > 9 ? "9+" : pendingAffiliateCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <Link
            href="/dashboard/configuracion"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
          <button
            onClick={() => signOut("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          <div className="px-3 pt-2">
            <p className="text-xs font-medium text-gray-700 truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}
