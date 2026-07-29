"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import Link from "next/link";
import { X, Send, Loader2, ShoppingCart, ArrowRight, ShoppingBag, PackageSearch, Store, Package, Wallet } from "lucide-react";
import AsistentePersonaje, { type EstadoSasha } from "./AsistentePersonaje";

type Mensaje = { role: "user" | "assistant"; content: string };
type Novedad = { disponible: boolean; tieneNovedad: boolean; tipo: "oportunidad" | "alerta" | null };

// Marca que Sasha agrega al final de un mensaje para pedir un botón de acción
// concreto en vez de que el dueño tenga que ir a buscar la sección a mano.
// Tiene que coincidir exactamente con lo que indica el system prompt (asistente-prompt.ts).
const ACCIONES: Record<string, { label: string; href: string; icon: React.ElementType }> = {
  CARRITOS_ABANDONADOS: { label: "Ver carritos abandonados", href: "/dashboard/carritos-abandonados", icon: ShoppingCart },
  PEDIDOS_PENDIENTES: { label: "Ver pedidos pendientes", href: "/dashboard/pedidos?status=PENDING", icon: ShoppingBag },
  STOCK_BAJO: { label: "Ver productos con stock bajo", href: "/dashboard/productos?stock=critical", icon: PackageSearch },
  FALTA_DISENO: { label: "Elegir diseño de mi tienda", href: "/dashboard/configuracion", icon: Store },
  FALTA_PRODUCTOS: { label: "Cargar un producto", href: "/dashboard/productos", icon: Package },
  FALTA_COBRO: { label: "Configurar método de cobro", href: "/dashboard/pagos", icon: Wallet },
};

type AccionesValidas = Record<string, boolean>;

// Sasha puede agregar más de una marca cuando hay más de un tema pendiente
// a la vez (ej. carritos abandonados Y pedidos pendientes) — se van
// despegando todas las marcas finales, una por una, manteniendo el orden.
// "accionesValidas" (traído de /api/asistente/acciones, datos reales de la
// base) filtra cualquier marca que el modelo haya puesto sin que el problema
// siga siendo cierto ahora mismo — nunca se confía ciegamente en el texto.
function parseAcciones(content: string, accionesValidas: AccionesValidas | null): { texto: string; acciones: (typeof ACCIONES)[string][] } {
  let texto = content;
  const acciones: (typeof ACCIONES)[string][] = [];
  const re = /\s*\[\[ACCION:([A-Z_]+)\]\]\s*$/;
  let match: RegExpMatchArray | null;
  while ((match = texto.match(re))) {
    const key = match[1];
    const accion = ACCIONES[key];
    if (accion && accionesValidas?.[key]) acciones.unshift(accion);
    texto = texto.slice(0, match.index);
  }
  return { texto: texto.trimEnd(), acciones };
}

function hoyKey() {
  return new Date().toDateString();
}

