"use client";

import { useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { usePushBell } from "@/contexts/PushBellContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  if (h < 24) return `Hace ${h}h`;
  if (d === 1) return "Ayer";
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function StorePushBanner({ storeName }: { storeName: string }) {
  const bell = usePushBell();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bell?.drawerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        bell?.closeDrawer();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [bell?.drawerOpen, bell]);

  if (!bell) return null;

  const { campaigns, loadingCampaigns, drawerOpen, closeDrawer } = bell;

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[9991] backdrop-blur-[1px]"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 z-[9992] w-full max-h-[80vh] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col
          sm:top-0 sm:bottom-0 sm:left-auto sm:right-0 sm:w-[420px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl ${
          drawerOpen
            ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        {/* Handle — solo mobile */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
              <Bell className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">Novedades</h2>
              <p className="text-[11px] text-gray-400 leading-tight truncate max-w-[180px]">{storeName}</p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Cerrar"
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Lista de campañas */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {loadingCampaigns ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-3.5 bg-gray-100 rounded-full w-3/4 mb-2.5" />
                  <div className="h-3 bg-gray-100 rounded-full w-full mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
                <Bell className="h-7 w-7 text-gray-200" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Todavía no hay novedades</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-[200px]">
                Cuando la tienda publique algo, aparecerá acá.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <li key={c.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.body}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-300 mt-0.5 whitespace-nowrap">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
