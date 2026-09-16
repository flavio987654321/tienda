"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowRight, Check, DoorOpen } from "lucide-react";
import {
  validarOfertaSalida, venceEnTexto, HORAS_DE_OFERTA, PORCENTAJE_MINIMO, PORCENTAJE_MAXIMO_SALIDA,
  TITULO_MAX, TEXTO_MAX, BOTON_MAX, type OfertaSalida, type HorasDeOferta,
} from "@/lib/oferta-salida";
import { descuentoDe } from "@/lib/cupones-digitales";
import { CONSEJO_DE_SALIDA } from "@/lib/plantillas-marketing";
import CartelDeSalida, { type ParteDelCartel } from "@/components/digitales/CartelDeSalida";
import ConsejoDeUso from "../../ConsejoDeUso";

export type ProductoDeSalida = {
  id: string;
  name: string;
  price: number;
  imagen: string | null;
  publicado: boolean;
  oferta: OfertaSalida;
};

const CLASE_INPUT = "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:opacity-50";
const CLASE_LABEL = "block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5";

/**
 * El formulario y la vista previa, lado a lado. La vista previa es
 * `CartelDeSalida`, el MISMO componente que abre el checkout, vestido con
 * las variables de la página del producto: lo que se ve acá es lo que se
 * va a ver allá. Las reglas están en `validarOfertaSalida`, la misma
 * función que corre la ruta.
 */
