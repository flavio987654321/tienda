"use client";

/* eslint-disable @next/next/no-img-element */
/* ⚠️ `<img>` a propósito, y no `next/image`: estas fotos vienen del banco de
   imágenes con direcciones que cambian en cada búsqueda. `next/image` las
   pasaría por nuestro optimizador —un pedido a nuestro servidor por cada
   miniatura de cada búsqueda, quince por vez, de fotos que casi todas se van a
   descartar— y encima habría que declarar el dominio del banco en la
   configuración. Acá el navegador las pide derecho y no nos cuestan nada. */

import { useCallback, useRef, useState } from "react";
import { ImageIcon, Loader2, Search, Check, RotateCcw, X } from "lucide-react";
import CampoAuto from "@/components/CampoAuto";
import { LARGO_FOTO, type FotoElegida } from "@/lib/ebook-ia";

/**
 * Elegir la foto de un capítulo —o la de la tapa— a mano.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO NO PODÍA SEGUIR FALTANDO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las fotos las elegía el armado solo, con una frase, y no había forma de decir
 * "esta no". La única palanca era reescribir la frase, sin ver nunca qué había
 * del otro lado, y volver a armar el PDF entero para mirar el resultado.
 *
 * Y **no hay salida por afuera**: un PDF armado no se edita en Canva ni en
 * Word. Si la foto no se puede cambiar acá, no se puede cambiar en ningún lado.
 *
 * ── Dos cosas distintas, y las dos se guardan ──────────────────────────────
 *
 *   · **La frase.** Con qué buscar si no hay ninguna elegida. Es lo que ya
 *     existía, sólo que ahora también se ve desde acá.
 *   · **La foto elegida.** Cuál, exactamente. Y eso arregla algo que estaba
 *     roto: hasta hoy, rehacer el PDF para corregir una falta de ortografía
 *     podía traer diez fotos distintas.
 *
 * ── El freno del banco de imágenes ─────────────────────────────────────────
 *
 * ⚠️ **Se busca al apretar, nunca al escribir.** Del otro lado hay una cuenta
 * con un tope mensual: un campo que dispara con cada tecla se come el mes de
 * todas las cuentas en una tarde. Por eso hay un botón y no un buscador vivo.
 */
export type FotoDeCandidata = {
  id: string;
  chica: string;
  url: string;
  fotografo: string;
  enlace: string;
};

export default function ElegirFoto({
  frase,
  elegida,
  alta = false,
  deQue,
  disabled,
  onFrase,
  onElegida,
  onCerrar,
}: {
  frase: string;
  elegida: FotoElegida | null;
  /** La de la tapa es vertical; las de los capítulos, apaisadas. */
  alta?: boolean;
  /** "la tapa" o "el capítulo 3": va en los textos de la pantalla. */
  deQue: string;
  disabled?: boolean;
  onFrase: (frase: string) => void;
  onElegida: (foto: FotoElegida | null) => void;
  onCerrar: () => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<FotoDeCandidata[] | null>(null);

  /* Corta el doble clic: cada búsqueda es un pedido al banco, y son contados. */
  const enVuelo = useRef(false);

  const buscar = useCallback(async () => {
    const limpia = frase.trim();
    if (!limpia || enVuelo.current) return;

    enVuelo.current = true;
    setBuscando(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/digitales/ia/ebook/fotos?busca=${encodeURIComponent(limpia)}${alta ? "&alta=1" : ""}`,
      );
      const datos = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      if (!res.ok || !datos?.ok) {
        setError(typeof datos?.error === "string" ? datos.error : "No pudimos buscar. Probá de nuevo.");
        return;
      }

      const fotos = Array.isArray(datos.fotos) ? (datos.fotos as FotoDeCandidata[]) : [];
      setResultados(fotos);
      /* Lista vacía no es una falla: es que no hay nada de eso. Se dice con
         palabras en vez de dejar un hueco. */
      if (fotos.length === 0) {
        setError(`No encontramos fotos de "${limpia}". Probá con otras palabras, más simples.`);
      }
    } catch {
      setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      setBuscando(false);
    }
  }, [frase, alta]);

  const campo =
    "border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 rounded-lg px-3 py-2 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60";

  return (
    <div className="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-bold text-gray-800 panel-oscuro:text-gray-200">
          La foto de {deQue}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar la elección de foto"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* La que está puesta ahora, si hay alguna. */}
      {elegida && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-gray-50 panel-oscuro:bg-gray-800/60 p-2">
          <img
            src={elegida.url}
            alt=""
            className="h-12 w-16 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
              Elegida a mano
            </p>
            {/* ⚠️ El nombre de quien la sacó, a la vista. No es un crédito de
                cortesía: es la licencia del banco de imágenes, y va también en
                la hoja de créditos del PDF. */}
            <p className="truncate text-[11px] text-gray-500 panel-oscuro:text-gray-400">
              Foto de {elegida.fotografo}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onElegida(null)}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-2 py-1.5 text-[11px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-white panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Sacarla
          </button>
        </div>
      )}

      <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
        Qué foto buscar
      </label>
      <div className="mt-1.5 flex items-start gap-2">
        <CampoAuto
          value={frase}
          onChange={(v) => onFrase(v.slice(0, LARGO_FOTO))}
          onEnter={buscar}
          maxLength={LARGO_FOTO}
          disabled={disabled}
          ariaLabel={`Qué foto buscar para ${deQue}`}
          placeholder="Una escena que se pueda fotografiar: manos amasando harina"
          estilo={campo}
          className="flex-1"
        />
        <button
          type="button"
          onClick={buscar}
          disabled={disabled || buscando || !frase.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 panel-oscuro:bg-gray-100 px-3 py-2 text-[12px] font-bold text-white panel-oscuro:text-gray-900 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Buscar
        </button>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
        Describí una escena, no el tema del capítulo: buscando por el título, “Primeros pasos
        para arrancar” trajo una guitarra.
      </p>

      {error && (
        <p className="mt-2.5 rounded-lg bg-amber-50 panel-oscuro:bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          {error}
        </p>
      )}

      {resultados && resultados.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {resultados.map((f) => {
              const puesta = elegida?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    onElegida({
                      id: f.id, url: f.url, fotografo: f.fotografo, enlace: f.enlace,
                    })
                  }
                  disabled={disabled}
                  title={`Foto de ${f.fotografo}`}
                  aria-pressed={puesta}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg transition-all disabled:opacity-50 ${
                    puesta
                      ? "ring-2 ring-orange-500 ring-offset-1 panel-oscuro:ring-offset-gray-950"
                      : "ring-1 ring-gray-200 panel-oscuro:ring-gray-700 hover:ring-gray-400"
                  }`}
                >
                  <img
                    src={f.chica}
                    alt={`Foto de ${f.fotografo}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {puesta && (
                    <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-400 panel-oscuro:text-gray-500">
            Fotos de Pexels. Quien las sacó queda nombrado en la hoja de créditos del ebook.
          </p>
        </>
      )}

      {!resultados && !elegida && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 panel-oscuro:bg-gray-800/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          <ImageIcon aria-hidden className="h-4 w-4 shrink-0" />
          Si no elegís ninguna, se busca sola con esa frase cuando se arma el PDF.
        </p>
      )}
    </div>
  );
}
