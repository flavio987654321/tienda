"use client";

import { useState } from "react";
import { FileText, ChevronDown, Check, ExternalLink } from "lucide-react";

const DEFAULTS = {
  policyReturns: `Aceptamos devoluciones dentro de los 30 días corridos desde la fecha de recepción del producto, siempre que el artículo se encuentre en su estado original, sin uso, con etiquetas y en su embalaje original.

Para iniciar una devolución, contactanos por WhatsApp o por el formulario de la tienda indicando el número de pedido y el motivo.

Los gastos de envío de la devolución corren por cuenta del cliente, salvo que el producto llegue con defecto de fabricación o error nuestro.

Una vez recibido e inspeccionado el artículo, procesamos el reembolso o cambio en un plazo de 5 días hábiles.`,

  policyShipping: `Realizamos envíos a todo el país a través de correo privado y Correo Argentino.

Los tiempos de entrega estimados son:
- CABA y GBA: 2 a 4 días hábiles
- Interior del país: 5 a 10 días hábiles

Una vez despachado tu pedido te enviamos el número de seguimiento por WhatsApp.

Los envíos se procesan de lunes a viernes en horario comercial. Los pedidos realizados después de las 15hs se procesan el día hábil siguiente.`,

  policyTerms: `Al realizar una compra en nuestra tienda, aceptás los siguientes términos y condiciones.

Los precios publicados están expresados en pesos argentinos e incluyen IVA. Nos reservamos el derecho de modificar los precios sin previo aviso.

Las imágenes de los productos son de carácter ilustrativo. Pueden existir pequeñas variaciones de color según la pantalla.

El pago se procesa de forma segura a través de Mercado Pago. No almacenamos datos de tarjetas.

Para consultas podés contactarnos por WhatsApp o mediante el formulario de contacto de la tienda. Respondemos dentro de las 24hs hábiles.`,
};

type Props = {
  slug: string;
  initialReturns: string | null;
  initialShipping: string | null;
  initialTerms: string | null;
};

export default function PoliticasForm({ slug, initialReturns, initialShipping, initialTerms }: Props) {
  const [open, setOpen] = useState(false);
  const [returns, setReturns] = useState(initialReturns ?? "");
  const [shipping, setShipping] = useState(initialShipping ?? "");
  const [terms, setTerms] = useState(initialTerms ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function loadDefaults() {
    if (!returns) setReturns(DEFAULTS.policyReturns);
    if (!shipping) setShipping(DEFAULTS.policyShipping);
    if (!terms) setTerms(DEFAULTS.policyTerms);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/ajustes/politicas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyReturns: returns, policyShipping: shipping, policyTerms: terms }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Error al guardar. Intentá de nuevo.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasAny = returns.trim() || shipping.trim() || terms.trim();
  const allEmpty = !returns.trim() && !shipping.trim() && !terms.trim();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-5 py-4"
      >
        <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-800">Información legal</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {hasAny ? "Políticas configuradas · visibles en tu tienda" : "Sin configurar · aparece un aviso en tu tienda"}
          </p>
        </div>
        {hasAny && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full mr-1">
            Activo
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Estas políticas aparecen en{" "}
              <a
                href={`/tienda/${slug}/politicas`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline inline-flex items-center gap-1"
              >
                /tienda/{slug}/politicas <ExternalLink className="h-3 w-3" />
              </a>{" "}
              y en los links del footer de tu tienda.
            </p>
            {allEmpty && (
              <button
                type="button"
                onClick={loadDefaults}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 ml-4"
              >
                Cargar ejemplos
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              ↩️ Política de devoluciones
            </label>
            <textarea
              value={returns}
              onChange={e => setReturns(e.target.value)}
              rows={6}
              placeholder={DEFAULTS.policyReturns}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y placeholder:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              📦 Política de envíos
            </label>
            <textarea
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              rows={6}
              placeholder={DEFAULTS.policyShipping}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y placeholder:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              📋 Términos y condiciones
            </label>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={6}
              placeholder={DEFAULTS.policyTerms}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y placeholder:text-gray-300"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saved ? <><Check className="h-4 w-4" /> Guardado</> : saving ? "Guardando..." : "Guardar políticas"}
            </button>
            {!allEmpty && (
              <a
                href={`/tienda/${slug}/politicas`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver en la tienda
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
