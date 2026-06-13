"use client";

import { useLayoutEffect, useState } from "react";
import { isPwa } from "@/lib/pwa";

// Cubre el contenido durante la hidratación en modo PWA para evitar el flash
// de layout deformado. No muestra ningún splash visual — el OS ya lo hace.
export default function PwaFadeIn() {
  const [covering, setCovering] = useState(true);

  useLayoutEffect(() => {
    if (!isPwa()) {
      setCovering(false);
      return;
    }

    const reveal = () => {
      // Pequeño delay extra para que React termine de pintar el layout
      setTimeout(() => setCovering(false), 150);
    };

    if (document.readyState === "complete") {
      reveal();
    } else {
      window.addEventListener("load", reveal, { once: true });
      return () => window.removeEventListener("load", reveal);
    }
  }, []);

  if (!covering) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "#ffffff",
        pointerEvents: "none",
      }}
    />
  );
}
