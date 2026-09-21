"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowRight, Check, Timer } from "lucide-react";
import {
  validarBienvenida, precioDeBienvenida, MINUTOS_DE_BIENVENIDA, PORCENTAJE_MINIMO, PORCENTAJE_MAXIMO_BIENVENIDA,
  TEXTO_BIENVENIDA_MAX, BIENVENIDA_DE_FABRICA, type Bienvenida, type MinutosDeBienvenida,
} from "@/lib/bienvenida";
import { CONSEJO_DE_BIENVENIDA } from "@/lib/plantillas-marketing";
import BarraDeBienvenida from "@/components/digitales/BarraDeBienvenida";
import ConsejoDeUso from "../../ConsejoDeUso";
import ProductoElegido from "../ProductoElegido";
import { useAvisoSinGuardar } from "../../useAvisoSinGuardar";

export type ProductoDeBienvenida = {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  publicado: boolean;
  bienvenida: Bienvenida;
  conLandingPropia: boolean;
};

const CLASE_INPUT = "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:opacity-50";
const CLASE_LABEL = "block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5";

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/**
 * El formulario y la vista previa, lado a lado. La vista previa es la
 * MISMA barra que va arriba de la página (`BarraDeBienvenida`, en demo) y
 * los números de verdad del producto: el precio con el descuento puesto y
 * el normal tachado. Las reglas están en `validarBienvenida`, la misma
 * función que corre la ruta.
 */
