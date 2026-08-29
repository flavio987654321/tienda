"use client";

import { useEffect, useState, useCallback, useRef, useId, useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag, Package, Users, TrendingUp, Store, Settings, LogOut,
  BarChart2, Tag, Loader2, MessageCircle, BadgeCheck, ChevronRight,
  CreditCard, Menu, X, Wallet, AlertTriangle, Bell, ShoppingCart, Star, LayoutGrid, BadgePercent,
  Download,
} from "lucide-react";
import { STORE_TYPES } from "@/lib/storeTypes";
import { useAuth } from "@/components/AuthProvider";
import { useIsPwa } from "@/hooks/useIsPwa";
import { AppLogo } from "@/components/AppLogo";
import NotificationBell from "@/components/NotificationBell";
import HelpButton from "@/components/HelpButton";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import AsistenteIA from "@/components/dashboard/AsistenteIA";
import TourGuide from "@/components/TourGuide";
import { GUION_PANEL, TOUR_PANEL_KEY } from "@/components/tours";
import TermsUpdateBanner from "@/components/TermsUpdateBanner";

const LEADS_STORE_TYPES = ["AUTOS"];

/* Los rubros que entregan un archivo descargable. Se deriva de la bandera del
   rubro y no se escribe a mano como la de arriba: un rubro nuevo que entregue
   por descarga aparece acá solo, sin que nadie se acuerde de volver a este
   archivo. (LEADS_STORE_TYPES es de antes y quedó así; se puede derivar igual
   el día que se toque.) */
const ARCHIVO_STORE_TYPES = STORE_TYPES.filter((t) => t.requiereArchivo).map((t) => t.id);

// Suscripción a los eventos online/offline del navegador para useSyncExternalStore.
// A nivel de módulo para que la referencia sea estable entre renders.
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

type NavItem = {
  href: string;
  label: string;
  labelFor?: Record<string, string>;
  icon: React.ElementType;
  exact?: boolean;
  onlyFor?: string[];
  hiddenFor?: string[];
  tourId?: string;
};

/* Los avisos ya vienen clasificados y con texto desde lib/avisos-tienda. Antes
   acá llegaban tres booleanos sueltos y este archivo decidía por su cuenta a qué
   item del menú correspondía cada uno y qué tan grave era, con un mapeo escrito
   a mano que había que mantener en sintonía con el endpoint. Ahora el aviso trae
   su propia `seccion` y su propio `nivel`, y acá solo se dibuja. */
type Aviso = {
  id: string;
  nivel: "rojo" | "amarillo";
  seccion: string;
  titulo: string;
  detalle: string;
  href: string;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard",            label: "Inicio",     icon: TrendingUp,    exact: true, tourId: "inicio" },
      { href: "/dashboard/pedidos",    label: "Pedidos",    icon: ShoppingBag,   tourId: "pedidos",   hiddenFor: LEADS_STORE_TYPES },
      { href: "/dashboard/consultas",  label: "Consultas",  icon: MessageCircle, onlyFor: LEADS_STORE_TYPES, tourId: "consultas" },
      { href: "/dashboard/productos",  label: "Productos",  icon: Package,       tourId: "productos", labelFor: { AUTOS: "Vehículos" } },
      /* Descargas: sólo para los rubros que entregan un archivo, y sólo con la
         bandera prendida. Lo segundo es para poder mergear el rubro entero sin
         que ninguna dueña lo vea todavía — el mismo mecanismo que Aplicaciones.
         Se habilita con NEXT_PUBLIC_DIGITALES_ENABLED=1. */
      ...(process.env.NEXT_PUBLIC_DIGITALES_ENABLED === "1"
        ? [{ href: "/dashboard/descargas", label: "Descargas", icon: Download, tourId: "descargas", onlyFor: ARCHIVO_STORE_TYPES }]
        : []),
      { href: "/dashboard/cupones",        label: "Cupones",        icon: Tag,   tourId: "cupones",   hiddenFor: LEADS_STORE_TYPES },
      { href: "/dashboard/promociones",    label: "Promociones",    icon: BadgePercent, tourId: "promociones", hiddenFor: LEADS_STORE_TYPES },
      { href: "/dashboard/carritos-abandonados", label: "Carritos abandonados", icon: ShoppingCart, tourId: "carritos-abandonados", hiddenFor: LEADS_STORE_TYPES },
      { href: "/dashboard/vendedoras",     label: "Afiliados",      icon: Users,         tourId: "afiliados" },
      { href: "/dashboard/resenas",         label: "Reseñas",        icon: Star,  tourId: "resenas", hiddenFor: LEADS_STORE_TYPES },
      { href: "/dashboard/notificaciones", label: "Notificaciones", icon: Bell, tourId: "notificaciones" },
    ],
  },
  {
    label: "Mi tienda",
    items: [
      { href: "/dashboard/configuracion", label: "Diseño",         icon: Store,     tourId: "diseno" },
      { href: "/dashboard/ajustes",       label: "Configuración",  icon: Settings,  tourId: "configuracion" },
      // Sección Aplicaciones oculta hasta el lanzamiento (App Review de Meta
      // pendiente) — se habilita seteando NEXT_PUBLIC_APPS_ENABLED=1.
      ...(process.env.NEXT_PUBLIC_APPS_ENABLED === "1"
        ? [{ href: "/dashboard/aplicaciones", label: "Aplicaciones", icon: LayoutGrid, tourId: "aplicaciones" }]
        : []),
      { href: "/dashboard/pagos",         label: "Pagos",          icon: Wallet,    tourId: "pagos", labelFor: { AUTOS: "Legal" } },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/metricas",  label: "Estadísticas", icon: BarChart2,  tourId: "metricas" },
      { href: "/dashboard/mi-plan",   label: "Mi plan",      icon: CreditCard, tourId: "mi-plan" },
    ],
  },
];

