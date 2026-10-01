"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, X, ArrowRight, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { TONOS, esTono, CANAL_AVISOS } from "@/lib/avisos-admin";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

export type AvisoEnPantalla = {
  id: string;
  titulo: string;
  texto: string;
  botonTexto: string | null;
  botonLink: string | null;
  tono: string;
  /** Lo que ya votó: 1 = 👍, -1 = 👎, 0 = nada. */
  voto?: number;
};

/**
 * El cartel, sin lógica: lo dibujan el panel y la vista previa del admin, así
 * lo que el admin ve mientras escribe es exactamente lo que va a salir.
 *
 * ⚠️ El texto va como TEXTO, nunca como HTML: React lo escapa. Lo único que
 * respeta son los saltos de línea (`whitespace-pre-line`).
 */
export function CartelAviso({
  aviso, onCerrar, onClick, pagina, onVotar, className = "",
}: {
  aviso: Omit<AvisoEnPantalla, "id">;
  onCerrar?: () => void;
  onClick?: () => void;
  /** Con más de un aviso: "1 de 2" y las flechas para pasar de uno a otro. */
  pagina?: { actual: number; total: number; onAnterior: () => void; onSiguiente: () => void };
  /** Con esto aparece "¿Te sirvió?" y las manitos. Tocar la misma otra vez la saca. */
  onVotar?: (valor: 1 | -1) => void;
  /** Para el panel que ya separa a sus hijos y no quiere el `mb-6` del cartel. */
  className?: string;
}) {
  const t = TONOS[esTono(aviso.tono) ? aviso.tono : "verde"];
  return (
    <div className={`relative mb-6 overflow-hidden rounded-2xl ${t.fondo} ${t.tinta} p-5 shadow-sm sm:p-6 ${className}`}>
      {/* El brillo de fondo: decoración, y por eso `pointer-events-none`. */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/25">
          <Megaphone className="h-5 w-5" />
        </div>

        {/* `min-w-0`: un título largo sin espacios no puede empujar la ✕ afuera. */}
        <div className="min-w-0 flex-1 pr-8 sm:pr-10">
          <p className="text-lg font-black leading-snug [overflow-wrap:anywhere] sm:text-xl">{aviso.titulo}</p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed opacity-90 [overflow-wrap:anywhere]">{aviso.texto}</p>
          {aviso.botonTexto && aviso.botonLink && (
            <a
              href={aviso.botonLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${t.boton}`}
            >
              <span className="truncate">{aviso.botonTexto}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </a>
          )}
          {((pagina && pagina.total > 1) || onVotar) && (
            /* La fila de abajo: a la izquierda las hojas, a la derecha las manitos.
               Chica a propósito: el aviso es lo importante. `flex-wrap` para que en
               un celular angosto las manitos bajen en vez de salirse. */
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] font-semibold">
                {pagina && pagina.total > 1 && (
              /* Las flechas van ABAJO y chicas: el aviso es lo importante, la
                 cantidad es un dato. Y no dan la vuelta: en el último, la de
                 adelante se apaga, así se entiende que no hay más. */
              <div className="flex items-center gap-1">
                <button type="button" onClick={pagina.onAnterior} disabled={pagina.actual <= 1} aria-label="Aviso anterior"
                  className="rounded-lg p-1.5 transition hover:bg-black/10 disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[3.5rem] text-center tabular-nums opacity-80" aria-live="polite">{pagina.actual} de {pagina.total}</span>
                <button type="button" onClick={pagina.onSiguiente} disabled={pagina.actual >= pagina.total} aria-label="Aviso siguiente"
                  className="rounded-lg p-1.5 transition hover:bg-black/10 disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
              {onVotar && (
                <div className="ml-auto flex items-center gap-1">
                  <span className="mr-1 opacity-80">¿Te sirvió?</span>
                  {([[1, ThumbsUp, "Me sirvió"], [-1, ThumbsDown, "No me sirvió"]] as const).map(([v, Icono, etiqueta]) => {
                    const marcado = aviso.voto === v;
                    return (
                      <button key={v} type="button" onClick={() => onVotar(v)} aria-label={etiqueta} aria-pressed={marcado}
                        className={`rounded-lg p-1.5 transition ${marcado ? "bg-black/15" : "opacity-70 hover:bg-black/10 hover:opacity-100"}`}>
                        <Icono className="h-4 w-4" fill={marcado ? "currentColor" : "none"} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="absolute right-3 top-3 rounded-lg p-1.5 opacity-70 transition hover:bg-black/10 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * El aviso del admin arriba del inicio de un panel. Va en los tres: tiendas,
 * afiliados y digitales. Sin aviso que mostrar no dibuja nada.
 *
 * Lo pide al servidor en vez de recibirlo de la página: así entra igual en un
 * panel armado en el servidor y en uno armado en el navegador, con una línea.
 *
 * ── En vivo, sin recargar ──────────────────────────────────────────────────
 *
 * Vuelve a preguntar en dos momentos:
 *   - Cuando el admin publica, edita, apaga o borra un aviso: el servidor lo
 *     anuncia por un canal de Supabase (`avisarQueCambiaron`). Por el canal no
 *     viaja el aviso, sólo "volvé a preguntar".
 *   - Cuando la persona vuelve a la pestaña. El canal NO reenvía lo que se
 *     perdió mientras estaba cortado, y el panel queda abierto horas: es lo que
 *     ya hace la campanita, por el mismo motivo. También cubre el aviso
 *     programado, que se prende solo a su hora sin que nadie anuncie nada.
 */
export default function AvisoDelPanel({ className }: { className?: string } = {}) {
  const [avisos, setAvisos] = useState<AvisoEnPantalla[]>([]);
  /* La hoja del libro que se está mirando. Se guarda el ID y no la posición:
     si llega uno nuevo en vivo, la persona sigue viendo el que estaba leyendo. */
  const [verId, setVerId] = useState<string | null>(null);
  /* Los que ya se anotaron como vistos en esta pestaña, para no repetir el pedido. */
  const vistos = useRef<Set<string>>(new Set());
  const esperaVoto = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  /* El voto que todavía no salió (está en su medio segundo de espera). Si justo
     en ese momento el panel vuelve a preguntar, el servidor contesta el voto
     VIEJO: sin esto la manito se desmarcaba sola, aunque después se guardara
     bien. Mientras está acá, manda lo que tocó la persona. */
  const votoPendiente = useRef<Map<string, number>>(new Map());
  /* Los que la persona cerró en esta pestaña. Por dos cosas: frena el doble
     click en la ✕ (un `ref` y no estado: dos clicks seguidos leen el mismo
     estado antes de que React vuelva a dibujar), y evita que una consulta que
     salió ANTES de que el servidor anotara el cierre lo vuelva a mostrar. Es por
     aviso: un freno único dejaba la ✕ trabada para el próximo que llegara. */
  const cerrados = useRef<Set<string>>(new Set());
  const ultimaConsulta = useRef(0);

  const traer = useCallback(() => {
    ultimaConsulta.current = Date.now();
    fetch("/api/avisos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.avisos)) return;
        const lista = (d.avisos as AvisoEnPantalla[])
          .filter((a) => !cerrados.current.has(a.id))
          .map((a) => (votoPendiente.current.has(a.id) ? { ...a, voto: votoPendiente.current.get(a.id) } : a));
        if (lista[0]) vistos.current.add(lista[0].id);
        setAvisos(lista);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { traer(); }, [traer]);

  useEffect(() => {
    function alVolver() {
      if (document.visibilityState !== "visible") return;
      /* `focus` y `visibilitychange` se disparan juntos al hacer alt-tab. */
      if (Date.now() - ultimaConsulta.current < 3000) return;
      traer();
    }
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [traer]);

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;
    const supabase = createSupabaseBrowserClient();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase
      .channel(CANAL_AVISOS)
      .on("broadcast", { event: "cambio" }, () => {
        /* Un ratito al azar, hasta 3 segundos: si hay cientos de paneles
           abiertos, que no le pregunten todos al servidor en el mismo instante. */
        clearTimeout(espera);
        espera = setTimeout(traer, Math.random() * 3000);
      })
      .subscribe();
    return () => { clearTimeout(espera); supabase.removeChannel(canal); };
  }, [traer]);

  const idx = Math.max(0, avisos.findIndex((a) => a.id === verId));
  const aviso = avisos[idx] ?? null;
  if (!aviso) return null;

  const avisar = (id: string, accion: "cerrar" | "click" | "visto") =>
    fetch(`/api/avisos/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
      keepalive: true,
    }).catch(() => {});

  /* El voto se manda medio segundo después del último toque, y sólo el valor
     final: tocar 👍 👎 👍 rápido no son tres pedidos que pueden llegar
     desordenados y dejar guardado el que no era. */
  const votar = (valor: 1 | -1) => {
    const nuevo = aviso.voto === valor ? 0 : valor;
    const id = aviso.id;
    setAvisos((lista) => lista.map((a) => (a.id === id ? { ...a, voto: nuevo } : a)));
    clearTimeout(esperaVoto.current.get(id));
    votoPendiente.current.set(id, nuevo);
    esperaVoto.current.set(id, setTimeout(() => {
      votoPendiente.current.delete(id);
      fetch(`/api/avisos/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "voto", valor: nuevo }),
        keepalive: true,
      }).catch(() => {});
    }, 500));
  };

  const ir = (n: number) => {
    const destino = avisos[n];
    if (!destino) return;
    setVerId(destino.id);
    if (!vistos.current.has(destino.id)) { vistos.current.add(destino.id); avisar(destino.id, "visto"); }
  };

  return (
    <CartelAviso
      aviso={aviso}
      className={className}
      onClick={() => { avisar(aviso.id, "click"); }}
      onVotar={votar}
      pagina={{ actual: idx + 1, total: avisos.length, onAnterior: () => ir(idx - 1), onSiguiente: () => ir(idx + 1) }}
      onCerrar={() => {
        if (cerrados.current.has(aviso.id)) return;
        cerrados.current.add(aviso.id);
        /* Cierra SÓLO el que se está viendo, y queda en la hoja que le sigue
           (o en la anterior, si era el último). */
        const resto = avisos.filter((a) => a.id !== aviso.id);
        const siguiente = resto[Math.min(idx, resto.length - 1)] ?? null;
        setAvisos(resto);
        setVerId(siguiente?.id ?? null);
        if (siguiente && !vistos.current.has(siguiente.id)) { vistos.current.add(siguiente.id); avisar(siguiente.id, "visto"); }
        avisar(aviso.id, "cerrar");
      }}
    />
  );
}
