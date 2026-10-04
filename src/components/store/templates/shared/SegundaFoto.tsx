"use client";
import { useEffect, useRef, useState } from "react";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";

/* ══════════════════════════════════════════════════════════════════════════
   LA SEGUNDA FOTO AL PASAR EL MOUSE (Aire y Boho, 04/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Se pone ADENTRO del hueco de la foto de una tarjeta, después de la primera:
   cuando el mouse entra al hueco, aparece la segunda foto del producto (la
   espalda, la prenda puesta) y al salir vuelve la primera. Es lo que hacen
   casi todas las tiendas de ropa: el cliente ve más sin entrar al producto.

   - Escucha el mouse en el hueco (su elemento padre), no en sí misma: arriba
     suyo van el corazón y las etiquetas, que si no le cortarían el hover.
   - Se baja recién la primera vez que se pasa el mouse, no la de todos los
     productos de entrada.
   - Sin mouse (celular) nunca se monta. Sin segunda foto distinta, no hace
     nada: la tarjeta queda como estaba. */
export function SegundaFoto({ images, sizes, zoom = false }: {
  images: string[];
  sizes: string;
  /** Si la primera foto se agranda al pasar el mouse, ésta también y CUÁNTO
   *  (la misma escala que la primera: si no, se nota un saltito en el cruce).
   *  `true` es 1.05. */
  zoom?: boolean | number;
}) {
  const segunda = images[1] && images[1] !== images[0] ? images[1] : null;
  const ref = useRef<HTMLSpanElement>(null);
  const [montada, setMontada] = useState(false);
  const [encima, setEncima] = useState(false);

  useEffect(() => {
    const hueco = ref.current?.parentElement;
    if (!segunda || !hueco || !window.matchMedia("(hover: hover)").matches) return;
    const entrar = () => { setMontada(true); setEncima(true); };
    const salir = () => setEncima(false);
    hueco.addEventListener("mouseenter", entrar);
    hueco.addEventListener("mouseleave", salir);
    return () => { hueco.removeEventListener("mouseenter", entrar); hueco.removeEventListener("mouseleave", salir); };
  }, [segunda]);

  if (!segunda) return null;
  return (
    <span ref={ref} aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      {montada && (
        <FadeImage src={segunda} alt="" fill sizes={sizes}
          style={{ objectFit:"cover", opacity: encima ? 1 : 0, transition:"opacity 0.45s ease, transform 0.55s ease",
            transform: zoom && encima ? `scale(${zoom === true ? 1.05 : zoom})` : "scale(1)" }}
          onError={e => { e.currentTarget.style.display = "none"; }} />
      )}
    </span>
  );
}
