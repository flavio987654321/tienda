"use client";
import { useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { useEditContext } from "@/contexts/EditContext";

/* ══════════════════════════════════════════════════════════════════════════
   LA PORTADA, EN EL EDITOR: productos O foto propia
   ══════════════════════════════════════════════════════════════════════════

   Un solo botón, "🖼 Portada", en el lugar donde estaba "Fondo", y adentro dos
   opciones con tilde. Se elige UNA (override `portadaModo`):

   - "productos": los cuadraditos con los productos pasando, y la tarjeta del
     producto. Se pueden elegir hasta MAX_PORTADA (override `heroPiezas`, ids
     separados por coma); sin elegir, van los primeros con foto.
   - "foto": la foto que subió la dueña, sola y a pantalla completa. Sin
     cuadraditos ni tarjeta. La foto se sube y se encuadra en el panel de fondo
     de siempre (`bg:bgHero`), que acá ofrece sólo la foto (SECTION_BG_SOLO_FOTO).

   Antes eran dos botones encimados —"Fondo" y "Productos de portada"— que se
   podían usar a la vez y se mezclaban, y el color del fondo no hacía nada porque
   siempre hay una foto encima (Flavio, 04/10/26). Cambiar de opción no borra
   nada: la foto y los productos elegidos quedan guardados para volver. */

export const MAX_PORTADA = 4;
export type ModoPortada = "productos" | "foto";

/** Los ids guardados, sin repetidos ni vacíos. */
export function leerPiezasPortada(texto: string | undefined): string[] {
  return [...new Set((texto ?? "").split(",").map(s => s.trim()).filter(Boolean))].slice(0, MAX_PORTADA);
}

/** El modo elegido. Sin elegir todavía: foto si ya subió una (como se veía antes), si no productos. */
export function leerModoPortada(texto: string | undefined, hayFoto: boolean): ModoPortada {
  return texto === "foto" || texto === "productos" ? texto : hayFoto ? "foto" : "productos";
}

export function ElegirPortada({ productos, elegidos, modo, foto, tinta, acento, textoAcento, linea, fondoPanel }: {
  /** Sólo los que tienen foto: sin foto no pueden ir en la portada. */
  productos: StorefrontProduct[];
  elegidos: string[];
  modo: ModoPortada;
  /** La foto propia que ya subió, si subió una. */
  foto?: string;
  tinta: string;
  acento: string;
  /** El texto que se lee sobre el acento (claro u oscuro según el acento). */
  textoAcento: string;
  linea: string;
  fondoPanel: string;
}) {
  const { setOverride, setActiveField, vistaCelular } = useEditContext();
  const [abierto, setAbierto] = useState(false);

  const guardar = (ids: string[]) => setOverride("heroPiezas", { text: ids.join(",") });
  const alternar = (id: string) => {
    if (elegidos.includes(id)) guardar(elegidos.filter(x => x !== id));
    else if (elegidos.length < MAX_PORTADA) guardar([...elegidos, id]);
  };
  const elegirModo = (m: ModoPortada) => setOverride("portadaModo", { text: m });
  // Abre el panel de fondo de siempre, que en esta sección ofrece sólo la foto.
  const abrirPanelFoto = () => { setAbierto(false); setActiveField("bg:bgHero"); };

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"rgba(14,15,26,0.85)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
    border:`1px solid ${linea}`, color:tinta, borderRadius:999, padding:"6px 12px", fontSize:11, fontWeight:600, letterSpacing:0.5, cursor:"pointer",
    fontFamily:"system-ui, -apple-system, sans-serif",
  };
  const opcion = (activa: boolean): React.CSSProperties => ({
    display:"flex", alignItems:"flex-start", gap:10, width:"100%", textAlign:"left", cursor:"pointer", borderRadius:14, padding:"12px 12px",
    background: activa ? "rgba(255,255,255,0.07)" : "transparent", border:`1px solid ${activa ? acento : linea}`, color:tinta, fontFamily:"inherit",
  });
  const tilde = (activa: boolean) => (
    <span aria-hidden style={{ flexShrink:0, marginTop:1, width:18, height:18, borderRadius:999, display:"grid", placeItems:"center",
      border:`1.5px solid ${activa ? acento : "rgba(255,255,255,0.4)"}`, background: activa ? acento : "transparent", color:textoAcento, fontSize:11, fontWeight:800 }}>
      {activa ? "✓" : ""}
    </span>
  );

  return (
    // Donde estaba "Fondo": en la compu, abajo de la chapita; en el celular, en
    // la misma línea de la chapita, contra el otro costado (como hacía "Fondo").
    // `data-edit-bg`: la marca que dejaba "Fondo". El panel de la foto la busca
    // para medir el hueco de la portada y mostrar el encuadre con su forma real.
    <div data-edit-bg="bgHero" style={{ position:"absolute", zIndex:7, display:"flex", flexDirection:"column",
      ...(vistaCelular ? { top:2, right:8, alignItems:"flex-end" } : { top:17, left:8, alignItems:"flex-start" }) }}>
      <button type="button" onClick={() => setAbierto(a => !a)} style={chip} aria-expanded={abierto}>
        🖼 Portada
        <span style={{ opacity:0.6, fontWeight:500 }}>· {modo === "foto" ? "Foto propia" : "Productos"}</span>
      </button>

      {abierto && (
        <div style={{ marginTop:8, width:380, maxWidth:"calc(100vw - 32px)", background:fondoPanel, border:`1px solid ${linea}`, borderRadius:18,
          padding:14, color:tinta, boxShadow:"0 30px 70px rgba(0,0,0,.6)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          display:"flex", flexDirection:"column", gap:10, fontFamily:"system-ui, -apple-system, sans-serif" }}>
          <p style={{ margin:"0 2px 2px", fontSize:13, fontWeight:600 }}>¿Qué se ve en la portada?</p>

          {/* ── Productos ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button type="button" onClick={() => elegirModo("productos")} aria-pressed={modo === "productos"} style={opcion(modo === "productos")}>
              {tilde(modo === "productos")}
              <span>
                <span style={{ display:"block", fontSize:12.5, fontWeight:600, marginBottom:3 }}>Productos de la tienda</span>
                <span style={{ display:"block", fontSize:11.5, lineHeight:1.45, opacity:0.65 }}>
                  Van pasando con los cuadraditos al costado. {elegidos.length ? `Elegiste ${elegidos.length}.` : "Sin elegir, van los primeros con foto."}
                </span>
              </span>
            </button>
            {modo === "productos" && (
              <div style={{ padding:"2px 4px 4px" }}>
                <p style={{ margin:"0 0 8px", fontSize:11.5, opacity:0.7 }}>Tocá hasta {MAX_PORTADA}, en el orden en que querés que salgan:</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, maxHeight:230, overflowY:"auto", padding:2 }}>
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
                {elegidos.length > 0 && (
                  <button type="button" onClick={() => guardar([])}
                    style={{ ...chip, marginTop:10, background:"transparent" }}>Volver a los automáticos</button>
                )}
              </div>
            )}
          </div>

          {/* ── Foto propia ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button type="button" onClick={() => elegirModo("foto")} aria-pressed={modo === "foto"} style={opcion(modo === "foto")}>
              {tilde(modo === "foto")}
              <span>
                <span style={{ display:"block", fontSize:12.5, fontWeight:600, marginBottom:3 }}>Foto propia</span>
                <span style={{ display:"block", fontSize:11.5, lineHeight:1.45, opacity:0.65 }}>
                  Una foto tuya a pantalla completa, sin los cuadraditos.
                </span>
              </span>
            </button>
            {modo === "foto" && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"2px 4px 4px" }}>
                {foto && <span aria-hidden style={{ width:56, height:40, flexShrink:0, borderRadius:8, backgroundImage:`url(${foto})`, backgroundSize:"cover", backgroundPosition:"center", border:`1px solid ${linea}` }} />}
                <div style={{ minWidth:0 }}>
                  <button type="button" onClick={abrirPanelFoto} style={{ ...chip, background:acento, color:textoAcento, border:"none" }}>
                    {foto ? "Cambiar o acomodar la foto" : "Subir la foto"}
                  </button>
                  {!foto && <p style={{ margin:"6px 0 0", fontSize:11, color:"#fbbf24" }}>Hasta que la subas, se siguen viendo los productos.</p>}
                </div>
              </div>
            )}
          </div>

          <button type="button" onClick={() => setAbierto(false)} style={{ ...chip, alignSelf:"flex-end", background:acento, color:textoAcento, border:"none" }}>Listo</button>
        </div>
      )}
    </div>
  );
}