export default function BienvenidaClient({ esPago, productos, elegidoId, estilo }: {
  esPago: boolean;
  productos: ProductoDeBienvenida[];
  elegidoId: string | null;
  estilo: { vars: Record<string, string>; tarjeta: string; sello: string; titulo: string; fuentes: string };
}) {
  const router = useRouter();
  const elegido = productos.find((p) => p.id === elegidoId) ?? null;
  const [b, setB] = useState<Bienvenida>(elegido?.bienvenida ?? BIENVENIDA_DE_FABRICA);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const enVuelo = useRef(false);

  const r = validarBienvenida(b);
  const problema = r.ok ? null : r.problema;
  const cambio = JSON.stringify(elegido?.bienvenida) !== JSON.stringify(r.ok ? r.datos : b);
  useAvisoSinGuardar(cambio && !guardando);

  function tocar<K extends keyof Bienvenida>(k: K, v: Bienvenida[K]) {
    setB((prev) => ({ ...prev, [k]: v }));
    setListo(false);
    setError(null);
  }

  async function guardar() {
    if (enVuelo.current || !elegido || !r.ok) return;
    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/digitales/productos/${elegido.id}/bienvenida`, {
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
        <p className="mt-1 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">El precio de bienvenida se arma por producto. Cargá el primero y volvé.</p>
        <Link href="/digitales/productos" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-orange-600">Ir a Productos <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }

  /* Los números de verdad: el porcentaje sobre el precio del producto, con
     la misma cuenta que va a hacer la ruta al cobrar. */
  const porcentaje = Number.isInteger(b.porcentaje) ? b.porcentaje : 0;
  const despues = precioDeBienvenida(elegido.price, porcentaje);
  const texto = b.texto || BIENVENIDA_DE_FABRICA.texto;

  return (
    <div className="space-y-4">
      <ProductoElegido
        productos={productos.map((p) => ({ id: p.id, name: p.name, nota: p.bienvenida.activa ? "prendido" : undefined }))}
        elegidoId={elegido.id}
        ruta="/digitales/marketing/bienvenida"
      />

      {!esPago && (
        <div className="rounded-3xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 p-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 panel-oscuro:text-gray-200">
            <Lock className="h-3.5 w-3.5 text-gray-400" /> Es de los planes Starter y Pro
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            El reloj que todas las páginas de ebooks tienen, pero de verdad: no se reinicia al recargar y el
            descuento deja de aplicar cuando llega a cero. Abajo ves cómo queda; con Starter lo prendés.
          </p>
          <Link href="/digitales/mi-cuenta" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500">
            Ver los planes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px] items-start">
        {/* ── El formulario ─────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5 shadow-sm space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Prendido</span>
              <span className="block text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                {b.activa ? "Quien entra a la página ve el precio con descuento y el reloj." : "Apagado: la página muestra el precio de siempre. Podés dejarlo armado."}
              </span>
            </span>
            <input type="checkbox" checked={b.activa} disabled={!esPago} onChange={(e) => tocar("activa", e.target.checked)} className="h-5 w-5 accent-orange-600" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="porcentaje" className={CLASE_LABEL}>Descuento</label>
              <div className="flex items-center gap-2">
                <input id="porcentaje" value={b.porcentaje} disabled={!esPago} inputMode="numeric" maxLength={2} onChange={(e) => tocar("porcentaje", Number.parseInt(e.target.value.replace(/\D/g, "") || "0", 10))} className={CLASE_INPUT} />
                <span className="text-sm font-bold text-gray-500">%</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
                De {PORCENTAJE_MINIMO} a {PORCENTAJE_MAXIMO_BIENVENIDA}. Se crea solo un cupón «BIENVENIDA-…» que el pago aplica sin que nadie lo escriba; lo ves en Cupones.
              </p>
            </div>
            <div>
              <label htmlFor="minutos" className={CLASE_LABEL}>Cuánto dura</label>
              <select id="minutos" value={b.minutos} disabled={!esPago} onChange={(e) => tocar("minutos", Number(e.target.value) as MinutosDeBienvenida)} className={CLASE_INPUT}>
                {MINUTOS_DE_BIENVENIDA.map((m) => <option key={m} value={m}>{m === 60 ? "1 hora" : `${m} minutos`}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">
                Desde que la persona entra. Recargar, cerrar o volver más tarde no lo reinicia: al llegar a cero vuelve el precio normal, en la página y en el pago.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="texto" className={CLASE_LABEL}>Qué dice la barra</label>
            <input id="texto" value={b.texto} disabled={!esPago} maxLength={TEXTO_BIENVENIDA_MAX} onChange={(e) => tocar("texto", e.target.value)} placeholder={BIENVENIDA_DE_FABRICA.texto} className={CLASE_INPUT} />
            <p className="mt-1.5 text-xs text-gray-500 panel-oscuro:text-gray-400">{b.texto.length} / {TEXTO_BIENVENIDA_MAX}. Después va el reloj: «{texto} 14:59».</p>
          </div>

          <ConsejoDeUso>{CONSEJO_DE_BIENVENIDA}</ConsejoDeUso>

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

        {/* ── Cómo se ve ────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            <Timer className="h-3.5 w-3.5" /> Así lo ve quien entra
          </p>
          {/* La barra de verdad (en demo, quieta) y el precio como lo dibuja la
              página: sello, tachado y el número. Con los colores y la letra de
              la página de este producto. */}
          <div
            style={estilo.vars as React.CSSProperties}
            className={`${estilo.fuentes} overflow-hidden rounded-3xl bg-[color:var(--pv-fondo)] antialiased text-[color:var(--pv-tinta)]`}
          >
            <BarraDeBienvenida productId={elegido.id} token="" texto={texto} demo />
            <div className="px-6 py-8 text-center">
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">{elegido.name}</p>
              {porcentaje > 0 && (
                <p className={`mb-4 inline-block bg-[color:var(--pv-ok)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--pv-fondo)] ${estilo.sello}`}>
                  {porcentaje}% de descuento
                </p>
              )}
              <p>
                <span className="mr-3 whitespace-nowrap text-xl text-[color:var(--pv-tenue)] line-through sm:text-2xl">{plata(elegido.price)}</span>{" "}
                <span className={`whitespace-nowrap text-4xl text-[color:var(--pv-tinta)] sm:text-5xl ${estilo.titulo}`}>{plata(despues)}</span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            La barra va pegada arriba de la página y el precio con descuento reemplaza al de siempre, que queda tachado.
            Al llegar a cero, se va la barra y vuelve el precio de siempre.
            {elegido.conLandingPropia && " En tu propio diseño, el reloj va donde dejaste el hueco «reloj» o adentro del contador que trajo el archivo, con tu diseño; si no hay ninguno, en una barra nuestra arriba de todo. Apagado, esa barra no se muestra."}
          </p>
          {elegido.comparePrice && elegido.comparePrice > elegido.price && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-amber-700 panel-oscuro:text-amber-300">
              Este producto ya tiene un precio anterior tachado ({plata(elegido.comparePrice)}). Mientras corre el reloj, lo que se tacha es el precio de siempre ({plata(elegido.price)}); el anterior vuelve cuando el reloj termina.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
