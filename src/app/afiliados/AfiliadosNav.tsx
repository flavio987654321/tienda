"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import {
  ShoppingBag, Wallet, Award, BarChart3, Trophy, Store,
  X, XCircle, Menu, LogOut, HelpCircle, Sun, Moon,
  Download, MessageSquare, Target, ShoppingCart, Share2, Home, ChevronDown,
} from "lucide-react";

// ── Modal de ayuda para afiliados ─────────────────────────────────────────────
const HELP_SECTIONS: { icon: React.ElementType; iconColor: string; title: string; body: string }[] = [
  { icon: Store,         iconColor: "text-indigo-500",  title: "Tiendas disponibles", body: "Postulate a las tiendas que te interesen. Cuando el dueño te acepte, vas a poder compartir sus productos y ganar comisión por cada venta." },
  { icon: Share2,        iconColor: "text-purple-500",  title: "Compartir",           body: "Desde cada producto generás tu link de afiliado, un código QR o una placa lista para redes (Instagram, WhatsApp, etc). Todo lleva tu identificador para que la venta te quede asignada." },
  { icon: Wallet,        iconColor: "text-emerald-500", title: "Mis comisiones",       body: "Acá ves el total de comisiones acreditadas y tu historial de movimientos. Podés pedir el retiro cuando quieras; te transferimos directamente a tu cuenta bancaria." },
  { icon: Award,         iconColor: "text-amber-500",   title: "Mis premios",         body: "Cupones de descuento que ganás automáticamente según tu nivel (Plata, Oro, Diamante) calculado por tus ventas del mes. Se usan en cualquier tienda de TiendaApps." },
  { icon: BarChart3,     iconColor: "text-blue-500",    title: "Estadísticas",        body: "Pedidos generados, clicks en tus links y de qué canal vienen (WhatsApp, Instagram, etc), para que sepas qué te está funcionando mejor." },
  { icon: Trophy,        iconColor: "text-amber-500",   title: "Ranking",             body: "Tu posición comparada con los demás afiliados de cada tienda, según comisiones generadas." },
  { icon: MessageSquare, iconColor: "text-purple-500",  title: "Plantillas",          body: "Mensajes ya escritos para WhatsApp, Instagram y otras redes, con tu link incluido, listos para pegar y enviar." },
  { icon: Download,      iconColor: "text-indigo-500",  title: "Kit de contenido",    body: "Fotos y videos de los productos de tus tiendas para usar en tus publicaciones, sin tener que pedírselos al dueño." },
  { icon: Target,        iconColor: "text-orange-500",  title: "Mis metas",           body: "Objetivos mensuales de ventas que podés fijarte para hacer seguimiento de tu progreso." },
  { icon: ShoppingBag,   iconColor: "text-green-500",   title: "Mis pedidos",         body: "Listado de las ventas generadas con tu link, con su estado y la comisión que te corresponde por cada una." },
];

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#0d0f1a] border border-gray-200 dark:border-white/8 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden">

        <div className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Cómo funciona el panel</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all">
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {HELP_SECTIONS.map(({ icon: Icon, iconColor, title, body }) => (
            <div key={title} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/5">
          <button type="button" onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20">
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Las pantallas del panel, en UNA sola lista ──────────────────────────────
 *
 * Antes eran dos listas escritas aparte: una para la barra de arriba y otra
 * para el menú del celular. La de la barra tenía cuatro y la del celular ocho,
 * así que "Mis pedidos", "Plantillas", "Kit de contenido" y "Mis metas" —cuatro
 * pantallas enteras, terminadas y andando— no tenían botón en la computadora.
 * Se llegaba escribiendo la dirección a mano, y el `?` de ayuda las nombraba
 * igual: prometía plantillas que no había forma de abrir.
 *
 * Con una sola lista eso no puede volver a pasar. La pantalla que se agregue
 * acá aparece en los dos lados sola; lo único que decide `LINKS_EN_BARRA` es
 * cuántas van sueltas arriba y cuántas quedan atrás de "Más".
 *
 * El color del ícono también vive acá. Solo se usa en el menú del celular —la
 * barra los pinta grises para no quedar como un arcoíris— pero tenerlo en la
 * lista evita la otra copia. */
const LINKS: { href: string; label: string; Icon: React.ElementType; color: string }[] = [
  { href: "/afiliados/billetera",    label: "Mis comisiones",   Icon: Wallet,         color: "text-indigo-500"  },
  { href: "/afiliados/premios",      label: "Mis premios",      Icon: Award,          color: "text-amber-500"   },
  { href: "/afiliados/estadisticas", label: "Estadísticas",     Icon: BarChart3,      color: "text-blue-500"    },
  { href: "/afiliados/ranking",      label: "Ranking",          Icon: Trophy,         color: "text-amber-500"   },
  { href: "/afiliados/pedidos",      label: "Mis pedidos",      Icon: ShoppingCart,   color: "text-green-500"   },
  { href: "/afiliados/plantillas",   label: "Plantillas",       Icon: MessageSquare,  color: "text-purple-500"  },
  { href: "/afiliados/kit",          label: "Kit de contenido", Icon: Download,       color: "text-indigo-500"  },
  { href: "/afiliados/metas",        label: "Mis metas",        Icon: Target,         color: "text-orange-500"  },
];

/* Cuántas entran sueltas en la barra ancha. Cuatro, y no es al voleo: la barra
 * son tres bloques que no se achican —logo, menú, íconos—, así que lo que no
 * entra no se acomoda, se pisa. Con cinco vuelve a montarse el logo encima del
 * primer link en pantallas de 1024 a 1200. */
const LINKS_EN_BARRA = 4;

const HELP_SEEN_KEY = "tiendaapps_affiliates_help_seen";

export default function AfiliadosNav() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [masOpen, setMasOpen] = useState(false);
  const masRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  /* Las dos formas de cerrar "Más" sin elegir nada: tocar afuera y Escape.
     Sin esto queda abierto tapando la página y el que lo abrió sin querer no
     tiene salida obvia. Al elegir una opción lo cierra el propio link.

     Van adentro de un efecto porque hay que escuchar al documento, pero lo que
     llama a setState son los manejadores, no el efecto — que es lo que la regla
     de hooks del repo pide. */
  useEffect(() => {
    if (!masOpen) return;
    function afuera(e: MouseEvent) {
      if (masRef.current && !masRef.current.contains(e.target as Node)) setMasOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setMasOpen(false);
    }
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [masOpen]);

  /* Ya hidratamos: en el servidor da false y en el navegador true. Tapa lo que no
     puede dibujarse igual en los dos lados. Antes era un `useState(false)` con un
     `setMounted(true)` adentro de un efecto, o sea un render entero de la barra
     nada más que para anotar que había montado. */
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  /* El puntito de "hay ayuda sin ver" sale de localStorage, que en el servidor no
     existe: por eso allá contesta "visto". Al revés, el punto se pintaría un
     instante en la pantalla de todos y desaparecería al hidratar. */
  const ayudaVistaGuardada = useSyncExternalStore(
    () => () => {},
    () => !!localStorage.getItem(HELP_SEEN_KEY),
    () => true,
  );
  // Y si la abre ahora, sin recargar. Escribir en localStorage no vuelve a
  // preguntar solo, así que el cambio del momento se recuerda acá.
  const [ayudaVistaAhora, setAyudaVistaAhora] = useState(false);
  const helpSeen = ayudaVistaGuardada || ayudaVistaAhora;

  const isDark = theme === "dark";
  const userName = user?.name ?? "Afiliado";
  const userInitial = userName.charAt(0).toUpperCase();

  /* Las cuatro primeras van sueltas en la barra ancha; el resto, adentro de
     "Más". En el menú del celular se muestran las OCHO, siempre. */
  const enLaBarra = LINKS.slice(0, LINKS_EN_BARRA);
  const enElMas = LINKS.slice(LINKS_EN_BARRA);
  const masActivo = enElMas.some((l) => l.href === pathname);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

          {/* Logo → página principal */}
          <Link href="/" className="flex items-center gap-1.5">
            <AppLogo size={72} />
            <span className="text-lg font-bold text-gray-900 dark:text-white">TiendaApps</span>
          </Link>

          {/* Barra ancha — de 1024 para arriba.
              Abajo de eso manda la hamburguesa, y el corte está en 1024 y no en
              los 640 de antes porque este bloque no se achica: en 768 el logo
              terminaba escrito encima del primer link. */}
          <div className="hidden lg:flex items-center gap-1">
            {enLaBarra.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}

            {/* "Más" — el resto de las pantallas. Se marca activo cuando estás
                parado en alguna de las de adentro, si no la barra entera se ve
                apagada mientras mirás, por ejemplo, Plantillas. */}
            {enElMas.length > 0 && (
              <div ref={masRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMasOpen((v) => !v)}
                  aria-expanded={masOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                    masActivo
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  Más
                  <ChevronDown className={`h-4 w-4 transition-transform ${masOpen ? "rotate-180" : ""}`} />
                </button>

                {masOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1629] shadow-xl p-2"
                  >
                    {enElMas.map(({ href, label, Icon, color }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          role="menuitem"
                          onClick={() => setMasOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${active ? "" : color}`} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Íconos — mismo corte que los links, si no en 900 quedan solos */}
          <div className="hidden lg:flex items-center justify-end gap-1">
            <Link
              href="/"
              title="Ir al sitio principal"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <Home className="h-4 w-4" />
            </Link>
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
            <div className="relative">
              <button
                onClick={() => { setShowHelp(true); localStorage.setItem(HELP_SEEN_KEY, "1"); setAyudaVistaAhora(true); }}
                title="Cómo funciona"
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              {mounted && !helpSeen && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-950 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-950" />
                </>
              )}
            </div>
            <button
              onClick={() => signOut("/")}
              title="Cerrar sesión"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Hamburguesa — hasta 1024, no hasta 640 */}
          <button
            className="lg:hidden col-start-3 justify-self-end w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
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
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="lg:hidden fixed top-0 right-0 h-full w-72 z-50 bg-white dark:bg-[#0f1629] shadow-2xl flex flex-col"
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
                {/* Las OCHO, sin "Más": acá la lista es vertical y hay lugar. */}
                {LINKS.map(({ href, label, Icon, color }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "" : color}`} />
                      {label}
                    </Link>
                  );
                })}

                {mounted && (
                  <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full text-left"
                  >
                    {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-gray-500" />}
                    <span className="flex-1">Modo oscuro</span>
                    <div className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${isDark ? "bg-indigo-500" : "bg-gray-300"}`}
                      style={{ height: "22px", width: "40px" }}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isDark ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                )}

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col gap-1">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Home className="h-4 w-4 text-gray-400" /> Ir al sitio principal
                  </Link>
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

      {/* Modal de ayuda */}
      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>
    </>
  );
}
