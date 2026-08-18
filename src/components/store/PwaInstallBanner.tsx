"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pedirTurno } from "@/lib/interrupcion-tienda";
import { CAPAS } from "@/lib/capas-tienda";
import { X, Download, Share } from "lucide-react";

/* iPhone y iPad. El iPad moderno se declara "MacIntel", así que sin mirar
   `maxTouchPoints` se cuela como escritorio y nunca ve las instrucciones. */
function esIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/* Y tiene que ser Safari DE VERDAD.
 *
 * En iOS todo es Safari por dentro, pero sólo el Safari real puede agregar algo a
 * la pantalla de inicio. Mandar a "Compartir → Agregar a inicio" a alguien que no
 * puede hacerlo es darle una instrucción que no lleva a ningún lado.
 *
 * Descartar Chrome, Firefox y Edge por el user-agent no alcanzaba, y el agujero
 * era el peor posible acá: los navegadores INTERNOS de Instagram, Facebook y
 * WhatsApp: no ponen ninguna marca propia parecida, así que pasaban el filtro. Y
 * ese es el camino por el que llega la mayoría de la gente a una tienda argentina
 * —el link del perfil de Instagram, el mensaje de WhatsApp—, o sea que el cartel
 * le explicaba cómo instalar justo a quien no podía.
 *
 * Lo que queda es mirar el user-agent, en tres pasos. No es perfecto, pero es
 * comprobable — que es más de lo que se puede decir de la alternativa: la primera
 * versión de esto exigía que existiera `navigator.standalone`, una propiedad
 * vieja de Safari. Suena más preciso y es peor: no hay forma de verificarlo sin
 * un iPhone de verdad, y si el supuesto está mal el cartel desaparece para TODOS
 * los iPhone sin que nadie se entere.
 *
 * LO QUE NO ATRAPA, dicho de frente: cuando WhatsApp abre un link usa el
 * navegador de Apple embebido, que se presenta con el user-agent exacto de
 * Safari. Por código no hay manera de distinguirlo. Si resulta que desde ahí
 * tampoco se puede instalar, hace falta un iPhone en la mano para confirmarlo. */
function esSafari(): boolean {
  const ua = navigator.userAgent;
  // 1. Los otros navegadores de iOS, que se anuncian con su propia marca.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  // 2. Los navegadores internos que sí dejan rastro: Facebook, Instagram y demás.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|MicroMessenger/.test(ua)) return false;
  // 3. Una vista web embebida pelada no trae el token `Safari/`.
  return /Safari\//.test(ua);
}

interface Props {
  logo: string | null;
  name: string;
  color: string;
  slug: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const STORAGE_KEY = (slug: string) => `pwa_banner_dismissed_${slug}`;

export default function PwaInstallBanner({ logo, name, color, slug }: Props) {
  const [visible, setVisible] = useState(false);
  /* Cómo se instala en ESTE teléfono.
     "prompt" es Android/escritorio, donde el navegador ofrece un diálogo nativo.
     "ios" es iPhone, donde no existe ningún diálogo y lo único que se puede hacer
     es explicar el camino a mano.
     Antes esto no existía y el cartel dependía por completo de
     `beforeinstallprompt`, un evento que en iOS NO EXISTE. Resultado: en iPhone el
     cartel no aparecía jamás y la tienda instalable —que es el premium— era
     invisible para todos esos usuarios. */
  const [modo, setModo] = useState<"prompt" | "ios">("prompt");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const installing = useRef(false);
  const liberar = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Already installed or dismissed
    if (localStorage.getItem(STORAGE_KEY(slug))) return;

    // Already running as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    /* Pide turno en vez de aparecer y listo.
       Antes esto se dibujaba a los 3-4 s pasara lo que pasara, y si la tienda
       tenía flyer —que sale a los 400 ms y tapa todo con un velo negro— el cartel
       quedaba abajo: existía, era invisible y no se podía tocar. Ahora espera a
       que la pantalla esté libre. Ver `lib/interrupcion-tienda`. */
    const mostrar = () => {
      liberar.current = pedirTurno("instalar-app", () => setVisible(true));
    };

    const arm = (e: BeforeInstallPromptEvent) => {
      deferredPrompt.current = e;
      // Small delay — let the user settle into the page first
      timer = setTimeout(mostrar, 3000);
    };

    // iOS: no hay evento que esperar, así que se muestra directo. Un poco más
    // tarde que en Android porque acá el cartel es para leer, no para tocar.
    if (esIOS() && esSafari()) {
      timer = setTimeout(() => {
        setModo("ios");
        mostrar();
      }, 4000);
      return () => {
        clearTimeout(timer);
        liberar.current?.();
        liberar.current = null;
      };
    }

    // Chrome puede disparar beforeinstallprompt antes de que React hidrate y
    // enganche el listener de abajo; el script del layout lo guarda acá para
    // que el evento no se pierda y el cartel no deje de aparecer.
    if (window.__pwaInstallPrompt) arm(window.__pwaInstallPrompt);

    const handler = (e: Event) => {
      e.preventDefault();
      arm(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
      liberar.current?.();
      liberar.current = null;
    };
  }, [slug]);

