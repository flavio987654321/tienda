"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2, Check } from "lucide-react";
import { LARGO_ID_MEDICION, validarPixelId, validarGaId, validarClarityId } from "@/lib/tracking-ids";
import type { Medicion } from "@/lib/medicion-digital";

/**
 * La medición de ESTE producto: su píxel de Meta, su GA, su Clarity.
 *
 * ── Por qué está acá y no sólo en Configuración ────────────────────────────
 *
 * Configuración → Meta tiene el de la cuenta, que vale para todas las páginas.
 * Pero una cuenta Pro tiene hasta cinco, cada una con su dominio, y pueden ser
 * cinco negocios con cinco cuentas de anuncios: el píxel del ebook de mecánica
 * no es el del curso de tortas. Acá se pone el de esta página; lo que se deje
 * vacío usa el de la cuenta, campo por campo. Está al lado de la dirección
 * porque es lo mismo: cosas de ESTA página, no de la cuenta.
 *
 * Lo que se escribe termina adentro de un <script> público: se verifica acá
 * (para avisar al toque) y de nuevo en la ruta (`validarMedicion`), con las
 * mismas reglas de `tracking-ids`.
 */
export default function MedicionDelProducto({ productoId, actual, delaCuenta }: {
  productoId: string;
  /** Lo guardado en el producto (vacíos si no tiene). */
  actual: Medicion;
  /** Lo de la cuenta, para decir "hoy usa el de la cuenta: 1234…". */
  delaCuenta: Medicion;
}) {
  const [pixel, setPixel] = useState(actual.pixelId);
  const [ga, setGa] = useState(actual.gaId);
  const [clarity, setClarity] = useState(actual.clarityId);
  const [guardado, setGuardado] = useState(actual);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambio = pixel.trim() !== guardado.pixelId || ga.trim() !== guardado.gaId || clarity.trim() !== guardado.clarityId;
  const problema = validarPixelId(pixel) ?? validarGaId(ga) ?? validarClarityId(clarity);

  async function guardar() {
    if (guardando || problema) return;
    setGuardando(true);
    setError(null);
    setListo(false);
    try {
      const res = await fetch(`/api/digitales/productos/${productoId}/medicion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelId: pixel, gaId: ga, clarityId: clarity }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "No se pudo guardar. Probá de nuevo.");
      } else {
        /* Lo que quedó guardado es lo que la ruta devolvió (Clarity puede haber
           entrado como script entero y salir como ID pelado). */
        const m = d.medicion ? (JSON.parse(d.medicion) as Medicion) : { pixelId: "", gaId: "", clarityId: "" };
        setGuardado(m);
        setPixel(m.pixelId); setGa(m.gaId); setClarity(m.clarityId);
        setListo(true);
      }
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo.");
    }
    setGuardando(false);
  }

  const pie = (propio: string, cuenta: string, que: string) =>
    propio.trim()
      ? `Esta página usa el suyo.`
      : cuenta
        ? `Vacío: usa el de la cuenta (${cuenta.length > 8 ? `${cuenta.slice(0, 6)}…` : cuenta}).`
        : `Vacío: no hay ${que} ni acá ni en la cuenta.`;

  return (
    <div className="mt-8 border-t border-gray-100 panel-oscuro:border-gray-800 pt-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-orange-100 panel-oscuro:bg-orange-500/15">
          <BarChart3 className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-gray-900 panel-oscuro:text-gray-100">Medición de esta página</h2>
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
            Si este producto tiene su propia cuenta de anuncios, poné acá su píxel. Lo que dejes vacío usa lo de{" "}
            <Link href="/digitales/configuracion?tab=meta" className="font-semibold text-orange-600 hover:text-orange-500">Configuración → Meta</Link>,
            que vale para todas tus páginas.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Campo id="pixel-producto" etiqueta="Píxel de Meta" valor={pixel} onChange={setPixel} placeholder="1234567890123456" inputMode="numeric"
          ayuda={pie(pixel, delaCuenta.pixelId, "píxel")} />
        <Campo id="ga-producto" etiqueta="Google Analytics" valor={ga} onChange={setGa} placeholder="G-XXXXXXXXXX"
          ayuda={pie(ga, delaCuenta.gaId, "Analytics")} />
        <Campo id="clarity-producto" etiqueta="Microsoft Clarity" valor={clarity} onChange={setClarity} placeholder="Project ID, o el script entero"
          ayuda={pie(clarity, delaCuenta.clarityId, "Clarity")} largo={2000} />
      </div>

      {problema && cambio && <p className="mt-3 text-sm text-red-600 font-medium">{problema}</p>}
      {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !cambio || !!problema}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          {listo && !cambio && <Check className="h-4 w-4" />}
          {listo && !cambio ? "Guardado" : "Guardar"}
        </button>
        <p className="text-xs text-gray-500 panel-oscuro:text-gray-400">
          Mide la página, el pago y la compra confirmada, con el id de este producto.
        </p>
      </div>
    </div>
  );
}

function Campo({ id, etiqueta, valor, onChange, placeholder, ayuda, inputMode, largo = LARGO_ID_MEDICION }: {
  id: string; etiqueta: string; valor: string; onChange: (v: string) => void; placeholder: string; ayuda: string;
  inputMode?: "numeric"; largo?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
        {etiqueta}<span className="font-normal text-gray-400 panel-oscuro:text-gray-500"> (opcional)</span>
      </label>
      <input
        id={id}
        value={valor}
        inputMode={inputMode}
        maxLength={largo}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
      />
      <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5 leading-relaxed">{ayuda}</p>
    </div>
  );
}
