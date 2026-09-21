"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Ticket, Trash2, Power } from "lucide-react";
import { validarCuponNuevo, normalizarCodigo, textoDelDescuento, aQuienesNoLesAlcanza, PORCENTAJE_MAXIMO, MINIMO_A_COBRAR, type TipoDeCupon } from "@/lib/cupones-digitales";
import { IDEAS_DE_CUPON, cuponDeLaIdea, CONSEJO_DE_CUPON } from "@/lib/plantillas-marketing";
import ConsejoDeUso from "../../ConsejoDeUso";
import { esCodigoDeOferta } from "@/lib/oferta-salida";
import { esCodigoDeBienvenida } from "@/lib/bienvenida";

export type CuponEnPantalla = {
  id: string;
  codigo: string;
  tipo: TipoDeCupon;
  valor: number;
  /** El nombre del producto, o null si vale para todos. */
  producto: string | null;
  vence: string | null;
  topeUsos: number | null;
  usos: number;
  activo: boolean;
  estado: "vivo" | "apagado" | "vencido" | "agotado";
};

const NOMBRE_ESTADO = { vivo: "Activo", apagado: "Apagado", vencido: "Vencido", agotado: "Agotado" } as const;
const CLASE_ESTADO = {
  vivo: "bg-green-50 panel-oscuro:bg-green-500/10 text-green-700 panel-oscuro:text-green-300",
  apagado: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400",
  vencido: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400",
  agotado: "bg-amber-50 panel-oscuro:bg-amber-500/10 text-amber-700 panel-oscuro:text-amber-300",
} as const;

const CLASE_INPUT = "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all";

/**
 * La lista y el formulario de crear. Las reglas de lo que se puede crear
 * están en `validarCuponNuevo`, la misma función que corre la ruta: acá se
 * avisa antes de mandar, allá se decide.
 */