  /* Soltar el turno es tan obligatorio como pedirlo: si este cartel se va sin
     liberar, el globo de "activá las notificaciones" que espera atrás no aparece
     nunca más. Por eso pasa por acá el cierre, la instalación y el desmontar. */
  const soltar = useCallback(() => {
    liberar.current?.();
    liberar.current = null;
  }, []);

  function dismiss() {
    setVisible(false);
    soltar();
    localStorage.setItem(STORAGE_KEY(slug), "1");
  }

  async function install() {
    const prompt = deferredPrompt.current;
    if (!prompt || installing.current) return;
    installing.current = true;
    // prompt() solo se puede llamar una vez por evento: se consume antes del
    // await para que un doble click no lo dispare dos veces (el segundo tiraba
    // excepción de Chrome y quedaba sin atrapar).
    deferredPrompt.current = null;
    window.__pwaInstallPrompt = null;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(STORAGE_KEY(slug), "1");
      }
    } catch {
      // El diálogo nativo se cerró solo o el evento ya estaba consumido.
    }

    installing.current = false;
    setVisible(false);
    soltar();
  }

  // Derive a readable accent — if color is very light, fall back to dark
  const accent = color && color !== "#ffffff" && color !== "#fff" ? color : "#111";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.9 }}
          className="fixed left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
          style={{
            zIndex: CAPAS.aviso,
            willChange: "transform, opacity",
            // Sin el safe-area, los 20px fijos caían debajo de la barra de
            // gestos en los celus que no tienen botones físicos.
            bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Glass card */}
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10"
            style={{
              background:
                "linear-gradient(135deg, rgba(10,10,10,0.92) 0%, rgba(20,20,20,0.96) 100%)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow:
                "0 32px 64px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            {/* Subtle color accent line at top */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)`,
              }}
            />

            <div className="flex items-center gap-3.5 p-4">
              {/* Logo / monogram */}
              <div
                className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg overflow-hidden"
                style={{ background: accent + "1a", border: `1px solid ${accent}33` }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name}
                    className="h-9 w-9 object-contain"
                    draggable={false}
                  />
                ) : (
                  <span
                    className="text-xl font-black select-none"
                    style={{ color: accent }}
                  >
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[13px] leading-snug truncate">
                  {name}
                </p>
                <p className="text-white/45 text-[11px] mt-0.5 leading-snug">
                  {modo === "ios"
                    ? "Agregala a tu pantalla de inicio y recibí novedades y ofertas"
                    : "Instalá la app y recibí notificaciones de novedades y ofertas"}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white/30 hover:text-white/60 transition-colors"
                aria-label="Cerrar"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Install CTA */}
            <div className="px-4 pb-4">
              {modo === "ios" ? (
                /* En iPhone no hay nada que apretar: el navegador no expone ningún
                   diálogo de instalación. Poner acá un botón "Instalar" sería un
                   botón que miente, así que en su lugar van los dos pasos reales.
                   El de cerrar es la única acción de verdad, y está arriba. */
                <div
                  className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed text-white/75"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Tocá
                    <Share size={13} strokeWidth={2.5} style={{ color: accent }} />
                    <b className="text-white/90">Compartir</b>
                  </span>
                  <br />
                  y elegí <b className="text-white/90">«Agregar a inicio»</b>
                </div>
              ) : (
                <button
                  onClick={install}
                  className="relative w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold tracking-wide transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: accent,
                    color: isLight(accent) ? "#000" : "#fff",
                    boxShadow: `0 8px 24px -4px ${accent}55`,
                  }}
                >
                  <Download size={14} strokeWidth={2.5} />
                  Instalar gratis
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}
