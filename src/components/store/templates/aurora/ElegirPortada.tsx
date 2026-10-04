"use client";
import { useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useEditContext } from "@/contexts/EditContext";

/* ══════════════════════════════════════════════════════════════════════════
   ELEGIR LOS PRODUCTOS DE LA PORTADA (sólo en el editor)
   ══════════════════════════════════════════════════════════════════════════

   La dueña toca hasta MAX_PORTADA productos y salen en ese orden en los
   cuadraditos del hero. Se guarda en el override `heroPiezas` como ids
   separados por coma; vacío vuelve a lo automático (los primeros con foto).

   Si la tienda subió su propia foto de fondo, esa va primera y los elegidos
   después. Sin elegir ninguno, la foto propia queda sola, como siempre. */

export const MAX_PORTADA = 4;

/** Los ids guardados, sin repetidos ni vacíos. */
export function leerPiezasPortada(texto: string | undefined): string[] {
  return [...new Set((texto ?? "").split(",").map(s => s.trim()).filter(Boolean))].slice(0, MAX_PORTADA);
}

export function ElegirPortada({ productos, elegidos, conFotoPropia, tinta, acento, textoAcento, linea, fondoPanel }: {
  /** Sólo los que tienen foto: sin foto no pueden ir en la portada. */
  productos: StorefrontProduct[];
  elegidos: string[];
  conFotoPropia: boolean;
  tinta: string;
  acento: string;
  /** El texto que se lee sobre el acento (claro u oscuro según el acento). */
  textoAcento: string;
  linea: string;
  fondoPanel: string;
}) {
  const { setOverride, vistaCelular } = useEditContext();
  const [abierto, setAbierto] = useState(false);

  const guardar = (ids: string[]) => setOverride("heroPiezas", { text: ids.join(",") });
  const alternar = (id: string) => {
    if (elegidos.includes(id)) guardar(elegidos.filter(x => x !== id));
    else if (elegidos.length < MAX_PORTADA) guardar([...elegidos, id]);
  };

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"rgba(14,15,26,0.85)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
    border:`1px solid ${linea}`, color:tinta, borderRadius:999, padding:"6px 12px", fontSize:11, fontWeight:600, letterSpacing:0.5, cursor:"pointer",
  };

  return (
    // En el celular va a la derecha, abajo de "Fondo": a la izquierda tapaba la
    // etiqueta de arriba del título, que ahí arranca más cerca del borde.
    <div style={{ position:"absolute", top:46, ...(vistaCelular ? { right:8 } : { left:8 }), zIndex:7, display:"flex", flexDirection:"column", alignItems: vistaCelular ? "flex-end" : "flex-start" }}>
      <button type="button" onClick={() => setAbierto(a => !a)} style={chip} aria-expanded={abierto}>
        📌 Productos de portada
        <span style={{ opacity:0.6, fontWeight:500 }}>{elegidos.length ? `${elegidos.length}/${MAX_PORTADA}` : "auto"}</span>
      </button>

      {abierto && (
        <div style={{ marginTop:8, width:380, maxWidth:"calc(100vw - 32px)", background:fondoPanel, border:`1px solid ${linea}`, borderRadius:18,
          padding:16, color:tinta, boxShadow:"0 30px 70px rgba(0,0,0,.6)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600 }}>Elegí hasta {MAX_PORTADA} productos</p>
          <p style={{ margin:"0 0 12px", fontSize:11.5, lineHeight:1.5, opacity:0.65 }}>
            {conFotoPropia
              ? "Tu foto de fondo va primero y después estos, en el orden en que los toques."
              : "Salen en los cuadraditos en el orden en que los toques. Sin elegir, van los primeros con foto."}
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, maxHeight:280, overflowY:"auto", padding:2 }}>
            {productos.map(p => {
              const n = elegidos.indexOf(p.id);
              const lleno = n < 0 && elegidos.length >= MAX_PORTADA;
              return (
                <button key={p.id} type="button" onClick={() => alternar(p.id)} title={p.name} disabled={lleno}
                  style={{ position:"relative", aspectRatio:"3/4", padding:0, borderRadius:10, overflow:"hidden", cursor: lleno ? "not-allowed" : "pointer",
                    border:`2px solid ${n >= 0 ? acento : "transparent"}`, opacity: lleno ? 0.35 : 1, background:"#0e0f1a",
                    boxShadow: n >= 0 ? `0 0 16px ${acento}88` : "none" }}>
                  <span aria-hidden style={{ position:"absolute", inset:0, backgroundImage:`url(${p.images[0]})`, backgroundSize:"cover", backgroundPosition:"center" }} />
                  {n >= 0 && (
                    <span style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:999, background:acento, color:textoAcento,
                      fontSize:11, fontWeight:700, display:"grid", placeItems:"center" }}>{n + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:14 }}>
            <button type="button" onClick={() => guardar([])} disabled={!elegidos.length}
              style={{ ...chip, background:"transparent", opacity: elegidos.length ? 1 : 0.4, cursor: elegidos.length ? "pointer" : "default" }}>
              Volver a automático
            </button>
            <button type="button" onClick={() => setAbierto(false)}
              style={{ ...chip, background:acento, border:"none", color:textoAcento }}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
