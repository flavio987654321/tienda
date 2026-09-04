"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copiar un dato al portapapeles.
 *
 * ── Para qué, acá ───────────────────────────────────────────────────────────
 *
 * El detalle de una venta muestra dos números que no se leen: el de la orden y
 * el del pago en Mercado Pago. Nadie los transcribe a mano sin equivocarse, y se
 * usan justo en el peor momento — pegándolos en un reclamo o en un mail al
 * soporte. Copiar mal ahí es contestar un contracargo con el número de otra
 * venta.
 *
 * ── Por qué se contempla que falle ──────────────────────────────────────────
 *
 * `navigator.clipboard` **no existe** fuera de un contexto seguro (una IP de red
 * local sin HTTPS, por ejemplo) y puede tirar error si el navegador lo tiene
 * bloqueado. Sin el `catch`, el botón se queda mudo y la persona cree que copió.
 * Con él, avisa que hay que hacerlo a mano — y el texto está a la vista al lado,
 * justamente para que se pueda.
 */
export default function BotonCopiar({ valor, que }: { valor: string; que: string }) {
  const [estado, setEstado] = useState<"quieto" | "copiado" | "falló">("quieto");

  async function copiar() {
    try {
      if (!navigator.clipboard) throw new Error("sin portapapeles");
      await navigator.clipboard.writeText(valor);
      setEstado("copiado");
    } catch {
      setEstado("falló");
    }
    /* Vuelve solo. Un tilde verde que se queda para siempre deja de significar
       "recién copiaste" y pasa a ser parte del dibujo. */
    window.setTimeout(() => setEstado("quieto"), 2200);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ${que}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-500 panel-oscuro:text-gray-400 transition-colors hover:border-orange-300 hover:text-orange-600"
    >
      {estado === "copiado"
        ? <><Check className="h-3 w-3 text-green-600" /> Copiado</>
        : estado === "falló"
          ? <span className="text-red-600">Copialo a mano</span>
          : <><Copy className="h-3 w-3" /> Copiar</>}
    </button>
  );
}
