"use client";

import { useLayoutEffect, useState } from "react";
import { isPwa } from "@/lib/pwa";

type Phase = "cover" | "exiting" | "done";

// Cubre el contenido durante la hidratación en modo PWA para evitar el flash
// de layout deformado. Al revelar, hace un zoom-out (escala + fade) como la app de Galicia.
export default function PwaFadeIn() {
  const [phase, setPhase] = useState<Phase>("cover");

  useLayoutEffect(() => {
    if (!isPwa()) {
      setPhase("done");
      return;
    }

    const reveal = () => {
      setPhase("exiting");
      setTimeout(() => setPhase("done"), 420);
    };

    if (document.readyState === "complete") {
      setTimeout(reveal, 150);
    } else {
      const onLoad = () => setTimeout(reveal, 150);
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "#ffffff",
        pointerEvents: "none",
        willChange: "transform, opacity",
        transition: "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 380ms cubic-bezier(0.4, 0, 0.2, 1)",
        transform: phase === "exiting" ? "scale(1.14)" : "scale(1)",
        opacity: phase === "exiting" ? 0 : 1,
      }}
    />
  );
}
