"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { EditableZone, EditableImageButton, textoSobre } from "@/contexts/EditContext";
import { useLookbook, MAX_PUNTOS } from "@/components/store/templates/shared/useLookbook";
import { Ramita } from "@/components/store/templates/boho/PreguntasBoho";

/* ══════════════════════════════════════════════════════════════════════════
   EL LOOK (el lookbook de Boho Terra)
   ══════════════════════════════════════════════════════════════════════════

   Lo que hace es lo de todos (`shared/useLookbook`): una foto de alguien
   vestido con ropa de la tienda, con una marca encima de cada prenda que se
   toca para ver qué es.

   El dibujo es de Boho: la foto va en un ARCO (la ventana de adobe, el espejo
   de mimbre: la forma más boho que hay), las marcas son semillas del acento (terracota de fábrica)
   con un anillo crema que respira, y al lado la lista como el epígrafe de una
   revista: nombres en Georgia cursiva, "Ver pieza" en mayúsculas espaciadas.
   Los looks se cambian con "Look I · Look II", subrayados como un índice.

   La tarjeta del producto tocado va abajo de la foto, a lo ancho: al lado del
   punto se cortaba contra el borde (lo mismo que en Aire). Tocar la foto la
   cierra. Sin ninguna foto, en la tienda no existe. */

const SERIF = "Georgia, 'Times New Roman', serif";
const ROMANOS = ["I", "II", "III"];
/** El ancho de la foto en compu: entra entera en la pantalla y sigue en 4/5. */
const ANCHO_FOTO = "min(calc(min(74vh, 640px) * 0.8), 48%)";

