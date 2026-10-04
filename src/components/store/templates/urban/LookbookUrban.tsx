"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { EditableZone, EditableImageButton, textoSobre } from "@/contexts/EditContext";
import { useLookbook, MAX_PUNTOS } from "@/components/store/templates/shared/useLookbook";

/* ══════════════════════════════════════════════════════════════════════════
   COMPRÁ EL LOOK (el lookbook de Urban Pulse)
   ══════════════════════════════════════════════════════════════════════════

   Lo que hace es lo de todos (`shared/useLookbook`); el dibujo es de Urban:
   la foto con el borde negro grueso del template y una sombra SÓLIDA del
   acento corrida al costado, como un sticker pegado. Las marcas son
   etiquetas cuadradas negras con el número ("01", "02"…), como las de
   liquidación, y el mismo número encabeza su fila en la lista. Los looks se
   cambian con "LOOK 01 / LOOK 02", el elegido en negro.

   La tarjeta del producto tocado va abajo de la foto, a lo ancho, y se cierra
   tocando la foto; los botones del editor van debajo de la foto, no encima
   (encima tapaban las marcas de abajo en el celular). Sin fotos no existe. */

const dos = (n: number) => String(n).padStart(2, "0");
/** El ancho de la foto en compu: entra entera en la pantalla y sigue en 4/5. */
const ANCHO_FOTO = "min(calc(min(72vh, 620px) * 0.8), 48%)";

