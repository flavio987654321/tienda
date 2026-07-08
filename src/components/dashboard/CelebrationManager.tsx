"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Milestone = {
  id: string;
  type: string;
  achievedAt: string;
};

type Props = {
  storeId: string;
};

type MilestoneMeta = {
  emoji: string;
  title: string;
  body: string;
};

function getMeta(type: string): MilestoneMeta {
  switch (type) {
    case "FIRST_ORDER":    return { emoji: "🎉", title: "¡Primer pedido!", body: "Recibiste tu primera venta. ¡Felicitaciones!" };
    case "FIRST_REVIEW":   return { emoji: "⭐", title: "¡Primera reseña!", body: "Un cliente dejó su primera reseña en tu tienda." };
    case "FIRST_AFFILIATE":return { emoji: "🤝", title: "¡Primera afiliada!", body: "Tu equipo de ventas arrancó. ¡Bienvenida!" };
    case "REVENUE_1K":     return { emoji: "💰", title: "¡$1.000 en ventas!", body: "Cruzaste la barrera de los primeros $1.000 en ingresos." };
    case "REVENUE_10K":    return { emoji: "🚀", title: "¡$10.000 en ventas!", body: "Tu tienda está creciendo. ¡Seguí así!" };
    case "REVENUE_50K":    return { emoji: "🏆", title: "¡$50.000 en ventas!", body: "Un logro enorme. ¡Tu tienda vuela!" };
    default:               return { emoji: "✨", title: "¡Nuevo logro!", body: "Tu tienda sigue creciendo." };
  }
}

// Colores de confetti
const CONFETTI_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#3b82f6", "#a855f7"];

function Confetti() {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${8 + (i * 7.5) % 84}%`,
    delay: `${(i * 0.13).toFixed(2)}s`,
    size: i % 3 === 0 ? 7 : 5,
  }));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-4 overflow-hidden h-32"
      style={{ ["--motion-reduce" as string]: "none" }}
    >
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(140px) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-dot { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {dots.map((d) => (
        <span
          key={d.id}
          className="confetti-dot absolute rounded-sm"
          style={{
            left: d.left,
            top: 0,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            animation: `confetti-fall 1.6s ease-in ${d.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}

export default function CelebrationManager({ storeId }: Props) {
  const instanceId = useId();
  const [queue, setQueue] = useState<Milestone[]>([]);
  const [current, setCurrent] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar hitos no mostrados al montar
  useEffect(() => {
    fetch("/api/dashboard/milestones")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Milestone[]) => {
        if (Array.isArray(data) && data.length > 0) setQueue(data);
      })
      .catch(() => {});
  }, []);

  // Suscripción Realtime: nuevos milestones mientras la sesión está abierta
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel(`milestones:${instanceId}`);
    ch.on(
      "postgres_changes" as Parameters<typeof ch.on>[0],
      {
        event: "INSERT",
        schema: "public",
        table: "StoreMilestone",
        filter: `storeId=eq.${storeId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        const milestone: Milestone = {
          id: String(row.id),
          type: String(row.type),
          achievedAt: String(row.achievedAt ?? new Date().toISOString()),
        };
        setQueue((prev) => {
          if (prev.some((m) => m.id === milestone.id)) return prev;
          return [...prev, milestone];
        });
      }
    );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId, instanceId]);

  // Mostrar el primer hito de la cola cuando no hay ninguno activo
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    const timer = setTimeout(() => dismiss(next.type), 8000);
    dismissTimer.current = timer;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, current]);

  const dismiss = useCallback((type: string) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setLoading(true);
    fetch("/api/dashboard/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setCurrent(null);
      });
  }, []);

  return (
    <AnimatePresence>
      {current && (() => {
        const meta = getMeta(current.type);
        return (
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center overflow-visible"
            >
              <Confetti />
              <div className="text-5xl mb-4 select-none">{meta.emoji}</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{meta.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{meta.body}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => dismiss(current.type)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? "…" : "¡Genial!"}
              </button>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