export function LookbookBoho({
  products, promotions, imagenes, fmt, ocultarPrecios, onAbrir,
  fondo, tinta, suave, A, panel, isMobile, ejemplo, children,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct) => void;
  /** El fondo de la sección (editable) y el texto que se lee sobre él. */
  fondo: string; tinta: string; suave: string;
  /** El acento, ya legible sobre `fondo`. */
  A: string;
  /** El crema de las tarjetas (BG del template). */
  panel: string;
  /** Vista previa de un diseño: sin fotos, mostrar el look de ejemplo. */
  ejemplo?: boolean;
  isMobile: boolean;
  children?: React.ReactNode;
}) {
  const {
    editMode, existe, looks, indice, look, huecoLibre, cambiarLook,
    puntos, puntosVisibles, enEsteLook, sinProducto, porId, elegibles,
    marcando, alternarMarcar, marcar, elegirProducto, borrarPunto,
    puntoAbierto, setPuntoAbierto, prodAbierto, precio,
  } = useLookbook({ products, promotions, imagenes, fmt, ocultarPrecios, ejemplo });

  if (!existe) return null;

  const abiertoId = prodAbierto?.id;
  const linea = `color-mix(in srgb, ${tinta} 16%, transparent)`;
  // El arco: medio círculo arriba, recto abajo.
  const ARCO = "999px 999px 0 0";

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"rgba(250,247,242,0.95)", border:"1px solid rgba(44,34,24,0.18)", color:"#2c2218",
    padding:"7px 13px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Helvetica Neue', Arial, sans-serif", boxShadow:"0 4px 14px rgba(44,34,24,0.15)",
  };

  const tarjetaDe = (prod: StorefrontProduct) => (
    <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAbrir(prod); }}
      onKeyDown={e => { if (e.key === "Enter") onAbrir(prod); }}
      style={{ position:"relative", pointerEvents:"auto", width:"100%", maxWidth:340, boxSizing:"border-box", display:"flex", alignItems:"center", gap:12,
        padding:8, paddingRight:16, cursor:"pointer", background:panel, border:"1px solid rgba(44,34,24,0.12)", boxShadow:"0 16px 36px rgba(44,34,24,0.22)", color:"#2c2218" }}>
      <div style={{ width:44, height:58, flexShrink:0, background:`#f0e9df url(${prod.images[0]}) center/cover` }} />
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:"0 0 4px", fontFamily:SERIF, fontStyle:"italic", fontSize:14.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.name}</p>
        <p style={{ margin:0, fontSize:13, fontWeight:700 }}>{precio(prod)}</p>
      </div>
      <span style={{ flexShrink:0, fontSize:9.5, letterSpacing:2, textTransform:"uppercase", color:A }}>Ver pieza →</span>
    </div>
  );

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "56px 16px" : "96px 32px" }}>
      {children}
      <style>{`
        @keyframes bt-respira { 0% { transform: translate(-50%,-50%) scale(1); opacity: .8 } 100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .bt-semilla-onda { animation: none !important; opacity: 0 } }
        @media (hover: hover) { .bt-look-fila:hover .bt-look-nombre { text-decoration: underline; text-underline-offset: 4px } }
      `}</style>
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom: isMobile ? 30 : 48 }}>
          <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 10px", fontFamily:SERIF, fontStyle:"italic" }}>
            <EditableZone field="lookbookKicker" label="Etiqueta del look">Lookbook</EditableZone>
          </p>
          <h2 style={{ fontFamily:SERIF, fontSize:"clamp(26px,3vw,38px)", fontWeight:400, fontStyle:"italic", margin:"0 0 16px", color:tinta }}>
            <EditableZone field="lookbookTitulo" label="Título del look">Comprá el look</EditableZone>
          </h2>
          <Ramita color={A} />
        </div>

        <div style={{ display:"grid", gap: isMobile ? 26 : 64, alignItems:"center", justifyContent:"center",
          gridTemplateColumns: isMobile || !look ? "minmax(0,1fr)" : `minmax(0,${ANCHO_FOTO}) minmax(0,440px)` }}>

          {/* ── La foto en arco, con sus semillas ── */}
          {look ? (
            <div style={{ position:"relative", minWidth:0 }}>
            {/* El botón de la foto va AFUERA del arco: adentro, la curva le
                cortaba la esquina en el celular. Así queda arriba a la derecha,
                sobre el fondo, donde el arco ya se curvó. */}
            <EditableImageButton field={`lookbook${look.n}`} label={`Foto del look ${look.n}`} />
            <div key={look.n} onClick={e => { if (marcando) marcar(e); else setPuntoAbierto(null); }}
              style={{ position:"relative", aspectRatio:"4/5", width:"100%", borderRadius:ARCO, overflow:"hidden", background:"#f0e9df",
                outline: marcando ? `2px dashed ${A}` : "none", outlineOffset:-6, cursor: marcando ? "crosshair" : "default" }}>
              <div aria-hidden style={{ position:"absolute", inset:0, background:`url(${look.url}) center/cover` }} />

              {puntosVisibles.map((pt, i) => {
                const prod = porId.get(pt.id);
                const abierto = puntoAbierto === i && !!prod && !marcando;
                const resaltado = !!prod && prod.id === abiertoId;
                return (
                  <div key={i} style={{ position:"absolute", left:`${pt.x}%`, top:`${pt.y}%`, zIndex: abierto ? 4 : 3 }}>
                    <button type="button" aria-label={prod ? `Ver ${prod.name}` : "Punto sin producto"}
                      onClick={e => { e.stopPropagation(); if (!marcando) setPuntoAbierto(abierto ? null : i); }}
                      style={{ position:"absolute", left:0, top:0, transform:"translate(-50%,-50%)", width:44, height:44, borderRadius:999,
                        background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
                      <span aria-hidden className="bt-semilla-onda" style={{ position:"absolute", left:"50%", top:"50%", width:20, height:20, borderRadius:999,
                        border:"1.5px solid rgba(250,247,242,0.9)", transform:"translate(-50%,-50%)", animation:"bt-respira 2.4s ease-out infinite" }} />
                      <span aria-hidden style={{ position:"absolute", left:"50%", top:"50%", transform:`translate(-50%,-50%) scale(${resaltado ? 1.25 : 1})`, width:16, height:16, borderRadius:999,
                        background: prod ? A : "#e0a526", border:"3px solid #faf7f2", boxShadow:"0 3px 10px rgba(44,34,24,0.35)", transition:"transform .25s" }} />
                    </button>

                    {editMode && marcando && (
                      <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:5 }}>
                        <select value={pt.id} aria-label={`Producto del punto ${i + 1}`} onChange={e => elegirProducto(i, e.target.value)}
                          style={{ background:"#faf7f2", color:"#2c2218", border:`1px solid ${pt.id ? "rgba(44,34,24,0.25)" : "#e0a526"}`, padding:"5px 8px", fontSize:11, maxWidth:160, cursor:"pointer",
                            boxShadow:"0 4px 14px rgba(44,34,24,0.2)", fontFamily:"inherit" }}>
                          <option value="" style={{ color:"#2c2218", background:"#faf7f2" }}>Elegí el producto…</option>
                          {elegibles.map(p => <option key={p.id} value={p.id} style={{ color:"#2c2218", background:"#faf7f2" }}>{p.name}</option>)}
                        </select>
                        <button type="button" onClick={() => borrarPunto(i)} aria-label="Borrar el punto"
                          style={{ width:26, height:26, border:"none", background:"#b91c1c", color:"#fff", cursor:"pointer", fontSize:13, lineHeight:1 }}>×</button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* La tarjeta del punto tocado, abajo de la foto. Deja pasar los clics a la
                  foto salvo sobre ella misma (para marcar, o cerrarla tocando afuera). */}
              <div style={{ position:"absolute", left:10, right:10, bottom:10, zIndex:6, display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8, pointerEvents:"none" }}>
                {prodAbierto && tarjetaDe(prodAbierto)}
              </div>
            </div>
            {/* Los botones del editor van DEBAJO de la foto, no encima: encima tapaban
                las marcas de abajo (unas sandalias, en el celular) y no se podían tocar. */}
            {editMode && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
                <button type="button" onClick={alternarMarcar} style={{ ...chip, ...(marcando ? { background:A, color:textoSobre(A), borderColor:A } : null) }}>
                  📍 {marcando ? "Listo" : "Marcar productos"}
                </button>
                {marcando && <span style={{ ...chip, cursor:"default", fontWeight:500 }}>Tocá la foto donde está cada prenda ({puntos.length}/{MAX_PUNTOS})</span>}
                {sinProducto > 0 && (
                  <span style={{ ...chip, cursor:"default", color:"#92400e", borderColor:"#e0a526" }}>
                    {sinProducto === 1 ? "1 punto" : `${sinProducto} puntos`} sin producto: no se ven en la tienda
                  </span>
                )}
              </div>
            )}
            </div>
          ) : (
            /* Sólo en el editor: todavía no hay ninguna foto. */
            <div style={{ position:"relative", maxWidth:620, margin:"0 auto", width:"100%", boxSizing:"border-box", border:`1px dashed ${A}`, padding: isMobile ? "26px 20px" : "38px 40px", color:tinta }}>
              <p style={{ margin:"0 0 8px", fontFamily:SERIF, fontStyle:"italic", fontSize:20 }}>¿Qué es “Comprá el look”?</p>
              <p style={{ margin:"0 0 22px", fontSize:14, lineHeight:1.7, color:suave }}>
                Una foto de alguien vestido con ropa de tu tienda, como un maniquí en la vidriera. Encima de cada prenda va una marca: el cliente la toca, ve qué es y lo compra. Sirve para vender el conjunto entero, no una sola prenda.
              </p>
              {[
                "Subí la foto de alguien vestido con tus productos (botón de arriba a la derecha).",
                "Tocá “📍 Marcar productos” y después tocá la foto encima de cada prenda.",
                "En cada marca elegí qué producto es.",
              ].map((paso, i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"baseline", marginBottom:12 }}>
                  <span style={{ flexShrink:0, width:24, fontFamily:SERIF, fontStyle:"italic", fontSize:14, color:A }}>{ROMANOS[i]}.</span>
                  <span style={{ fontSize:14, lineHeight:1.55 }}>{paso}</span>
                </div>
              ))}
              <p style={{ margin:"14px 0 0", fontSize:13, color:"#92400e", fontWeight:700 }}>No se muestra en la tienda hasta que subas una foto.</p>
              <EditableImageButton field="lookbook1" label="Subir la foto del look" />
            </div>
          )}

          {/* ── Los looks y la lista, como epígrafe de revista ── */}
          {look && (
            <div style={{ minWidth:0 }}>
              {(looks.length > 1 || huecoLibre > 0) && (
                <div style={{ display:"flex", gap:22, flexWrap:"wrap", alignItems:"center", marginBottom: isMobile ? 20 : 28, justifyContent: isMobile ? "center" : "flex-start" }}>
                  {looks.map((l, i) => {
                    const activo = i === indice;
                    return (
                      <button key={l.n} type="button" onClick={() => cambiarLook(i)} aria-pressed={activo}
                        style={{ background:"none", border:"none", padding:"0 0 4px", cursor:"pointer", fontFamily:SERIF, fontStyle:"italic", fontSize:17,
                          color: activo ? tinta : suave, borderBottom:`1px solid ${activo ? A : "transparent"}`, transition:"color .2s, border-color .2s" }}>
                        Look {ROMANOS[i]}
                      </button>
                    );
                  })}
                  {huecoLibre > 0 && (
                    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", minHeight:38, padding:"0 46px 0 14px", border:`1px dashed ${A}`,
                      fontSize:10.5, letterSpacing:2, textTransform:"uppercase", color:suave }}>
                      + Sumar look
                      <EditableImageButton field={`lookbook${huecoLibre}`} label={`Foto del look ${huecoLibre}`} compact />
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize:9.5, letterSpacing:4, textTransform:"uppercase", color:suave, margin:"0 0 6px" }}>En este look</p>
              <div style={{ borderTop:`1px solid ${linea}` }}>
                {enEsteLook.length > 0 ? enEsteLook.map(p => {
                  const resaltado = p.id === abiertoId;
                  return (
                    <div key={p.id} role="button" tabIndex={0} className="bt-look-fila" onClick={() => onAbrir(p)}
                      onKeyDown={e => { if (e.key === "Enter") onAbrir(p); }}
                      style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 0", borderBottom:`1px solid ${linea}`, cursor:"pointer", color:tinta }}>
                      <div style={{ width:56, height:72, flexShrink:0, background:`#f0e9df url(${p.images[0]}) center/cover`,
                        outline: resaltado ? `2px solid ${A}` : "none", outlineOffset:2, transition:"outline-color .2s" }} />
                      <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ margin:"0 0 4px", fontSize:9.5, letterSpacing:2.5, textTransform:"uppercase", color:A }}>{p.category}</p>
                        <p className="bt-look-nombre" style={{ margin:"0 0 4px", fontFamily:SERIF, fontStyle:"italic", fontSize:17, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:14, fontWeight:700, color: ocultarPrecios ? suave : tinta }}>{precio(p)}</p>
                      </div>
                      <span style={{ flexShrink:0, fontSize:9.5, letterSpacing:2, textTransform:"uppercase", color:A, whiteSpace:"nowrap" }}>Ver pieza →</span>
                    </div>
                  );
                }) : (
                  <p style={{ margin:"16px 0 0", fontSize:14, lineHeight:1.7, color:suave }}>
                    {editMode ? "Todavía no marcaste productos en este look: tocá “📍 Marcar productos” abajo de la foto." : "Consultanos por las prendas de este look."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
