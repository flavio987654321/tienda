"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import Link from "next/link";
import { X, Send, Loader2, Lock, Sparkles, ArrowRight } from "lucide-react";
import AsistentePersonaje from "@/components/dashboard/AsistentePersonaje";
import type { TierDigital } from "@/lib/planes-digitales";
/* La lista blanca de pantallas la comparte con el prompt: ver allá por qué. */
import { PANTALLAS_DEL_PANEL } from "@/lib/sasha-digital-saber";

/**
 * Sasha adentro del panel de Productos Digitales.
 *
 * Tres cosas la separan de la del panel de tiendas, y las tres son a
 * propósito:
 *
 *   - EL SALUDO NO GASTA. El "hola" de cada día es texto nuestro, no una
 *     respuesta del modelo: saludar costaba un mensaje entero por persona por
 *     día para decir algo que ya sabemos escribir.
 *   - FREE NO ABRE EL CHAT. Ve quién es Sasha y qué plan la incluye, y ahí
 *     termina: no hay pedido que mandar, así que no hay nada que contar ni que
 *     pagar.
 *   - SE VE CUÁNTO QUEDA. Cuando quedan pocos mensajes del día lo dice antes
 *     de que se acaben, no después.
 */

type Mensaje = { role: "user" | "assistant"; content: string };

type Estado = {
  tier: TierDigital;
  tope: number;
  usados: number;
  mensajes: Mensaje[];
};

const MARCA_IR = /\s*\[\[IR:(\/[A-Za-z0-9/_-]*)\]\]\s*$/;

/** Despega la marca final y devuelve el texto y, si vale, el botón. */
export function leerMarcaDeIr(texto: string): { texto: string; ir: { href: string; label: string } | null } {
  const m = texto.match(MARCA_IR);
  if (!m) return { texto: texto.trimEnd(), ir: null };
  const label = PANTALLAS_DEL_PANEL[m[1]];
  return { texto: texto.slice(0, m.index).trimEnd(), ir: label ? { href: m[1], label } : null };
}

const SALUDO = "¡Hola! Soy Sasha. Sé de productos digitales: qué es un ebook, cómo armar tu embudo, cuánto cobrar, por qué una página no vende. Y veo cómo viene tu cuenta. ¿Qué querés saber?";

const SUGERENCIAS = ["¿Por dónde empiezo?", "¿Cuánto cobro por mi ebook?", "¿Cómo viene mi producto?"];

