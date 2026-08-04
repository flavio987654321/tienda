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
      /* Acá el `setState` sincrónico es el punto, no un descuido, y por eso se
         silencia la regla en vez de reescribirlo.
         El componente arranca tapando (`phase: "cover"`) porque el servidor no
         puede saber si esto se abrió como PWA: `isPwa()` mira el navegador. En una
         pestaña común hay que destapar, y tiene que pasar ANTES de que se pinte,
         que es exactamente lo que garantiza `useLayoutEffect` — corre después de
         tocar el DOM y antes de que el navegador dibuje, así que nadie llega a ver
         la tapa blanca.
         Deducirlo con `useSyncExternalStore` no sirve: contestaría "no es PWA" en
         el primer pintado, y entonces la PWA mostraría el layout deformado que
         este componente existe para tapar. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
