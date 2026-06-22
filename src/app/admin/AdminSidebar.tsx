"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Users, Store, ShoppingBag, LogOut, Shield, Menu, X, ShieldCheck, Wallet, BadgeCheck, Flag, HeartHandshake, Megaphone,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_GROUPS = [
  {
    label: "Gestión",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/tiendas", label: "Tiendas", icon: Store },
    ],
  },
  {
    label: "Moderación",
    items: [
      { href: "/admin/verificaciones", label: "Verificaciones", icon: BadgeCheck },
      { href: "/admin/denuncias", label: "Denuncias", icon: Flag },
      { href: "/admin/testimonios", label: "Testimonios", icon: MessageSquare },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/admin/retiros", label: "Retiros", icon: Wallet },
      { href: "/admin/canasta", label: "Donaciones", icon: HeartHandshake },
      { href: "/admin/promociones", label: "Promociones", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Historial", icon: ShieldCheck },
    ],
  },
];

type Badges = { pendingVerif: number; pendingReports: number; pendingRetiros: number };

function NavLinks({ pathname, badges, onNavigate }: { pathname: string; badges: Badges; onNavigate?: () => void }) {
  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function getBadge(href: string): number {
    if (href === "/admin/verificaciones" && !pathname.startsWith("/admin/verificaciones")) return badges.pendingVerif;
    if (href === "/admin/denuncias" && !pathname.startsWith("/admin/denuncias")) return badges.pendingReports;
    if (href === "/admin/retiros" && !pathname.startsWith("/admin/retiros")) return badges.pendingRetiros;
    return 0;
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const badge = getBadge(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(href, exact)
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user, onSignOut }: { user: { name: string | null; email: string }; onSignOut: () => void }) {
  return (
    <div className="px-4 py-4 border-t border-white/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-indigo-600/30 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-300 text-xs font-bold">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{user.name ?? "Admin"}</p>
          <p className="text-gray-500 text-xs truncate">{user.email}</p>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
      </button>
    </div>
  );
}

export default function AdminSidebar({ user }: { user: { name: string | null; email: string } }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Badges>({ pendingVerif: 0, pendingReports: 0, pendingRetiros: 0 });
  const pathname = usePathname();
  const { signOut } = useAuth();

  useEffect(() => {
    function fetchCounts() {
      fetch("/api/admin/verificacion?count=1")
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setBadges((b) => ({ ...b, pendingVerif: d.count })); })
        .catch(() => {});
      fetch("/api/admin/denuncias?count=1")
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setBadges((b) => ({ ...b, pendingReports: d.count })); })
        .catch(() => {});
      fetch("/api/admin/retiros?count=1")
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setBadges((b) => ({ ...b, pendingRetiros: d.count })); })
        .catch(() => {});
    }
    fetchCounts();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-pending-counts")
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "VerificationRequest" },
        () => fetchCounts()
      )
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "StoreReport" },
        () => fetchCounts()
      )
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "WalletWithdrawal" },
        () => fetchCounts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-white/5 flex-col min-h-screen sticky top-0">
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">TiendaApps</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3 text-indigo-400" />
              <span className="text-indigo-400 text-xs font-semibold">Admin</span>
            </div>
          </div>
        </div>
        <NavLinks pathname={pathname} badges={badges} />
        <UserFooter user={user} onSignOut={() => signOut("/")} />
      </aside>

      {/* ── Mobile top header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-white/5 flex items-center justify-between px-4 py-3 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">TiendaApps</span>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-indigo-400" />
            <span className="text-indigo-400 text-xs font-semibold">Admin</span>
          </div>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-gray-900 flex flex-col min-h-screen shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">TiendaApps</p>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-indigo-400" />
                    <span className="text-indigo-400 text-xs font-semibold">Admin</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} badges={badges} onNavigate={() => setMobileOpen(false)} />
            <UserFooter user={user} onSignOut={() => { setMobileOpen(false); signOut("/"); }} />
          </aside>
        </div>
      )}
    </>
  );
}
