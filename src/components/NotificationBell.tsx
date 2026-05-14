"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Bell } from "lucide-react";
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
  NEW_ORDER: "🛍️",
  ORDER_CONFIRMED: "✅",
  ORDER_SHIPPED: "📦",
  ORDER_DELIVERED: "🎉",
  ORDER_CANCELLED: "❌",
  COMMISSION_EARNED: "💰",
  LOW_STOCK: "⚠️",
  PRICE_CHANGED: "🏷️",
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

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cargar notificaciones iniciales
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      });
  }, []);

  // Supabase Realtime — escuchar nuevas notificaciones para este usuario
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const channel = supabase
      .channel(`notifications:${userId}`)
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
  }, [userId]);

  // Cerrar dropdown al click fuera
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
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl dark:bg-[#0f1629] dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <p className="font-bold text-sm text-gray-900 dark:text-white">Notificaciones</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
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
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${!n.read ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}
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
                      <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
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
