"use client";
import { useEffect, useRef } from "react";

/**
 * La escena de luz de Auto Volt (12/10/26): el fondo de la portada.
 *
 * Tres capas, todas CSS: un foco de luz del color del acento que sigue al
 * puntero (o deriva solo en el celular, donde no hay puntero), un piso de
 * grilla en perspectiva que avanza hacia quien mira, y la línea del horizonte.
 *
 * El puntero se escribe en variables CSS del propio elemento, en un
 * `requestAnimationFrame`, y no en estado de React: si no, la portada entera se
 * volvía a dibujar sesenta veces por segundo. Con "reducir movimiento" el piso
 * queda quieto y la luz no sigue a nadie.
 */
export const ESCENA_VOLT_CSS = `
  .ev-escena { position:absolute; inset:0; overflow:hidden; pointer-events:none; --ev-x:68%; --ev-y:28% }
  .ev-luz { position:absolute; inset:-20%;
    background:
      radial-gradient(42% 38% at var(--ev-x) var(--ev-y), var(--ev-acento-a) 0%, transparent 70%),
      radial-gradient(30% 26% at calc(100% - var(--ev-x)) 80%, var(--ev-acento-b) 0%, transparent 72%);
    animation: ev-respira 9s ease-in-out infinite alternate }
  @keyframes ev-respira { from { opacity:.75 } to { opacity:1 } }
  .ev-piso { position:absolute; left:-50%; right:-50%; bottom:-6%; height:58%;
    transform: perspective(520px) rotateX(64deg); transform-origin: 50% 100%;
    background-image:
      linear-gradient(to right, var(--ev-linea) 1px, transparent 1px),
      linear-gradient(to bottom, var(--ev-linea) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: linear-gradient(to top, #000 10%, transparent 85%);
    mask-image: linear-gradient(to top, #000 10%, transparent 85%);
    animation: ev-avanza 2.6s linear infinite }
  @keyframes ev-avanza { to { background-position: 0 56px } }
  .ev-horizonte { position:absolute; left:0; right:0; bottom:5%; height:1px;
    background: linear-gradient(90deg, transparent, var(--ev-acento-a) 30%, var(--ev-acento-c) 50%, var(--ev-acento-a) 70%, transparent);
    box-shadow: 0 0 24px 2px var(--ev-acento-b) }
  @media (max-width: 720px) { .ev-piso { height:42% } .ev-horizonte { bottom:4% } }
  @media (prefers-reduced-motion: reduce) { .ev-piso, .ev-luz { animation:none } }
`;

/** La letra de tablero de Auto Volt: datos, códigos y contadores. */
export const MONO = "ui-monospace,'SFMono-Regular','JetBrains Mono',Menlo,Consolas,monospace";

/** `#22d3ee` + alfa → `rgba(...)`. Si no es un hex, cae a un cian. */
export function conAlfa(hex: string, a: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(34,211,238,${a})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

export function EscenaVolt({ acento, quieta }: { acento: string; quieta?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || quieta) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pedido = 0;
    let x = 68, y = 28;
    const pintar = () => { pedido = 0; el.style.setProperty("--ev-x", `${x}%`); el.style.setProperty("--ev-y", `${y}%`); };
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.clientY > r.bottom + 200) return; // ya bajó: no hace falta seguirlo
      x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
      if (!pedido) pedido = requestAnimationFrame(pintar);
    };
    /* Sin puntero (celular): la luz deriva sola, despacio, en un óvalo. */
    let deriva: ReturnType<typeof setInterval> | null = null;
    if (window.matchMedia("(hover: none)").matches) {
      let t = 0;
      deriva = setInterval(() => { t += 0.035; x = 55 + Math.cos(t) * 22; y = 30 + Math.sin(t * 1.3) * 14; if (!pedido) pedido = requestAnimationFrame(pintar); }, 60);
    } else {
      window.addEventListener("pointermove", mover, { passive: true });
    }
    return () => {
      window.removeEventListener("pointermove", mover);
      if (deriva) clearInterval(deriva);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [quieta]);

  return (
    <div ref={ref} aria-hidden="true" className="ev-escena" style={{
      ["--ev-acento-a" as string]: conAlfa(acento, 0.32),
      ["--ev-acento-b" as string]: conAlfa(acento, 0.18),
      ["--ev-acento-c" as string]: conAlfa(acento, 0.9),
      ["--ev-linea" as string]: conAlfa(acento, 0.3),
    }}>
      <div className="ev-luz" />
      <div className="ev-horizonte" />
      <div className="ev-piso" />
    </div>
  );
}