export default function CuponesClient({ cupones, productos, tope, hoy }: {
  cupones: CuponEnPantalla[];
  productos: { id: string; name: string; price: number }[];
  tope: number;
  /** El día de hoy en Argentina, "YYYY-MM-DD": para calcular el vencimiento de las ideas. */
  hoy: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(cupones.length === 0);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<TipoDeCupon>("PORCENTAJE");
  const [valor, setValor] = useState("");
  const [productId, setProductId] = useState("");
  const [venceAt, setVenceAt] = useState("");
  const [topeUsos, setTopeUsos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [tocando, setTocando] = useState<string | null>(null);
  /* El problema se dice cuando la persona salió de un campo o intentó crear,
     no mientras escribe la segunda letra del código. */
  const [revisar, setRevisar] = useState(false);
  const enVuelo = useRef(false);

  const borrador = { codigo, tipo, valor, productId: productId || undefined, venceAt, topeUsos };

  /* Una idea carga el formulario y lo abre; la persona la cambia antes de
     crear. Es un borrador, no un botón de "crear": el código y el número
     los tiene que ver ella. */
  function usarIdea(clave: string) {
    const idea = IDEAS_DE_CUPON.find((i) => i.clave === clave);
    if (!idea) return;
    const c = cuponDeLaIdea(idea, hoy);
    setCodigo(c.codigo); setTipo(c.tipo); setValor(c.valor); setVenceAt(c.venceAt); setTopeUsos(c.topeUsos); setProductId("");
    setError(null);
    setAbierto(true);
  }
  const problema = codigo || valor ? (() => { const r = validarCuponNuevo(borrador); return r.ok ? null : r.problema; })() : null;
  /* En pesos: a qué productos no les alcanza. Se avisa, no se frena. */
  const noLesAlcanza = aQuienesNoLesAlcanza({ tipo, valor: Number.parseInt(valor || "0", 10), productId: productId || null }, productos);

  async function crear() {
    setRevisar(true);
    if (enVuelo.current || problema) return;
    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/digitales/cupones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrador),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "No se pudo guardar. Probá de nuevo.");
      } else {
        setCodigo(""); setValor(""); setProductId(""); setVenceAt(""); setTopeUsos("");
        setRevisar(false);
        setAbierto(false);
        router.refresh();
      }
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    }
    enVuelo.current = false;
    setGuardando(false);
  }

  async function tocar(c: CuponEnPantalla, que: "apagar" | "prender" | "borrar") {
    if (tocando) return;
    if (que === "borrar" && !window.confirm(`¿Borrar el cupón ${c.codigo}? Las ventas que ya lo usaron no cambian.`)) return;
    setTocando(c.id);
    try {
      const r = await fetch(`/api/digitales/cupones/${c.id}`, {
        method: que === "borrar" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: que === "borrar" ? undefined : JSON.stringify({ activo: que === "prender" }),
      });
      if (r.ok) router.refresh();
    } catch {
      /* Se queda como estaba; la pantalla no miente. */
    }
    setTocando(null);
  }

  return (
    <div className="space-y-4">
      {/* ── Tres ideas ─────────────────────────────────────────────────────
          Para qué se usa un cupón, con el ejemplo armado: un click lo carga
          en el formulario. Van SIEMPRE, no sólo en vacío: la segunda idea
          sirve recién cuando ya hay ventas. */}
      <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Tres cupones que funcionan</p>
        <p className="mt-0.5 mb-3 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">Tocá uno y queda cargado en el formulario para que lo cambies antes de crearlo.</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {IDEAS_DE_CUPON.map((i) => (
            <li key={i.clave}>
              <button
                type="button"
                onClick={() => usarIdea(i.clave)}
                disabled={cupones.length >= tope}
                className="h-full w-full rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 p-3.5 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/60 panel-oscuro:hover:bg-orange-500/10 disabled:opacity-40"
              >
                <p className="text-[12.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">{i.nombre}</p>
                <p className="mt-1 font-mono text-[12px] font-black tracking-wider text-orange-600">
                  {i.codigo} · {i.tipo === "PORCENTAJE" ? `${i.valor} %` : `$ ${i.valor}`}
                  {i.diasDeVida !== null && ` · ${i.diasDeVida} días`}
                  {i.topeUsos !== null && ` · ${i.topeUsos} usos`}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">{i.porQue}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Crear ─────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm">
        {!abierto ? (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            disabled={cupones.length >= tope}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Nuevo cupón
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Nuevo cupón</p>

            <div className="grid gap-4 sm:grid-cols-2" onBlur={() => setRevisar(true)}>
              <div>
                <label htmlFor="codigo" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Código</label>
                <input id="codigo" value={codigo} onChange={(e) => setCodigo(normalizarCodigo(e.target.value))} maxLength={20} placeholder="PROMO20" className={`${CLASE_INPUT} uppercase`} />
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">Es lo que la persona escribe al pagar. Corto y fácil de decir.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Descuento</label>
                <div className="flex gap-2">
                  <input value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={7} placeholder={tipo === "PORCENTAJE" ? "20" : "2000"} aria-label="Cuánto descuenta" className={CLASE_INPUT} />
                  <select value={tipo} onChange={(e) => setTipo(e.target.value === "PESOS" ? "PESOS" : "PORCENTAJE")} aria-label="Tipo de descuento" className={`${CLASE_INPUT} w-auto`}>
                    <option value="PORCENTAJE">%</option>
                    <option value="PESOS">$</option>
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
                  {tipo === "PORCENTAJE" ? `Hasta ${PORCENTAJE_MAXIMO} %. Se calcula sobre el total, con los upsells que sume.` : "Un monto fijo, en pesos, sobre el total."}
                </p>
              </div>
              <div>
                <label htmlFor="producto" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Vale para</label>
                <select id="producto" value={productId} onChange={(e) => setProductId(e.target.value)} className={CLASE_INPUT}>
                  <option value="">Todos tus productos</option>
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="vence" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Vence <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input id="vence" type="date" min={hoy} value={venceAt} onChange={(e) => setVenceAt(e.target.value)} className={CLASE_INPUT} />
                </div>
                <div>
                  <label htmlFor="tope" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Usos <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input id="tope" value={topeUsos} onChange={(e) => setTopeUsos(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={7} placeholder="Sin tope" className={CLASE_INPUT} />
                </div>
              </div>
            </div>

            <ConsejoDeUso>{CONSEJO_DE_CUPON}</ConsejoDeUso>

            {revisar && problema && <p role="alert" className="text-sm font-medium text-red-600">{problema}</p>}
            {!problema && noLesAlcanza.length > 0 && (
              <p className="text-[12.5px] font-medium leading-relaxed text-amber-700 panel-oscuro:text-amber-300">
                A {noLesAlcanza.length === 1 ? <>«{noLesAlcanza[0]}»</> : <>{noLesAlcanza.length} de tus productos</>} no le va a aplicar:
                dejaría la compra por debajo de los $ {MINIMO_A_COBRAR} que se pueden cobrar. Bajá el monto o pasalo a porcentaje.
              </p>
            )}
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={crear}
                disabled={guardando || !!problema || !codigo || !valor}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Crear el cupón
              </button>
              {cupones.length > 0 && (
                <button type="button" onClick={() => setAbierto(false)} className="text-sm font-semibold text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-800">Cancelar</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── La lista ─────────────────────────────────────────────────────── */}
      {cupones.length === 0 ? (
        <p className="text-[12.5px] text-gray-500 panel-oscuro:text-gray-400 px-1">
          Todavía no tenés cupones. El primero suele ser uno para quien ya te compró: es la venta más fácil que existe.
        </p>
      ) : (
        <ul className="space-y-3">
          {cupones.map((c) => (
            <li key={c.id} className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-black tracking-wider text-gray-900 panel-oscuro:text-gray-100">
                      <Ticket className="h-4 w-4 text-orange-500" /> {c.codigo}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${CLASE_ESTADO[c.estado]}`}>{NOMBRE_ESTADO[c.estado]}</span>
                    {/* El cupón que crea la oferta de salida: se maneja desde
                        allá, y acá se dice para que nadie lo borre por error. */}
                    {esCodigoDeOferta(c.codigo) && (
                      <Link href="/digitales/marketing/salida" className="rounded-full bg-orange-50 panel-oscuro:bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-700 panel-oscuro:text-orange-300 hover:underline">
                        de la oferta de salida
                      </Link>
                    )}
                    {esCodigoDeBienvenida(c.codigo) && (
                      <Link href="/digitales/marketing/bienvenida" className="rounded-full bg-orange-50 panel-oscuro:bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-700 panel-oscuro:text-orange-300 hover:underline">
                        del precio de bienvenida
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-gray-600 panel-oscuro:text-gray-400">
                    <span className="font-semibold text-gray-800 panel-oscuro:text-gray-200">{textoDelDescuento(c)} de descuento</span>
                    {" · "}{c.producto ?? "todos los productos"}
                    {c.vence ? ` · vence el ${c.vence}` : ""}
                    {" · "}{c.usos} {c.usos === 1 ? "uso" : "usos"}{c.topeUsos !== null ? ` de ${c.topeUsos}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => tocar(c, c.activo ? "apagar" : "prender")}
                    disabled={tocando !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 panel-oscuro:text-gray-300 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                  >
                    {tocando === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                    {c.activo ? "Apagar" : "Prender"}
                  </button>
                  {!esCodigoDeOferta(c.codigo) && !esCodigoDeBienvenida(c.codigo) && <button
                    type="button"
                    onClick={() => tocar(c, "borrar")}
                    disabled={tocando !== null}
                    aria-label={`Borrar el cupón ${c.codigo}`}
                    className="inline-flex items-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 p-1.5 text-gray-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
