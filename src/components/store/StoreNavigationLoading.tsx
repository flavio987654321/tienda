"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Señal inmediata mientras una página de la tienda termina de cargar. */
export default function StoreNavigationLoading() {
  const pathname = usePathname();
  const [destinoCargando, setDestinoCargando] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const respaldo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const limpiar = () => {
      if (timer.current) clearTimeout(timer.current);
      if (respaldo.current) clearTimeout(respaldo.current);
      timer.current = null;
      respaldo.current = null;
      setDestinoCargando("");
    };

    const alNavegar = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;

      let destino: URL;
      try { destino = new URL(link.href, window.location.href); } catch { return; }
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;

      if (timer.current) clearTimeout(timer.current);
      if (respaldo.current) clearTimeout(respaldo.current);
      // Evita un destello en cambios rápidos, pero avisa si la navegación tarda.
      const pathDestino = destino.pathname;
      timer.current = setTimeout(() => {
        setDestinoCargando(pathDestino);
        // Si una navegación queda colgada, no dejar una capa bloqueando la página.
        respaldo.current = setTimeout(() => setDestinoCargando(""), 15_000);
      }, 140);
    };

    document.addEventListener("click", alNavegar, true);
    window.addEventListener("pageshow", limpiar);
    return () => {
      document.removeEventListener("click", alNavegar, true);
      window.removeEventListener("pageshow", limpiar);
      if (timer.current) clearTimeout(timer.current);
      if (respaldo.current) clearTimeout(respaldo.current);
    };
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (respaldo.current) clearTimeout(respaldo.current);
    timer.current = null;
    respaldo.current = null;
  }, [pathname]);

  if (!destinoCargando || destinoCargando === pathname) return null;

  return (
    <div role="status" aria-live="polite" aria-label="Cargando página" style={{ position: "fixed", inset: 0, zIndex: 2147483000,
      display: "grid", placeItems: "center", background: "rgba(10, 12, 16, .68)", backdropFilter: "blur(3px)" }}>
      <style>{`@keyframes store-nav-gira { to { transform: rotate(360deg) } } @media (prefers-reduced-motion: reduce) { .store-nav-spinner { animation-duration: 2s !important } }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 20px", border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 14, background: "#17191d", color: "#fff", boxShadow: "0 18px 60px rgba(0,0,0,.35)", font: "600 14px/1.3 system-ui, sans-serif" }}>
        <span className="store-nav-spinner" aria-hidden="true" style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,.28)",
          borderTopColor: "#f2aa18", borderRadius: "50%", animation: "store-nav-gira .7s linear infinite" }} />
        Cargando…
      </div>
    </div>
  );
}
