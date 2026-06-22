"use client";
import { useState, useEffect } from "react";

type Promotion = { id: string; imageUrl: string; link: string | null };

// Mismo patrón que el flyer de las tiendas (FlyerPopup): cartel flotante con
// fondo oscuro, no una franja fija en la página.
export default function PromotionsCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");

  useEffect(() => {
    fetch("/api/promociones")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.promotions)) setPromotions(d.promotions); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (promotions.length === 0) return;
    const isPwa =
      new URLSearchParams(window.location.search).get("source") === "pwa" ||
      window.matchMedia("(display-mode: standalone)").matches;
    const t = setTimeout(() => setVisible(true), isPwa ? 1200 : 400);
    return () => clearTimeout(t);
  }, [promotions.length]);

  if (!visible) return null;

  const total = promotions.length;
  if (total === 0) return null;

  function prev() { setDir("prev"); setIndex((i) => (i - 1 + total) % total); }
  function next() { setDir("next"); setIndex((i) => (i + 1) % total); }

  const current = promotions[index];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "flyerFadeIn 0.35s ease",
      }}
      onClick={() => setVisible(false)}
    >
      <style>{`
        @keyframes flyerFadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes flyerSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)   scale(1)    }
        }
        @keyframes flyerImgNext {
          from { opacity: 0; transform: translateX(36px) scale(0.97) }
          to   { opacity: 1; transform: translateX(0)    scale(1)    }
        }
        @keyframes flyerImgPrev {
          from { opacity: 0; transform: translateX(-36px) scale(0.97) }
          to   { opacity: 1; transform: translateX(0)     scale(1)    }
        }
      `}</style>

      <div
        style={{
          position: "relative", width: "100%", maxWidth: 340,
          animation: "flyerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={() => setVisible(false)}
          aria-label="Cerrar promociones"
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

        {/* Imagen con animación direccional — clickeable si tiene link */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
          {current.link ? (
            <a href={current.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={index}
                src={current.imageUrl}
                alt={`Promoción ${index + 1}`}
                style={{
                  width: "100%", display: "block", cursor: "pointer",
                  objectFit: "contain", maxHeight: "80vh",
                  animation: `${dir === "next" ? "flyerImgNext" : "flyerImgPrev"} 0.35s cubic-bezier(0.22,1,0.36,1)`,
                }}
              />
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={current.imageUrl}
              alt={`Promoción ${index + 1}`}
              style={{
                width: "100%", display: "block",
                objectFit: "cover", maxHeight: "80vh",
                animation: `${dir === "next" ? "flyerImgNext" : "flyerImgPrev"} 0.35s cubic-bezier(0.22,1,0.36,1)`,
              }}
            />
          )}
        </div>

        {/* Flechas */}
        {total > 1 && (
          <>
            <button onClick={prev} aria-label="Anterior"
              style={{
                position: "absolute", left: -24, top: "50%", transform: "translateY(-50%)",
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(15,23,42,0.75)", border: "1.5px solid rgba(255,255,255,0.18)",
                color: "white", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >‹</button>
            <button onClick={next} aria-label="Siguiente"
              style={{
                position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)",
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(15,23,42,0.75)", border: "1.5px solid rgba(255,255,255,0.18)",
                color: "white", fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >›</button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
            {promotions.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setDir(i > index ? "next" : "prev"); setIndex(i); }}
                aria-label={`Ir a la promoción ${i + 1}`}
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
