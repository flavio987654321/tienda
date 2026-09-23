"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck, Eye, Search,
  Package, ArrowLeft, LayoutGrid, Shirt, Car,
  Home, Utensils, Store,
} from "lucide-react";
import { STORE_TYPES } from "@/lib/storeTypes";
import type { TiendaDirectorio } from "@/lib/tiendasDirectorio";
import type { LucideIcon } from "lucide-react";

type StoreItem = TiendaDirectorio;

const TYPE_ICONS: Record<string, LucideIcon> = {
  TODAS:     LayoutGrid,
  ROPA:      Shirt,
  AUTOS:     Car,
  HOGAR_TECH: Home,
  GASTRONOMIA: Utensils,
  GENERAL:   Store,
};

const ALL_TAB = { id: "TODAS", label: "Todas" };
const tabs = [ALL_TAB, ...STORE_TYPES.map((t) => ({ id: t.id, label: t.label }))];

/**
 * La tapa de la tarjeta.
 *
 * ── Acá vivía un `<iframe>` con la tienda entera adentro ─────────────────────
 *
 * Hasta el 23/09/26 cada tarjeta metía `/tienda/<slug>` en un iframe de 1280px
 * escalado al 25%. O sea que abrir el directorio cargaba una copia COMPLETA de
 * cada tienda publicada, todas a la vez. Tres cosas salían mal:
 *
 * 1. Casi nunca llegaba a dibujarse: en el listado de verdad las tapas se veían
 *    grises. La foto que mostraba el directorio era un rectángulo vacío.
 * 2. En el celular mostraba el diseño de ESCRITORIO apretado —el iframe mide
 *    1280 y se achica—, que es algo que ningún visitante ve nunca.
 * 3. Pagábamos la tienda entera (fuentes, fotos, JavaScript) para mostrar una
 *    estampilla de 150 píxeles.
 *
 * Y todo eso teniendo la imagen buena al alcance de la mano: `listarTiendas` ya
 * manda el hero de su landing, la foto del último producto, el banner y el logo.
 * Llegaban a la tarjeta y no los usaba nadie. Es el mismo orden que ya elige la
 * imagen de OpenGraph en `api/og/store/[slug]`, así que la tapa del directorio y
 * la que se ve al compartir el link ahora muestran lo mismo.
 *
 * ── Por qué `next/image` y no un `<img>` ────────────────────────────────────
 *
 * Porque lo sirve achicado al tamaño real de la tarjeta en vez de bajar la foto
 * original del hero —que pesa lo que pesa un fondo de pantalla— y lo cachea. En
 * este proyecto eso no es un detalle: lo que se paga de Supabase es el egress.
 *
 * Si la imagen no carga —se borró del bucket, la URL quedó vieja— el `onError`
 * cae al respaldo de color en vez de dejar el hueco.
 *
 * ⚠️ Eso NO cubre un dominio que `next.config` no tenga permitido, o al menos no
 * en desarrollo: ahí el cargador de imágenes tira error antes de dibujar nada y
 * se lleva puesta la pantalla entera (en producción sí cae al respaldo). Hoy
 * todas las fotos salen de Supabase y de unsplash, que están permitidos; si
 * algún día se acepta una URL de afuera, el dominio hay que agregarlo allá y no
 * confiar en este respaldo.
 */
