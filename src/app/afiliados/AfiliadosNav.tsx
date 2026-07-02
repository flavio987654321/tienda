"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import {
  ShoppingBag, Wallet, Award, BarChart3, Trophy,
  X, Menu, LogOut, HelpCircle, Sun, Moon,
  Download, MessageSquare, Target, ShoppingCart, Headset, Share2,
} from "lucide-react";

export default function AfiliadosNav() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  const isDark = theme === "dark";
  const userName = user?.name ?? "Afiliado";
  const userInitial = userName.charAt(0).toUpperCase();

  const navLinks = [
    { href: "/afiliados/billetera",    label: "Mi billetera",  icon: <Wallet className="h-4 w-4" /> },
    { href: "/afiliados/premios",      label: "Mis premios",   icon: <Award className="h-4 w-4" /> },
    { href: "/afiliados/estadisticas", label: "Estadísticas",  icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/afiliados/ranking",      label: "Ranking",       icon: <Trophy className="h-4 w-4" /> },
    { href: "/afiliados/canales",      label: "Canales",       icon: <Share2 className="h-4 w-4" /> },
  ];

  const mobileLinks = [
    { href: "/afiliados/billetera",    label: "Mi billetera",    icon: <Wallet className="h-4 w-4 text-indigo-500" /> },
    { href: "/afiliados/premios",      label: "Mis premios",     icon: <Award className="h-4 w-4 text-amber-500" /> },
    { href: "/afiliados/pedidos",      label: "Mis pedidos",     icon: <ShoppingCart className="h-4 w-4 text-green-500" /> },
    { href: "/afiliados/estadisticas", label: "Estadísticas",    icon: <BarChart3 className="h-4 w-4 text-blue-500" /> },
    { href: "/afiliados/plantillas",   label: "Plantillas",      icon: <MessageSquare className="h-4 w-4 text-purple-500" /> },
    { href: "/afiliados/kit",          label: "Kit de contenido",icon: <Download className="h-4 w-4 text-indigo-500" /> },
    { href: "/afiliados/metas",        label: "Mis metas",       icon: <Target className="h-4 w-4 text-orange-500" /> },
    { href: "/afiliados/ranking",      label: "Ranking",          icon: <Trophy className="h-4 w-4 text-amber-500" /> },
    { href: "/afiliados/canales",      label: "Canales",          icon: <Share2 className="h-4 w-4 text-sky-500" /> },
    { href: "/afiliados/soporte",      label: "Soporte",          icon: <Headset className="h-4 w-4 text-indigo-500" /> },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

          {/* Logo */}
          <Link href="/afiliados" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">TiendaApps</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {l.icon} {l.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop íconos */}
          <div className="hidden sm:flex items-center justify-end gap-1">
            <FavoritesDrawer buttonClassName="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all" />
            {user?.id && <NotificationBell userId={user.id} />}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title={isDark ? "Modo claro" : "Modo oscuro"}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <Link
              href="/afiliados/soporte"
              title="Ayuda"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <HelpCircle className="h-4 w-4" />
            </Link>
            <button
              onClick={() => signOut("/")}
              title="Cerrar sesión"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile hamburguesa */}
          <button
            className="sm:hidden col-start-3 justify-self-end w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Panel mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="sm:hidden fixed top-0 right-0 h-full w-72 z-50 bg-white dark:bg-[#0f1629] shadow-2xl flex flex-col"
            >
              {/* Header del panel */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {userInitial}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <FavoritesDrawer buttonClassName="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10" />
                  {user?.id && <NotificationBell userId={user.id} />}
                  <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Links */}
              <div className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
                {mobileLinks.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      {l.icon} {l.label}
                    </Link>
                  );
                })}

                {mounted && (
                  <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full text-left"
                  >
                    {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-gray-500" />}
                    {isDark ? "Modo claro" : "Modo oscuro"}
                  </button>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10">
                  <button
                    onClick={() => { signOut("/"); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
