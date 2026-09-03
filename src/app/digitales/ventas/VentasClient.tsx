"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LinkDelPanel as Link } from "../SalidaSinGuardar";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, ShoppingBag,
  CheckCircle2, Clock, Ban, Download, AlertTriangle, Send,
} from "lucide-react";

/**
 * La lista de ventas y sus filtros.
 *
 * ── Por qué el filtro vive en la dirección y no en un `useState` ────────────
 *
 * Porque el servidor es el que pagina. Con el estado acá, cada filtro tendría que
 * pedir de nuevo a mano, el botón atrás no volvería al filtro anterior y el link
 * no se podría mandar por WhatsApp. Con la dirección, las tres cosas salen
 * gratis: los filtros son `<Link>` y el buscador escribe la misma dirección.
 *
 * ── Por qué se ve una TARJETA por venta y no una tabla ──────────────────────
 *
 * Porque hay que leerlo en el celular. Una tabla de seis columnas a 360 px se
 * arruga o se va de costado, y el dato que más se busca —cuánto me quedó— queda
 * fuera de la pantalla. La tarjeta pone el importe arriba y a la derecha, donde
 * el ojo lo encuentra sin scrollear.
 */

export type LineaDeVenta = {
  id: string;
  producto: string;
  esBono: boolean;
  esUpsell: boolean;
  /** Cuántas veces se bajó. `null` = esa línea no tiene archivo entregado. */
  bajadas: number | null;
  tope: number | null;
  ultima: string | null;
  vencido: boolean;
};

export type VentaEnPantalla = {
  id: string;
  fecha: string;
  estado: "COBRADA" | "ESPERANDO" | "CANCELADA";
  total: number;
  comision: number;
  neto: number;
  comprador: string;
  nombre: string | null;
  lineas: LineaDeVenta[];
};