export default function DashboardLayout({
  children,
  userName,
  userId,
  initialPendingAffiliateCount = 0,
  initialLowStockCount = 0,
  avisosIniciales,
  fullHeight = false,
  hideHelp = false,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userId?: string | null;
  initialPendingAffiliateCount?: number;
  initialLowStockCount?: number;
  /* Los avisos ya calculados por la pantalla, para no volver a pedirlos. Cuando
     no vienen, el layout los busca solo con el fetch de más abajo — así las
     pantallas que todavía no los pasan siguen andando igual. */
  avisosIniciales?: Aviso[];
  fullHeight?: boolean;
  hideHelp?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const instanceId = useId();

  const [pendingAffiliateCount, setPendingAffiliateCount] = useState(initialPendingAffiliateCount);
  const [lowStockCount, setLowStockCount] = useState(initialLowStockCount);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  const [newCartsCount, setNewCartsCount] = useState(0);
  const [storeType, setStoreType] = useState<string | null>(null);
  // Arranca en false, no en null: mientras no sepamos, el tour NO se abre.
  // Al revés se abriría durante la espera del fetch, que es el escenario malo.
  const [rubroElegido, setRubroElegido] = useState(false);
  // Estado online/offline vía useSyncExternalStore (patrón canónico de React para
  // suscribirse a una fuente externa del navegador). El snapshot de servidor es
  // "online" para no romper la hidratación; en el cliente lee navigator.onLine.
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [showTour, setShowTour] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>(avisosIniciales ?? []);

  // Cerrar el menú mobile y resincronizar los contadores cuando cambian sus
  // fuentes (ruta / props del servidor) — ajuste durante el render en vez de
  // un efecto, evita un re-render en cascada (react-hooks/set-state-in-effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }
  const [prevInitialPendingAffiliateCount, setPrevInitialPendingAffiliateCount] = useState(initialPendingAffiliateCount);
  if (initialPendingAffiliateCount !== prevInitialPendingAffiliateCount) {
    setPrevInitialPendingAffiliateCount(initialPendingAffiliateCount);
    setPendingAffiliateCount(initialPendingAffiliateCount);
  }
  const [prevInitialLowStockCount, setPrevInitialLowStockCount] = useState(initialLowStockCount);
  if (initialLowStockCount !== prevInitialLowStockCount) {
    setPrevInitialLowStockCount(initialLowStockCount);
    setLowStockCount(initialLowStockCount);
  }

  /* Adentro de la app instalada, el logo lleva al inicio DEL PANEL y no a la web
     comercial. Afuera sigue yendo a la home, que es lo que se espera de un sitio.
     Nadie instala el panel para visitar la página de ventas: con `href="/"` un
     toque en el logo te dejaba navegando tiendaapps.com adentro de la app, sin
     barra de direcciones y sin forma de volver (ver `useIsPwa`). */
  const inPwa = useIsPwa();
  const hrefLogo = inPwa ? "/dashboard" : "/";

  /* Se perdió la sesión con el panel abierto: venció, o la cerraron en otra
     pestaña del mismo navegador.
     Afuera de la app se va a `/login`, como siempre. Adentro NO se puede:
     `/login` está fuera del scope del manifest y la app se comería la página
     comercial. Se recarga la misma url y el layout del servidor dibuja el login
     en el lugar (ver `PanelLogin`).
     El candado no es decorativo: si el servidor todavía viera la cookie que el
     cliente ya dio por muerta, volvería a dibujar el panel y esto recargaría de
     nuevo, dejando la app en un loop de recargas. Con el ref pasa una sola vez. */
  const sesionPerdida = useRef(false);
  useEffect(() => {
    if (status !== "unauthenticated" || sesionPerdida.current) return;
    sesionPerdida.current = true;
    if (inPwa) window.location.reload();
    else router.push("/login");
  }, [status, inPwa, router]);

  useEffect(() => {
    fetch("/api/verificacion")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.store?.isVerified) setIsVerified(true); })
      .catch(() => {});
  }, []);

  /* Solo si la pantalla no los trajo. Este fetch es una consulta entera a la
     base por cada visita a cualquier pantalla del panel, y cuando la pantalla ya
     los calculó en el servidor es el mismo trabajo hecho dos veces — medido,
     unos 850ms de ida y vuelta que no hacían falta. */
  const yaVinieron = avisosIniciales !== undefined;
  useEffect(() => {
    if (yaVinieron) return;
    fetch("/api/dashboard/warnings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (Array.isArray(d?.avisos)) setAvisos(d.avisos); })
      .catch(() => {});
  }, [yaVinieron]);

  /* El tour de la primera vez espera a que el rubro esté ELEGIDO, para no
     abrirse encima del modal que lo pregunta.
     La espera estaba puesta sobre `storeType`, y ese era el bug: en la base
     `tipoTienda` arranca con "ROPA" por defecto desde que se crea la tienda,
     así que en una cuenta recién hecha /api/pedidos ya devuelve un rubro, esta
     condición daba verdadera al instante y 1,4 s después el tour se abría
     arriba del modal de "¿qué vendés?", que seguía abierto porque nadie había
     elegido nada todavía. Los dos juntos, en la primera pantalla que ve una
     dueña nueva.
     Tener rubro y haberlo elegido son cosas distintas, y sólo la segunda la
     sabe `tipoTiendaConfigurado`. Es esa la que hay que mirar.

     Sin distinguir el ancho: antes pedía >= 1024 y en teléfono no aparecía
     nunca, ni siquiera al elegir el rubro. Ahora abajo de 1024 el tour abre el
     menú lateral y resalta los links de verdad, así que corre igual en los tres. */
  useEffect(() => {
    if (!rubroElegido) return;
    if (localStorage.getItem(TOUR_PANEL_KEY)) return;
    // Los 1,4 s le dan lugar al modal para guardar, refrescar y desmontarse.
    const t = setTimeout(() => setShowTour(true), 1400);
    return () => clearTimeout(t);
  }, [rubroElegido]);


  const fetchAffiliateCount = useCallback(() => {
    fetch("/api/vendedoras")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const n = Array.isArray(data?.affiliates)
          ? data.affiliates.filter((a: { status?: string }) => a.status === "PENDING").length
          : 0;
        setPendingAffiliateCount(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel(`dashboard-affiliates:${instanceId}`);
    ch.on("postgres_changes" as Parameters<typeof ch.on>[0], { event: "*", schema: "public", table: "Affiliate" }, () => fetchAffiliateCount());
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAffiliateCount, instanceId]);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setPendingOrderCount(data?.pendingCount ?? 0);
        if (data?.tipoTienda) setStoreType(data.tipoTienda);
        if (data?.tipoTiendaConfigurado) setRubroElegido(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onStoreTypeChanged(e: Event) {
      const newType = (e as CustomEvent<{ newType: string }>).detail?.newType;
      if (newType) setStoreType(newType);
      // El modal sólo emite esto cuando la dueña confirmó: si estaba eligiendo
      // por primera vez, acá es donde el rubro pasa a estar elegido de verdad
      // y recién ahora el tour tiene permiso para arrancar.
      setRubroElegido(true);
    }
    window.addEventListener("store-type-changed", onStoreTypeChanged);
    return () => window.removeEventListener("store-type-changed", onStoreTypeChanged);
  }, []);

  useEffect(() => {
    if (!storeType || !LEADS_STORE_TYPES.includes(storeType)) return;
    fetch("/api/leads?status=PENDING&count=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPendingLeadsCount(data?.count ?? 0))
      .catch(() => {});
  }, [storeType]);

  // Carritos abandonados con actividad desde la última visita. Se espera a saber
  // el tipo de tienda porque las de consultas no tienen carrito: sin este guard,
  // una tienda que cambió de rubro encendería el puntito del menú mobile por
  // carritos viejos de un link que ya ni se muestra.
  //
  // Estando parado en la página no se pregunta: como este fetch espera a storeType,
  // llegaba después del "ya lo vi" que manda la propia página y volvía a prender el
  // puntito con el número viejo. Y como el layout no se vuelve a montar al navegar,
  // quedaba encendido hasta recargar. Depender de pathname también lo refresca al
  // moverse por el panel, que antes solo pasaba una vez por montaje.
  useEffect(() => {
    if (!storeType || LEADS_STORE_TYPES.includes(storeType)) return;
    if (pathname.startsWith("/dashboard/carritos-abandonados")) return;
    fetch("/api/dashboard/carritos-abandonados/nuevos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setNewCartsCount(data?.count ?? 0))
      .catch(() => {});
  }, [storeType, pathname]);

  // La página de carritos avisa que ya se vio; el puntito se apaga sin recargar.
  useEffect(() => {
    function onSeen() { setNewCartsCount(0); }
    window.addEventListener("abandoned-carts-seen", onSeen);
    return () => window.removeEventListener("abandoned-carts-seen", onSeen);
  }, []);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  /* Solo los ROJOS llegan al menú. El amarillo se ve al entrar a la sección.
     El menú está siempre en pantalla: unos cuantos triangulitos amarillos fijos
     se vuelven empapelado en una semana, y para cuando aparezca uno rojo de
     verdad ya nadie mira los triángulos. */
  function getWarning(href: string): Aviso | null {
    return avisos.find((a) => a.nivel === "rojo" && a.seccion === href) ?? null;
  }

  const avisoNoVerificada = avisos.find((a) => a.id === "cuenta-sin-verificar") ?? null;

  // Qué contador y de qué color lleva cada link, en un solo lugar. Rojo = alguien
  // espera que le contestes, naranja = alerta de stock, amarillo = entró algo
  // nuevo para atender.
  const badges: Record<string, { count: number; color: string }> = {
    "/dashboard/vendedoras": { count: pendingAffiliateCount, color: "bg-red-500" },
    "/dashboard/consultas":  { count: pendingLeadsCount,     color: "bg-red-500" },
    "/dashboard/productos":  { count: lowStockCount,         color: "bg-orange-500" },
    "/dashboard/pedidos":    { count: pendingOrderCount,     color: "bg-yellow-500" },
    "/dashboard/carritos-abandonados": { count: newCartsCount, color: "bg-yellow-500" },
  };

  function getBadge(href: string) {
    const badge = badges[href];
    const count = badge?.count ?? 0;
    return { has: count > 0, count, color: badge?.color ?? "bg-gray-400" };
  }

  const anyBadge = Object.values(badges).some((b) => b.count > 0);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -60) setMobileOpen(false);
    touchStartX.current = null;
  }

  function filterItems(items: NavItem[]) {
    return items.filter(({ onlyFor, hiddenFor }) => {
      if (onlyFor && !(storeType && onlyFor.includes(storeType))) return false;
      if (hiddenFor && storeType && hiddenFor.includes(storeType)) return false;
      return true;
    });
  }

  function resolveLabel(item: NavItem): string {
    if (item.labelFor && storeType && item.labelFor[storeType]) return item.labelFor[storeType];
    return item.label;
  }

  function renderDesktopLink(item: NavItem) {
    const { href, icon: Icon, exact, tourId } = item;
    const label = resolveLabel(item);
    const active = isActive(href, exact);
    const { has, count, color } = getBadge(href);
    const hasWarning = getWarning(href);
    return (
      <Link
        key={href}
        href={href}
        {...(tourId ? { "data-tour": tourId } : {})}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={`flex-1 whitespace-nowrap overflow-hidden transition-[max-width] duration-200 ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`}>
          {label}
        </span>
        {/* Warning icon — visible only in expanded state.
            `title` para que diga QUÉ pasa: hasta ahora era un ícono mudo. */}
        {hasWarning && !has && (
          <span title={hasWarning.titulo} className="hidden group-hover:block shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          </span>
        )}
        {/* Numeric badge or warning dot */}
        {(has || hasWarning) && (
          <>
            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${has ? color : "bg-red-500"} group-hover:hidden`} />
            {has && (
              <span className={`hidden group-hover:inline-flex shrink-0 min-w-5 rounded-full ${color} px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white`}>
                {count > 9 ? "9+" : count}
              </span>
            )}
          </>
        )}
      </Link>
    );
  }

  function renderMobileLink(item: NavItem, onNavigate: () => void) {
    const { href, icon: Icon, exact, tourId } = item;
    const label = resolveLabel(item);
    const active = isActive(href, exact);
    const { has, count, color } = getBadge(href);
    const hasWarning = getWarning(href);
    return (
      <Link
        key={href}
        href={href}
        {...(tourId ? { "data-tour": tourId } : {})}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98] ${
          active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {/* En el celular hay ancho de sobra: el aviso dice qué pasa en vez de ser
            un triángulo mudo como en el menú de escritorio, donde no entra. */}
        <span className="flex-1 min-w-0">
          {label}
          {hasWarning && (
            <span className="block text-[11px] font-normal leading-tight text-red-600 truncate">
              {hasWarning.titulo}
            </span>
          )}
        </span>
        {hasWarning && !has && (
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        {has && (
          <span className={`shrink-0 min-w-5 rounded-full ${color} px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  }

  return (
    // `data-panel-root`: al imprimir hay que devolverle el flujo normal a esta
    // caja (ver el bloque @media print de globals.css). En pantalla es del alto
    // de la ventana con el scroll adentro; en papel eso sería una sola hoja.
    <div data-panel-root className="h-screen bg-gray-50 flex overflow-hidden text-gray-900 [color-scheme:light]">

      {/* ── DESKTOP Sidebar (lg+) ─────────────────────────────────────────── */}
      <aside data-tour-scope="panel-desktop" className={`group hidden lg:flex fixed left-0 top-0 h-full bg-white border-r border-gray-100 flex-col z-[60] transition-[width] duration-200 overflow-hidden ${showTour ? "w-60 shadow-xl" : "w-14 hover:w-60 hover:shadow-xl"}`}>
        <Link href={hrefLogo} className="flex items-center gap-3 h-[61px] px-[15px] border-b border-gray-100 shrink-0 hover:bg-gray-50 transition-colors">
          <AppLogo size={52} className="shrink-0" />
          <span className={`font-bold text-gray-900 whitespace-nowrap overflow-hidden transition-[max-width] duration-200 ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`}>
            TiendaApps
          </span>
        </Link>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {NAV_GROUPS.map((group, gi) => {
            const visible = filterItems(group.items);
            if (visible.length === 0) return null;
            return (
              <div key={gi}>
                {gi > 0 && (
                  <div className="flex items-center gap-2 pt-3 pb-1 px-1">
                    <div className="h-px bg-gray-100 flex-1" />
                    {group.label && (
                      <span className={`overflow-hidden transition-[max-width] duration-200 text-[10px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`}>
                        {group.label}
                      </span>
                    )}
                    <div className="h-px bg-gray-100 flex-1" />
                  </div>
                )}
                <div className="space-y-0.5">
                  {visible.map(renderDesktopLink)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <button
            onClick={async () => { setSigningOut(true); await signOut(inPwa ? "/dashboard" : "/login"); }}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
            <span className={`whitespace-nowrap overflow-hidden transition-[max-width] duration-200 ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`}>
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </span>
          </button>
          <Link
            href="/dashboard/perfil"
            title={isVerified ? "Mi perfil — Verificado" : "Mi perfil"}
            className="flex items-center gap-2.5 px-1 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
          >
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {(userName ?? "U")[0].toUpperCase()}
              </div>
              <BadgeCheck className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-white rounded-full ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden transition-[max-width] duration-200 ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`}>
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-gray-800 truncate whitespace-nowrap">{userName}</p>
                {avisoNoVerificada && (
                  <span title={avisoNoVerificada.titulo}><AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" /></span>
                )}
              </div>
              <p className="text-[10px] text-indigo-400 font-medium whitespace-nowrap">Ver perfil →</p>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 text-gray-300 shrink-0 overflow-hidden transition-[max-width] duration-200 ${showTour ? "max-w-xs" : "max-w-0 group-hover:max-w-xs"}`} />
          </Link>
          {!isOnline && (
            <div className="mx-2 mb-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
              <p className="text-[11px] font-semibold text-orange-600 leading-tight">Sin conexión</p>
              <p className="text-[10px] text-orange-400 leading-tight">Los datos pueden estar desactualizados</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE Top Bar (< lg) ────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] h-14 bg-white border-b border-gray-100 flex items-center justify-between px-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-gray-600" />
          {anyBadge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <Link href={hrefLogo} className="flex items-center gap-2">
          <AppLogo size={52} />
          <span className="font-bold text-gray-900 text-sm">TiendaApps</span>
        </Link>

        <div className="flex items-center gap-1">
          <FavoritesDrawer buttonClassName="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500" />
          {/* En Diseño la pantalla trae su propia ayuda, con el tour del editor:
              dos `?` pegados abriendo guías distintas confunden más de lo que
              ayudan. En escritorio ya estaba escondido más abajo; acá faltaba
              el mismo corte para mobile. */}
          {!pathname.startsWith("/dashboard/configuracion") && (
            <HelpButton onStartTour={() => setShowTour(true)} />
          )}
          {userId && <NotificationBell userId={userId} />}
        </div>
      </header>

      {/* ── MOBILE Drawer (< lg) ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          {/* Durante el tour el velo lo pone el propio resaltado (el calado que
              deja el ítem a pleno color): dos capas oscuras encimadas dejaban
              todo casi negro. */}
          <div
            className={`absolute inset-0 ${showTour ? "" : "bg-black/40 backdrop-blur-[2px]"}`}
            onClick={() => setMobileOpen(false)}
          />
          <div
            data-tour-scope="panel-mobile"
            className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col shadow-2xl animate-slide-in-left"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 shrink-0">
              <Link href={hrefLogo} className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-600" />
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
              {NAV_GROUPS.map((group, gi) => {
                const visible = filterItems(group.items);
                if (visible.length === 0) return null;
                return (
                  <div key={gi}>
                    {gi > 0 && (
                      <div className="pt-3 pb-1 px-3">
                        {group.label && (
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {group.label}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {visible.map((item) => renderMobileLink(item, () => setMobileOpen(false)))}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="p-3 border-t border-gray-100 space-y-0.5 shrink-0">
              <button
                onClick={async () => { setSigningOut(true); await signOut(inPwa ? "/dashboard" : "/login"); }}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
              >
                {signingOut ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <LogOut className="h-5 w-5 shrink-0" />}
                <span>{signingOut ? "Cerrando..." : "Cerrar sesión"}</span>
              </button>
              <Link
                href="/dashboard/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 active:bg-indigo-100 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base">
                    {(userName ?? "U")[0].toUpperCase()}
                  </div>
                  <BadgeCheck className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-white rounded-full ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
                    {avisoNoVerificada && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-indigo-400 font-medium">Ver mi perfil →</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </Link>
              {!isOnline && (
                <div className="mt-1 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-orange-600">Sin conexión</p>
                  <p className="text-[11px] text-orange-400 leading-tight mt-0.5">Los datos pueden estar desactualizados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Guided Tour ──────────────────────────────────────────────────── */}
      {showTour && (
        <TourGuide
          guion={GUION_PANEL}
          ambito={{ desktop: "panel-desktop", mobile: "panel-mobile" }}
          storageKey={TOUR_PANEL_KEY}
          respaldo={{
            title: "Bienvenido a tu panel",
            body: "Desde el menú lateral llegás a tus productos, pedidos, cupones y al diseño de tu tienda. Abrilo cuando quieras y explorá con calma.",
          }}
          onDone={() => setShowTour(false)}
          storeType={storeType}
          onMenu={setMobileOpen}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className={`lg:ml-14 flex-1 flex flex-col bg-gray-50 pt-14 lg:pt-0 overflow-x-hidden ${fullHeight ? "overflow-hidden h-full" : "overflow-y-auto"}`}>
        {!hideHelp && !pathname.startsWith("/dashboard/configuracion") && (
          // Favoritos, ayuda y campanita son botones del panel, no del informe:
          // impresos quedan tres iconos sueltos arriba de todo.
          <div data-print="ocultar" className="hidden lg:flex justify-end items-center gap-1 px-4 pt-3 pb-0 shrink-0">
            <FavoritesDrawer buttonClassName="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500" />
            <HelpButton onStartTour={() => setShowTour(true)} />
            {userId && <NotificationBell userId={userId} />}
          </div>
        )}
        <div className={`flex-1 ${fullHeight ? "overflow-hidden min-h-0" : "p-4 pt-2"}`}>
          {!fullHeight && <TermsUpdateBanner />}
          {children}
        </div>
      </main>

      {userId && <AsistenteIA userId={userId} />}
    </div>
  );
}
