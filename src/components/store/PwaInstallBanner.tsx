"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

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

const STORAGE_KEY = (slug: string) => `pwa_banner_dismissed_${slug}`;

export default function PwaInstallBanner({ logo, name, color, slug }: Props) {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed or dismissed
    if (localStorage.getItem(STORAGE_KEY(slug))) return;

    // Already running as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Small delay — let the user settle into the page first
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [slug]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY(slug), "1");
  }

  async function install() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY(slug), "1");
    }
    deferredPrompt.current = null;
    setVisible(false);
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
          className="fixed bottom-5 left-1/2 z-[9990] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
          style={{ willChange: "transform, opacity" }}
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
                  Instalá la app y recibí notificaciones de novedades y ofertas
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
