"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, X, Bell, Loader2 } from "lucide-react";
import { subscribeToPush, isPushSupported } from "@/lib/push-client";

// ─── Notification sound via Web Audio API (no binary file needed) ───────────
function playNotificationSound() {
  try {
    type WindowWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioCtx =
      window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tone = (freq: number, start: number, dur: number, vol = 0.12) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };

    // Two-note ascending "ding" — E6 then B5
    tone(1318.51, now, 0.25, 0.13);
    tone(987.77, now + 0.14, 0.3, 0.10);

    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
}

const NOTIF_PROMPT_KEY = "pwa_notif_prompt_dismissed";

type PromptState = "idle" | "loading" | "error";

interface Props {
  appVersion?: string;
  versionKey?: string;
}

export default function PWAManager({ appVersion, versionKey }: Props) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [promptState, setPromptState] = useState<PromptState>("idle");

  // ── App version check (independiente del SW) ─────────────────────────────
  useEffect(() => {
    if (!appVersion || !versionKey) return;
    const stored = localStorage.getItem(versionKey);
    if (stored && stored !== appVersion) {
      setUpdateAvailable(true);
    } else {
      localStorage.setItem(versionKey, appVersion);
    }
  }, [appVersion, versionKey]);

  // ── Service Worker registration + update detection ───────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let updateInterval: ReturnType<typeof setInterval>;
    let onVisibility: (() => void) | null = null;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        const handleWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          setWaitingWorker(worker);
          setUpdateAvailable(true);
        };

        handleWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              handleWaiting(next);
            }
          });
        });

        updateInterval = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

        onVisibility = () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisibility);
      })
      .catch(() => {});

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") playNotificationSound();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      clearInterval(updateInterval);
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  // ── Notification permission prompt ───────────────────────────────────────
  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(NOTIF_PROMPT_KEY)) return;
    const t = setTimeout(() => setShowNotifBanner(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // ── Toast post-reload ────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem("pwa_just_updated")) {
      sessionStorage.removeItem("pwa_just_updated");
      setShowUpdatedToast(true);
      setTimeout(() => setShowUpdatedToast(false), 3500);
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const applyUpdate = useCallback(() => {
    setUpdating(true);
    sessionStorage.setItem("pwa_just_updated", "1");
    // Guardar la nueva versión antes de recargar
    if (appVersion && versionKey) localStorage.setItem(versionKey, appVersion);
    setTimeout(() => {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        // Reload after new SW activates (~500ms is enough)
        setTimeout(() => window.location.reload(), 800);
      } else {
        window.location.reload();
      }
    }, 600);
  }, [waitingWorker, appVersion, versionKey]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    // Si descarta, guardamos la versión igual para no volver a mostrar
    if (appVersion && versionKey) localStorage.setItem(versionKey, appVersion);
  }, [appVersion, versionKey]);

  const dismissNotifBanner = useCallback(() => {
    setShowNotifBanner(false);
    localStorage.setItem(NOTIF_PROMPT_KEY, "1");
  }, []);

  const enableNotifications = useCallback(async () => {
    setPromptState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismissNotifBanner();
        return;
      }
      const ok = await subscribeToPush();
      if (ok) {
        dismissNotifBanner();
        playNotificationSound();
      } else {
        setPromptState("error");
      }
    } catch {
      setPromptState("error");
    }
  }, [dismissNotifBanner]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Update Banner ──────────────────────────────────────────────── */}
      {updateAvailable && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 shadow-2xl w-[calc(100%-2rem)] max-w-sm">
          <RefreshCw className={`h-4 w-4 shrink-0 text-indigo-400 ${updating ? "animate-spin" : ""}`} />
          <p className="flex-1 text-sm text-white">
            <span className="font-semibold">{updating ? "Actualizando..." : "Nueva versión disponible"}</span>
          </p>
          {!updating && (
            <>
              <button
                onClick={applyUpdate}
                className="whitespace-nowrap text-xs font-bold text-indigo-400 transition-colors hover:text-indigo-200"
              >
                Actualizar
              </button>
              <button
                onClick={dismissUpdate}
                className="text-gray-500 transition-colors hover:text-gray-300"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Updated Toast ───────────────────────────────────────────────── */}
      {showUpdatedToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-gray-900 px-4 py-3 shadow-2xl w-[calc(100%-2rem)] max-w-sm">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <span className="text-xs text-emerald-400 font-bold">✓</span>
          </div>
          <p className="text-sm text-white font-semibold">App actualizada correctamente</p>
        </div>
      )}

      {/* ── Notification Permission Banner ─────────────────────────────── */}
      {showNotifBanner && (
        <div className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl bg-indigo-100 p-2">
              <Bell className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">
                Activá las notificaciones
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                Te avisamos cuando recibís un pedido nuevo, incluso con el navegador cerrado.
              </p>
              {promptState === "error" && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  No se pudo activar. Intentá desde Ajustes.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={enableNotifications}
                  disabled={promptState === "loading"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {promptState === "loading" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Activando…
                    </>
                  ) : (
                    "Activar ahora"
                  )}
                </button>
                <button
                  onClick={dismissNotifBanner}
                  className="px-2 text-xs text-gray-400 transition-colors hover:text-gray-600"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button
              onClick={dismissNotifBanner}
              className="shrink-0 text-gray-300 transition-colors hover:text-gray-500"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