export default function Sasha() {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Cuando el tope del día cortó: el cuadro de escribir se apaga hasta
     mañana, así no se manda un pedido que ya sabemos que se rechaza. */
  const [cortado, setCortado] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Se arrastra, igual que en el panel de tiendas ──────────────────────
     Sasha tapa una esquina, y la esquina que tapa molesta distinto en cada
     pantalla —acá abajo a la derecha está el botón de guardar de varias—.
     Se puede mover a donde no moleste y ahí se queda: la posición se guarda
     en ESTE navegador (`localStorage`), porque es una comodidad de quien la
     corrió, no un dato de la cuenta.
     `arrastrando` existe porque soltarla también dispara el clic: sin esa
     guarda, moverla abría el chat todas las veces. */
  const arrastrando = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [limites, setLimites] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    /* Los límites son el tamaño de la ventana menos el botón: que no se pueda
       tirar afuera y quedarse sin forma de traerla de vuelta. Se recalculan al
       rotar el celular o cambiar el tamaño de la ventana. */
    const medir = () => setLimites({ left: -(window.innerWidth - 80), right: 0, top: -(window.innerHeight - 120), bottom: 0 });
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    try {
      const guardada = localStorage.getItem("sasha-digital-pos");
      if (!guardada) return;
      const { x: gx, y: gy } = JSON.parse(guardada) as { x: number; y: number };
      if (typeof gx === "number" && typeof gy === "number") { x.set(gx); y.set(gy); }
    } catch { /* sin localStorage (o con basura adentro) arranca en su esquina */ }
  }, [x, y]);

  /* El estado se pide UNA vez al abrir, no al cargar el panel: si no, cada
     pantalla del panel haría una consulta para algo que casi nunca se abre. */
  useEffect(() => {
    if (!abierto || estado) return;
    let vivo = true;
    fetch("/api/digitales/sasha")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Estado | null) => {
        if (!vivo || !d) return;
        setEstado(d);
        setMensajes(d.mensajes ?? []);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [abierto, estado]);

  useEffect(() => {
    if (!abierto) return;
    inputRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  useEffect(() => {
    cajaRef.current?.scrollTo({ top: cajaRef.current.scrollHeight });
  }, [mensajes, enviando]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function mandar(texto: string) {
    if (!texto.trim() || enviando || cortado) return;
    const conmigo: Mensaje[] = [...mensajes, { role: "user", content: texto.trim() }];
    setMensajes([...conmigo, { role: "assistant", content: "" }]);
    setInput("");
    setEnviando(true);
    setError(null);

    abortRef.current?.abort();
    const control = new AbortController();
    abortRef.current = control;

    try {
      /* Se manda SÓLO el mensaje nuevo: lo dicho hasta ahora lo arma el
         servidor con lo que tiene guardado. Ver el comentario en la ruta —
         una charla que viaja desde el navegador se puede inventar. */
      const r = await fetch("/api/digitales/sasha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: texto.trim() }),
        signal: control.signal,
      });
      if (!r.ok || !r.body) {
        const d = (await r.json().catch(() => null)) as { error?: string; motivo?: string } | null;
        setError(d?.error ?? "No pudimos hablar con Sasha. Probá de nuevo.");
        /* Sólo se apaga el cuadro cuando no hay nada que reintentar hoy: el
           cupo del día, o un plan que no la incluye. Un "mandaste muchos
           seguidos" se va en un rato y una demanda alta también, así que ahí
           se muestra el aviso y se deja volver a probar — apagarlo hasta
           recargar por algo que dura diez minutos es peor que el problema. */
        if (d?.motivo === "diario" || d?.motivo === "plan") setCortado(true);
        setMensajes(conmigo);
        return;
      }
      const lector = r.body.getReader();
      const decoder = new TextDecoder();
      let junto = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        junto += decoder.decode(value, { stream: true });
        setMensajes([...conmigo, { role: "assistant", content: junto }]);
      }
      setEstado((e) => (e ? { ...e, usados: Math.min(e.usados + 1, e.tope) } : e));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Se cortó la conexión. Probá de nuevo.");
        setMensajes(conmigo);
      }
    } finally {
      setEnviando(false);
    }
  }

  const esFree = estado !== null && estado.tope === 0;
  const quedan = estado ? Math.max(0, estado.tope - estado.usados) : null;

  return (
    <>
      {/* El personaje ES el botón, sin círculo blanco alrededor: es el mismo
          que en el panel de tiendas, y Sasha tiene que ser la misma en los dos
          —aunque adentro sepa de otra cosa—. `bottom-20` en el celular para no
          taparle la barra de abajo del panel. `print:hidden` en todo: si el
          chat quedó abierto y se imprime, tapa la pantalla entera. */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={limites}
        style={{ x, y }}
        onDragStart={() => { arrastrando.current = true; }}
        onDragEnd={() => {
          /* El clic llega justo después de soltar: se baja la guarda un
             instante más tarde para que ese clic no abra el chat. */
          setTimeout(() => { arrastrando.current = false; }, 50);
          try {
            localStorage.setItem("sasha-digital-pos", JSON.stringify({ x: x.get(), y: y.get() }));
          } catch { /* sin localStorage se mueve igual, sólo que no se recuerda */ }
        }}
        className="fixed bottom-20 right-4 z-[60] h-14 w-14 cursor-grab touch-none active:cursor-grabbing lg:bottom-6 lg:right-6 print:hidden"
      >
        <button
          type="button"
          onClick={() => { if (!arrastrando.current) setAbierto((v) => !v); }}
          aria-label={abierto ? "Cerrar el chat con Sasha" : "Abrir el chat con Sasha"}
          title="Sasha — arrastrala para moverla"
          className="h-14 w-14 rounded-full transition-transform hover:scale-110"
        >
          <AsistentePersonaje estado={enviando ? "pensando" : abierto ? "sonriente" : "reposo"} size={56} />
        </button>
      </motion.div>

      {abierto && (
        <>
          {/* En el celular el cajón ocupa todo, así que el fondo oscuro es lo
              que deja volver tocando afuera. */}
          <div
            className="fixed inset-0 z-[60] bg-black/30 md:hidden print:hidden"
            onClick={() => setAbierto(false)}
          />
          <div
            role="dialog"
            aria-label="Chat con Sasha"
            className="fixed right-0 top-0 z-[60] flex h-full w-full flex-col bg-white panel-oscuro:bg-gray-900 shadow-2xl md:w-[380px] md:rounded-l-2xl print:hidden"
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 panel-oscuro:border-gray-800 p-4">
              <AsistentePersonaje estado={enviando ? "pensando" : "sonriente"} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-950 panel-oscuro:text-gray-100">Sasha</p>
                <p className="truncate text-xs text-gray-400 panel-oscuro:text-gray-500">
                  {esFree ? "Asistente con IA de TiendaApps" : quedan !== null && quedan <= 5 ? `Te quedan ${quedan} mensaje${quedan === 1 ? "" : "s"} hoy` : "Asistente con IA de TiendaApps"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar chat"
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {esFree ? (
              /* Free: no hay chat que abrir. Se cuenta qué hace y con qué plan
                 viene; no se manda ningún pedido, así que no hay nada que
                 contar ni que pagar. */
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <AsistentePersonaje estado="guiño" size={64} />
                <span className="mt-4 grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 panel-oscuro:bg-orange-500/10">
                  <Lock className="h-4 w-4 text-orange-600" />
                </span>
                <p className="mt-3 font-bold text-gray-950 panel-oscuro:text-gray-100">Sasha viene con Starter y Pro</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  Te explica desde cero —qué es un ebook, cómo armar tu embudo, cuánto cobrar— y mira tu cuenta para decirte qué conviene hacer ahora.
                </p>
                <Link href="/digitales/mi-cuenta" onClick={() => setAbierto(false)} className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors">
                  <Sparkles className="h-4 w-4" /> Ver los planes
                </Link>
              </div>
            ) : (
              <>
                <div ref={cajaRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  <Burbuja de="assistant">{SALUDO}</Burbuja>
                  {mensajes.map((m, i) => {
                    const { texto, ir } = m.role === "assistant" ? leerMarcaDeIr(m.content) : { texto: m.content, ir: null };
                    return (
                      <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <Burbuja de={m.role}>
                          {texto || (enviando && i === mensajes.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                        </Burbuja>
                        {ir && (
                          <Link href={ir.href} onClick={() => setAbierto(false)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-50 panel-oscuro:bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-100">
                            {ir.label} <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                  {mensajes.length === 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGERENCIAS.map((s) => (
                        <button key={s} type="button" onClick={() => void mandar(s)} className="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3.5 py-2 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300 hover:border-orange-300 hover:text-orange-700 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {error && <div role="alert" className="rounded-2xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 panel-oscuro:text-amber-200">{error}</div>}
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); void mandar(input); }}
                  className="flex shrink-0 items-center gap-2 border-t border-gray-100 panel-oscuro:border-gray-800 p-3"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={500}
                    disabled={enviando || cortado}
                    placeholder={cortado ? "Volvé mañana" : "Escribile a Sasha..."}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-4 py-2.5 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={enviando || cortado || !input.trim()}
                    aria-label="Enviar mensaje"
                    className="rounded-xl bg-orange-500 p-2.5 text-white hover:bg-orange-600 disabled:opacity-40"
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Burbuja({ de, children }: { de: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
        de === "user"
          ? "ml-auto bg-orange-500 text-white"
          : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-800 panel-oscuro:text-gray-100"
      }`}
    >
      {children}
    </div>
  );
}
