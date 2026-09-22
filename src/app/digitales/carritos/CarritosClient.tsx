"use client";

import { useState } from "react";
import { Copy, Check, Mail, MailCheck, MessageCircle } from "lucide-react";
import { celularArgentino } from "@/lib/ventas-digitales";
import { primerNombre } from "@/lib/texto";

/**
 * La lista de carritos abandonados.
 *
 * Es de navegador por una sola cosa: **copiar el correo**. Esa es la operación
 * real de esta pantalla —se pega en el mail o en WhatsApp— y en un teléfono
 * seleccionar un correo a mano con el dedo es un castigo.
 *
 * ⚠️ Lo que NO hace: mandar nada. Acá no hay ningún botón que le escriba a
 * alguien desde nuestro servidor. El enlace de "escribirle" abre el programa de
 * correo de la persona **con su propia dirección como remitente**, así que la
 * conversación queda entre quien vende y quien iba a comprar. Mandarlo nosotros
 * sin que sea el envío automático de Pro sería usar nuestro dominio de envío
 * para correo que no controlamos.
 */

export type CarritoEnPantalla = {
  ordenId: string;
  email: string;
  nombre: string | null;
  /** El celular que dejó en el checkout, si lo dejó: es opcional allá. */
  telefono: string | null;
  productos: string[];
  total: number;
  /** Ya formateado en el servidor: ver el comentario en la página. */
  cuando: string;
  recordado: boolean;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function CarritosClient({
  carritos,
  tienda,
}: {
  carritos: CarritoEnPantalla[];
  tienda: string;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      setTimeout(() => setCopiado((c) => (c === texto ? null : c)), 1800);
    } catch {
      /* Sin permiso de portapapeles no se hace nada: el correo está a la vista
         y se puede seleccionar a mano. */
    }
  }

  return (
    <div className="space-y-2">
      {carritos.map((c) => {
        const que = c.productos[0] ?? "tu compra";
        /* El asunto y el cuerpo se arman acá para que el programa de correo se
           abra con algo escrito. `encodeURIComponent` es obligatorio: un nombre
           de producto con un `&` o un `#` cortaría el enlace a la mitad. */
        const asunto = encodeURIComponent(`Tu compra de ${que}`);
        const texto =
          `Hola${primerNombre(c.nombre) ? ` ${primerNombre(c.nombre)}` : ""}, vi que empezaste a comprar ${que} y no llegaste a terminar. ` +
          `Si te quedó alguna duda, contame y lo vemos.\n\n${tienda}`;
        const cuerpo = encodeURIComponent(texto);
        /* El mismo mensaje por WhatsApp, para no escribir dos veces lo mismo.
           `celularArgentino` deja el número como lo quiere wa.me (sin 15, sin
           0, sin +54); si lo que dejó no parece un celular, no hay botón. */
        const cel = celularArgentino(c.telefono);
        const whatsapp = cel ? `https://wa.me/549${cel}?text=${cuerpo}` : null;

        return (
          <div
            key={c.ordenId}
            className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-4 py-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100 truncate">
                  {que}
                </p>
                {c.productos.length > 1 && (
                  <p className="text-[11.5px] text-gray-500 panel-oscuro:text-gray-400 truncate">
                    + {c.productos.slice(1).join(", ")}
                  </p>
                )}
                <p className="mt-0.5 text-[11.5px] text-gray-400 panel-oscuro:text-gray-500">
                  {c.cuando}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black tabular-nums text-gray-900 panel-oscuro:text-gray-100">
                {plata(c.total)}
              </p>
            </div>

            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-gray-50 panel-oscuro:bg-gray-950/50 px-3 py-2">
              {/* `min-w-0` + `break-all`: un correo largo en 360 se llevaba
                  puestos los dos botones de la derecha. */}
              <span className="min-w-0 flex-1 break-all text-[12.5px] font-semibold text-gray-700 panel-oscuro:text-gray-300">
                {c.email || "—"}
              </span>

              {c.email && (
                <>
                  <button
                    type="button"
                    onClick={() => copiar(c.email)}
                    aria-label={`Copiar ${c.email}`}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/15 hover:text-orange-600 transition-colors"
                  >
                    {copiado === c.email
                      ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  <a
                    href={`mailto:${c.email}?subject=${asunto}&body=${cuerpo}`}
                    aria-label={`Escribirle a ${c.email}`}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/15 hover:text-orange-600 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>

                  {/* ⚠️ WhatsApp SÓLO si dejó el celular: es opcional en el
                      checkout, así que la mayoría de las filas no lo va a
                      tener, y un botón que no hace nada es peor que no estar.

                      Abre TU WhatsApp con el mensaje escrito: lo mandás vos,
                      desde tu teléfono, a alguien que empezó a comprarte. No
                      lo mandamos nosotros ni es automático — eso sería otra
                      cosa, y necesitaría otro permiso. */}
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Escribirle por WhatsApp al ${c.telefono}`}
                      title="Escribirle por WhatsApp"
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 panel-oscuro:hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Que ya se le escribió importa: evita que le escriban de nuevo a
                mano encima del automático, que es la forma de quedar pesado. */}
            {c.recordado && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <MailCheck className="h-3 w-3" /> Ya le mandamos el recordatorio
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
