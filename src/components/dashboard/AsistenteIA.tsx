"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import AsistentePersonaje, { type EstadoSacha } from "./AsistentePersonaje";

type Mensaje = { role: "user" | "assistant"; content: string };
type Novedad = { disponible: boolean; tieneNovedad: boolean; tipo: "oportunidad" | "alerta" | null };

function hoyKey() {
  return new Date().toDateString();
}

const INTRO_TEXTO = `¡Hola! Soy Sacha, el asistente de tu panel.

Te voy a ir contando cómo viene tu tienda —pedidos pendientes, stock bajo, cómo andan las ventas— y avisándote cuando se acerca alguna fecha que conviene aprovechar, con alguna idea para esa ocasión.

También podés preguntarme lo que necesites del panel: cómo armar un cupón, elegir y configurar tu template, conectar Mercado Pago, qué te falta antes de publicar tu tienda, y mucho más.

¿Por dónde arrancamos?`;

export default function AsistenteIA({ userId }: { userId: string }) {
  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [introVista, setIntroVista] = useState(true);
  const [mostrarIntro, setMostrarIntro] = useState(false);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mensajesRef = useRef<HTMLDivElement>(null);

  const visKey = `asistente_visto_${userId}_${hoyKey()}`;
  const greetKey = `asistente_greet_${userId}_${hoyKey()}`;
  const msgsKey = `asistente_msgs_${userId}_${hoyKey()}`;
  const introKey = `asistente_intro_${userId}`;

  useEffect(() => {
    fetch("/api/asistente/novedad")
      .then((r) => r.json())
      .then((d: Novedad) => setNovedad(d))
      .catch(() => setNovedad({ disponible: false, tieneNovedad: false, tipo: null }));
  }, []);

  // Restaurar la conversación de hoy (si existía) al recargar la página,
  // y detectar si todavía no se mostró nunca la intro de Sacha.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const guardados = localStorage.getItem(msgsKey);
    if (guardados) {
      try {
        setMensajes(JSON.parse(guardados));
      } catch {
        /* ignorar JSON corrupto */
      }
    }
    setIntroVista(localStorage.getItem(introKey) === "1");
  }, [msgsKey, introKey]);

  // Persistir la conversación de hoy en localStorage para que sobreviva un recargado.
  useEffect(() => {
    if (typeof window === "undefined" || mensajes.length === 0) return;
    localStorage.setItem(msgsKey, JSON.stringify(mensajes));
  }, [mensajes, msgsKey]);

  useEffect(() => {
    if (!abierto) return;
    inputRef.current?.focus();
    if (typeof window !== "undefined") localStorage.setItem(visKey, "1");

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abierto, visKey]);

  useEffect(() => {
    mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight });
  }, [mensajes]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function mandarRequest(body: { messages: Mensaje[]; greet: boolean }) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEnviando(true);
    setError(null);
    setMensajes((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No pudimos cargar a Sacha. Probá de nuevo.");
        setMensajes((prev) => prev.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensajes((prev) => {
          const copia = [...prev];
          copia[copia.length - 1] = { role: "assistant", content: acumulado };
          return copia;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Se cortó la conexión con Sacha. Probá de nuevo.");
        setMensajes((prev) => prev.slice(0, -1));
      }
    } finally {
      setEnviando(false);
    }
  }

  function abrirChat() {
    setAbierto(true);
    if (!introVista) {
      setMostrarIntro(true);
      if (typeof window !== "undefined") localStorage.setItem(introKey, "1");
      setIntroVista(true);
    }
    const yaSaludoHoy = typeof window !== "undefined" && localStorage.getItem(greetKey) === "1";
    if (!yaSaludoHoy && mensajes.length === 0) {
      if (typeof window !== "undefined") localStorage.setItem(greetKey, "1");
      mandarRequest({ messages: [], greet: true });
    }
  }

  function enviarMensaje() {
    const texto = input.trim();
    if (!texto || enviando) return;
    setInput("");
    const nuevoHistorial: Mensaje[] = [...mensajes, { role: "user", content: texto }];
    setMensajes(nuevoHistorial);
    mandarRequest({ messages: nuevoHistorial, greet: false });
  }

  if (!novedad?.disponible) return null;

  const yaVistoHoy = typeof window !== "undefined" && localStorage.getItem(visKey) === "1";
  const estadoBurbuja: EstadoSacha =
    !yaVistoHoy && novedad.tipo === "alerta" ? "sorprendido" : !yaVistoHoy && novedad.tipo === "oportunidad" ? "guiño" : "reposo";

  return (
    <>
      <motion.button
        type="button"
        onClick={abrirChat}
        aria-label="Abrir asistente Sacha"
        title="Sacha, tu asistente"
        initial={{ scale: 0 }}
        animate={{
          scale: 1,
          y: [0, -7, 0],
          boxShadow: [
            "0 8px 24px rgba(249,115,22,.45), 0 0 0 0 rgba(249,115,22,.45)",
            "0 8px 24px rgba(249,115,22,.45), 0 0 0 10px rgba(249,115,22,0)",
            "0 8px 24px rgba(249,115,22,.45), 0 0 0 0 rgba(249,115,22,.45)",
          ],
        }}
        transition={{
          scale: { delay: 0.8, type: "spring" },
          y: { delay: 0.8, duration: 2.6, repeat: Infinity, ease: "easeInOut" },
          boxShadow: { delay: 0.8, duration: 2.6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full hover:scale-110 transition-transform"
      >
        <AsistentePersonaje estado={estadoBurbuja} size={56} />
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbierto(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Chat con Sacha"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-[60] flex h-full w-full flex-col bg-white shadow-2xl md:w-[380px] md:rounded-l-2xl"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <AsistentePersonaje estado={enviando ? "pensando" : "sonriente"} size={36} />
                <div className="flex-1">
                  <p className="font-bold text-gray-950">Sacha</p>
                  <p className="text-xs text-gray-400">Tu asistente de TiendaApps</p>
                </div>
                <button
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar chat"
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div ref={mensajesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {mostrarIntro && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm whitespace-pre-wrap text-gray-800">
                      {INTRO_TEXTO}
                    </div>
                  </div>
                )}
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        m.role === "user" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.content || (enviando && i === mensajes.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                    </div>
                  </div>
                ))}
                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 p-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  disabled={enviando}
                  placeholder="Escribile a Sacha..."
                  maxLength={2000}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
                />
                <button
                  onClick={enviarMensaje}
                  disabled={enviando || !input.trim()}
                  aria-label="Enviar mensaje"
                  className="rounded-xl bg-orange-500 p-2.5 text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
