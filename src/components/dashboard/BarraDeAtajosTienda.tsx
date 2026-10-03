"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus, ExternalLink, UserRound, CreditCard, LogOut, Loader2, ChevronDown, BadgeCheck,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import HelpButton from "@/components/HelpButton";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import { useAuth } from "@/components/AuthProvider";
import { useIsPwa } from "@/hooks/useIsPwa";

/**
 * Los atajos de arriba a la derecha del panel de tiendas, en computadora.
 *
 * El mismo molde que la barra de digitales (`app/digitales/BarraDeAtajos`),
 * pedido por Flavio el 03/10/26: lo que se usa todos los días, a un toque y
 * sin entrar a ninguna pantalla. Lo que cambia respecto de digitales, y por qué:
 *
 *   - "Ver mi tienda" en vez del botón de tema: el panel de tiendas no tiene
 *     modo oscuro, y lo que una dueña de tienda mira todo el tiempo es cómo
 *     quedó su tienda.
 *   - Sin la variante de "plan lleno": el tope de productos de Tienda Pro es
 *     1.000 (`PRO_MAX_PRODUCTS`) y la tienda más grande tiene decenas. Un botón
 *     para un caso que no pasa sería código que nadie prueba.
 *   - Favoritos y Ayuda se quedan: ya estaban en esta barra y se usan.
 *
 * En el celular no se dibuja: la barra de arriba del celular ya tiene
 * favoritos, ayuda y campanita, y el resto está en el cajón.
 */
export default function BarraDeAtajosTienda({
  userId, userName, isVerified, storeSlug, storeType, onTour,
}: {
  userId?: string | null;
  userName?: string | null;
  isVerified: boolean;
  /** `null` mientras no llegó: el botón de ver la tienda espera a tenerlo. */
  storeSlug: string | null;
  storeType: string | null;
  onTour: () => void;
}) {
  const pathname = usePathname();
  const esDeAutos = storeType === "AUTOS";
  const yaEstaCreando = pathname.startsWith("/dashboard/productos/nuevo");
  return (
    <div data-print="ocultar" className="hidden lg:flex justify-end items-center gap-1.5 px-4 pt-3 pb-0 shrink-0">
      {/* Estando en el formulario de alta no se ofrece crear otro: el botón
          llevaría a la misma pantalla y no pasaría nada. */}
      {!yaEstaCreando && (
        <Link
          href="/dashboard/productos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> {esDeAutos ? "Nuevo vehículo" : "Nuevo producto"}
        </Link>
      )}
      {storeSlug && (
        <a
          href={`/tienda/${storeSlug}`}
          target="_blank"
          rel="noreferrer"
          title="Abre tu tienda en otra pestaña, como la ven tus clientes"
          className="mr-1 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <ExternalLink className="h-4 w-4" /> Ver mi tienda
        </a>
      )}
      <FavoritesDrawer buttonClassName="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500" />
      <HelpButton onStartTour={onTour} />
      {userId && <NotificationBell userId={userId} />}
      <MenuDeCuenta userName={userName} isVerified={isVerified} />
    </div>
  );
}

/**
 * La inicial con su menú: quién es, Mi perfil, Mi plan y salir.
 *
 * Se cierra al tocar afuera y con Escape. Cerrar sesión se apaga mientras
 * trabaja (un `ref` corta el doble click) y va al mismo destino que el de la
 * barra lateral: adentro de la app instalada se queda en `/dashboard`.
 */
function MenuDeCuenta({ userName, isVerified }: { userName?: string | null; isVerified: boolean }) {
  const { signOut } = useAuth();
  const inPwa = useIsPwa();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const saliendoRef = useRef(false);
  const caja = useRef<HTMLDivElement>(null);
  const nombre = userName?.trim() || "Mi cuenta";

  useEffect(() => {
    if (!abierto) return;
    function afuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  async function salir() {
    if (saliendoRef.current) return;
    saliendoRef.current = true;
    setSaliendo(true);
    await signOut(inPwa ? "/dashboard" : "/login");
  }

  return (
    <div ref={caja} className="relative ml-1">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Tu cuenta"
        className="flex items-center gap-1 rounded-xl py-1 pl-1 pr-1.5 transition-colors hover:bg-gray-100"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
          {nombre[0].toUpperCase()}
          <BadgeCheck className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-full z-[70] mt-1.5 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl">
          <div className="border-b border-gray-100 px-3.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-bold text-gray-900">{nombre}</p>
            <p className={`text-[11.5px] font-medium ${isVerified ? "text-blue-600" : "text-gray-400"}`}>
              {isVerified ? "Tienda verificada" : "Tienda sin verificar"}
            </p>
          </div>
          <Link role="menuitem" href="/dashboard/perfil" onClick={() => setAbierto(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <UserRound className="h-4 w-4 text-gray-400" /> Mi perfil
          </Link>
          <Link role="menuitem" href="/dashboard/mi-plan" onClick={() => setAbierto(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <CreditCard className="h-4 w-4 text-gray-400" /> Mi plan
          </Link>
          <div className="my-1 h-px bg-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void salir()}
            disabled={saliendo}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {saliendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {saliendo ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
