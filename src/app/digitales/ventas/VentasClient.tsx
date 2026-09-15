"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LinkDelPanel as Link } from "../SalidaSinGuardar";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, ShoppingBag,
  CheckCircle2, Clock, Ban, Download, AlertTriangle, ArrowRight, Mail, MessageCircle, FileDown, Lock,
} from "lucide-react";
import {
  RANGOS_VENTAS, NOMBRE_RANGO_VENTAS, direccionDeVentas,
  mensajeParaElComprador, enlaceDeMail, enlaceDeWhatsApp,
} from "@/lib/ventas-digitales";
import { COPY_DIGITAL } from "@/lib/planes-digitales";
import { DESDE_QUE_PLAN } from "@/lib/estadisticas-digitales";
import BotonReenviar from "./BotonReenviar";

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
 *
 * ── Escribirle ──────────────────────────────────────────────────────────────
 *
 * Cada venta cobrada tiene un botón para escribirle a quien compró. Es un
 * `mailto:` con el mensaje ya escrito —distinto si bajó el archivo o no—, y un
 * chat de WhatsApp si dejó un teléfono que parece un celular. No manda nada
 * solo: abre el correo de la persona con el borrador, y ella lo cambia y lo manda.
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
  telefono: string | null;
  lineas: LineaDeVenta[];
};

/** Un principal vivo, para el selector de arriba. */
export type ProductoDelFiltro = { id: string; name: string };

/** Los números de arriba: del producto y el rango elegidos. */
export type Resumen = {
  ventas: number;
  bruto: number;
  neto: number;
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

export default function VentasClient({
  ventas, resumen, filtro, q, rango, pagina, paginas, productos, elegido, puedeExportar,
}: {
  ventas: VentaEnPantalla[];
  resumen: Resumen;
  filtro: string | null;
  q: string;
  rango: string;
  pagina: number;
  paginas: number;
  productos: ProductoDelFiltro[];
  elegido: string | null;
  puedeExportar: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [buscando, arrancar] = useTransition();

  /** La dirección con lo que ya está elegido, cambiando sólo lo que se pasa. */
  const ir = (cambios: { p?: string | null; estado?: string | null; q?: string; rango?: string | null; pagina?: number }) =>
    direccionDeVentas({ p: elegido, estado: filtro, q, rango, ...cambios });

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    /* Se recorta acá también, no sólo en el servidor: sin esto, un espacio
       suelto se convierte en `?q=+` y la pantalla dice "no encontramos nada"
       cuando en realidad no se buscó nada. Y al buscar se vuelve a la página 1:
       quedarse en la 3 de un resultado que tiene una sola es una lista vacía sin
       explicación. */
    arrancar(() => router.push(ir({ q: texto.trim().slice(0, 120) })));
  }

  function limpiar() {
    setTexto("");
    arrancar(() => router.push(ir({ q: "" })));
  }

  const nombreDelElegido = productos.find((prod) => prod.id === elegido)?.name ?? null;
  const nombreDelRango = NOMBRE_RANGO_VENTAS[rango as keyof typeof NOMBRE_RANGO_VENTAS] ?? "Todo";
  const hayFiltro = !!filtro || !!q || !!elegido || rango !== "todo";

  return (
    <>
      {/* ── Por producto ────────────────────────────────────────────────────
          Sólo con más de una página: con una, "Todos" y el producto son lo
          mismo. El elegido viaja en la dirección con el resto, y los cuatro
          números de abajo son los de ese producto. En el celular la fila se
          desplaza de costado en vez de apilarse: con seis productos, apilados
          empujan el resumen fuera de la pantalla. */}
      {productos.length > 1 && (
        <Fila>
          <Chip href={ir({ p: null })} activo={!elegido}>Todos</Chip>
          {productos.map((prod) => (
            <Chip key={prod.id} href={ir({ p: prod.id })} activo={elegido === prod.id}>{prod.name}</Chip>
          ))}
        </Fila>
      )}

      {/* ── Por fecha ───────────────────────────────────────────────────────
          Los rangos de quien hace cuentas: "este mes" y "el mes pasado" son
          los que se cotejan contra lo que liquidó Mercado Pago. */}
      <Fila>
        {RANGOS_VENTAS.map((r) => (
          <Chip key={r} href={ir({ rango: r })} activo={rango === r}>{NOMBRE_RANGO_VENTAS[r]}</Chip>
        ))}
      </Fila>

      {/* ── El resumen ──────────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato titulo="Te quedó" valor={plata(resumen.neto)} pie={`de ${plata(resumen.bruto)} vendidos`} fuerte />
        <Dato titulo="Ventas" valor={String(resumen.ventas)} pie={nombreDelElegido ?? (rango === "todo" ? (resumen.ventas === 1 ? "cobrada" : "cobradas") : nombreDelRango.toLowerCase())} />
        <Dato titulo="Sin bajar" valor={String(resumen.sinBajar)} pie={resumen.sinBajar === 1 ? "archivo pago" : "archivos pagos"} />
        <Dato titulo="Sin pagar" valor={String(resumen.esperando)} pie={resumen.esperando === 1 ? "compra a medias" : "compras a medias"} />
      </div>

      {/* Un aviso, no una tarjeta más: es lo único del resumen sobre lo que hay
          algo para hacer. Aparece sólo cuando de verdad hay algo sin bajar. */}
      {resumen.sinBajar > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/25 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Hay {resumen.sinBajar} {resumen.sinBajar === 1 ? "archivo pago que nadie bajó" : "archivos pagos que nadie bajó"} todavía.
            Suele ser el mail que se fue a spam: escribile a quien compró con el botón de cada venta, o reenviale el mail.
          </span>
        </p>
      )}

      {/* ── Filtros, búsqueda y exportar ──────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => {
          const activo = (f.clave ?? null) === (filtro ?? null);
          return (
            <Link
              key={f.label}
              href={ir({ estado: f.clave })}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                activo
                  ? "bg-orange-600 text-white"
                  : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-800 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        {/* Bajar la lista que se está mirando —mismos filtros— como planilla.
            Un enlace a la ruta: el navegador baja el archivo. Con candado en
            Free, como el de Estadísticas; la ruta vuelve a mirar el plan. Y
            apagado cuando la lista está vacía: un botón que baja una planilla
            sin filas parece roto. El candado manda sobre el apagado. */}
        {puedeExportar && ventas.length === 0 ? (
          <span
            aria-disabled="true"
            title="Nada para exportar todavía"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-800 px-2.5 py-1.5 text-[12px] font-semibold text-gray-300 panel-oscuro:text-gray-600"
          >
            <FileDown className="h-3.5 w-3.5" /> Exportar
          </span>
        ) : puedeExportar ? (
          <a
            href={`/api/digitales/ventas/exportar${ir({}).replace("/digitales/ventas", "")}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-400"
          >
            <FileDown className="h-3.5 w-3.5" /> Exportar
          </a>
        ) : (
          <Link
            href="/digitales/mi-cuenta"
            aria-label={`Exportar: disponible desde ${COPY_DIGITAL[DESDE_QUE_PLAN.exportar].nombre}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 panel-oscuro:border-gray-700 px-2.5 py-1.5 text-[12px] font-semibold text-gray-400 panel-oscuro:text-gray-500"
          >
            <Lock className="h-3.5 w-3.5 text-orange-500" /> Exportar<span className="hidden sm:inline"> · desde {COPY_DIGITAL[DESDE_QUE_PLAN.exportar].nombre}</span>
          </Link>
        )}
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
        <Vacio hayFiltro={hayFiltro} />
      ) : (
        <div className="mt-5 space-y-3">
          {ventas.map((v) => <Venta key={v.id} v={v} />)}
        </div>
      )}

      {/* ── Las páginas ─────────────────────────────────────────────────── */}
      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Paso href={ir({ pagina: pagina - 1 })} puede={pagina > 1} lado="antes" />
          <span className="text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            Página {pagina} de {paginas}
          </span>
          <Paso href={ir({ pagina: pagina + 1 })} puede={pagina < paginas} lado="despues" />
        </div>
      )}
    </>
  );
}

