"use client";

import { useMemo, useRef, useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, Store, Globe, Smartphone,
  MessageCircle, DollarSign, LineChart, Archive, ShieldAlert,
} from "lucide-react";

export type SeccionConfig = {
  id: string;
  /** Título del grupo en el menú lateral. Las secciones con el mismo grupo van juntas, en el orden en que llegan. */
  grupo: string;
  label: string;
  descripcion: string;
  /* Palabras por las que el buscador tiene que encontrar la sección aunque no
     estén en el título ni en la descripción. Sin esto, buscar "instagram" no
     lleva a "Contacto", que es donde se cargan las redes, y el buscador queda
     sirviendo sólo para lo que ya sabés dónde está. */
  claves?: string[];
  contenido: React.ReactNode;
};

/* Los íconos se eligen acá por id y no llegan por props: `page.tsx` es un Server
   Component, y un componente de ícono es una función — no cruza el límite entre
   servidor y cliente. Lo que sí cruza son los strings y el contenido ya
   renderizado, que es todo lo que hay en `SeccionConfig`. */
const ICONOS: Record<string, React.ComponentType<{ className?: string }>> = {
  tienda: Store,
  web: Globe,
  contacto: MessageCircle,
  ventas: DollarSign,
  seo: LineChart,
  app: Smartphone,
  datos: Archive,
  peligro: ShieldAlert,
};

function normalizar(s: string) {
  // Sin tildes y en minúscula: acá se busca "descripcion" tanto como
  // "descripción", y en un teclado de celular la tilde es la primera que se cae.
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function ConfiguracionShell({ titulo, secciones, seccionInicial }: {
  titulo: string;
  secciones: SeccionConfig[];
  /* Con qué sección abrir, ya validada por la página. Viene del parámetro `?s=`
     y no de un `#hash` justamente para que la lea el servidor: con el hash había
     que corregir la sección desde un efecto después de montar, y eso pintaba
     primero la sección equivocada y después saltaba a la del link. */
  seccionInicial?: string;
}) {
  const [activaId, setActivaId] = useState(seccionInicial ?? secciones[0]?.id ?? "");
  const [busqueda, setBusqueda] = useState("");
  // En angosto no entran las dos columnas, así que se navega como en el celular
  // de Instagram: primero la lista, y al elegir se reemplaza por el contenido con
  // un "Volver". En ancho las dos conviven y esto no se mira.
  // Si se entró con `?s=`, se arranca directo en el detalle: quien llega por un
  // link a una sección viene a ver esa sección, no la lista.
  const [enDetalle, setEnDetalle] = useState(!!seccionInicial);
  const contenidoRef = useRef<HTMLDivElement>(null);

  function elegir(id: string) {
    setActivaId(id);
    setEnDetalle(true);
    // `replaceState` para que quede linkeable sin ensuciar el historial con una
    // entrada por cada click del menú.
    window.history.replaceState(null, "", `?s=${id}`);
    contenidoRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const activa = secciones.find((s) => s.id === activaId) ?? secciones[0];

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return secciones;
    return secciones.filter((s) =>
      normalizar([s.label, s.descripcion, s.grupo, ...(s.claves ?? [])].join(" ")).includes(q)
    );
  }, [busqueda, secciones]);

  /* Los grupos salen del orden en que llegan las secciones, no de una lista
     aparte: una lista aparte se desincroniza el día que se agrega una sección y
     nadie se acuerda de anotarla, y esa sección desaparece del menú sin avisar. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, SeccionConfig[]>();
    for (const s of filtradas) {
      const actual = mapa.get(s.grupo);
      if (actual) actual.push(s);
      else mapa.set(s.grupo, [s]);
    }
    return Array.from(mapa.entries());
  }, [filtradas]);

  return (
    <div className="lg:flex lg:items-start lg:gap-8">

      {/* ── Menú lateral ── */}
      <aside className={`lg:w-[270px] lg:shrink-0 lg:sticky lg:top-6 ${enDetalle ? "hidden lg:block" : "block"}`}>
        {/* El título encabeza la columna del menú, no una barra propia arriba de
            todo. La barra ocupaba un cuarto de pantalla para decir tres cosas
            que ya se saben —dónde estás—, y empujaba el contenido hacia abajo en
            una pantalla que ya es larga. Acá arranca pegado al primer ajuste. */}
        <h1 className="mb-4 px-1 text-2xl font-black tracking-tight text-slate-900">{titulo}</h1>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en configuración"
            aria-label="Buscar en configuración"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {grupos.length === 0 ? (
          <p className="px-1 py-6 text-sm text-slate-400">
            No hay nada que coincida con <span className="font-semibold text-slate-600">{busqueda}</span>.
          </p>
        ) : (
          <nav className="space-y-6">
            {grupos.map(([grupo, items]) => (
              <div key={grupo}>
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{grupo}</p>
                <ul className="space-y-0.5">
                  {items.map((s) => {
                    const Icono = ICONOS[s.id] ?? Store;
                    const esActiva = s.id === activaId;
                    const esPeligro = s.id === "peligro";
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => elegir(s.id)}
                          aria-current={esActiva ? "page" : undefined}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            esActiva
                              ? esPeligro ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-900"
                              : esPeligro ? "text-red-500 hover:bg-red-50/60" : "text-slate-600 hover:bg-slate-100/70"
                          }`}
                        >
                          <Icono className={`h-4 w-4 shrink-0 ${esActiva ? "" : "text-slate-400"}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 lg:hidden" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </aside>

      {/* ── Contenido ── */}
      <div ref={contenidoRef} className={`min-w-0 flex-1 ${enDetalle ? "block" : "hidden lg:block"}`}>
        <button
          onClick={() => setEnDetalle(false)}
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Configuración
        </button>

        {/* Se dibujan TODAS y se esconde la que no está activa, en vez de montar
            sólo la activa. Montando sólo una, cambiar de sección desmontaba la
            anterior y pasaban dos cosas feas: lo que estabas escribiendo sin
            guardar se perdía sin aviso, y lo que SÍ habías guardado volvía a
            aparecer con el valor viejo —cada tarjeta arranca su estado con lo
            que vino del servidor al cargar la página, que ya no era lo guardado—.
            Se veía como que el guardado no había funcionado.
            `hidden` es `display:none`, así que lo escondido tampoco recibe foco
            ni lo lee un lector de pantalla. */}
        {secciones.map((s) => (
          <div key={s.id} className={s.id === activa?.id ? "block" : "hidden"}>
            <div className="mb-6">
              <h2 className="text-xl font-black tracking-tight text-slate-900">{s.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{s.descripcion}</p>
            </div>
            <div className="space-y-3">{s.contenido}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
