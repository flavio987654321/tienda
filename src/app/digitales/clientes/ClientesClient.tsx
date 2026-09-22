"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Mail, MessageCircle, Receipt, Repeat, AlertTriangle, BellOff, Users,
} from "lucide-react";
import { direccionDeClientes, LARGO_MAXIMO_DE_BUSQUEDA, type ClienteEnPantalla, type ResumenDeClientes } from "@/lib/clientes-digitales";
import { mensajeParaElComprador, enlaceDeMail, enlaceDeWhatsApp } from "@/lib/ventas-digitales";

/**
 * La lista de clientes. Sin estado propio salvo el texto del buscador y qué
 * fila está abierta: la búsqueda y la página viajan en la dirección y las
 * resuelve el servidor, como en Ventas (mismo motivo: el link se comparte,
 * atrás funciona, recargar no pierde nada).
 *
 * Cada fila es una persona; abierta, muestra su historial de compras. Los
 * botones de escribirle usan el MISMO texto que la venta (`lib/ventas-
 * digitales`): si tiene algo sin bajar, el mensaje es el de "¿te llegó el
 * mail?"; si no, el de "¿cómo te fue?". A quien pidió la baja no se le
 * ofrece el mail: se marca, y punto.
 */
export default function ClientesClient({ clientes, resumen, q, pagina, paginas }: {
  clientes: ClienteEnPantalla[];
  resumen: ResumenDeClientes;
  q: string;
  pagina: number;
  paginas: number;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const [buscando, arrancar] = useTransition();
  const [abierto, setAbierto] = useState<string | null>(null);

  const ir = (cambios: { q?: string; pagina?: number }) => direccionDeClientes({ q, ...cambios });

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    arrancar(() => router.push(ir({ q: texto.trim().slice(0, LARGO_MAXIMO_DE_BUSQUEDA), pagina: 1 })));
  }
  function limpiar() {
    setTexto("");
    arrancar(() => router.push(ir({ q: "", pagina: 1 })));
  }

  return (
    <>
      {/* ── Los números ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Dato titulo="Clientes" valor={String(resumen.clientes)} pie={resumen.clientes === 1 ? "persona que te compró" : "personas que te compraron"} fuerte />
        <Dato titulo="Repiten" valor={String(resumen.repiten)} pie={resumen.repiten === 1 ? "compró más de una vez" : "compraron más de una vez"} />
        <Dato titulo="Sin bajar" valor={String(resumen.sinBajar)} pie={resumen.sinBajar === 1 ? "no bajó lo que pagó" : "no bajaron lo que pagaron"} />
      </div>

      {resumen.sinBajar > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-200 panel-oscuro:border-amber-500/25 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {resumen.sinBajar === 1 ? "Hay una persona que pagó y no bajó su archivo" : `Hay ${resumen.sinBajar} personas que pagaron y no bajaron su archivo`}.
            Suele ser el mail en spam: abrí su fila y escribile, el mensaje ya está armado.
          </span>
        </p>
      )}

      {/* ── Buscar ──────────────────────────────────────────────────────── */}
      <form onSubmit={buscar} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LARGO_MAXIMO_DE_BUSQUEDA}
            placeholder="Buscar por correo o nombre"
            aria-label="Buscar un cliente por correo o nombre"
            className="w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 py-2.5 pl-9 pr-9 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none"
          />
          {texto && (
            <button type="button" onClick={limpiar} aria-label="Limpiar la búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={buscando}
          className="shrink-0 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-4 py-2.5 text-sm font-semibold text-white panel-oscuro:text-gray-900 transition-opacity disabled:opacity-50"
        >
          {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </form>

      {/* ── La lista ────────────────────────────────────────────────────── */}
      {clientes.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300 panel-oscuro:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-gray-700 panel-oscuro:text-gray-300">
            {q ? `No encontramos a nadie con «${q}»` : "Todavía nadie te compró"}
          </p>
          <p className="mt-1 text-[13px] text-gray-500 panel-oscuro:text-gray-400">
            {q ? "Probá con otra parte del correo o del nombre." : "Cuando alguien pague, aparece acá con sus compras y si bajó lo suyo."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {clientes.map((c) => (
            <Fila key={c.id} c={c} abierta={abierto === c.id} alTocar={() => setAbierto(abierto === c.id ? null : c.id)} />
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Paso href={ir({ pagina: pagina - 1 })} puede={pagina > 1} lado="antes" />
          <span className="text-[13px] text-gray-500 panel-oscuro:text-gray-400">Página {pagina} de {paginas}</span>
          <Paso href={ir({ pagina: pagina + 1 })} puede={pagina < paginas} lado="despues" />
        </div>
      )}
    </>
  );
}

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function Fila({ c, abierta, alTocar }: { c: ClienteEnPantalla; abierta: boolean; alTocar: () => void }) {
  const mensaje = mensajeParaElComprador({ nombre: c.nombre, producto: c.ultimoProducto, sinBajar: c.sinBajar > 0 });
  const whatsapp = enlaceDeWhatsApp(c.telefono, mensaje);
  return (
    <li className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900">
      <button
        type="button"
        onClick={alTocar}
        aria-expanded={abierta}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 panel-oscuro:bg-orange-500/10 text-sm font-black text-orange-700 panel-oscuro:text-orange-300">
          {inicial(c)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{c.nombre ?? c.email}</span>
            {c.compras >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 panel-oscuro:bg-green-500/10 px-2 py-0.5 text-[11px] font-bold text-green-700 panel-oscuro:text-green-300">
                <Repeat className="h-3 w-3" /> Repite
              </span>
            )}
            {c.sinBajar > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 panel-oscuro:bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-800 panel-oscuro:text-amber-200">
                <AlertTriangle className="h-3 w-3" /> {c.sinBajar === 1 ? "Sin bajar" : `${c.sinBajar} sin bajar`}
              </span>
            )}
            {c.dioDeBaja && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 panel-oscuro:bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-gray-500 panel-oscuro:text-gray-400" title="Pidió no recibir más mails tuyos">
                <BellOff className="h-3 w-3" /> Sin mails
              </span>
            )}
          </span>
          {c.nombre && <span className="block truncate text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">{c.email}</span>}
          <span className="mt-1 block text-[12.5px] text-gray-600 panel-oscuro:text-gray-300">
            {c.compras === 1 ? "1 compra" : `${c.compras} compras`} · te quedó <strong className="font-bold text-gray-900 panel-oscuro:text-gray-100">{plata(c.neto)}</strong>
            {c.devoluciones > 0 && <> · {c.devoluciones === 1 ? "1 devolución" : `${c.devoluciones} devoluciones`}</>}
            <span className="text-gray-400"> · última el {c.ultima}</span>
          </span>
        </span>
        {abierta ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />}
      </button>

      {abierta && (
        <div className="border-t border-gray-100 panel-oscuro:border-gray-800 px-4 py-3.5">
          {/* Qué hacer con esta persona. El mail no se ofrece a quien pidió la
              baja: el link seguiría andando, pero ofrecerlo es invitar a
              escribirle a alguien que dijo que no. */}
          <div className="flex flex-wrap gap-2">
            {!c.dioDeBaja && (
              <a href={enlaceDeMail(c.email, mensaje)} className={BOTON}>
                <Mail className="h-3.5 w-3.5" /> {c.sinBajar > 0 ? "Preguntarle si le llegó" : "Escribirle"}
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BOTON}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            <Link href={`/digitales/ventas?q=${encodeURIComponent(c.email)}`} className={BOTON}>
              <Receipt className="h-3.5 w-3.5" /> Ver sus ventas
            </Link>
          </div>
          {c.dioDeBaja && (
            <p className="mt-2 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
              Pidió no recibir más mails tuyos: no va a recibir tus correos a compradores ni recordatorios. Lo de su compra le llega igual.
            </p>
          )}

          <p className="mt-4 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
            Sus compras · desde el {c.primera}
          </p>
          <ul className="mt-1.5 divide-y divide-gray-100 panel-oscuro:divide-gray-800">
            {c.historial.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-800 panel-oscuro:text-gray-200">{h.producto}{h.conUpsell ? " + upsell" : ""}</span>
                  <span className="block text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                    {h.fecha}
                    {h.estado === "DEVUELTA" ? " · devuelta" : h.sinBajar > 0 ? ` · ${h.sinBajar === 1 ? "un archivo sin bajar" : `${h.sinBajar} archivos sin bajar`}` : " · bajado"}
                  </span>
                </span>
                <span className={`shrink-0 tabular-nums font-bold ${h.estado === "DEVUELTA" ? "text-gray-400 line-through" : "text-gray-900 panel-oscuro:text-gray-100"}`}>
                  {plata(h.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

const BOTON = "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3 py-2 text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300 hover:border-orange-300 hover:text-orange-700 panel-oscuro:hover:text-orange-300 transition-colors";

function inicial(c: ClienteEnPantalla): string {
  const base = c.nombre ?? c.email;
  return base.trim().charAt(0).toUpperCase() || "?";
}

function Dato({ titulo, valor, pie, fuerte }: { titulo: string; valor: string; pie: string; fuerte?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${fuerte
      ? "border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10"
      : "border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900"}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">{titulo}</p>
      <p className={`mt-1 break-words text-lg font-black leading-tight ${fuerte ? "text-orange-700 panel-oscuro:text-orange-300" : "text-gray-900 panel-oscuro:text-gray-100"}`}>{valor}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">{pie}</p>
    </div>
  );
}

function Paso({ href, puede, lado }: { href: string; puede: boolean; lado: "antes" | "despues" }) {
  const clase = "inline-flex items-center gap-1 rounded-xl border border-gray-200 panel-oscuro:border-gray-800 px-3 py-2 text-[13px] font-semibold text-gray-600 panel-oscuro:text-gray-400";
  if (!puede) return <span className={`${clase} opacity-40`}>{lado === "antes" ? <ChevronLeft className="h-4 w-4" /> : null}{lado === "antes" ? "Anterior" : "Siguiente"}{lado === "despues" ? <ChevronRight className="h-4 w-4" /> : null}</span>;
  return (
    <Link href={href} className={`${clase} hover:border-orange-300 hover:text-orange-600 transition-colors`}>
      {lado === "antes" && <ChevronLeft className="h-4 w-4" />}
      {lado === "antes" ? "Anterior" : "Siguiente"}
      {lado === "despues" && <ChevronRight className="h-4 w-4" />}
    </Link>
  );
}