/** Una fila de chips que en el celular se desplaza de costado. */
function Fila({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-2 overflow-x-auto">
      <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">{children}</div>
    </div>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`shrink-0 max-w-[180px] truncate rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
        activo
          ? "bg-gray-900 panel-oscuro:bg-gray-100 text-white panel-oscuro:text-gray-900"
          : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-800 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300"
      }`}
    >
      {children}
    </Link>
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
 * Una venta, con su botón de reenviar y su entrada al detalle.
 *
 * ── Por qué el estado del reenvío vive en el botón y no acá ─────────────────
 *
 * Porque es de esa fila y de nadie más. Con un `useState` en la lista habría que
 * llevar "cuál está mandando" y "qué le pasó a cuál" en dos mapas, y el aviso de
 * una venta aparecería debajo de otra el día que la lista se reordene. El botón
 * se lleva su propio estado adentro — ver `BotonReenviar`, que además lo comparte
 * con el detalle.
 */
function Venta({ v }: { v: VentaEnPantalla }) {
  const { Icon, texto, clase } = CHIPS[v.estado];

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

      {/* ── Las acciones ─────────────────────────────────────────────────
          "Ver el detalle" va en TODAS, incluso en una cancelada: ahí es donde se
          ve por qué se canceló, y una devuelta es justo la que hay que poder
          abrir. Reenviar, en cambio, sólo en las cobradas: en una que nadie pagó
          no hay nada que mandar. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
        {v.estado === "COBRADA" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Escribirle v={v} />
            <BotonReenviar ordenId={v.id} />
          </div>
        ) : <span />}

        <Link
          href={`/digitales/ventas/${v.id}`}
          className="group inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-gray-500 panel-oscuro:text-gray-400 transition-colors hover:text-orange-600"
        >
          Ver el detalle
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Escribirle a quien compró: el correo con el mensaje ya escrito, y WhatsApp
 * si dejó un celular. El mensaje cambia si bajó el archivo o no; el producto
 * que se nombra es el principal, no el bono.
 */
function Escribirle({ v }: { v: VentaEnPantalla }) {
  if (!v.comprador) return null;
  const principal = v.lineas.find((l) => !l.esBono && !l.esUpsell) ?? v.lineas[0];
  const sinBajar = v.lineas.some((l) => l.bajadas === 0);
  const mensaje = mensajeParaElComprador({ nombre: v.nombre, producto: principal?.producto ?? "tu compra", sinBajar });
  const wa = enlaceDeWhatsApp(v.telefono, mensaje);
  const clase = "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-600";
  return (
    <>
      <a href={enlaceDeMail(v.comprador, mensaje)} className={clase}>
        <Mail className="h-3.5 w-3.5" /> Escribirle
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={clase} aria-label="Escribirle por WhatsApp">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
      )}
    </>
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
            Probá con otro filtro, otra fecha, o sacá la búsqueda.
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
