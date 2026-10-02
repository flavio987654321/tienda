"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Plus, Moon, Sun, UserRound, LogOut, Loader2, ChevronDown } from "lucide-react";
import { LinkDelPanel as Link } from "./SalidaSinGuardar";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/components/AuthProvider";
import { useIsPwa } from "@/hooks/useIsPwa";
import { ATRIBUTO_TEMA, EVENTO_TEMA, aplicarTema } from "@/lib/tema-digitales";
import { COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";

/**
 * Los atajos de arriba a la derecha del panel, en computadora.
 *
 * Lo que se usa todos los días, a un toque y sin entrar a ninguna pantalla:
 * crear un producto, los avisos, claro/oscuro y la cuenta. Pedido por Flavio el
 * 03/10/26, mirando la barra de la competencia. Se dejó afuera a propósito lo
 * que allá tienen y acá no suma: el selector de fechas (sólo sirve en Ventas y
 * Estadísticas, que ya tienen el suyo), "Actualizar" (el panel ya se actualiza
 * al moverse y los avisos llegan en vivo) y "Personalizar".
 *
 * En el celular va sólo la luna, en la barra de arriba que ya existe: el resto
 * está en el cajón, y cuatro botones más en 360 px no entran.
 */
/**
 * "Abrí armar un producto nuevo", para cuando el atajo se toca ESTANDO en
 * Productos. Ahí un link a `?nuevo=1` no alcanza: la segunda vez la dirección
 * es la misma que la primera, nada cambia y la ventana no se abría.
 */
export const EVENTO_NUEVO_PRODUCTO = "digitales-nuevo-producto";

export default function BarraDeAtajos({ userId, tier }: { userId: string; tier: TierDigital }) {
  const pathname = usePathname();
  return (
    <div className="hidden lg:flex justify-end items-center gap-1.5 px-4 pt-3 pb-0 shrink-0">
      <Link
        href="/digitales/productos?nuevo=1"
        onClick={(e) => {
          if (pathname !== "/digitales/productos") return;
          e.preventDefault();
          window.dispatchEvent(new Event(EVENTO_NUEVO_PRODUCTO));
        }}
        className="mr-1 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-orange-500"
      >
        <Plus className="h-4 w-4" /> Nuevo producto
      </Link>
      <NotificationBell userId={userId} />
      <BotonTema />
      <MenuDeCuenta tier={tier} />
    </div>
  );
}

function suscribirTema(avisar: () => void) {
  window.addEventListener(EVENTO_TEMA, avisar);
  return () => window.removeEventListener(EVENTO_TEMA, avisar);
}

/**
 * La luna / el sol. Muestra lo que se ESTÁ viendo (el atributo ya resuelto,
 * "automático" incluido) y al tocarlo elige el otro, a mano. Es el mismo ajuste
 * que Apariencia en Configuración: los dos escriben con `aplicarTema` y se
 * enteran del otro por `EVENTO_TEMA`.
 *
 * En el servidor dice "claro": el ícono puede cambiar un instante después de
 * cargar, pero nunca rompe la hidratación.
 */
export function BotonTema({ className = "" }: { className?: string }) {
  const oscuro = useSyncExternalStore(
    suscribirTema,
    () => document.documentElement.getAttribute(ATRIBUTO_TEMA) === "oscuro",
    () => false,
  );
  const texto = oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro";
  return (
    <button
      type="button"
      onClick={() => aplicarTema(oscuro ? "claro" : "oscuro")}
      aria-label={texto}
      title={texto}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:bg-gray-100 panel-oscuro:hover:bg-gray-800 ${className}`}
    >
      {oscuro ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

/**
 * La inicial con su menú: quién es, en qué plan está, Mi cuenta y salir.
 *
 * Se cierra al tocar afuera y con Escape. Cerrar sesión se apaga mientras
 * trabaja (un `ref` corta el doble click) y va al mismo destino que el de la
 * barra lateral: adentro de la app instalada se queda en `/digitales`.
 */
function MenuDeCuenta({ tier }: { tier: TierDigital }) {
  const { user, signOut } = useAuth();
  const inPwa = useIsPwa();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const enVuelo = useRef(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function afuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) { if (e.key === "Escape") setAbierto(false); }
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const nombre = user?.name || user?.email?.split("@")[0] || "Tu cuenta";
  const inicial = nombre.charAt(0).toUpperCase();

  async function salir() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setSaliendo(true);
    await signOut(inPwa ? "/digitales" : "/login");
  }

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Tu cuenta"
        className="flex items-center gap-1 rounded-xl py-1 pl-1 pr-1.5 transition-colors hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 panel-oscuro:bg-orange-500/15 text-[13px] font-bold text-orange-700 panel-oscuro:text-orange-300">
          {inicial}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[80] mt-1.5 w-60 overflow-hidden rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 shadow-xl"
        >
          <div className="border-b border-gray-100 panel-oscuro:border-gray-800 px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100">{nombre}</p>
            {user?.email && <p className="truncate text-[12px] text-gray-500 panel-oscuro:text-gray-400">{user.email}</p>}
            <p className="mt-1 text-[11px] font-semibold text-orange-600 panel-oscuro:text-orange-400">Plan {COPY_DIGITAL[tier].nombre}</p>
          </div>
          <Link
            href="/digitales/mi-cuenta"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 panel-oscuro:text-gray-300 transition-colors hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
          >
            <UserRound className="h-4 w-4" /> Mi cuenta y plan
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={salir}
            disabled={saliendo}
            className="flex w-full items-center gap-2.5 border-t border-gray-100 panel-oscuro:border-gray-800 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 disabled:opacity-60"
          >
            {saliendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {saliendo ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
