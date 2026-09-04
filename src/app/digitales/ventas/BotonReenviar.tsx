"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

/**
 * "Reenviar el mail" — el botón, con su freno y su aviso.
 *
 * ── Por qué es un archivo aparte ────────────────────────────────────────────
 *
 * Porque lo aprietan dos pantallas: la lista de ventas y el detalle de una. Y no
 * es un botón: es un botón MÁS un freno de doble click, MÁS la traducción de
 * cuatro respuestas distintas del servidor a una frase en castellano. Copiado en
 * dos lados, el día que cambie una de esas frases va a cambiar en uno solo.
 *
 * ── El freno ────────────────────────────────────────────────────────────────
 *
 * `useState` no alcanza: dos clics seguidos leen el mismo `false` antes de que
 * React vuelva a dibujar, y salen los dos — dos mails al mismo comprador y dos
 * de sus tres reenvíos del día quemados. Con un `ref` el segundo ve el `true` en
 * el mismo instante.
 */
export default function BotonReenviar({
  ordenId,
  /* En el detalle la pantalla muestra el vencimiento del enlace, así que después
     de renovarlo hay que volver a pedirlo: si no, la ficha sigue diciendo la
     fecha vieja y quien vende cree que no pasó nada. En la lista no hace falta. */
  refrescar = false,
}: {
  ordenId: string;
  refrescar?: boolean;
}) {
  const router = useRouter();
  const [mandando, setMandando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const enVuelo = useRef(false);

  async function reenviar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setMandando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/digitales/ventas/${ordenId}/reenviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setAviso({ ok: false, texto: d.error ?? "No pudimos mandarlo. Probá de nuevo." });
      } else {
        setAviso({
          ok: true,
          texto: d.renovados > 0
            /* Se dice cuando el enlace estaba vencido: es un cambio real en lo
               que esa persona puede hacer, no un detalle técnico. */
            ? "Mail reenviado, y le renovamos el enlace por 30 días más."
            : "Mail reenviado.",
        });
        if (refrescar) router.refresh();
      }
    } catch {
      setAviso({ ok: false, texto: "No pudimos conectarnos. Probá de nuevo." });
    }
    enVuelo.current = false;
    setMandando(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={reenviar}
        disabled={mandando}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
      >
        {mandando
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Send className="h-3.5 w-3.5" />}
        {mandando ? "Mandando…" : "Reenviar el mail"}
      </button>

      {aviso && (
        /* `role="status"` y no `alert`: es la respuesta a algo que la persona
           apretó, no una interrupción. Un lector de pantalla lo anuncia cuando
           termina de leer lo que estaba leyendo. */
        <p
          role="status"
          className={`min-w-0 text-[12px] ${
            aviso.ok
              ? "text-green-700 panel-oscuro:text-green-400"
              : "text-red-600 panel-oscuro:text-red-400"
          }`}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
