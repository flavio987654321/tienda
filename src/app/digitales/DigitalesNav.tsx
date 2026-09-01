"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsPwa } from "@/hooks/useIsPwa";
import { AppLogo } from "@/components/AppLogo";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { Home, CreditCard, Menu, X, LogOut } from "lucide-react";

/* ── Las pantallas del panel, en UNA sola lista ──────────────────────────────
 *
 * Dos, y son las dos que existen de verdad. No hay entradas apagadas ni "próximamente":
 * un menú que nombra pantallas que no están es la forma más rápida de que alguien
 * crea que el panel se rompió.
 *
 * La lista es una sola para la barra ancha y para el menú del celular, que es la
 * corrección que ya se le hizo a `AfiliadosNav`: con dos listas separadas, la
 * pantalla que se agrega termina apareciendo en un solo lado. Acá todavía entran
 * las dos en la barra, así que no hace falta el "Más" — cuando sean más de
 * cuatro, se copia ese pedazo de afiliados. */
const LINKS: { href: string; label: string; Icon: React.ElementType }[] = [
  { href: "/digitales", label: "Inicio", Icon: Home },
  { href: "/digitales/mi-plan", label: "Mi plan", Icon: CreditCard },
];

export default function DigitalesNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Adentro de la app instalada el logo lleva al inicio DEL PANEL, no a la web
     comercial: `scope` es `/digitales`, pero los `<Link>` de Next navegan del
     lado del cliente y el navegador ni se entera de que se salió. Un toque en el
     logo dejaba a la persona navegando tiendaapps.com adentro de la app, sin
     barra de direcciones y sin forma de volver. Mismo caso que en los otros dos
     paneles. */
  const inPwa = useIsPwa();
  const hrefLogo = inPwa ? "/digitales" : "/";
  /* Y al cerrar sesión, quedarse adentro: `/digitales` sin sesión dibuja el login
     del panel (ver el layout). Mandarlo a `/login` lo sacaría del scope justo
     cuando se queda sin sesión, que es el peor momento para perder la app. */
  const destinoAlSalir = inPwa ? "/digitales" : "/login";

  const userName = user?.name ?? "Mi cuenta";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

          <Link href={hrefLogo} className="flex items-center gap-1.5 min-w-0">
            <AppLogo size={64} />
            <span className="text-base sm:text-lg font-bold text-gray-900 truncate">TiendaApps</span>
          </Link>

          {/* Barra ancha. El corte va en 768 y no en 1024 como en afiliados: acá
              son dos links, no ocho, así que entran cómodos mucho antes. */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center justify-end gap-1">
            {/* Mismo criterio que en afiliados: adentro de la app instalada este
                botón no existe. Un `target="_blank"` no alcanza — en Android abre
                una pestaña de Chrome donde se puede navegar el sitio entero
                igual. */}
            {!inPwa && (
              <Link
                href="/"
                title="Ir al sitio principal"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
              >
                <Home className="h-4 w-4" />
              </Link>
            )}
            {/* La campanita SÍ tiene qué mostrar: el cron diario avisa acá cuando
                un plan pago se termina y la cuenta vuelve a Free. */}
            {user?.id && <NotificationBell userId={user.id} />}
            <button
              onClick={() => signOut(destinoAlSalir)}
              title="Cerrar sesión"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <button
            className="md:hidden col-start-3 justify-self-end w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-600"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="md:hidden fixed top-0 right-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {userInitial}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user?.id && <NotificationBell userId={user.id} />}
                  <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
                {LINKS.map(({ href, label, Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "" : "text-orange-500"}`} />
                      {label}
                    </Link>
                  );
                })}

                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-1">
                  {!inPwa && (
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Home className="h-4 w-4 text-gray-400" /> Ir al sitio principal
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(destinoAlSalir); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
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
