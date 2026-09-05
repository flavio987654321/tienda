"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle, Globe } from "lucide-react";
import { normalizarSlug, SLUG_MAXIMO } from "@/lib/configuracion-digital";

/**
 * La dirección de un producto.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE ESTA PANTALLA TIENE QUE DECIR ANTES QUE NADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Que **cambiarla rompe los links que ya repartiste**. No es una advertencia de
 * cortesía: alguien que pautó dos semanas contra su dirección pierde los
 * anuncios corriendo, el historial del píxel y todo lo que compartió por
 * WhatsApp. Es de lo poco acá que no se puede deshacer.
 *
 * Por eso el aviso no aparece siempre: aparece **cuando ya hay una dirección
 * puesta**, que es cuando pasa a ser verdad. Ponerla por primera vez no rompe
 * nada, y avisar ahí sería asustar por asustar — y el que avisa siempre no
 * avisa nunca.
 *
 * ── Mirar no es reservar ───────────────────────────────────────────────────
 *
 * El cartel de "está libre" se consulta mientras se escribe, pero entre eso y
 * guardar otro se lo puede llevar. El que garantiza es el servidor al guardar,
 * con un candado. Acá sólo se evita hacer escribir en vano.
 */

export default function DireccionClient({
  productoId,
  slugActual,
  dominioBase,
  publicado,
}: {
  productoId: string;
  slugActual: string | null;
  dominioBase: string;
  publicado: boolean;
}) {
  const [valor, setValor] = useState(slugActual ?? "");
  const [guardado, setGuardado] = useState(slugActual);
  /* ⚠️ Lo que se GUARDA es la última respuesta del servidor, y nada más.
   *
   * "Mirando", "libre" y "ocupado" NO son estado: se DEDUCEN de comparar esa
   * respuesta con lo que hay escrito ahora. Guardarlos obligaba a llamar a
   * `setEstado` en forma sincrónica adentro del efecto —apenas cambia una
   * tecla— y eso dispara un dibujo que dispara otro. Con la respuesta guardada
   * y el resto deducido, el efecto sólo escribe cuando el servidor contesta. */
  const [respuesta, setRespuesta] = useState<{ slug: string; libre: boolean; motivo: string | null } | null>(null);
  /* El error de GUARDAR va aparte: no lo puede pisar la próxima consulta. */
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  /* El doble clic: `guardando` es estado y el estado se ve recién en el
     siguiente dibujo, así que dos clics en el mismo cuadro lo leen los dos en
     false. El ref cambia en el acto. */
  const enVuelo = useRef(false);

  const limpio = normalizarSlug(valor);
  const cambio = limpio !== (guardado ?? "");

  /* ── Mirar mientras se escribe ─────────────────────────────────────────── */
  useEffect(() => {
    if (!cambio || limpio.length === 0) return;

    /* Se espera a que pare de escribir. Sin esto sale una consulta por tecla, y
       en "mecanica" son ocho. */
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/digitales/productos/${productoId}/direccion?slug=${encodeURIComponent(limpio)}`,
        );
        const datos = await res.json().catch(() => null);
        if (!vivo) return;
        setRespuesta({
          slug: limpio,
          libre: datos?.libre === true,
          motivo: datos?.libre ? null : (datos?.motivo ?? "Esa dirección no se puede usar."),
        });
      } catch {
        /* Que no se pueda mirar no bloquea: el que decide es el guardado. */
      }
    }, 400);

    return () => { vivo = false; clearTimeout(t); };
  }, [limpio, cambio, productoId]);

  /* Lo que se dibuja, deducido. "Mirando" es simplemente que la respuesta que
     tenemos no es de lo que hay escrito ahora. */
  const estado: "quieto" | "mirando" | "libre" | "ocupado" =
    errorGuardar ? "ocupado"
      : !cambio || limpio.length === 0 ? "quieto"
        : respuesta?.slug !== limpio ? "mirando"
          : respuesta.libre ? "libre" : "ocupado";

  const motivo = errorGuardar ?? (estado === "ocupado" ? respuesta?.motivo ?? null : null);

  async function guardar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setGuardando(true);
    setErrorGuardar(null);
    setListo(false);

    try {
      const res = await fetch(`/api/digitales/productos/${productoId}/direccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: limpio }),
      });
      const datos = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorGuardar(datos?.error ?? "No pudimos guardar la dirección. Probá de nuevo.");
        return;
      }

      setGuardado(datos.slug);
      setValor(datos.slug);
      /* Se limpia lo mirado: la próxima consulta la dispara la próxima tecla. */
      setRespuesta(null);
      setListo(true);
    } catch {
      setErrorGuardar("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  const puedeGuardar = cambio && limpio.length > 0 && estado !== "ocupado" && !guardando;

  return (
    <>
      {/* La dirección que está andando ahora, si hay alguna. */}
      {guardado && (
        <div className="rounded-2xl border border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 panel-oscuro:text-emerald-400">
            Tu dirección
          </p>
          {/* `break-all`: una dirección larga en 360 empujaba la pantalla. */}
          <p className="mt-1 text-[15px] font-bold text-emerald-900 panel-oscuro:text-emerald-300 break-all">
            {guardado}.{dominioBase}
          </p>
        </div>
      )}

      {/* ⚠️ El aviso va ANTES del campo, no debajo del botón. Debajo se lee
          después de haber escrito, que es tarde. Y sólo si ya hay una puesta:
          ponerla por primera vez no rompe nada. */}
      {guardado && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Si la cambiás, <strong>la dirección de antes deja de funcionar</strong>. Los links
            que ya compartiste y los anuncios que estén corriendo contra ella dejan de llegar.
            {publicado && " Este producto ya está publicado."}
          </span>
        </p>
      )}

      <label className="mt-5 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
        {guardado ? "Cambiar la dirección" : "Elegí tu dirección"}
      </label>

      <div className="mt-1.5 flex items-stretch rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 overflow-hidden focus-within:border-orange-400">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value.slice(0, SLUG_MAXIMO))}
          maxLength={SLUG_MAXIMO}
          disabled={guardando}
          placeholder="mecanica"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
        />
        {/* `shrink-0` + texto chico: en 360 el dominio no puede empujar al campo
            hasta dejarlo sin ancho. */}
        <span className="shrink-0 flex items-center bg-gray-50 panel-oscuro:bg-gray-800 px-3 text-[12px] font-semibold text-gray-500 panel-oscuro:text-gray-400 border-l border-gray-200 panel-oscuro:border-gray-700">
          .{dominioBase}
        </span>
      </div>

      {/* Lo que se va a guardar de verdad, si no es lo mismo que se escribió.
          "Mis Guías" se guarda como "mis-guias" y eso hay que verlo antes. */}
      {limpio && limpio !== valor && (
        <p className="mt-1.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
          Se va a guardar como <strong>{limpio}</strong>
        </p>
      )}

      <div className="mt-2 min-h-[20px] text-[12px]">
        {estado === "mirando" && (
          <span className="inline-flex items-center gap-1.5 text-gray-500 panel-oscuro:text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fijándonos si está libre…
          </span>
        )}
        {estado === "libre" && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Está libre
          </span>
        )}
        {estado === "ocupado" && motivo && (
          <span role="alert" className="inline-flex items-start gap-1.5 font-bold text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {motivo}
          </span>
        )}
        {listo && estado === "quieto" && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Guardada
          </span>
        )}
      </div>

      <button
        onClick={guardar}
        disabled={!puedeGuardar}
        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        {guardando ? "Guardando…" : guardado ? "Cambiar la dirección" : "Guardar la dirección"}
      </button>

      {/* ⚠️ El dominio propio NO se dibuja acá: es su propio componente y lo
          monta la página, que es la que sabe el plan. Antes estaba adentro de
          este archivo, apagado y con un cartel de "todavía no está disponible". */}
    </>
  );
}
