"use client";
import { useEffect, useRef } from "react";
import type { StoreConfig } from "@/types/store-config";
import { AVISO_ALINEABLE, AVISO_CONFIG, AVISO_INDICE, AVISO_LISTA, AVISO_LLAMADA, LLAMADAS, type Edicion, type ItemIndice, type Llamada } from "@/app/preview/celular/avisos";

export type Ancho = "pc" | "celular";

function mandarA(marco: HTMLIFrameElement | null, config: StoreConfig, edicion: Edicion | null) {
  marco?.contentWindow?.postMessage(
    { tipo: AVISO_CONFIG, config: JSON.parse(JSON.stringify(config)), edicion },
    window.location.origin,
  );
}

/**
 * La tienda en tamaño celular, adentro del editor de Diseño.
 *
 * Es un `iframe` a `/preview/celular` y no el template dibujado acá: el porqué
 * está en esa página. Este lado le manda el borrador y, si se está editando, qué
 * campo está abierto; de vuelta recibe lo que se toque adentro (`onLlamada`).
 *
 * ⚠️ Se manda una copia pasada por JSON, no el objeto tal cual. La config del
 * editor lleva funciones (`onPreviewBellClick`) y `postMessage` no sabe copiar
 * funciones: tira `DataCloneError` y no llega nada. En la otra ventana esa
 * función tampoco serviría — navegaría adentro del celular, no el panel.
 */
export default function MarcoCelular({ config, edicion = null, onLlamada, onIndice, onAlineable, corrido = 0 }: {
  config: StoreConfig;
  /** Con esto el celular se puede tocar para editar. Sin esto, sólo se mira. */
  edicion?: Edicion | null;
  onLlamada?: (fn: Llamada, args: unknown[]) => void;
  /** Los textos que se pueden tocar, para la lista del panel. */
  onIndice?: (items: ItemIndice[]) => void;
  /** Si alinear el texto elegido lo mueve de verdad (lo mide el teléfono). */
  onAlineable?: (field: string, puede: boolean) => void;
  /** Cuánto correr el teléfono a la izquierda: lo que ocupa el panel abierto. */
  corrido?: number;
}) {
  const marco = useRef<HTMLIFrameElement>(null);

  /* Con un respiro, como en la previa de digitales: sin él se redibuja la tienda
     entera por cada tecla que se escribe en un texto. */
  useEffect(() => {
    const t = setTimeout(() => mandarA(marco.current, config, edicion), 150);
    return () => clearTimeout(t);
  }, [config, edicion]);

  useEffect(() => {
    const alAviso = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== marco.current?.contentWindow) return;
      const d = e.data as { tipo?: unknown; fn?: unknown; args?: unknown } | null;
      /* La ventanita avisa cuando terminó de cargar; lo que se mandó antes se perdió. */
      if (d?.tipo === AVISO_LISTA) { mandarA(marco.current, config, edicion); return; }
      /* Sólo lo que está en la lista: lo demás se ignora. */
      if (d?.tipo === AVISO_LLAMADA && LLAMADAS.includes(d.fn as Llamada) && Array.isArray(d.args)) {
        onLlamada?.(d.fn as Llamada, d.args);
        return;
      }
      if (d?.tipo === AVISO_INDICE && Array.isArray((d as { items?: unknown }).items)) {
        onIndice?.((d as { items: ItemIndice[] }).items);
        return;
      }
      const a = d as { tipo?: unknown; field?: unknown; puede?: unknown } | null;
      if (a?.tipo === AVISO_ALINEABLE && typeof a.field === "string" && typeof a.puede === "boolean") {
        onAlineable?.(a.field, a.puede);
      }
    };
    window.addEventListener("message", alAviso);
    return () => window.removeEventListener("message", alAviso);
  }, [config, edicion, onLlamada, onIndice, onAlineable]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "8px 0", paddingRight: corrido, gap: 10, minHeight: 0,
      boxSizing: "border-box", transition: "padding-right 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ flex: 1, minHeight: 0, maxHeight: 844 + 24, width: 390 + 24, padding: 12,
        borderRadius: 44, background: "#0b0f19", boxSizing: "border-box",
        boxShadow: "0 0 0 1px #334155, 0 20px 50px rgba(0,0,0,0.35)" }}>
        {/* Sin `key`: si se volviera a montar con cada cambio perdería el scroll
            y arrancaría desde arriba a cada tecla. */}
        <iframe ref={marco} src="/preview/celular" title="Tu tienda vista desde un celular"
          style={{ width: "100%", height: "100%", border: 0, borderRadius: 32, background: "white", display: "block" }} />
      </div>
    </div>
  );
}

/** Los dos botones PC / Celular. Mismo dibujo que en la previa de digitales. */
export function SelectorAncho({ ancho, onChange }: { ancho: Ancho; onChange: (a: Ancho) => void }) {
  const boton = (valor: Ancho, etiqueta: string, icono: React.ReactNode) => (
    <button type="button" onClick={() => onChange(valor)} aria-label={etiqueta} title={etiqueta}
      aria-pressed={ancho === valor}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 26,
        borderRadius: 6, border: "none", cursor: "pointer",
        background: ancho === valor ? "white" : "transparent",
        color: ancho === valor ? "#1e293b" : "#94a3b8",
        boxShadow: ancho === valor ? "0 1px 2px rgba(15,23,42,0.12)" : "none" }}>
      {icono}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 8, background: "#f1f5f9", flexShrink: 0 }}>
      {boton("pc", "Ver en computadora",
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>)}
      {boton("celular", "Ver en celular",
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>)}
    </div>
  );
}
