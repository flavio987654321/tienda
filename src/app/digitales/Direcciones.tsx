"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

/**
 * Las direcciones de un producto, con su botón de copiar.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LO QUE LA PERSONA VIENE A BUSCAR ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La dirección se pega en un anuncio, en un mensaje, en una historia. O sea que
 * la operación real es **copiarla**, no leerla: sin el botón, hay que
 * seleccionarla a mano con el dedo en un teléfono, que es donde más se usa.
 *
 * ⚠️ Y se muestran LAS DOS cuando hay dos. Mostrar sólo el dominio propio haría
 * pensar que la de tiendaapps se apagó — y no se apaga nunca, en ningún plan.
 * Esa es la promesa de la Fase 5 bis y se rompe con una omisión.
 *
 * ── Y qué es cada una ──────────────────────────────────────────────────────
 *
 * Dos direcciones sin nombre son dos renglones iguales, y una tercera —la
 * del pago— sería un misterio. Cada renglón lleva un rótulo y una línea de
 * para qué sirve: la página es la que se reparte; el pago directo es para
 * quien ya dijo que sí por WhatsApp y no necesita leer nada más. Es lo que
 * la competencia muestra en su inicio ("tu tienda" / "tu checkout") y acá
 * faltaba.
 *
 * Este es el único pedazo del panel que necesita JavaScript. El resto —el
 * selector incluido— son enlaces, así que el panel se puede usar igual si el
 * navegador tarda en despertar.
 */

/** La ruta del pago directo, colgada de la dirección del producto. */
export const RUTA_DE_PAGO = "/pagar";

export default function Direcciones({
  slug,
  dominioBase,
  dominioPropio,
  conPago = false,
}: {
  slug: string | null;
  dominioBase: string;
  dominioPropio: string | null;
  /** Agrega el renglón del pago directo, sobre la dirección principal. */
  conPago?: boolean;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      setTimeout(() => setCopiado((c) => (c === texto ? null : c)), 1800);
    } catch {
      /* Sin permiso de portapapeles no se hace nada: la dirección está a la
         vista y se puede seleccionar a mano. */
    }
  }

  const principal = dominioPropio ?? (slug ? `${slug}.${dominioBase}` : null);
  const filas: { texto: string; tuyo: boolean; rotulo: string; paraQue: string }[] = [
    ...(dominioPropio ? [{ texto: dominioPropio, tuyo: true, rotulo: "Tu dominio", paraQue: "Tu página de venta, con tu marca. Es la que va en la bio, en los anuncios y en las historias." }] : []),
    ...(slug ? [{
      texto: `${slug}.${dominioBase}`, tuyo: false,
      rotulo: dominioPropio ? "Dirección de TiendaApps" : "Tu página",
      paraQue: dominioPropio
        ? "Sigue andando siempre, en todos los planes. Si el dominio deja de estar, la gente llega igual por acá."
        : "Tu página de venta. Es la que va en la bio, en los anuncios y en las historias.",
    }] : []),
    ...(conPago && principal ? [{
      texto: `${principal}${RUTA_DE_PAGO}`, tuyo: false, rotulo: "Directo al pago",
      paraQue: "Saltea la página y abre el pago. Para quien ya te dijo que sí por WhatsApp y no necesita leer nada más.",
    }] : []),
  ];

  if (filas.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {filas.map(({ texto, tuyo, rotulo, paraQue }) => (
        <div
          key={texto}
          className="rounded-xl border border-gray-100 panel-oscuro:border-gray-800 bg-gray-50 panel-oscuro:bg-gray-950/50 px-3 py-2"
        >
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 panel-oscuro:text-gray-500">{rotulo}</p>
          <div className="flex items-center gap-2">
          {/* `min-w-0` + `break-all`: una dirección larga en 360 se llevaba
              puestos los dos botones de la derecha. */}
          <span
            className={`min-w-0 flex-1 break-all text-[12.5px] ${
              tuyo
                ? "font-bold text-gray-900 panel-oscuro:text-gray-100"
                : "font-semibold text-gray-600 panel-oscuro:text-gray-400"
            }`}
          >
            {texto}
          </span>

          <button
            type="button"
            onClick={() => copiar(`https://${texto}`)}
            aria-label={`Copiar ${texto}`}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/15 transition-colors"
          >
            {copiado === `https://${texto}` ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <a
            href={`https://${texto}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${texto}`}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/15 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">{paraQue}</p>
        </div>
      ))}
    </div>
  );
}
