"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: TrendingUp },
  { href: "/dashboard/productos", label: "Productos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/dashboard/vendedoras", label: "Afiliados", icon: Users },
  { href: "/dashboard/configuracion", label: "Mi tienda", icon: Store },
];

const AFFILIATE_SEEN_KEY = "mitienda_seen_pending_affiliate_ids";

export default function DashboardLayout({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [pendingAffiliateIds, setPendingAffiliateIds] = useState<string[] | null>(null);
  const [seenPendingAffiliateIds, setSeenPendingAffiliateIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(AFFILIATE_SEEN_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      setSeenPendingAffiliateIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenPendingAffiliateIds([]);
    }

    fetch("/api/vendedoras")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const pendingIds = Array.isArray(data?.affiliates)
          ? data.affiliates
              .filter((affiliate: { status?: string }) => affiliate.status === "PENDING")
              .map((affiliate: { id?: string }) => affiliate.id)
              .filter((id: string | undefined): id is string => Boolean(id))
          : [];
        setPendingAffiliateIds(pendingIds);
      })
      .catch(() => setPendingAffiliateIds([]));
  }, []);

  useEffect(() => {
    if (pendingAffiliateIds === null || !pathname.startsWith("/dashboard/vendedoras")) return;
    window.localStorage.setItem(AFFILIATE_SEEN_KEY, JSON.stringify(pendingAffiliateIds));
    setSeenPendingAffiliateIds(pendingAffiliateIds);
  }, [pathname, pendingAffiliateIds]);

  const newAffiliateRequests = (pendingAffiliateIds ?? []).filter(
    (id) => !seenPendingAffiliateIds.includes(id)
  ).length;

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
            const showAffiliateBadge = href === "/dashboard/vendedoras" && newAffiliateRequests > 0 && !active;
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
                    {newAffiliateRequests > 9 ? "9+" : newAffiliateRequests}
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
            onClick={() => signOut({ callbackUrl: "/" })}
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
