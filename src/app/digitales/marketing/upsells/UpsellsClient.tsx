"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowRight, Check, Clock, Plus, TrendingUp } from "lucide-react";
import {
  validarOfertaUpsell, entraEnLaOferta, MINUTOS_DE_UPSELL, TEXTO_UPSELL_MAX,
  OFERTA_UPSELL_DE_FABRICA, type OfertaUpsell, type MinutosDeUpsell,
} from "@/lib/oferta-upsell";
import ProductoElegido from "../ProductoElegido";
import { useAvisoSinGuardar } from "../../useAvisoSinGuardar";

export type UpsellDelProducto = {
  id: string;
  name: string;
  /** Lo que sale con la oferta puesta. Se carga en Productos. */
  price: number;
  /** A lo que vuelve cuando el reloj llega a cero. Se carga acá. */
  comparePrice: number | null;
  publicado: boolean;
};

export type ProductoConUpsells = {
  id: string;
  name: string;
  price: number;
  publicado: boolean;
  oferta: OfertaUpsell;
  upsells: UpsellDelProducto[];
};

const CLASE_INPUT = "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:opacity-50";
const CLASE_LABEL = "block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5";

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** La nota que va al lado del nombre en las fichas de producto. */
function notaDelProducto(p: ProductoConUpsells): string {
  if (p.upsells.length === 0) return "sin upsell";
  if (p.oferta.activa) return p.upsells.length === 1 ? "1 upsell · reloj" : `${p.upsells.length} upsells · reloj`;
  return p.upsells.length === 1 ? "1 upsell" : `${p.upsells.length} upsells`;
}

/**
 * El formulario y la vista previa. Lo que se configura es LA OFERTA: cuánto
 * dura el reloj y a qué precio vuelve cada upsell cuando termina.
 *
 * ⚠️ Acá NO se crea ni se edita el upsell en sí. El nombre, el archivo y la
 * imagen viven en Productos y se llega con un link. Duplicar ese formulario
 * sería tener dos altas de la misma cosa, que en tres meses dicen distinto —
 * es la misma razón por la que un producto, un bono y un upsell son una sola
 * tabla y no tres.
 */
