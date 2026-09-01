"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsPwa } from "@/hooks/useIsPwa";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";
import {
  Home, UserRound, Menu, X, LogOut, Loader2, ChevronRight, Sparkles,
} from "lucide-react";

/* ── Las pantallas del panel, en UNA sola lista ──────────────────────────────
 *
 * Dos, y son las dos que existen de verdad. Sin entradas apagadas ni
 * "próximamente": un menú que nombra pantallas que no están se lee como que el
 * panel se rompió, no como que eso viene después.
 *
 * La lista es una sola para la barra de escritorio y para el cajón del celular.
 * Es la corrección que ya se le hizo a `AfiliadosNav`, donde eran dos listas y
 * cuatro pantallas enteras y andando no tenían botón en la computadora. */
const LINKS: { href: string; label: string; Icon: React.ElementType }[] = [
  { href: "/digitales", label: "Inicio", Icon: Home },
  { href: "/digitales/mi-cuenta", label: "Mi cuenta", Icon: UserRound },
];

type Props = {
  /** Para la tarjeta de abajo de todo: quién sos y en qué plan estás. */
  tier: TierDigital;
};

/**
 * La barra lateral del panel de Productos Digitales.
 *
 * ── Por qué lateral y no arriba ──────────────────────────────────────────────
 * La primera versión era una barra horizontal, calcada de `/afiliados`. Estaba
 * mal copiada: el panel que manda en esta plataforma es el de tiendas, y ese es
 * lateral. Dos paneles del mismo producto con el menú en lugares distintos se
 * sienten dos programas distintos.
 *
 * ── Por qué se abre sola en vez de estar siempre abierta ─────────────────────
 * Igual que en `/dashboard`: arranca como una franja de 56 px con los íconos y
 * se abre a 240 px al pasar el mouse. Las pantallas que vienen —productos,
 * ventas, estadísticas— son tablas anchas, y 240 px fijos se los come de la
 * pantalla todo el tiempo para mostrar dos palabras que ya dice el ícono.
 *
 * En el celular no hay ninguna franja: barra arriba y cajón, que es lo único
 * que entra.
 */
export default function DigitalesSidebar({ tier }: Props) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  /* Adentro de la app instalada el logo lleva al inicio DEL PANEL, no a la web
     comercial: el `scope` del manifiesto no encierra a nadie, porque los `<Link>`
     de Next navegan del lado del cliente y el navegador ni se entera de que se
     salió. Un toque en el logo dejaba a la persona navegando tiendaapps.com
     adentro de la app, sin barra de direcciones y sin forma de volver. */
  const inPwa = useIsPwa();
  const hrefLogo = inPwa ? "/digitales" : "/";
  /* Y al cerrar sesión, quedarse adentro: `/digitales` sin sesión dibuja el login
     del panel (ver el layout). Mandarlo a `/login` lo sacaría del scope justo
     cuando se queda sin sesión, que es el peor momento para perder la app. */
  const destinoAlSalir = inPwa ? "/digitales" : "/login";

  /* Sin nombre cargado se cae al correo, y recién después a un texto fijo.
     Decía "Mi cuenta", que es el nombre de la pantalla a la que lleva la propia
     tarjeta: quedaba "Mi cuenta / Plan Free" justo abajo del link que también
     dice "Mi cuenta", y se leía como si el menú estuviera repetido. El correo,
     además, sí identifica a la persona.
     `split("@")[0]` es lo mismo que hace el nav compartido: la parte de adelante
     alcanza para reconocerse y entra en los 240 px de la barra. */
  const nombre = user?.name || user?.email?.split("@")[0] || "Tu cuenta";
  const inicial = nombre.charAt(0).toUpperCase();
  const activa = (href: string) => pathname === href;

  async function salir() {
    setSaliendo(true);
    await signOut(destinoAlSalir);
  }

  return (
    <>
      {/* ── ESCRITORIO: la franja que se abre sola (lg+) ──────────────────── */}
      <aside className="group hidden lg:flex fixed left-0 top-0 h-full w-14 hover:w-60 hover:shadow-xl bg-white border-r border-gray-100 flex-col z-[60] transition-[width] duration-200 overflow-hidden">
        <Link
          href={hrefLogo}
          className="flex items-center gap-3 h-[61px] px-[15px] border-b border-gray-100 shrink-0 hover:bg-gray-50 transition-colors"
        >
          <AppLogo size={52} className="shrink-0" />
          <span className="font-bold text-gray-900 whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-200">
            TiendaApps
          </span>
        </Link>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activa(href)
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-200">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <button
            onClick={salir}
            disabled={saliendo}
            title="Cerrar sesión"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {saliendo ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-200">
              {saliendo ? "Cerrando..." : "Cerrar sesión"}
            </span>
          </button>

          {/* La tarjeta de abajo dice en qué plan estás sin que tengas que entrar
              a ninguna pantalla. Es lo único del menú que no es un link a otra
              cosa: es información. */}
          <Link
            href="/digitales/mi-cuenta"
            title={`${nombre} — plan ${COPY_DIGITAL[tier].nombre}`}
            className="flex items-center gap-2.5 px-1 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-orange-50 hover:border-orange-100 transition-colors"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
              {inicial}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-200">
              <p className="text-xs font-semibold text-gray-800 truncate whitespace-nowrap">{nombre}</p>
              <p className="text-[10px] text-orange-500 font-medium whitespace-nowrap">
                Plan {COPY_DIGITAL[tier].nombre}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-200" />
          </Link>
        </div>
      </aside>

      {/* ── CELULAR: barra arriba (< lg) ──────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] h-14 bg-white border-b border-gray-100 flex items-center justify-between px-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        <Link href={hrefLogo} className="flex items-center gap-2">
          <AppLogo size={52} />
          <span className="font-bold text-gray-900 text-sm">TiendaApps</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* La campanita SÍ tiene qué mostrar: el cron diario avisa acá cuando un
              plan pago se termina y la cuenta vuelve a Free. */}
          {user?.id && <NotificationBell userId={user.id} />}
        </div>
      </header>

      {/* ── CELULAR: el cajón ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 shrink-0">
              <Link href={hrefLogo} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <Sparkles className="h-5 w-5 text-orange-600" />
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
              {LINKS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                    activa(href)
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${activa(href) ? "" : "text-orange-500"}`} />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="p-3 border-t border-gray-100 space-y-0.5 shrink-0">
              <button
                onClick={salir}
                disabled={saliendo}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
              >
                {saliendo ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <LogOut className="h-5 w-5 shrink-0" />}
                {saliendo ? "Cerrando..." : "Cerrar sesión"}
              </button>
              <Link
                href="/digitales/mi-cuenta"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-orange-50 hover:border-orange-100 transition-colors"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-base">
                  {inicial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{nombre}</p>
                  <p className="text-[10px] text-orange-500 font-medium">Plan {COPY_DIGITAL[tier].nombre}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