const INTRO_TEXTO = `¡Hola! Soy Sasha, el asistente con inteligencia artificial de tu panel.

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
  const [historialError, setHistorialError] = useState(false);
  const [accionesValidas, setAccionesValidas] = useState<AccionesValidas | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mensajesRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    const updateConstraints = () => setDragConstraints({
      left: -(window.innerWidth - 80),
      right: 0,
      top: -(window.innerHeight - 80),
      bottom: 0,
    });
    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    return () => window.removeEventListener("resize", updateConstraints);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("sasha-pos");
    if (!saved) return;
    try {
      const { x, y } = JSON.parse(saved);
      dragX.set(x);
      dragY.set(y);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // El historial vive en el servidor (no en localStorage) para que sea el mismo en
  // cualquier dispositivo. yaSaludoHoy evita saludar dos veces mientras carga.
  const [yaSaludoHoy, setYaSaludoHoy] = useState(false);
  const [historialListo, setHistorialListo] = useState(false);

  const visKey = `asistente_visto_${userId}_${hoyKey()}`;
  const introKey = `asistente_intro_${userId}`;

  useEffect(() => {
    fetch("/api/asistente/novedad")
      .then((r) => r.json())
      .then((d: Novedad) => setNovedad(d))
      .catch(() => setNovedad({ disponible: false, tieneNovedad: false, tipo: null }));
  }, []);

  // Traer del servidor la conversación de hoy (la misma en cualquier dispositivo),
  // y detectar si todavía no se mostró nunca la intro de Sasha en este navegador.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage (sistema externo)
    setIntroVista(localStorage.getItem(introKey) === "1");
    fetch("/api/asistente/historial")
      .then((r) => {
        if (!r.ok) throw new Error("historial no disponible");
        return r.json();
      })
      .then((d: { messages?: Mensaje[]; yaSaludoHoy?: boolean }) => {
        if (d.messages) setMensajes(d.messages);
        setYaSaludoHoy(!!d.yaSaludoHoy);
      })
      .catch(() => {
        // Si no se pudo traer el historial, no sabemos si ya saludó hoy desde otro
        // dispositivo: asumimos que sí para no arriesgar un saludo duplicado.
        setHistorialError(true);
        setYaSaludoHoy(true);
      })
      .finally(() => setHistorialListo(true));
  }, [introKey]);

  // Saluda apenas se sabe que el chat está abierto, el historial ya cargó del server,
  // todavía no se saludó hoy (en ningún dispositivo) y no hay mensajes previos.
  useEffect(() => {
    if (!abierto || !historialListo || yaSaludoHoy || mensajes.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda inmediata para no disparar el saludo dos veces
    setYaSaludoHoy(true);
    mandarRequest({ messages: [], greet: true });
  }, [abierto, historialListo, yaSaludoHoy, mensajes.length]);

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
        setError(data?.error ?? "No pudimos cargar a Sasha. Probá de nuevo.");
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
        setError("Se cortó la conexión con Sasha. Probá de nuevo.");
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
    // Se refresca cada vez que se abre el chat (no solo una vez) para que los
    // botones de acción nunca queden mostrando un problema ya resuelto.
    fetch("/api/asistente/acciones")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AccionesValidas | null) => setAccionesValidas(d))
      .catch(() => setAccionesValidas(null));
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
  const estadoBurbuja: EstadoSasha =
    !yaVistoHoy && novedad.tipo === "alerta" ? "sorprendido" : !yaVistoHoy && novedad.tipo === "oportunidad" ? "guiño" : "reposo";

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={dragConstraints}
        style={{ x: dragX, y: dragY }}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={() => {
          setTimeout(() => { isDragging.current = false; }, 50);
          localStorage.setItem("sasha-pos", JSON.stringify({ x: dragX.get(), y: dragY.get() }));
        }}
        // `data-print`: el globo del chat se imprimía encima del informe, tapando
        // la esquina de abajo a la derecha de la última hoja. Va también
        // `print:hidden` —la clase propia de Tailwind— para que no dependa de
        // que globals.css esté al día: son dos mecanismos distintos.
        data-print="ocultar"
        className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing touch-none print:hidden"
      >
        <motion.button
          type="button"
          onClick={() => { if (!isDragging.current) abrirChat(); }}
          aria-label="Abrir asistente Sasha"
          title="Sasha — arrastrá para mover"
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
          className="h-14 w-14 rounded-full hover:scale-110 transition-transform"
        >
          <AsistentePersonaje estado={estadoBurbuja} size={56} />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {abierto && (
          // `print:hidden` en los dos: si el chat quedó abierto y se manda a
          // imprimir, el panel tapa el informe entero.
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/30 md:hidden print:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbierto(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Chat con Sasha"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-[60] flex h-full w-full flex-col bg-white shadow-2xl md:w-[380px] md:rounded-l-2xl print:hidden"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <AsistentePersonaje estado={enviando ? "pensando" : "sonriente"} size={36} />
                <div className="flex-1">
                  <p className="font-bold text-gray-950">Sasha</p>
                  <p className="text-xs text-gray-400">Asistente con IA de TiendaApps</p>
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
                {historialError && (
                  <div className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                    No pudimos cargar tu conversación de hoy — puede estar incompleta. Probá recargar la página.
                  </div>
                )}
                {mostrarIntro && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm whitespace-pre-wrap text-gray-800">
                      {INTRO_TEXTO}
                    </div>
                  </div>
                )}
                {mensajes.map((m, i) => {
                  const { texto, acciones } = m.role === "assistant" ? parseAcciones(m.content, accionesValidas) : { texto: m.content, acciones: [] };
                  return (
                    <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-1.5`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          m.role === "user" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {texto || (enviando && i === mensajes.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                      </div>
                      {acciones.length > 0 && (
                        <div className="flex max-w-[85%] flex-wrap gap-2">
                          {acciones.map((accion, j) => (
                            <Link
                              key={j}
                              href={accion.href}
                              onClick={() => setAbierto(false)}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                            >
                              <accion.icon className="h-3.5 w-3.5 shrink-0" />
                              {accion.label}
                              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  placeholder="Escribile a Sasha..."
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
