"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Users, Store, ShoppingBag, LogOut, Shield,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/testimonios", label: "Testimonios", icon: MessageSquare },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/tiendas", label: "Tiendas", icon: Store },
];

export default function AdminSidebar({ user }: { user: { name: string | null; email: string } }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-64 bg-gray-900 border-r border-white/5 flex flex-col min-h-screen sticky top-0">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(href, exact)
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="h-4.5 w-4.5 h-5 w-5 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
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
          onClick={() => signOut("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
