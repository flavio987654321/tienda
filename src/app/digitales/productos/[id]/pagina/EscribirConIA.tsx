"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles, X, AlertTriangle } from "lucide-react";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
import type { PaginaVenta } from "@/lib/pagina-venta";

/**
 * "Escribir con IA" adentro del editor de la página de venta.
 *
 * ── Por qué pregunta antes en vez de escribir directo ──────────────────────
 *
 * Porque pisa texto. Si la persona estuvo media hora ajustando los beneficios y
 * aprieta esto sin saber qué hace, pierde la media hora — y **no hay ningún
 * botón de deshacer en el editor**. El paso de confirmar existe para eso, y por
 * eso dice exactamente qué toca y qué no.
 *
 * ── Lo que NO se pisa, y se dice ───────────────────────────────────────────
 *
 * El estilo, la paleta, el orden de las secciones, y opiniones / garantía /
 * oferta con fecha. Decirlo tranquiliza justo a quien más miedo tiene de
 * apretar: el que ya tiene la página armada.
 */
export default function EscribirConIA({
  productoId,
  cupoInicial,
  hayCambiosSinGuardar,
  onListo,
}: {
  productoId: string;
  cupoInicial: EstadoDelCupo;
  hayCambiosSinGuardar: boolean;
  onListo: (pagina: PaginaVenta) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [cupo, setCupo] = useState(cupoInicial);
  const [error, setError] = useState("");
  const enVuelo = useRef(false);

  const sinCupo = cupo.quedan <= 0;

  async function escribir() {
    if (enVuelo.current || sinCupo) return;
    enVuelo.current = true;
    setEscribiendo(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/ia/pagina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setError(d.error ?? "No pudimos escribirla. Probá de nuevo.");
        if (d.cupo) setCupo(d.cupo);
      } else {
        setCupo(d.cupo);
        onListo(d.pagina as PaginaVenta);
        setAbierto(false);
      }
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet.");
    }
    enVuelo.current = false;
    setEscribiendo(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setAbierto(true); setError(""); }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-500"
      >
        <Sparkles className="h-3.5 w-3.5" /> Escribir con IA
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !escribiendo && setAbierto(false)}
          />
          <div className="relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl panel-oscuro:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 font-black text-gray-900 panel-oscuro:text-gray-100">
                <Sparkles className="h-4 w-4 text-orange-500" />
                Escribir la página con IA
              </p>
              <button
                type="button"
                onClick={() => !escribiendo && setAbierto(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 panel-oscuro:bg-gray-800 panel-oscuro:text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
              Escribe los textos de <strong>ocho secciones</strong> usando el nombre, la descripción y
              los bonos de este producto: la portada, qué te llevás, los bonos, los beneficios, esto te
              suena, cómo funciona, las preguntas frecuentes y el cierre.
            </p>

            {/* Lo que NO toca. Va destacado porque es lo que tranquiliza a quien
                ya tiene la página armada, que es justo el que no se anima. */}
            <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 panel-oscuro:bg-gray-800/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
                No toca
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
                Tu estilo, tu paleta ni el orden de las secciones. Y tampoco las{" "}
                <strong>opiniones</strong>, la <strong>garantía</strong> ni la <strong>oferta con
                fecha</strong>: ésas son cosas que asumís vos, no las escribe una IA.
              </p>
            </div>

            {/* ⚠️ El editor no tiene deshacer, así que si hay trabajo sin guardar
                hay que decirlo antes y no después. */}
            {hayCambiosSinGuardar && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-900 panel-oscuro:border-amber-500/30 panel-oscuro:bg-amber-500/10 panel-oscuro:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Tenés cambios sin guardar en esas secciones y se van a pisar. Todavía no se guarda
                  nada: si no te gusta cómo queda, salí sin guardar y vuelve lo de antes.
                </span>
              </p>
            )}

            <p className="mt-3 text-[12px] text-gray-600 panel-oscuro:text-gray-400">
              {sinCupo
                ? "No te quedan generaciones."
                : <>Usa <strong>1</strong> de tus <strong>{cupo.quedan}</strong> generaciones.</>}
            </p>

            {error && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-800 panel-oscuro:border-red-500/25 panel-oscuro:bg-red-500/10 panel-oscuro:text-red-300"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="button"
              onClick={escribir}
              disabled={escribiendo || sinCupo}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
            >
              {escribiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {escribiendo ? "Escribiendo…" : "Escribirla"}
            </button>
            {escribiendo && (
              <p className="mt-2 text-center text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
                Son ocho secciones, tarda un poco más que el embudo. No cierres esta ventana.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