export function LookbookUrban({
  products, promotions, imagenes, fmt, ocultarPrecios, onAbrir,
  fondo, tinta, suave, acentoTexto, ACC, acentoSobreNegro, isMobile, ejemplo, children,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct) => void;
  fondo: string; tinta: string; suave: string;
  /** El acento como TEXTO sobre `fondo`. */
  acentoTexto: string;
  /** El acento como relleno (la sombra de la foto). */
  ACC: string;
  /** El acento como texto sobre negro (los números de las etiquetas). */
  acentoSobreNegro: string;
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

  const numeroDe = (id: string) => enEsteLook.findIndex(p => p.id === id) + 1;
  const abiertoId = prodAbierto?.id;
  const NEGRO = "#0f0f0f";
  const sombra = isMobile ? 7 : 12;

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:`2px solid ${NEGRO}`, color:NEGRO,
    padding:"7px 12px", fontSize:10.5, fontWeight:900, letterSpacing:1, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
  };

  const tarjetaDe = (prod: StorefrontProduct) => (
    <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAbrir(prod); }}
      onKeyDown={e => { if (e.key === "Enter") onAbrir(prod); }}
      style={{ position:"relative", pointerEvents:"auto", width:"100%", maxWidth:340, boxSizing:"border-box", display:"flex", alignItems:"center", gap:12,
        padding:8, paddingRight:14, cursor:"pointer", background:"#fff", border:`3px solid ${NEGRO}`, color:NEGRO }}>
      <div style={{ width:44, height:58, flexShrink:0, background:`#eee url(${prod.images[0]}) center/cover` }} />
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:"0 0 4px", fontSize:11.5, fontWeight:900, textTransform:"uppercase", letterSpacing:0.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.name}</p>
        <p style={{ margin:0, fontSize:13, fontWeight:900 }}>{precio(prod)}</p>
      </div>
      <span style={{ flexShrink:0, background:NEGRO, color:"#fff", padding:"8px 10px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase" }}>Ver →</span>
    </div>
  );

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "48px 16px" : "80px 40px", borderTop:`3px solid ${tinta}` }}>
      {children}
      {/* Abajo de 1024 el botón de cada fila es sólo la flecha: con "VER →" el nombre
          del producto quedaba en "CAMPER…" en tablet y celular. */}
      <style>{`@media (hover: hover) { .up-look-fila { transition: background .15s } .up-look-fila:hover { background: color-mix(in srgb, ${tinta} 5%, transparent) } }
        @media (max-width: 1023px) { .up-look-ver { display: none } }`}</style>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom: isMobile ? 26 : 40 }}>
          <p style={{ fontSize:9, letterSpacing:5, color:acentoTexto, textTransform:"uppercase", fontWeight:900, margin:"0 0 8px" }}>
            <EditableZone field="lookbookKicker" label="Etiqueta del look">Lookbook</EditableZone>
          </p>
          <h2 style={{ fontSize:"clamp(32px,4vw,44px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-1px", margin:0, color:tinta }}>
            <EditableZone field="lookbookTitulo" label="Título del look">Comprá el look</EditableZone>
          </h2>
        </div>

        <div style={{ display:"grid", gap: isMobile ? 30 : 56, alignItems:"start",
          gridTemplateColumns: isMobile || !look ? "minmax(0,1fr)" : `minmax(0,${ANCHO_FOTO}) minmax(0,1fr)` }}>

          {look ? (
            <div style={{ position:"relative", minWidth:0, paddingRight:sombra }}>
              <div key={look.n} onClick={e => { if (marcando) marcar(e); else setPuntoAbierto(null); }}
                style={{ position:"relative", aspectRatio:"4/5", width:"100%", overflow:"hidden", background:"#ddd", border:`3px solid ${NEGRO}`,
                  boxShadow:`${sombra}px ${sombra}px 0 ${ACC}`, boxSizing:"border-box", cursor: marcando ? "crosshair" : "default",
                  outline: marcando ? `3px dashed ${NEGRO}` : "none", outlineOffset:4 }}>
                <div aria-hidden style={{ position:"absolute", inset:0, background:`url(${look.url}) center/cover` }} />

                {puntosVisibles.map((pt, i) => {
                  const prod = porId.get(pt.id);
                  const abierto = puntoAbierto === i && !!prod && !marcando;
                  const resaltado = !!prod && prod.id === abiertoId;
                  return (
                    <div key={i} style={{ position:"absolute", left:`${pt.x}%`, top:`${pt.y}%`, zIndex: abierto ? 4 : 3 }}>
                      <button type="button" aria-label={prod ? `Ver ${prod.name}` : "Punto sin producto"}
                        onClick={e => { e.stopPropagation(); if (!marcando) setPuntoAbierto(abierto ? null : i); }}
                        style={{ position:"absolute", left:0, top:0, transform:"translate(-50%,-50%)", minWidth:44, height:44, background:"transparent",
                          border:"none", cursor:"pointer", padding:0, display:"grid", placeItems:"center" }}>
                        {/* La etiqueta: cuadrada, negra, con el número en el acento. */}
                        <span aria-hidden style={{ display:"grid", placeItems:"center", minWidth:30, height:26, padding:"0 5px", boxSizing:"border-box",
                          background: !prod ? "#f59e0b" : resaltado ? ACC : NEGRO, color: !prod ? NEGRO : resaltado ? textoSobre(ACC) : acentoSobreNegro,
                          border:`2px solid ${resaltado ? NEGRO : "#fff"}`, fontSize:11.5, fontWeight:900, letterSpacing:0.5,
                          boxShadow:"3px 3px 0 rgba(0,0,0,0.35)", transform: resaltado ? "rotate(-4deg) scale(1.1)" : "none", transition:"transform .2s, background .2s" }}>
                          {prod ? dos(numeroDe(prod.id)) : "?"}
                        </span>
                      </button>

                      {editMode && marcando && (
                        <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:5 }}>
                          <select value={pt.id} aria-label={`Producto del punto ${i + 1}`} onChange={e => elegirProducto(i, e.target.value)}
                            style={{ background:"#fff", color:NEGRO, border:`2px solid ${pt.id ? NEGRO : "#f59e0b"}`, padding:"4px 6px", fontSize:11, fontWeight:700, maxWidth:160, cursor:"pointer", fontFamily:"inherit" }}>
                            <option value="" style={{ color:NEGRO, background:"#fff" }}>Elegí el producto…</option>
                            {elegibles.map(p => <option key={p.id} value={p.id} style={{ color:NEGRO, background:"#fff" }}>{p.name}</option>)}
                          </select>
                          <button type="button" onClick={() => borrarPunto(i)} aria-label="Borrar el punto"
                            style={{ width:26, height:26, border:`2px solid ${NEGRO}`, background:"#e63329", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:900, lineHeight:1 }}>×</button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <EditableImageButton field={`lookbook${look.n}`} label={`Foto del look ${look.n}`} />
                <div style={{ position:"absolute", left:10, right:10, bottom:10, zIndex:6, display:"flex", flexDirection:"column", alignItems:"flex-start", pointerEvents:"none" }}>
                  {prodAbierto && tarjetaDe(prodAbierto)}
                </div>
              </div>
              {editMode && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop: sombra + 10 }}>
                  <button type="button" onClick={alternarMarcar} style={{ ...chip, ...(marcando ? { background:NEGRO, color:"#fff" } : null) }}>
                    📍 {marcando ? "Listo" : "Marcar productos"}
                  </button>
                  {marcando && <span style={{ ...chip, cursor:"default", fontWeight:700, textTransform:"none", letterSpacing:0 }}>Tocá la foto donde está cada prenda ({puntos.length}/{MAX_PUNTOS})</span>}
                  {sinProducto > 0 && (
                    <span style={{ ...chip, cursor:"default", color:"#92400e", borderColor:"#f59e0b", textTransform:"none", letterSpacing:0 }}>
                      {sinProducto === 1 ? "1 punto" : `${sinProducto} puntos`} sin producto: no se ven en la tienda
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Sólo en el editor: todavía no hay ninguna foto. */
            <div style={{ position:"relative", maxWidth:640, border:`3px dashed ${tinta}`, padding: isMobile ? "24px 18px" : "34px 36px", color:tinta }}>
              <p style={{ margin:"0 0 8px", fontSize:18, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.5px" }}>¿Qué es “Comprá el look”?</p>
              <p style={{ margin:"0 0 20px", fontSize:14, lineHeight:1.65, color:suave }}>
                Una foto de alguien vestido con ropa de tu tienda, como un maniquí en la vidriera. Encima de cada prenda va una etiqueta con un número: el cliente la toca, ve qué es y lo compra. Sirve para vender el conjunto entero, no una sola prenda.
              </p>
              {[
                "Subí la foto de alguien vestido con tus productos (botón de arriba a la derecha).",
                "Tocá “📍 Marcar productos” y después tocá la foto encima de cada prenda.",
                "En cada etiqueta elegí qué producto es.",
              ].map((paso, i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                  <span style={{ flexShrink:0, minWidth:30, height:24, display:"grid", placeItems:"center", background:NEGRO, color:acentoSobreNegro, fontSize:11, fontWeight:900 }}>{dos(i + 1)}</span>
                  <span style={{ fontSize:14, lineHeight:1.5, paddingTop:2 }}>{paso}</span>
                </div>
              ))}
              <p style={{ margin:"12px 0 0", fontSize:13, color:"#b45309", fontWeight:900 }}>No se muestra en la tienda hasta que subas una foto.</p>
              <EditableImageButton field="lookbook1" label="Subir la foto del look" />
            </div>
          )}

          {look && (
            <div style={{ minWidth:0 }}>
              {(looks.length > 1 || huecoLibre > 0) && (
                <div style={{ display:"flex", gap:0, flexWrap:"wrap", marginBottom: isMobile ? 20 : 28 }}>
                  {looks.map((l, i) => {
                    const activo = i === indice;
                    return (
                      <button key={l.n} type="button" onClick={() => cambiarLook(i)} aria-pressed={activo}
                        style={{ padding:"11px 18px", fontSize:11, fontWeight:900, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                          background: activo ? tinta : "transparent", color: activo ? textoSobre(tinta) : tinta, border:`2px solid ${tinta}`, marginLeft: i ? -2 : 0 }}>
                        Look {dos(i + 1)}
                      </button>
                    );
                  })}
                  {huecoLibre > 0 && (
                    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", padding:"0 46px 0 14px", minHeight:42, marginLeft:10,
                      border:`2px dashed ${tinta}`, fontSize:10.5, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:suave }}>
                      + Sumar look
                      <EditableImageButton field={`lookbook${huecoLibre}`} label={`Foto del look ${huecoLibre}`} compact />
                    </div>
                  )}
                </div>
              )}

              <div style={{ borderTop:`3px solid ${tinta}` }}>
                {enEsteLook.length > 0 ? enEsteLook.map((p, i) => {
                  const resaltado = p.id === abiertoId;
                  return (
                    <div key={p.id} role="button" tabIndex={0} className="up-look-fila" onClick={() => onAbrir(p)}
                      onKeyDown={e => { if (e.key === "Enter") onAbrir(p); }}
                      style={{ display:"flex", alignItems:"center", gap: isMobile ? 12 : 16, padding:"14px 0", borderBottom:`2px solid ${tinta}`, cursor:"pointer", color:tinta }}>
                      <span aria-hidden style={{ flexShrink:0, width: isMobile ? 34 : 44, fontSize: isMobile ? 20 : 26, fontWeight:900, letterSpacing:"-1px",
                        color: resaltado ? acentoTexto : tinta, transition:"color .2s" }}>{dos(i + 1)}</span>
                      <div style={{ width:54, height:70, flexShrink:0, background:`#ddd url(${p.images[0]}) center/cover`, border:`2px solid ${NEGRO}` }} />
                      <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ margin:"0 0 5px", fontSize:12.5, fontWeight:900, textTransform:"uppercase", letterSpacing:0.5, lineHeight:1.25, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:14, fontWeight:900, color: ocultarPrecios ? suave : tinta }}>{precio(p)}</p>
                      </div>
                      <span style={{ flexShrink:0, background:tinta, color:textoSobre(tinta), padding:"10px 12px", fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", whiteSpace:"nowrap" }}><span className="up-look-ver">Ver </span>→</span>
                    </div>
                  );
                }) : (
                  <p style={{ margin:"16px 0 0", fontSize:14, lineHeight:1.65, color:suave }}>
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