export default function UpsellsClient({ esPago, productos, elegidoId }: {
  esPago: boolean;
  productos: ProductoConUpsells[];
  elegidoId: string | null;
}) {
  const router = useRouter();
  const elegido = productos.find((p) => p.id === elegidoId) ?? null;
  const [o, setO] = useState<OfertaUpsell>(elegido?.oferta ?? OFERTA_UPSELL_DE_FABRICA);
  /* Los precios de después, como texto: es un campo que se escribe, y
     convertirlo a número en cada tecla no deja borrar ni escribir una coma. */
  const [precios, setPrecios] = useState<Record<string, string>>(
    Object.fromEntries((elegido?.upsells ?? []).map((u) => [u.id, u.comparePrice ? String(u.comparePrice) : ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const enVuelo = useRef(false);

  const r = validarOfertaUpsell(o);
  const upsells = elegido?.upsells ?? [];

  /** El número que se está escribiendo, o null si el campo está vacío. */
  const escrito = (id: string): number | null => {
    const t = (precios[id] ?? "").replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  /* Los mismos avisos que va a dar la ruta, pero antes: un precio de después
     que no es mayor que el de la oferta haría un reloj que no cambia nada. */
  const malEscrito = upsells.find((u) => (precios[u.id] ?? "").trim() !== "" && escrito(u.id) === null);
  const muyBajo = upsells.find((u) => { const n = escrito(u.id); return n !== null && n <= u.price; });
  const participan = upsells.filter((u) => {
    const n = escrito(u.id);
    return n !== null && entraEnLaOferta({ price: u.price, comparePrice: n });
  });

  const problema = !r.ok
    ? r.problema
    : malEscrito
      ? `El precio de después de «${malEscrito.name}» tiene que ser un número.`
      : muyBajo
        ? `«${muyBajo.name}» sale ${plata(muyBajo.price)} con la oferta: el precio de después tiene que ser mayor, si no el reloj no cambia nada al terminar.`
        : o.activa && upsells.length > 0 && participan.length === 0
          ? "Ponele el precio de después a por lo menos un upsell, si no el reloj no tiene qué cambiar."
          : null;

  const original = JSON.stringify({
    o: elegido?.oferta,
    p: Object.fromEntries(upsells.map((u) => [u.id, u.comparePrice ?? null])),
  });
  const ahora = JSON.stringify({
    o: r.ok ? r.datos : o,
    p: Object.fromEntries(upsells.map((u) => [u.id, escrito(u.id)])),
  });
  const cambio = original !== ahora;
  useAvisoSinGuardar(cambio && !guardando);

  function tocar<K extends keyof OfertaUpsell>(k: K, v: OfertaUpsell[K]) {
    setO((prev) => ({ ...prev, [k]: v }));
    setListo(false);
    setError(null);
  }

  function tocarPrecio(id: string, v: string) {
    setPrecios((prev) => ({ ...prev, [id]: v.replace(/[^\d.,]/g, "") }));
    setListo(false);
    setError(null);
  }

  async function guardar() {
    if (enVuelo.current || !elegido || !r.ok || problema) return;
    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/digitales/productos/${elegido.id}/upsells`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...r.datos,
          precios: upsells.map((u) => ({ id: u.id, comparePrice: escrito(u.id) })),
        }),
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
        <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">La oferta del upsell se arma por producto. Cargá el primero y volvé.</p>
        <Link href="/digitales/productos" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-orange-600">Ir a Productos <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }

  const texto = o.texto || OFERTA_UPSELL_DE_FABRICA.texto;
  /* El de la previa: el primero que participe, o el primero que haya. */
  const muestra = participan[0] ?? upsells[0] ?? null;
  const muestraDespues = muestra ? escrito(muestra.id) : null;

  return (
    <div className="space-y-4">
      <ProductoElegido
        productos={productos.map((p) => ({ id: p.id, name: p.name, nota: notaDelProducto(p) }))}
        elegidoId={elegido.id}
        ruta="/digitales/marketing/upsells"
      />

      {!esPago && (
        <div className="rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 panel-oscuro:text-gray-200">
            <Lock className="h-3.5 w-3.5 text-gray-400" /> Es de los planes Starter y Pro
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            El upsell se sigue ofreciendo en todos los planes. Lo que agrega Starter es el reloj: mientras
            corre sale más barato, y al terminar vuelve a su precio. Abajo ves cómo queda.
          </p>
          <Link href="/digitales/mi-cuenta" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Ver los planes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Este producto todavía no tiene upsell ───────────────────────────
          No es un error ni un reto: es el estado normal de quien todavía no
          lo cargó. Lo único que hace falta es decirle dónde se carga, que es
          justo lo que la tarjeta de Marketing no decía. */}
      {upsells.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 panel-oscuro:bg-sky-500/15">
            <TrendingUp className="h-6 w-6 text-sky-600" />
          </div>
          <p className="text-[15px] font-bold text-gray-900 panel-oscuro:text-gray-100">
            «{elegido.name}» todavía no tiene ningún upsell
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            El upsell es un producto más, con su propio precio, que se ofrece al lado del botón de pagar.
            Se carga en Productos, abajo de los bonos —con su archivo y su imagen—, y cuando esté acá le
            ponés el reloj.
          </p>
          <Link
            href="/digitales/productos"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" /> Cargar el upsell en Productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
          {/* ── El formulario ───────────────────────────────────────────── */}
          <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Oferta por tiempo limitado</span>
                <span className="block text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                  {o.activa
                    ? "El extra sale más barato mientras corre el reloj, y después vuelve a su precio."
                    : "Apagado: el extra se ofrece siempre al mismo precio. Podés dejarlo armado."}
                </span>
              </span>
              <input type="checkbox" checked={o.activa} disabled={!esPago} onChange={(e) => tocar("activa", e.target.checked)} className="h-5 w-5 shrink-0 accent-orange-600" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="minutos" className={CLASE_LABEL}>Cuánto dura</label>
                <select id="minutos" value={o.minutos} disabled={!esPago} onChange={(e) => tocar("minutos", Number(e.target.value) as MinutosDeUpsell)} className={CLASE_INPUT}>
                  {MINUTOS_DE_UPSELL.map((m) => <option key={m} value={m}>{m} minutos</option>)}
                </select>
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
                  Desde que la persona abre la pantalla de pago. Recargar o volver más tarde no lo reinicia.
                </p>
              </div>
              <div>
                <label htmlFor="texto" className={CLASE_LABEL}>Qué dice al lado del reloj</label>
                <input id="texto" value={o.texto} disabled={!esPago} maxLength={TEXTO_UPSELL_MAX} onChange={(e) => tocar("texto", e.target.value)} placeholder={OFERTA_UPSELL_DE_FABRICA.texto} className={CLASE_INPUT} />
                <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">{o.texto.length} / {TEXTO_UPSELL_MAX}. Queda: «{texto} 9:32».</p>
              </div>
            </div>

            {/* ── Los upsells de este producto ──────────────────────────── */}
            <div className="border-t border-gray-100 panel-oscuro:border-gray-800 pt-4">
              <p className="text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400">
                {upsells.length === 1 ? "El upsell de este producto" : `Los ${upsells.length} upsells de este producto`}
              </p>
              {/* ⚠️ EL AVISO QUE NO SE PUEDE SACAR. En Productos este número se
                  pide como "Precio original" y quien lo carga piensa en un
                  anclaje de marketing: pone cualquier cosa. Con el reloj
                  prendido es plata que se le cobra a alguien, así que acá se
                  dice con esas palabras y no con aquéllas. */}
              <p className="mt-1 text-[12px] leading-relaxed text-amber-700 panel-oscuro:text-amber-300">
                El precio de después <strong>se cobra de verdad</strong> cuando el reloj llega a cero. No es
                un número tachado para que se vea más barato: es lo que va a pagar quien llegue tarde.
              </p>

              <div className="mt-3 space-y-2.5">
                {upsells.map((u) => {
                  const n = escrito(u.id);
                  const entra = n !== null && n > u.price;
                  return (
                    <div key={u.id} className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-3.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="min-w-0 text-[13.5px] font-bold text-gray-900 panel-oscuro:text-gray-100">{u.name}</p>
                        {o.activa && (
                          <span className={`shrink-0 text-[11px] font-bold ${entra ? "text-emerald-600" : "text-gray-400"}`}>
                            {entra ? "entra en la oferta" : "sin precio de después"}
                          </span>
                        )}
                      </div>
                      {!u.publicado && (
                        <p className="mt-1 text-[11.5px] text-amber-700 panel-oscuro:text-amber-300">
                          Está sin publicar, así que hoy no se ofrece en el pago. Podés dejarlo configurado.
                        </p>
                      )}
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={CLASE_LABEL}>Con la oferta</label>
                          <p className="px-4 py-3 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{plata(u.price)}</p>
                          <p className="mt-0.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
                            Es su precio, y se carga en{" "}
                            <Link href="/digitales/productos" className="font-bold text-orange-600 hover:text-orange-500">Productos</Link>.
                          </p>
                        </div>
                        <div>
                          <label htmlFor={`despues-${u.id}`} className={CLASE_LABEL}>Cuando se termina el reloj</label>
                          <input
                            id={`despues-${u.id}`}
                            inputMode="decimal"
                            maxLength={12}
                            value={precios[u.id] ?? ""}
                            disabled={!esPago}
                            onChange={(e) => tocarPrecio(u.id, e.target.value)}
                            placeholder={String(Math.round(u.price * 2))}
                            className={CLASE_INPUT}
                          />
                          <p className="mt-0.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
                            Mayor que {plata(u.price)}. Vacío: este upsell no entra en la oferta.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {problema && <p className="text-sm font-medium text-red-600">{problema}</p>}
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
                <span className="text-xs text-gray-500 panel-oscuro:text-gray-400">Este producto está sin publicar: se va a ver cuando lo publiques.</span>
              )}
            </div>
          </div>

          {/* ── Cómo se ve ──────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
              <Clock className="h-3.5 w-3.5" /> Así lo ve quien va a pagar
            </p>
            <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-gray-50 panel-oscuro:bg-gray-950 p-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="shrink-0 text-[10px] font-extrabold uppercase tracking-widest text-orange-600">Sumá a tu compra</p>
                {o.activa && (
                  <p className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold text-orange-600">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">{texto}</span>
                    <span className="shrink-0 tabular-nums">{o.minutos}:00</span>
                  </p>
                )}
              </div>
              {muestra && (
                <div className="rounded-2xl border-2 border-dashed border-orange-400 bg-white panel-oscuro:bg-gray-900 p-3.5">
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{muestra.name}</p>
                  <p className="mt-2 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
                    {o.activa && muestraDespues !== null && muestraDespues > muestra.price && (
                      <s className="mr-2 font-normal text-gray-400">{plata(muestraDespues)}</s>
                    )}
                    {plata(muestra.price)}
                  </p>
                  <p className="mt-2.5 rounded-xl border-2 border-orange-500 py-2 text-center text-[13px] font-bold text-orange-600">
                    + Agregar a tu compra
                  </p>
                </div>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              {o.activa
                ? `Cuando el reloj llega a cero se va, aparece «La oferta se terminó» y ${muestra ? `«${muestra.name}»` : "el extra"} pasa a su precio de después. Eso se cobra así, aunque la persona recargue o vuelva mañana.`
                : "Con la oferta apagada, la caja se ve igual pero sin reloj y siempre al mismo precio."}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              El precio del producto principal no lo toca nunca: el reloj manda sobre esta caja y nada más.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
