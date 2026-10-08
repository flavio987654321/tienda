"use client";
import { useEffect, useRef } from "react";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { CAPAS } from "@/lib/capas-tienda";

/**
 * La ventana de los formularios de autos (tasación, "Avisame si entra") que se
 * abren desde la portada de un template (06/10/26). Comparte la LÓGICA con la
 * de /vehiculos y la del vehículo; el aspecto del panel lo pone cada template
 * con `panel`.
 *
 * - El fondo no se mueve detrás.
 * - Escape cierra; escribiendo, primero suelta el campo (no se pierde lo escrito).
 * - Tocar afuera cierra sólo si el toque EMPEZÓ afuera (seleccionar texto y
 *   soltar afuera no la cierra).
 * - En el celular, "atrás" la cierra en vez de salir de la tienda.
 */
export function VentanaAuto({ titulo, onClose, panel, children, abierta = true }: {
  titulo: string;
  onClose: () => void;
  panel?: React.CSSProperties;
  children: React.ReactNode;
  /** Cerrada visualmente, pero mantiene montado el formulario para conservar el borrador. */
  abierta?: boolean;
}) {
  const tocoElFondo = useRef(false);
  useCerrarConAtras(onClose, abierta);

  useEffect(() => {
    if (!abierta) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) t.blur();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose, abierta]);

  return (
    <div role="dialog" aria-modal={abierta || undefined} aria-hidden={!abierta} aria-label={titulo}
      onMouseDown={e => { tocoElFondo.current = e.target === e.currentTarget; }}
      onClick={e => { if (tocoElFondo.current && e.target === e.currentTarget) onClose(); tocoElFondo.current = false; }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: CAPAS.critico, display: abierta ? "flex" : "none",
        alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", color: "#1a2744", borderRadius: 14, width: "100%", maxWidth: 520, margin: "auto 0",
        padding: "52px 12px 12px", position: "relative", ...panel }}>
        <button type="button" onClick={onClose} aria-label="Cerrar"
          style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,0.06)", color: "inherit", fontSize: 20, cursor: "pointer", zIndex: 1 }}>×</button>
        {children}
      </div>
    </div>
  );
}
