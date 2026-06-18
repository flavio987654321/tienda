"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
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

const ACTIVATION_DISMISSED_KEY = (storeId: string) => `push_act_dismissed_${storeId}`;

export default function StorePushBanner({ storeName, storeId }: { storeName: string; storeId: string }) {
  const bell = usePushBell();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [activating, setActivating] = useState(false);
  const [activationDismissed, setActivationDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(ACTIVATION_DISMISSED_KEY(storeId))) {
      setActivationDismissed(true);
    }
  }, [storeId]);

  function dismissActivation() {
    setActivationDismissed(true);
    localStorage.setItem(ACTIVATION_DISMISSED_KEY(storeId), "1");
  }

  async function handleActivate() {
    if (!bell) return;
    setActivating(true);
    await bell.activatePushOnDevice();
    setActivating(false);
  }

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

  const { campaigns, loadingCampaigns, drawerOpen, closeDrawer, needsPushActivation, followState } = bell;
  const isFollowing = followState === "following";

  const showActivationBanner = needsPushActivation && !activationDismissed;

  return (
    <>
      {/* Banner: activar notificaciones en este dispositivo */}
      {showActivationBanner && (
        <div className="fixed bottom-5 left-1/2 z-[9989] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <div className="flex items-start gap-3 p-4">
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15">
              <Bell className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[13px] leading-snug">
                Activá las notificaciones
              </p>
              <p className="text-white/45 text-[11px] mt-0.5 leading-snug">
                Ya seguís esta tienda. Activá para recibir novedades en este dispositivo.
              </p>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2 text-[12px] font-bold text-white transition-colors"
              >
                {activating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                {activating ? "Activando…" : "Activar ahora"}
              </button>
            </div>
            <button
              onClick={dismissActivation}
              aria-label="Cerrar"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white/20 hover:text-white/50 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

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
          ) : !isFollowing ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
                <Bell className="h-7 w-7 text-gray-200" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Seguí la tienda para ver sus novedades</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-[200px]">
                Las novedades son solo para quienes siguen esta tienda.
              </p>
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
