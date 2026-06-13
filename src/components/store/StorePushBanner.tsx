"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Loader2, X, BellOff } from "lucide-react";
import {
  isPushSupported,
  isSubscribedToStore,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/push-client";

interface Props {
  storeId: string;
  storeName: string;
  storeSlug: string;
}

type SubState = "checking" | "prompt" | "subscribed" | "loading" | "error";

type Campaign = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

// Guarda cuándo fue la última vez que el usuario abrió el panel de novedades
const LAST_SEEN_KEY = (id: string) => `push_last_seen_${id}`;

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

export default function StorePushBanner({ storeId, storeName, storeSlug }: Props) {
  const [subState, setSubState] = useState<SubState>("checking");
  const [action, setAction] = useState<"idle" | "busy">("idle");
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pushSupported = useRef(false);

  // Inicializa estado de suscripción
  useEffect(() => {
    pushSupported.current = isPushSupported();
    if (!pushSupported.current) {
      setSubState("prompt"); // Puede ver novedades igual, solo sin push
      return;
    }
    isSubscribedToStore(storeId).then((subscribed) => {
      setSubState(subscribed ? "subscribed" : "prompt");
    });
  }, [storeId]);

  // Carga campañas y calcula si hay novedades nuevas
  useEffect(() => {
    setLoadingCampaigns(true);
    fetch(`/api/push/campaigns/${storeSlug}`)
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((data) => {
        const list: Campaign[] = data.campaigns ?? [];
        setCampaigns(list);
        if (list.length > 0) {
          const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY(storeId)) ?? 0);
          const latestCampaign = new Date(list[0].createdAt).getTime();
          setHasNew(latestCampaign > lastSeen);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false));
  }, [storeId, storeSlug]);

  // Cierra drawer al click fuera
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openDrawer() {
    localStorage.setItem(LAST_SEEN_KEY(storeId), String(Date.now()));
    setHasNew(false);
    setOpen(true);
  }

  async function handleSubscribe() {
    if (!pushSupported.current) return;
    if (Notification.permission === "denied") {
      setSubState("error");
      return;
    }
    setAction("busy");
    setSubState("loading");
    const ok = await subscribeToStore(storeId);
    setAction("idle");
    setSubState(ok ? "subscribed" : "error");
  }

  async function handleUnsubscribe() {
    setAction("busy");
    setSubState("loading");
    const ok = await unsubscribeFromStore(storeId);
    setAction("idle");
    setSubState(ok ? "prompt" : "subscribed");
  }

  if (subState === "checking") return null;

  const isSubscribed = subState === "subscribed";
  const isLoading = subState === "loading";
  const noCampaigns = campaigns.length === 0 && !loadingCampaigns;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-[9991] backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer de novedades */}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 z-[9992] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "72vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-900">Novedades de {storeName}</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-7 h-7 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Bloque de suscripción */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${isSubscribed ? "bg-indigo-50" : "bg-gray-50"}`}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            ) : isSubscribed ? (
              <Bell className="h-4 w-4 text-indigo-600 fill-indigo-100" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isSubscribed ? (
              <>
                <p className="text-xs font-semibold text-gray-800 leading-tight">Notificaciones activas</p>
                <p className="text-[11px] text-gray-400">Te avisamos cuando haya novedades.</p>
              </>
            ) : subState === "error" ? (
              <>
                <p className="text-xs font-semibold text-red-600 leading-tight">No se pudo activar</p>
                <p className="text-[11px] text-gray-400">Revisá los permisos en tu navegador.</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-800 leading-tight">Recibí alertas en tu dispositivo</p>
                <p className="text-[11px] text-gray-400">Activá para que te avisemos cuando haya novedades.</p>
              </>
            )}
          </div>
          {pushSupported.current && (
            isSubscribed ? (
              <button
                onClick={handleUnsubscribe}
                disabled={action === "busy" || isLoading}
                className="shrink-0 text-[11px] text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                Desactivar
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={action === "busy" || isLoading}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                <Bell className="h-3 w-3" />
                Activar
              </button>
            )
          )}
        </div>

        {/* Lista de campañas */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(72vh - 160px)" }}>
          {loadingCampaigns ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : noCampaigns ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Bell className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">Todavía no hay novedades</p>
              <p className="text-[11px] text-gray-300 mt-1">Cuando la tienda publique algo, aparecerá acá.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 leading-snug">{c.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{c.body}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-300 mt-0.5 whitespace-nowrap">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bell FAB */}
      <button
        onClick={openDrawer}
        aria-label="Ver novedades de la tienda"
        className={`fixed bottom-[88px] right-4 z-[9990] w-11 h-11 rounded-full shadow-lg border flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 ${
          isSubscribed
            ? "bg-indigo-600 border-indigo-700"
            : "bg-white border-gray-200 hover:border-indigo-200"
        }`}
      >
        <Bell className={`h-5 w-5 ${isSubscribed ? "text-white fill-white/20" : "text-gray-400"}`} />

        {/* Badge rojo: hay novedades nuevas */}
        {hasNew && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
