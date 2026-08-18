"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, X, Bell, Loader2 } from "lucide-react";
import { subscribeToPush, isPushSupported, asegurarSuscripcionDelPanel } from "@/lib/push-client";
import { esIOS, esAppInstalada } from "@/lib/pwa";

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
  disableNotifPrompt?: boolean;
  /* Dónde vive el service worker de esta app.
     El panel pasa "/dashboard", que es el mismo `scope` que declara su
     manifiesto. Tienen que coincidir: Android atribuye la notificación a la app
     instalada solo si la suscripción nació bajo el service worker que coincide
     con el scope del manifiesto. Registrándolo en la raíz —como estaba— las
     notificaciones de pedidos llegaban como "Chrome · tiendaapps.com".
     Sin este dato se registra en la raíz, que es lo que necesita la web
     comercial para su pantalla de sin conexión. */
  scope?: string;
}

export default function PWAManager({ appVersion, versionKey, disableNotifPrompt = false, scope }: Props) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [promptState, setPromptState] = useState<PromptState>("idle");
  /* iPhone sin instalar: el cartel cambia de texto y esconde el boton de
     activar, porque ahi ese boton no puede hacer nada. */
  const [enIOSsinInstalar, setEnIOSsinInstalar] = useState(false);
  // Build que está sirviendo el servidor cuando detectamos que hay algo nuevo.
  // Se guarda para poder silenciar el aviso de ESE build si el usuario lo cierra.
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);

  // ── ¿Salió una versión nueva? (independiente del SW) ──────────────────────
  //
  // Le pregunta al servidor qué build está sirviendo y lo compara contra el que
  // trae ESTE bundle. Si difieren, hay algo nuevo que este cliente no tiene.
  //
  // Hace falta preguntar cada tanto, y no solo al abrir, porque una PWA
  // instalada corre en standalone: sin barra de direcciones ni F5, la única
  // forma de que el usuario se actualice es este aviso. Si la deja abierta dos
  // días, sin este chequeo se queda con el código viejo y sin manera de salir.
  //
  // Antes esto comparaba contra localStorage, y con un build que cambia en cada
  // deploy eso daba un falso positivo: al abrir la app ya te bajabas el código
  // nuevo, pero como el valor guardado era el viejo te aparecía igual el cartel
  // de "actualizá" para algo que acababas de recibir.
  useEffect(() => {
    if (!appVersion) return;

    let cancelado = false;
    async function chequear() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelado || !data?.buildId) return;
        if (data.buildId === appVersion) return; // ya está al día
        // Si cerró el aviso de ESTE build, no insistir cada hora. Cuando salga
        // uno nuevo el id cambia y vuelve a avisar.
        if (versionKey && localStorage.getItem(versionKey) === data.buildId) return;
        setServerBuildId(data.buildId);
        setUpdateAvailable(true);
      } catch {
        // Sin conexión o servidor caído: no es momento de pedir que actualice.
      }
    }

    chequear();
    const interval = setInterval(chequear, 60 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") chequear(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelado = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [appVersion, versionKey]);

  // ── Service Worker registration + update detection ───────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let updateInterval: ReturnType<typeof setInterval>;
    let onVisibility: (() => void) | null = null;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none", ...(scope ? { scope } : {}) })
      .then((reg) => {
        /* Si el service worker del scope quedó esperando —lo bloquean las
           pestañas que todavía maneja el de la raíz— se lo activa ahora. Es
           seguro: acá el service worker solo sirve para la atribución del push y
           la pantalla de sin conexión, no dibuja nada que la persona esté
           mirando. Es lo mismo que ya hace la tienda en `StoreShell`. */
        if (scope && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });

        /* Con el service worker en su lugar, reponer la suscripción si hace
           falta. Ver el comentario largo en `asegurarSuscripcionDelPanel`: esto
           es lo que devuelve los avisos a quien los perdió sin enterarse, y lo
           que borra la dirección vieja que hacía llegar todo por duplicado. */
        if (scope) asegurarSuscripcionDelPanel(scope);

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
  }, [scope]);

  // ── Notification permission prompt (dashboard only) ──────────────────────
  useEffect(() => {
    if (disableNotifPrompt) return;
    if (localStorage.getItem(NOTIF_PROMPT_KEY)) return;

    /* iPhone sin la app instalada. Va ANTES del chequeo de soporte, y ese es todo
       el punto: en iOS, fuera de la app instalada, `Notification` y `PushManager`
       no existen, así que `isPushSupported()` da false y el cartel cortaba acá.
       Resultado: al comerciante con iPhone no se le decía nada. Ni el permiso, ni
       que instalando sí puede. Silencio, y avisos de pedidos que nunca llegan.
       Ahora se le muestra lo único que le sirve: cómo instalarla. */
    if (esIOS() && !esAppInstalada()) {
      const t = setTimeout(() => {
        setEnIOSsinInstalar(true);
        setShowNotifBanner(true);
      }, 4000);
      return () => clearTimeout(t);
    }

    if (!isPushSupported()) return;
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setShowNotifBanner(true), 4000);
    return () => clearTimeout(t);
  }, [disableNotifPrompt]);

  // ── Toast post-reload ────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStorage.getItem("pwa_just_updated")) return;
    sessionStorage.removeItem("pwa_just_updated");
    // El cartel se prende en el tick siguiente y no en el acto: encenderlo derecho
    // acá adentro obliga a rehacer el render entero (y es lo que el lint del repo
    // marca como error). Un tick no se ve; el aviso igual queda 3,5 segundos.
    const prender = setTimeout(() => setShowUpdatedToast(true), 0);
    const apagar = setTimeout(() => setShowUpdatedToast(false), 3500);
    // El de apagar no se limpiaba: si te ibas de la pantalla antes de los 3,5s,
    // saltaba sobre un componente que ya no estaba.
    return () => { clearTimeout(prender); clearTimeout(apagar); };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  // Recargar es lo que trae el código nuevo. En una PWA instalada este botón es
  // la ÚNICA forma de hacerlo: standalone no tiene barra de direcciones ni F5.
  const applyUpdate = useCallback(() => {
    setUpdating(true);
    sessionStorage.setItem("pwa_just_updated", "1");
    setTimeout(() => {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        // Reload after new SW activates (~500ms is enough)
        setTimeout(() => window.location.reload(), 800);
      } else {
        window.location.reload();
      }
    }, 600);
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    // Silencia solo este build. Cuando salga otro, el id cambia y vuelve a avisar.
    if (versionKey && serverBuildId) localStorage.setItem(versionKey, serverBuildId);
  }, [versionKey, serverBuildId]);

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
              {/* En iPhone el texto es otro, y no es un detalle de redacción.
                  Apple no permite notificaciones web salvo que la app esté en la
                  pantalla de inicio: sin instalarla, tocar "Activar ahora" no
                  hace nada —el diálogo del permiso ni siquiera aparece— y la
                  persona queda esperando avisos que no van a llegar nunca.
                  Antes se le pedía el permiso igual que en Android. */}
              <p className="text-sm font-bold text-gray-900">
                {enIOSsinInstalar ? "Instalá el panel para recibir avisos" : "Activá las notificaciones"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                {enIOSsinInstalar
                  ? "En iPhone los avisos llegan solo con la app instalada. Tocá Compartir y después «Agregar a inicio»."
                  : "Te avisamos cuando recibís un pedido nuevo, incluso con el navegador cerrado."}
              </p>
              {promptState === "error" && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  No se pudo activar. Intentá desde Ajustes.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {/* En iPhone no hay botón que pueda hacer nada: instalar es un
                    gesto del navegador que ninguna página puede disparar. Queda
                    solo el "Entendido", que cierra. */}
                <button
                  onClick={enableNotifications}
                  hidden={enIOSsinInstalar}
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
