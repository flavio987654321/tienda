"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { EditableZone, EditableImageButton } from "@/contexts/EditContext";
import { useLookbook, MAX_PUNTOS } from "@/components/store/templates/shared/useLookbook";

/* ══════════════════════════════════════════════════════════════════════════
   COMPRÁ EL LOOK (el lookbook de Aire)
   ══════════════════════════════════════════════════════════════════════════

   Lo que hace es lo mismo que en Aurora (`shared/useLookbook`): una foto de
   alguien vestido con ropa de la tienda, con una marca encima de cada prenda;
   se toca y se ve qué es y cuánto sale.

   El dibujo es de Aire: la tarjeta blanca sobre el papel de los otros bloques,
   y en vez de puntos de luz, NÚMEROS. Cada número de la foto es el mismo de su
   renglón en la lista de al lado, así se lee como el epígrafe de una revista:
   "1. Campera, 2. Jean…". En el celular el número es más fácil de tocar que un
   punto, y la lista queda debajo con los mismos números.

   Sin ninguna foto, en la tienda no existe; en el editor explica qué es. */

/** El ancho de la columna de la foto en compu: lo que le da 72% del alto de la
 *  pantalla (tope 600px) en 4/5, sin pasar de la mitad de la tarjeta. Así la
 *  foto entra entera en la pantalla y sigue en 4/5 (los puntos están en %). */
const ANCHO_FOTO = "min(calc(min(72vh, 600px) * 0.8), 50%)";

