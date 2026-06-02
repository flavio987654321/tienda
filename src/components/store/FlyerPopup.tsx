"use client";
import { useState, useEffect } from "react";
import type { FlyerConfig } from "@/types/store-config";

export default function FlyerPopup({ flyer }: { flyer: FlyerConfig }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // PWA detectada por query param (start_url: /tienda/{slug}?source=pwa)
    // o por display-mode standalone
    const isPwa =
      new URLSearchParams(window.location.search).get("source") === "pwa" ||
      window.matchMedia("(display-mode: standalone)").matches;
    const delay = isPwa ? 1200 : 400;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const images = flyer.images.filter(Boolean);
  const total = images.length;
  if (total === 0) return null;

  function prev() { setIndex(i => (i - 1 + total) % total); }
  function next() { setIndex(i => (i + 1) % total); }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "flyerFadeIn 0.3s ease",
      }}
      onClick={() => setVisible(false)}
    >
      <style>{`
        @keyframes flyerFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes flyerSlideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        style={{
          position: "relative", width: "100%", maxWidth: 340,
          animation: "flyerSlideUp 0.35s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={() => setVisible(false)}
          aria-label="Cerrar flyer"
          style={{
            position: "absolute", top: -14, right: -6, zIndex: 2,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(15,23,42,0.85)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            color: "white", fontSize: 22, lineHeight: 1,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          ×
        </button>

        {/* Imagen actual */}
        <img
          key={index}
          src={images[index]}
          alt={`Flyer ${index + 1}`}
          style={{
            width: "100%", display: "block", borderRadius: 16,
            objectFit: "cover", maxHeight: "80vh",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          }}
        />

        {/* Flechas de navegación */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Anterior"
              style={{
                position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)",
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(15,23,42,0.75)", border: "1.5px solid rgba(255,255,255,0.18)",
                color: "white", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Siguiente"
              style={{
                position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)",
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(15,23,42,0.75)", border: "1.5px solid rgba(255,255,255,0.18)",
                color: "white", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Indicadores (dots) */}
        {total > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Ir al flyer ${i + 1}`}
                style={{
                  width: i === index ? 22 : 8, height: 8,
                  borderRadius: 4, border: "none", padding: 0, cursor: "pointer",
                  background: i === index ? "white" : "rgba(255,255,255,0.3)",
                  transition: "width 0.25s ease, background 0.2s",
                }}
              />
            ))}
          </div>
        )}

        <p style={{
          textAlign: "center", color: "rgba(255,255,255,0.35)",
          fontSize: 11, marginTop: 10, userSelect: "none",
        }}>
          Tocá afuera para cerrar
        </p>
      </div>
    </div>
  );
}