export type Resumen = {
  ventas: number;
  bruto: number;
  neto: number;
  ventasDelMes: number;
  brutoDelMes: number;
  sinBajar: number;
  esperando: number;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const FILTROS = [
  { clave: null, label: "Todas" },
  { clave: "cobradas", label: "Cobradas" },
  { clave: "esperando", label: "Sin pagar" },
  { clave: "canceladas", label: "Canceladas" },
] as const;

/** Arma la dirección de la pantalla con lo que cambia y deja el resto igual. */
function direccion(cambios: { estado?: string | null; q?: string; pagina?: number }) {
  const p = new URLSearchParams();
  if (cambios.estado) p.set("estado", cambios.estado);
  if (cambios.q) p.set("q", cambios.q);
  /* La página 1 no se escribe: es la dirección limpia, la que se comparte. */
  if (cambios.pagina && cambios.pagina > 1) p.set("pagina", String(cambios.pagina));
  const cola = p.toString();
  return cola ? `/digitales/ventas?${cola}` : "/digitales/ventas";
}

export default function VentasClient({
  ventas, resumen, filtro, q, pagina, paginas,
}: {
  ventas: VentaEnPantalla[];
  resumen: Resumen;
  filtro: string | null;
  q: string;
  pagina: number;
  paginas: number;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [buscando, arrancar] = useTransition();

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    /* Se recorta acá también, no sólo en el servidor: sin esto, un espacio
       suelto se convierte en `?q=+` y la pantalla dice "no encontramos nada"
       cuando en realidad no se buscó nada. Y al buscar se vuelve a la página 1:
       quedarse en la 3 de un resultado que tiene una sola es una lista vacía sin
       explicación. */
    arrancar(() => router.push(direccion({ estado: filtro, q: texto.trim().slice(0, 120) })));
  }

  function limpiar() {
    setTexto("");
    arrancar(() => router.push(direccion({ estado: filtro })));
  }

  return (
    <>
      {/* ── El resumen ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato titulo="Te quedó" valor={plata(resumen.neto)} pie={`de ${plata(resumen.bruto)} vendidos`} fuerte />
        <Dato titulo="Ventas" valor={String(resumen.ventas)} pie={resumen.ventas === 1 ? "cobrada" : "cobradas"} />
        <Dato titulo="Este mes" valor={plata(resumen.brutoDelMes)} pie={`${resumen.ventasDelMes} ${resumen.ventasDelMes === 1 ? "venta" : "ventas"}`} />
        <Dato titulo="Sin bajar" valor={String(resumen.sinBajar)} pie={resumen.sinBajar === 1 ? "archivo pago" : "archivos pagos"} />
      </div>

      {/* Un aviso, no una tarjeta más: es lo único del resumen sobre lo que hay
          algo para hacer. Aparece sólo cuando de verdad hay algo sin bajar. */}
      {resumen.sinBajar > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/25 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Hay {resumen.sinBajar} {resumen.sinBajar === 1 ? "archivo pago que nadie bajó" : "archivos pagos que nadie bajó"} todavía.
            Suele ser el mail que se fue a spam: escribile a quien compró y pasale el enlace de nuevo.
          </span>
        </p>
      )}

      {/* ── Filtros y búsqueda ──────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => {
          const activo = (f.clave ?? null) === (filtro ?? null);
          return (
            <Link
              key={f.label}
              href={direccion({ estado: f.clave, q })}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                activo
                  ? "bg-orange-600 text-white"
                  : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-800 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300"
              }`}
            >
              {f.label}
              {f.clave === "esperando" && resumen.esperando > 0 && (
                <span className={`ml-1.5 ${activo ? "opacity-80" : "text-orange-500"}`}>{resumen.esperando}</span>
              )}
            </Link>
          );
        })}
      </div>

      <form onSubmit={buscar} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            /* El tope es el mismo que corta el servidor. Puesto sólo allá, el
               campo deja escribir de más y la búsqueda recorta sin avisar. */
            maxLength={120}
            placeholder="Buscar por correo o nombre"
            aria-label="Buscar una venta por correo o nombre"
            className="w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 py-2.5 pl-9 pr-9 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none"
          />
          {texto && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Limpiar la búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          /* Se apaga mientras viaja: sin esto, apretar Enter tres veces manda tres
             navegaciones a la misma dirección. */
          disabled={buscando}
          className="shrink-0 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2.5 text-sm font-semibold text-white panel-oscuro:text-gray-900 transition-opacity disabled:opacity-50"
        >
          {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </form>

      {/* ── La lista ────────────────────────────────────────────────────── */}
      {ventas.length === 0 ? (
        <Vacio hayFiltro={!!filtro || !!q} />
      ) : (
        <div className="mt-5 space-y-3">
          {ventas.map((v) => <Venta key={v.id} v={v} />)}
        </div>
      )}

      {/* ── Las páginas ─────────────────────────────────────────────────── */}
      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Paso
            href={direccion({ estado: filtro, q, pagina: pagina - 1 })}
            puede={pagina > 1}
            lado="antes"
          />
          <span className="text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            Página {pagina} de {paginas}
          </span>
          <Paso
            href={direccion({ estado: filtro, q, pagina: pagina + 1 })}
            puede={pagina < paginas}
            lado="despues"
          />
        </div>
      )}
    </>
  );
}

function Dato({ titulo, valor, pie, fuerte }: {
  titulo: string; valor: string; pie: string; fuerte?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 ${
      fuerte
        ? "border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10"
        : "border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900"
    }`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">{titulo}</p>
      {/* `break-words` porque un importe de siete cifras a 360 px se sale de la
          tarjeta y empuja la grilla entera. */}
      <p className={`mt-1 break-words text-lg font-black leading-tight ${
        fuerte ? "text-orange-700 panel-oscuro:text-orange-300" : "text-gray-900 panel-oscuro:text-gray-100"
      }`}>
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 panel-oscuro:text-gray-400">{pie}</p>
    </div>
  );
}

const CHIPS = {
  COBRADA: { Icon: CheckCircle2, texto: "Cobrada", clase: "bg-green-50 panel-oscuro:bg-green-500/10 text-green-700 panel-oscuro:text-green-300" },
  ESPERANDO: { Icon: Clock, texto: "Sin pagar", clase: "bg-amber-50 panel-oscuro:bg-amber-500/10 text-amber-700 panel-oscuro:text-amber-300" },
  CANCELADA: { Icon: Ban, texto: "Cancelada", clase: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400" },
} as const;

/**
 * Una venta, con su botón de reenviar.
 *
 * ── Por qué el estado del reenvío vive ACÁ y no arriba ──────────────────────
 *
 * Porque es de esta fila. Con un `useState` en la lista habría que llevar "cuál
 * está mandando" y "qué le pasó a cuál" en dos mapas, y el aviso de una venta
 * aparecería debajo de otra el día que la lista se reordene.
 */
function Venta({ v }: { v: VentaEnPantalla }) {
  const { Icon, texto, clase } = CHIPS[v.estado];
  const [mandando, setMandando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  /* ⚠️ El freno del doble click. `useState` no alcanza: dos clics seguidos leen
     el mismo `false` antes de que React vuelva a dibujar, y salen los dos —
     dos mails al mismo comprador y dos de sus tres reenvíos del día quemados.
     Con un `ref` el segundo ve el `true` en el mismo instante. */
  const enVuelo = useRef(false);

  async function reenviar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setMandando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/digitales/ventas/${v.id}/reenviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setAviso({ ok: false, texto: d.error ?? "No pudimos mandarlo. Probá de nuevo." });
      } else {
        setAviso({
          ok: true,
          texto: d.renovados > 0
            /* Se dice cuando el enlace estaba vencido: es un cambio real en lo
               que esa persona puede hacer, no un detalle técnico. */
            ? "Mail reenviado, y le renovamos el enlace por 30 días más."
            : "Mail reenviado.",
        });
      }
    } catch {
      setAviso({ ok: false, texto: "No pudimos conectarnos. Probá de nuevo." });
    }
    enVuelo.current = false;
    setMandando(false);
  }

  return (
    <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${clase}`}>
              <Icon className="h-3 w-3" /> {texto}
            </span>
            <span className="text-[11.5px] text-gray-400">{v.fecha}</span>
          </div>
          {/* `break-all` en el correo: hay direcciones larguísimas sin un solo
              espacio, y a 360 px son las que rompen el ancho de la tarjeta. */}
          <p className="mt-1.5 break-all text-sm font-semibold text-gray-900 panel-oscuro:text-gray-100">
            {v.comprador || "sin correo"}
          </p>
          {v.nombre && (
            <p className="text-[12px] text-gray-500 panel-oscuro:text-gray-400">{v.nombre}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-black text-gray-900 panel-oscuro:text-gray-100">{plata(v.total)}</p>
          {/* La comisión sólo se nombra cuando se cobró de verdad. En una venta
              que nadie pagó, "te queda" es un número que no existe. */}
          {v.estado === "COBRADA" && v.comision > 0 && (
            <p className="text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
              te quedó <span className="font-bold text-orange-600">{plata(v.neto)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
        {v.lineas.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="min-w-0 flex-1 truncate text-[13px] text-gray-700 panel-oscuro:text-gray-300">
              {l.producto}
              {l.esBono && <Etiqueta>bono</Etiqueta>}
              {l.esUpsell && <Etiqueta>upsell</Etiqueta>}
            </p>
            <Descargas l={l} />
          </div>
        ))}
      </div>

      {/* ── Reenviar ─────────────────────────────────────────────────────
          Sólo en las cobradas: en una que nadie pagó no hay nada que mandar.
          Es la única acción de esta pantalla, y existe porque hasta acá quien
          vendía veía la venta y no la podía tocar: si el mail se iba a spam, no
          había ningún camino de vuelta para quien había pagado. */}
      {v.estado === "COBRADA" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
          <button
            type="button"
            onClick={reenviar}
            disabled={mandando}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
          >
            {mandando
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />}
            {mandando ? "Mandando…" : "Reenviar el mail"}
          </button>

          {aviso && (
            /* `role="status"` y no `alert`: es la respuesta a algo que la persona
               apretó, no una interrupción. Un lector de pantalla lo anuncia
               cuando termina de leer lo que estaba leyendo. */
            <p
              role="status"
              className={`min-w-0 text-[12px] ${
                aviso.ok
                  ? "text-green-700 panel-oscuro:text-green-400"
                  : "text-red-600 panel-oscuro:text-red-400"
              }`}
            >
              {aviso.texto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded bg-gray-100 panel-oscuro:bg-gray-800 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
      {children}
    </span>
  );
}

/** El estado de descarga de una línea, en una línea. */
function Descargas({ l }: { l: LineaDeVenta }) {
  /* Sin permiso no se inventa nada: puede ser una línea sin archivo (un bono que
     es sólo una promesa) o una venta que todavía no se acreditó. Decir "0 de 5"
     ahí sería afirmar que hay un archivo esperando. */
  if (l.bajadas === null || l.tope === null) {
    return <span className="shrink-0 text-[11.5px] text-gray-400">—</span>;
  }
  if (l.vencido) {
    return (
      <span className="shrink-0 text-[11.5px] font-semibold text-gray-400">
        enlace vencido
      </span>
    );
  }
  if (l.bajadas === 0) {
    return (
      <span className="shrink-0 text-[11.5px] font-semibold text-amber-600 panel-oscuro:text-amber-400">
        sin bajar
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
      <Download className="h-3 w-3" />
      {l.bajadas} de {l.tope}
      {l.ultima && <span className="text-gray-400">· {l.ultima}</span>}
    </span>
  );
}

function Vacio({ hayFiltro }: { hayFiltro: boolean }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 px-6 py-12 text-center">
      <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-gray-300" />
      {hayFiltro ? (
        <>
          <p className="text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">No hay ventas con eso</p>
          <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            Probá con otro filtro, o sacá la búsqueda.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">Todavía no vendiste nada</p>
          <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            Cuando alguien compre, la venta aparece acá sola — con el correo de quien compró
            y si llegó a bajar el archivo.
          </p>
        </>
      )}
    </div>
  );
}

function Paso({ href, puede, lado }: { href: string; puede: boolean; lado: "antes" | "despues" }) {
  const clase = "inline-flex items-center gap-1 rounded-xl border border-gray-200 panel-oscuro:border-gray-800 px-3 py-2 text-[13px] font-semibold text-gray-600 panel-oscuro:text-gray-400";
  /* Cuando no se puede, es un `<span>` y no un `<button disabled>`: no hay nada
     que apretar ni ninguna acción que esperar, es el borde de la lista. */
  if (!puede) return <span className={`${clase} opacity-40`}>{lado === "antes" ? <ChevronLeft className="h-4 w-4" /> : null}{lado === "antes" ? "Anterior" : "Siguiente"}{lado === "despues" ? <ChevronRight className="h-4 w-4" /> : null}</span>;
  return (
    <Link href={href} className={`${clase} hover:border-orange-300 hover:text-orange-600 transition-colors`}>
      {lado === "antes" && <ChevronLeft className="h-4 w-4" />}
      {lado === "antes" ? "Anterior" : "Siguiente"}
      {lado === "despues" && <ChevronRight className="h-4 w-4" />}
    </Link>
  );
}