function TapaDeTienda({ store }: { store: StoreItem }) {
  const [fallo, setFallo] = useState(false);
  const imagen = store.heroImg || store.coverImg || store.banner || store.logo;

  if (!imagen || fallo) {
    /* Sin foto: el color de la tienda y su inicial. Prolijo y reconocible, en vez
       del gris de "acá falta algo". */
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${store.primaryColor} 0%, ${store.primaryColor}99 100%)` }}
      >
        <span className="text-white/90 text-3xl font-black">{store.name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <Image
      src={imagen}
      alt=""
      fill
      /* Dos por fila en el celular y hasta cuatro en escritorio: sin esto el
         navegador se baja la imagen para el ancho entero de la pantalla. */
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      className="object-cover"
      onError={() => setFallo(true)}
    />
  );
}

export default function TiendasPage({ tiendasIniciales }: { tiendasIniciales: StoreItem[] }) {
  // Arranca CON las tiendas puestas, no vacío: son las que el servidor ya
  // dibujó en el HTML. Si arrancara vacío, React borraría del DOM las tarjetas
  // que acaban de llegar para volver a poner los esqueletos, y el visitante
  // vería parpadear la página entera por nada.
  const [allStores, setAllStores] = useState<StoreItem[]>(tiendasIniciales);
  const [loading, setLoading] = useState(tiendasIniciales.length === 0);
  const [tipo, setTipo] = useState("TODAS");
  const [search, setSearch] = useState("");

  // Sólo si el servidor no pudo traerlas (la base caída, por ejemplo). En el
  // camino normal no se pide nada: el dato ya vino con la página.
  useEffect(() => {
    if (tiendasIniciales.length > 0) return;
    fetch("/api/stores?limit=100")
      .then((r) => r.json())
      .then((data) => setAllStores(data.stores ?? []))
      .finally(() => setLoading(false));
  }, [tiendasIniciales.length]);

  const searchFiltered = search.trim()
    ? allStores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : allStores;

  const groups = STORE_TYPES
    .map((t) => ({ ...t, stores: searchFiltered.filter((s) => s.tipoTienda === t.id) }))
    .filter((g) => g.stores.length > 0);

  const visibleGroups = tipo === "TODAS" ? groups : groups.filter((g) => g.id === tipo);

  /* Dos por fila en el celular, tres en tablet y cuatro en escritorio. Es la
     misma grilla para las tarjetas y para los esqueletos: si fueran distintas,
     al terminar de cargar se reacomodaría todo de golpe. */
  const GRILLA = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4";

  return (
    <div className="min-h-screen bg-[#f8f7f5]">
      <style>{`
        .store-card { transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s cubic-bezier(.4,0,.2,1); }
        .store-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.10); }
      `}</style>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#f8f7f5]/95 backdrop-blur-md border-b border-black/5">
        {/* Top row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors group shrink-0">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold tracking-widest uppercase hidden sm:block">TiendaApps</span>
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="w-full bg-white border border-black/8 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {/* Los rubros, en los renglones que hagan falta.

            Antes eran una tira que se corría al costado, con una flechita en cada
            punta. En 360 se veían dos y medio: para enterarse de que existía
            "Gastronomía" había que adivinar que eso se arrastraba. Son seis y
            entran en dos renglones; mostrarlos todos de una es más corto que
            cualquier gesto. */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = tipo === tab.id;
            const Icon = TYPE_ICONS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setTipo(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all duration-150 ${
                  active
                    ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                    : "bg-white text-gray-500 border-black/8 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {loading ? (
          <div className="space-y-10">
            {[1, 2].map((s) => (
              <div key={s}>
                <div className="h-6 w-40 bg-gray-200 rounded-full animate-pulse mb-5" />
                <div className={GRILLA}>
                  {[1, 2, 3, 4].map((c) => (
                    <div key={c} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-black/5">
                      <div className="aspect-[4/3] bg-gray-100" />
                      <div className="p-3 sm:p-4 space-y-2.5">
                        <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-600 mb-2">
              {search ? "Sin resultados para esa búsqueda" : "Todavía no hay tiendas en esta categoría"}
            </h2>
            <p className="text-gray-400 text-sm mb-7">
              {search ? "Probá con otro nombre." : "¡Sé el primero en abrir una!"}
            </p>
            <Link href="/registro" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">
              Crear mi tienda
            </Link>
          </div>
        ) : (
          visibleGroups.map((group) => {
            const Icon = TYPE_ICONS[group.id];

            return (
              <section key={group.id}>
                {/* Título */}
                <div className="flex items-center gap-2.5 mb-5">
                  {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-white border border-black/8 flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="h-4 w-4 text-gray-700" />
                    </div>
                  )}
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{group.label}</h2>
                  <span className="text-xs text-gray-400 font-medium">
                    {group.stores.length} tienda{group.stores.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className={GRILLA}>
                  {group.stores.map((store) => {
                    const StoreIcon = TYPE_ICONS[store.tipoTienda];
                    return (
                      <Link
                        key={store.id}
                        href={`/tienda/${store.slug}`}
                        className="store-card bg-white rounded-2xl overflow-hidden border border-black/[0.06] group block"
                      >
                        <div className="relative overflow-hidden aspect-[4/3] bg-gray-50">
                          <TapaDeTienda store={store} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                          {store.isVerified && (
                            <div className="absolute top-2 right-2">
                              {/* En 360 la tarjeta mide media pantalla: ahí la
                                  chapita entera comía el ancho, así que queda el
                                  tilde solo y el texto aparece desde tablet. */}
                              <div className="flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 sm:px-2 py-1 rounded-full shadow">
                                <BadgeCheck className="h-3 w-3" />
                                <span className="hidden sm:inline">Verificado</span>
                              </div>
                            </div>
                          )}
                          {StoreIcon && (
                            <div className="absolute top-2 left-2 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 shadow-sm flex items-center justify-center">
                              <StoreIcon className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="h-0.5" style={{ backgroundColor: store.primaryColor + "80" }} />
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-bold text-gray-900 text-sm leading-snug truncate group-hover:text-indigo-600 transition-colors">
                              {store.name}
                            </h3>
                            <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: store.primaryColor }} />
                          </div>
                          {store.description && (
                            <p className="text-xs text-gray-400 line-clamp-1 mb-3">{store.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-[11px] text-gray-400 font-medium">
                              {store.totalProducts} producto{store.totalProducts !== 1 ? "s" : ""}
                            </span>
                            {/* "Ver tienda" se esconde en el celular: al lado del
                                contador no entraba y se pisaban. La tarjeta
                                entera es el link, así que no se pierde nada. */}
                            <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                              <Eye className="h-3.5 w-3.5" />
                              Ver tienda
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