export default function SalidaClient({ esPago, productos, elegidoId, estilo }: {
  esPago: boolean;
  productos: ProductoDeSalida[];
  elegidoId: string | null;
  estilo: { vars: Record<string, string>; tarjeta: string; boton: string; fuentes: string };
}) {
  const router = useRouter();
  const elegido = productos.find((p) => p.id === elegidoId) ?? null;
  const [o, setO] = useState<OfertaSalida>(elegido?.oferta ?? { activa: false, tipo: "DESCUENTO", porcentaje: 20, productoId: null, horas: 24, titulo: "", texto: "", boton: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const enVuelo = useRef(false);
  /* La hora de "ahora" para la vista previa, fija al abrir: un reloj que
     cambia en cada dibujo hace saltar el texto del plazo. */
  const [abiertaEn] = useState(() => Date.now());
  /* Tocar una parte del cartel lleva al campo: se enfoca, se desplaza a la
     vista y se marca un momento. */
  const refTitulo = useRef<HTMLInputElement>(null);
  const refTexto = useRef<HTMLTextAreaElement>(null);
  const refBoton = useRef<HTMLInputElement>(null);
  const [resaltado, setResaltado] = useState<ParteDelCartel | null>(null);
  function irA(parte: ParteDelCartel) {
    const el = (parte === "titulo" ? refTitulo : parte === "texto" ? refTexto : refBoton).current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setResaltado(parte);
    window.setTimeout(() => setResaltado((r) => (r === parte ? null : r)), 1600);
  }
  const marca = (parte: ParteDelCartel) => (resaltado === parte ? " ring-2 ring-orange-400 border-orange-400" : "");

  const otros = productos.filter((p) => p.id !== elegido?.id);
  const r = validarOfertaSalida(o);
  const problema = r.ok ? null : r.problema;
  const cambio = JSON.stringify(elegido?.oferta) !== JSON.stringify(r.ok ? r.datos : o);
  const otro = otros.find((p) => p.id === o.productoId) ?? null;

  function tocar<K extends keyof OfertaSalida>(k: K, v: OfertaSalida[K]) {
    setO((prev) => ({ ...prev, [k]: v }));
    setListo(false);
    setError(null);
  }

  async function guardar() {
    if (enVuelo.current || !elegido || !r.ok) return;
    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/digitales/productos/${elegido.id}/salida`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r.datos),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudo guardar. Probá de nuevo.");
      else { setListo(true); router.refresh(); }
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    }
    enVuelo.current = false;
    setGuardando(false);
  }

  if (!elegido) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 px-6 py-12 text-center">
        <p className="text-sm font-bold text-gray-800 panel-oscuro:text-gray-200">Todavía no tenés ningún producto</p>
        <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">La oferta de salida se arma por producto. Cargá el primero y volvé.</p>
        <Link href="/digitales/productos" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-orange-600">Ir a Productos <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }

  /* La vista previa con los números del producto elegido: el precio de
     verdad, el descuento de verdad, y un plazo contado desde ahora. */
  const antes = elegido.price;
  const despues = antes - descuentoDe({ tipo: "PORCENTAJE", valor: o.porcentaje }, antes);
  const vence = venceEnTexto(new Date(abiertaEn + o.horas * 3_600_000), new Date(abiertaEn));
  const cartel = {
    titulo: o.titulo || "Antes de que te vayas…",
    texto: o.texto || "Acá va tu texto.",
    boton: o.boton || "Sí, lo quiero",
    vence,
    imagen: o.tipo === "PRODUCTO" ? (otro?.imagen ?? null) : elegido.imagen,
    oferta: o.tipo === "DESCUENTO"
      ? { tipo: "DESCUENTO" as const, nombre: elegido.name, antes, despues, porcentaje: o.porcentaje }
      : { tipo: "PRODUCTO" as const, nombre: otro?.name ?? "(elegí un producto)", precio: otro?.price ?? 0, descripcion: null },
  };

  return (
    <div className="space-y-4">
      {/* ── Qué producto ──────────────────────────────────────────────────── */}
      {productos.length > 1 && (
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
          <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
            {productos.map((p) => (
              <Link
                key={p.id}
                href={`/digitales/marketing/salida?p=${p.id}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                  p.id === elegido.id
                    ? "bg-gray-900 panel-oscuro:bg-gray-100 text-white panel-oscuro:text-gray-900"
                    : "border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 hover:border-gray-400"
                }`}
              >
                {p.name}{p.oferta.activa ? " · prendida" : ""}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!esPago && (
        <div className="rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 panel-oscuro:text-gray-200">
            <Lock className="h-3.5 w-3.5 text-gray-400" /> Es de los planes Starter y Pro
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            Mucha gente llega al pago y se va sin pagar. Este cartel es la última chance de quedarse con
            algunos: un descuento que vence de verdad, o algo más barato. Abajo ves cómo queda; con Starter lo
            prendés.
          </p>
          <Link href="/digitales/mi-cuenta" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Ver los planes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_470px] items-start">
        {/* ── El formulario ─────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Prendida</span>
              <span className="block text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                {o.activa ? "Se muestra a quien se va del pago, y va en el mail de carrito." : "Apagada: no se muestra a nadie. Podés dejarla armada."}
              </span>
            </span>
            <input type="checkbox" checked={o.activa} disabled={!esPago} onChange={(e) => tocar("activa", e.target.checked)} className="h-5 w-5 accent-orange-600" />
          </label>

          <div>
            <p className={CLASE_LABEL}>Qué se ofrece</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["DESCUENTO", "Un descuento", "Sobre este mismo producto, por tiempo limitado."], ["PRODUCTO", "Algo más barato", "Otro de tus productos, para quien no llega al precio."]] as const).map(([t, n, d]) => (
                <button
                  key={t}
                  type="button"
                  disabled={!esPago || (t === "PRODUCTO" && otros.length === 0)}
                  onClick={() => tocar("tipo", t)}
                  className={`rounded-2xl border p-3.5 text-left transition-colors disabled:opacity-50 ${o.tipo === t ? "border-orange-400 bg-orange-50/60 panel-oscuro:bg-orange-500/10" : "border-gray-200 panel-oscuro:border-gray-700 hover:border-gray-400"}`}
                >
                  <p className="text-[13px] font-bold text-gray-900 panel-oscuro:text-gray-100">{n}</p>
                  <p className="mt-0.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">{d}{t === "PRODUCTO" && otros.length === 0 ? " Necesitás otro producto." : ""}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {o.tipo === "DESCUENTO" ? (
              <div>
                <label htmlFor="porcentaje" className={CLASE_LABEL}>Descuento</label>
                <div className="flex items-center gap-2">
                  <input id="porcentaje" value={o.porcentaje} disabled={!esPago} inputMode="numeric" maxLength={2} onChange={(e) => tocar("porcentaje", Number.parseInt(e.target.value.replace(/\D/g, "") || "0", 10))} className={CLASE_INPUT} />
                  <span className="text-sm font-bold text-gray-500">%</span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">De {PORCENTAJE_MINIMO} a {PORCENTAJE_MAXIMO_SALIDA}. Se crea solo un cupón «SALIDA-…» que aplica al aceptar; lo ves en Cupones.</p>
              </div>
            ) : (
              <div>
                <label htmlFor="otro" className={CLASE_LABEL}>Qué producto</label>
                <select id="otro" value={o.productoId ?? ""} disabled={!esPago} onChange={(e) => tocar("productoId", e.target.value || null)} className={CLASE_INPUT}>
                  <option value="">Elegí uno</option>
                  {otros.map((p) => <option key={p.id} value={p.id}>{p.name} · $ {Math.round(p.price).toLocaleString("es-AR")}{p.publicado ? "" : " (sin publicar)"}</option>)}
                </select>
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">El botón lleva a su pago. Si está sin publicar, el cartel no se muestra.</p>
              </div>
            )}
            <div>
              <label htmlFor="horas" className={CLASE_LABEL}>Cuánto vale</label>
              <select id="horas" value={o.horas} disabled={!esPago} onChange={(e) => tocar("horas", Number(e.target.value) as HorasDeOferta)} className={CLASE_INPUT}>
                {HORAS_DE_OFERTA.map((h) => <option key={h} value={h}>{h} horas</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">Desde que la persona lo ve. Es de verdad: pasado el plazo, el descuento no aplica.</p>
            </div>
          </div>

          <div>
            <label htmlFor="titulo" className={CLASE_LABEL}>Título</label>
            <input ref={refTitulo} id="titulo" value={o.titulo} disabled={!esPago} maxLength={TITULO_MAX} onChange={(e) => tocar("titulo", e.target.value)} placeholder="Antes de que te vayas…" className={CLASE_INPUT + marca("titulo")} />
          </div>
          <div>
            <label htmlFor="texto" className={CLASE_LABEL}>Texto</label>
            <textarea ref={refTexto} id="texto" value={o.texto} disabled={!esPago} maxLength={TEXTO_MAX} rows={3} onChange={(e) => tocar("texto", e.target.value)} placeholder="Sé que el precio puede ser una traba…" className={`${CLASE_INPUT} resize-y${marca("texto")}`} />
            <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">{o.texto.length} / {TEXTO_MAX}. Una o dos frases, como se lo dirías en persona.</p>
          </div>
          <div>
            <label htmlFor="boton" className={CLASE_LABEL}>Botón</label>
            <input ref={refBoton} id="boton" value={o.boton} disabled={!esPago} maxLength={BOTON_MAX} onChange={(e) => tocar("boton", e.target.value)} placeholder="Sí, lo quiero" className={CLASE_INPUT + marca("boton")} />
          </div>

          <ConsejoDeUso>{CONSEJO_DE_SALIDA}</ConsejoDeUso>

          {problema && (o.titulo || o.texto || o.boton) && <p className="text-sm font-medium text-red-600">{problema}</p>}
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={!esPago || guardando || !!problema || !cambio}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              {listo && !cambio && <Check className="h-4 w-4" />}
              {listo && !cambio ? "Guardado" : "Guardar"}
            </button>
            {!elegido.publicado && (
              <span className="text-xs text-gray-500 panel-oscuro:text-gray-400">Este producto está sin publicar: el cartel se va a mostrar cuando lo publiques.</span>
            )}
          </div>
        </div>

        {/* ── Cómo se ve ────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            <DoorOpen className="h-3.5 w-3.5" /> Así lo ve quien se va
          </p>
          {/* Tal cual el checkout: el fondo oscurecido y el cartel encima, con
              los colores y la letra de la página de este producto. Tocar una
              parte lleva al campo. */}
          <div
            style={estilo.vars as React.CSSProperties}
            className={`${estilo.fuentes} flex items-center justify-center rounded-3xl bg-[color:var(--pv-fondo)] p-3 antialiased text-[color:var(--pv-tinta)] sm:p-5`}
          >
            <div className="flex w-full items-center justify-center rounded-2xl bg-black/55 p-3 sm:p-4">
              <CartelDeSalida c={cartel} tarjeta={estilo.tarjeta} botonRedondo={estilo.boton} onCerrar={() => {}} alTocar={esPago ? irA : undefined} />
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            En la computadora aparece así, en el medio del pago, con el fondo oscurecido. En el celular sube desde abajo. Tocá el título, el texto o el botón para editarlos.
          </p>
          {cartel.imagen === null && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-amber-700 panel-oscuro:text-amber-300">
              {o.tipo === "PRODUCTO" ? "Ese producto" : "Este producto"} no tiene portada, así que el cartel sale sin foto.{" "}
              <Link href={`/digitales/productos/${o.tipo === "PRODUCTO" && otro ? otro.id : elegido.id}`} className="font-bold underline">Cargarla en Productos</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
