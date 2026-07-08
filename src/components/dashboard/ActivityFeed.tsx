"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ActivityEvent = {
  id: string;
  type: string;
  data: string;
  createdAt: string;
};

type Props = {
  storeId: string;
  initialEvents: ActivityEvent[];
};

type EventMeta = {
  label: string;
  detail: string;
  dot: string;
};

function parseData(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatEvent(type: string, data: Record<string, unknown>): EventMeta {
  switch (type) {
    case "NEW_ORDER":
      return {
        label: "Nuevo pedido",
        detail: `${data.buyerName ?? "Comprador"} — $${Number(data.total ?? 0).toLocaleString("es-AR")}`,
        dot: "bg-indigo-500",
      };
    case "NEW_REVIEW":
      return {
        label: `${data.rating ?? 5}★ reseña`,
        detail: `${data.reviewerName ?? "Compradora"} en ${data.productName ?? "producto"}`,
        dot: "bg-yellow-400",
      };
    case "NEW_AFFILIATE":
      return {
        label: "Nueva afiliada",
        detail: String(data.affiliateName ?? "Afiliada"),
        dot: "bg-purple-500",
      };
    case "CART_RECOVERED":
      return {
        label: "Carrito recuperado",
        detail: String(data.buyerName ?? "Compradora"),
        dot: "bg-emerald-500",
      };
    default:
      return { label: type, detail: "", dot: "bg-gray-300" };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function ActivityFeed({ storeId, initialEvents }: Props) {
  const instanceId = useId();
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel(`activity-feed:${instanceId}`);
    ch.on(
      "postgres_changes" as Parameters<typeof ch.on>[0],
      {
        event: "INSERT",
        schema: "public",
        table: "StoreActivityEvent",
        filter: `storeId=eq.${storeId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        const newEvent: ActivityEvent = {
          id: String(row.id),
          type: String(row.type),
          data: String(row.data ?? "{}"),
          createdAt: String(row.createdAt ?? new Date().toISOString()),
        };
        setEvents((prev) => [newEvent, ...prev].slice(0, 20));
        setNewIds((prev) => new Set(prev).add(newEvent.id));
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev);
            next.delete(newEvent.id);
            return next;
          });
        }, 3000);
      }
    );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storeId, instanceId]);

  if (events.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
      <h2 className="font-bold text-gray-900 mb-4">Actividad reciente</h2>
      <div className="space-y-0">
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const meta = formatEvent(ev.type, parseData(ev.data));
            const isNew = newIds.has(ev.id);
            return (
              <motion.div
                key={ev.id}
                initial={isNew ? { opacity: 0, height: 0 } : false}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                <p className="flex-1 min-w-0 text-sm truncate">
                  <span className="font-medium text-gray-800">{meta.label}</span>
                  {meta.detail && <span className="text-gray-400 ml-1.5">{meta.detail}</span>}
                </p>
                <span className="text-xs text-gray-300 shrink-0">{relativeTime(ev.createdAt)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
