"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { Bell, X, Trash2 } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const ICONS: Record<string, string> = {
  // Pedidos (dueño)
  NEW_ORDER: "🛍️",
  ORDER_CONFIRMED: "✅",
  ORDER_SHIPPED: "📦",
  ORDER_DELIVERED: "🎉",
  ORDER_CANCELLED: "❌",
  // Afiliados — estado en programa
  AFFILIATE_APPROVED: "🤝",
  AFFILIATE_REJECTED: "🚫",
  AFFILIATE_PAUSED: "⏸️",
  AFFILIATE_REMOVED: "👋",
  // Afiliados — comisiones y retiros
  COMMISSION_EARNED: "💰",
  COMMISSION_RATE_CHANGED: "📊",
  WITHDRAWAL_REQUESTED: "💸",
  WITHDRAWAL_COMPLETED: "💳",
  REWARD_COUPON_EARNED: "🎁",
  // Afiliados — productos de la tienda
  NEW_PRODUCT: "✨",
  PRICE_CHANGED: "🏷️",
  OUT_OF_STOCK: "⚠️",
  LOW_STOCK: "⚠️",
  RESTOCK: "🟢",
  // Afiliados — programa / tienda
  STORE_PROGRAM_PAUSED: "⏸️",
  STORE_COUPONS_DISABLED: "🎟️",
  STORE_RESET: "🔄",
  store_offline: "🔕",
  STORE_CLOSED: "🚪",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hs = Math.floor(mins / 60);
  if (hs < 24) return `hace ${hs}h`;
  return `hace ${Math.floor(hs / 24)}d`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      });
  }, []);

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`notifications:${userId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev].slice(0, 30));
          setUnread((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, instanceId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", { method: "PATCH" });
  }

  async function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications?id=${id}`, { method: "PATCH" });
  }

  async function deleteOne(e: React.MouseEvent, id: string, wasRead: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!wasRead) setUnread((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
  }

  async function deleteAll() {
    setNotifications([]);
    setUnread(0);
    await fetch("/api/notifications", { method: "DELETE" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-gray-100 bg-white shadow-xl dark:bg-[#0f1629] dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <p className="font-bold text-sm text-gray-900 dark:text-white">Notificaciones</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={deleteAll}
                  title="Limpiar todas"
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Sin notificaciones
              </div>
            ) : (
              notifications.map((n) => {
                const inner = (
                  <div
                    className={`group flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${!n.read ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}
                    onClick={() => !n.read && markOneRead(n.id)}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{ICONS[n.type] ?? "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">
                        {timeAgo(n.createdAt)} · {formatDate(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={(e) => deleteOne(e, n.id, n.read)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/10"
                        title="Eliminar"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