export function LookbookAire({
  products, promotions, imagenes, fmt, ocultarPrecios, onAbrir,
  fondo, G, accentText, T, T2, S, LN, RAD, ANCHO, MARGEN, isMobile, children,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct) => void;
  /** El papel de alrededor de la tarjeta (editable con "Fondo"). */
  fondo: string;
  G: string; accentText: string; T: string; T2: string; S: string; LN: string;
  RAD: number; ANCHO: number; MARGEN: number;
  isMobile: boolean;
  /** El botón "Fondo" del editor, que va adentro de la sección. */
  children?: React.ReactNode;
}) {
  const {
    editMode, existe, looks, indice, look, huecoLibre, cambiarLook,
    puntos, puntosVisibles, enEsteLook, sinProducto, porId, elegibles,
    marcando, alternarMarcar, marcar, elegirProducto, borrarPunto,
    puntoAbierto, setPuntoAbierto, prodAbierto, precio,
  } = useLookbook({ products, promotions, imagenes, fmt, ocultarPrecios });

  if (!existe) return null;

  /* El número de cada producto: su lugar en la lista. Dos puntos sobre el
     mismo producto llevan el mismo número. */
  const numeroDe = (id: string) => enEsteLook.findIndex(p => p.id === id) + 1;
  const abiertoId = prodAbierto?.id;

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:S, border:`1px solid ${LN}`, color:T, borderRadius:999,
    padding:"7px 13px", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(20,22,26,0.12)",
  };

  /** La tarjeta de un punto abierto: blanca, como las de Aire. */
  const tarjetaDe = (prod: StorefrontProduct, lugar: React.CSSProperties) => (
    <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAbrir(prod); }}
      onKeyDown={e => { if (e.key === "Enter") onAbrir(prod); }}
      style={{ ...lugar, zIndex:5, display:"flex", alignItems:"center", gap:10, padding:8, paddingRight:14, borderRadius:14, cursor:"pointer",
        background:S, border:`1px solid ${LN}`, boxShadow:"0 18px 40px rgba(20,22,26,0.22)", color:T }}>
      <div style={{ width:44, height:56, flexShrink:0, borderRadius:9, background:`${LN} url(${prod.images[0]}) center/cover` }} />
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.name}</p>
        <p style={{ margin:0, fontSize:13, fontWeight:800, color:G }}>{precio(prod)} <span aria-hidden>→</span></p>
      </div>
    </div>
  );

  return (
    <section data-reveal style={{ background:fondo, position:"relative", padding:`${isMobile ? 4 : 6}px ${MARGEN}px ${isMobile ? 26 : 38}px` }}>
      {children}
      <style>{`@media (hover: hover) { .ai-look-fila { transition: background .2s } .ai-look-fila:hover { background: rgba(20,22,26,0.03) } }`}</style>
      <div className="ai-entrada" style={{ maxWidth:ANCHO, margin:"0 auto", background:S, border:`1px solid ${LN}`, borderRadius:RAD,
        display:"grid", gap: isMobile ? 18 : 44, padding: isMobile ? 8 : 10, alignItems:"start",
        gridTemplateColumns: isMobile || !look ? "minmax(0,1fr)" : `minmax(0,${ANCHO_FOTO}) minmax(0,1fr)` }}>

        {/* ── La foto, con sus números ── */}
        {look ? (
          <div key={look.n} onClick={e => { if (marcando) marcar(e); else setPuntoAbierto(null); }}
            style={{ position:"relative", aspectRatio:"4/5", width:"100%", borderRadius:RAD - 6, overflow:"hidden", background:LN,
              outline: marcando ? `3px solid ${G}` : "none", outlineOffset:-3, cursor: marcando ? "crosshair" : "default" }}>
            <div aria-hidden style={{ position:"absolute", inset:0, background:`url(${look.url}) center/cover` }} />

            {puntosVisibles.map((pt, i) => {
              const prod = porId.get(pt.id);
              const abierto = puntoAbierto === i && !!prod && !marcando;
              const resaltado = !!prod && prod.id === abiertoId;
              return (
                <div key={i} style={{ position:"absolute", left:`${pt.x}%`, top:`${pt.y}%`, zIndex: abierto ? 4 : 3 }}>
                  {/* 44px de botón para el dedo; el círculo que se ve es de 30. */}
                  <button type="button" aria-label={prod ? `Ver ${prod.name}` : "Punto sin producto"}
                    onClick={e => { e.stopPropagation(); if (!marcando) setPuntoAbierto(abierto ? null : i); }}
                    style={{ position:"absolute", left:0, top:0, transform:"translate(-50%,-50%)", width:44, height:44, borderRadius:999,
                      background:"transparent", border:"none", cursor:"pointer", padding:0, display:"grid", placeItems:"center" }}>
                    <span aria-hidden style={{ width:30, height:30, borderRadius:999, display:"grid", placeItems:"center", fontSize:13, fontWeight:800,
                      background: !prod ? "#f59e0b" : resaltado ? G : S, color: !prod ? "#fff" : resaltado ? accentText : T,
                      boxShadow:"0 0 0 4px rgba(255,255,255,0.45), 0 6px 16px rgba(20,22,26,0.3)", transition:"background .2s, color .2s, transform .2s",
                      transform: resaltado ? "scale(1.12)" : "none" }}>
                      {prod ? numeroDe(prod.id) : "?"}
                    </span>
                  </button>

                  {editMode && marcando && (
                    <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:5 }}>
                      <select value={pt.id} aria-label={`Producto del punto ${i + 1}`} onChange={e => elegirProducto(i, e.target.value)}
                        style={{ background:S, color:T, border:`1px solid ${pt.id ? LN : "#f59e0b"}`, borderRadius:999, padding:"5px 9px", fontSize:11, maxWidth:160, cursor:"pointer",
                          boxShadow:"0 4px 14px rgba(20,22,26,0.18)", fontFamily:"inherit" }}>
                        <option value="" style={{ color:"#14161a", background:"#ffffff" }}>Elegí el producto…</option>
                        {elegibles.map(p => <option key={p.id} value={p.id} style={{ color:"#14161a", background:"#ffffff" }}>{p.name}</option>)}
                      </select>
                      <button type="button" onClick={() => borrarPunto(i)} aria-label="Borrar el punto"
                        style={{ width:26, height:26, borderRadius:999, border:"none", background:"#dc2626", color:"#fff", cursor:"pointer", fontSize:13, lineHeight:1 }}>×</button>
                    </div>
                  )}
                </div>
              );
            })}

            <EditableImageButton field={`lookbook${look.n}`} label={`Foto del look ${look.n}`} />
            {/* Abajo de la foto, apilados: la tarjeta del número tocado y, en el
                editor, los botones. Al lado del punto la tarjeta se cortaba
                contra el borde de la foto, y suelta abajo tapaba los botones
                del editor (04/10/26). La pila deja pasar los clics a la foto
                (para marcar, o para cerrar la tarjeta tocando afuera: en el celular
                tapa el número que se tocó) salvo sobre la tarjeta y los botones. */}
            <div style={{ position:"absolute", left:10, right:10, bottom:10, zIndex:6, display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8, pointerEvents:"none" }}>
              {prodAbierto && tarjetaDe(prodAbierto, { position:"relative", pointerEvents:"auto", width:"100%", maxWidth:340, boxSizing:"border-box" })}
              {editMode && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", pointerEvents:"auto" }} onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={alternarMarcar} style={{ ...chip, ...(marcando ? { background:G, color:accentText, borderColor:G } : null) }}>
                    📍 {marcando ? "Listo" : "Marcar productos"}
                  </button>
                  {marcando && <span style={{ ...chip, cursor:"default", fontWeight:500 }}>Tocá la foto donde está cada prenda ({puntos.length}/{MAX_PUNTOS})</span>}
                  {sinProducto > 0 && (
                    <span style={{ ...chip, cursor:"default", color:"#b45309", borderColor:"#f59e0b" }}>
                      {sinProducto === 1 ? "1 punto" : `${sinProducto} puntos`} sin producto: no se ven en la tienda
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Sólo en el editor: todavía no hay ninguna foto. */
          <div style={{ position:"relative", borderRadius:RAD - 6, border:`1.5px dashed ${LN}`, padding: isMobile ? "24px 18px" : "36px 34px", color:T }}>
            <p style={{ margin:"0 0 6px", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:"-0.3px" }}>¿Qué es “Comprá el look”?</p>
            <p style={{ margin:"0 0 20px", fontSize:14, lineHeight:1.6, color:T2, maxWidth:560 }}>
              Una foto de alguien vestido con ropa de tu tienda, como un maniquí en la vidriera. Encima de cada prenda va un número: el cliente lo toca, ve qué es y lo compra. Sirve para vender el conjunto entero, no una sola prenda.
            </p>
            {[
              "Subí la foto de alguien vestido con tus productos (botón de arriba a la derecha).",
              "Tocá “📍 Marcar productos” y después tocá la foto encima de cada prenda.",
              "En cada número elegí qué producto es.",
            ].map((paso, i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                <span style={{ flexShrink:0, width:26, height:26, borderRadius:999, display:"grid", placeItems:"center", background:G, color:accentText, fontSize:12.5, fontWeight:800 }}>{i + 1}</span>
                <span style={{ fontSize:14, lineHeight:1.5, color:T, paddingTop:3 }}>{paso}</span>
              </div>
            ))}
            <p style={{ margin:"12px 0 0", fontSize:13, color:"#b45309", fontWeight:700 }}>No se muestra en la tienda hasta que subas una foto.</p>
            <EditableImageButton field="lookbook1" label="Subir la foto del look" />
          </div>
        )}

        {/* ── El título, los looks y la lista numerada ── */}
        {look && (
          <div style={{ minWidth:0, padding: isMobile ? "0 8px 8px" : "30px 34px 24px 0" }}>
            <p style={{ margin:"0 0 10px", fontSize:11.5, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:G }}>
              <EditableZone field="lookbookKicker" label="Etiqueta del look">Lookbook</EditableZone>
            </p>
            <h2 style={{ fontSize: isMobile ? 21 : 28, fontWeight:800, letterSpacing:"-0.8px", color:T, margin:0, lineHeight:1.12, textTransform:"uppercase" }}>
              <EditableZone field="lookbookTitulo" label="Título del look">Comprá el look</EditableZone>
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 15, color:T2, margin:"10px 0 0", lineHeight:1.55, maxWidth:440 }}>
              <EditableZone field="lookbookTexto" label="Texto del look">Tocá los números de la foto para ver cada prenda.</EditableZone>
            </p>

            {/* Los looks: pastillas con su miniatura. */}
            {(looks.length > 1 || huecoLibre > 0) && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:20 }}>
                {looks.map((l, i) => {
                  const activo = i === indice;
                  return (
                    <button key={l.n} type="button" onClick={() => cambiarLook(i)} aria-pressed={activo}
                      style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"4px 14px 4px 4px", borderRadius:999, cursor:"pointer", fontFamily:"inherit",
                        fontSize:13, fontWeight:700, background: activo ? T : S, color: activo ? S : T, border:`1px solid ${activo ? T : LN}`, transition:"background .2s, color .2s" }}>
                      <span aria-hidden style={{ width:30, height:30, borderRadius:999, background:`${LN} url(${l.url}) center/cover` }} />
                      Look {i + 1}
                    </button>
                  );
                })}
                {huecoLibre > 0 && (
                  <div style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:6, padding:"0 48px 0 16px", minHeight:40, borderRadius:999,
                    border:`1.5px dashed ${LN}`, color:T2, fontSize:13, fontWeight:700 }}>
                    + Sumar look
                    <EditableImageButton field={`lookbook${huecoLibre}`} label={`Foto del look ${huecoLibre}`} compact />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: isMobile ? 18 : 26, borderTop:`1px solid ${LN}` }}>
              {enEsteLook.length > 0 ? enEsteLook.map((p, i) => {
                const resaltado = p.id === abiertoId;
                return (
                  <div key={p.id} role="button" tabIndex={0} onClick={() => onAbrir(p)}
                    onKeyDown={e => { if (e.key === "Enter") onAbrir(p); }}
                    className="ai-look-fila"
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 4px", borderBottom:`1px solid ${LN}`, cursor:"pointer", color:T }}>
                    <span aria-hidden style={{ flexShrink:0, width:26, height:26, borderRadius:999, display:"grid", placeItems:"center", fontSize:12.5, fontWeight:800,
                      background: resaltado ? G : "rgba(20,22,26,0.06)", color: resaltado ? accentText : T, transition:"background .2s, color .2s" }}>{i + 1}</span>
                    <div style={{ width:52, height:64, flexShrink:0, borderRadius:10, background:`${LN} url(${p.images[0]}) center/cover` }} />
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:"0 0 4px", fontSize:14.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:800, color: ocultarPrecios ? T2 : T }}>{precio(p)}</p>
                    </div>
                    <span style={{ flexShrink:0, fontSize:13, fontWeight:700, color:G, whiteSpace:"nowrap" }}>Ver <span aria-hidden>→</span></span>
                  </div>
                );
              }) : (
                <p style={{ margin:"16px 0 0", fontSize:14, lineHeight:1.6, color:T2 }}>
                  {editMode ? "Todavía no marcaste productos en este look: tocá “📍 Marcar productos” sobre la foto." : "Consultanos por las prendas de este look."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
