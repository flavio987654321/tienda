"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { EditableZone, EditableImageButton, textoSobre, getReadableAccentText } from "@/contexts/EditContext";
import { useLookbook, MAX_PUNTOS } from "@/components/store/templates/shared/useLookbook";

/* ══════════════════════════════════════════════════════════════════════════
   COMPRÁ EL LOOK (el lookbook de Chic Paris)
   ══════════════════════════════════════════════════════════════════════════

   Lo que hace es lo de todos (`shared/useLookbook`); el dibujo es de Chic:
   una página de revista de moda. La foto va con PASPARTÚ (un marco blanco
   ancho, como una lámina) y debajo su epígrafe en cursiva: "Look 1 — tres
   prendas". Las marcas son círculos blancos con el número en Playfair
   cursiva del acento. Al lado, "En este look" con las prendas y su precio, y
   "Ver" subrayado en el acento. Los looks se cambian con "Look 1 · Look 2".

   La tarjeta del producto tocado va abajo de la foto, a lo ancho, y se cierra
   tocando la foto; los botones del editor van debajo, no encima (encima
   tapaban las marcas de abajo en el celular). Sin fotos no existe. */

const PLAYFAIR = "'Playfair Display', Georgia, serif";
const ANCHO_FOTO = "min(calc(min(70vh, 620px) * 0.8), 48%)";
const PALABRAS = ["", "una prenda", "dos prendas", "tres prendas", "cuatro prendas", "cinco prendas", "seis prendas"];

export function LookbookChic({
  products, promotions, imagenes, fmt, ocultarPrecios, onAbrir,
  fondo, tinta, suave, acento, ACC, isMobile, children,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct) => void;
  fondo: string; tinta: string; suave: string;
  /** El acento como texto sobre `fondo`. */
  acento: string;
  /** El acento tal cual (los números de las marcas van sobre blanco). */
  ACC: string;
  isMobile: boolean;
  children?: React.ReactNode;
}) {
  const {
    editMode, existe, looks, indice, look, huecoLibre, cambiarLook,
    puntos, puntosVisibles, enEsteLook, sinProducto, porId, elegibles,
    marcando, alternarMarcar, marcar, elegirProducto, borrarPunto,
    puntoAbierto, setPuntoAbierto, prodAbierto, precio,
  } = useLookbook({ products, promotions, imagenes, fmt, ocultarPrecios });

  if (!existe) return null;

  const numeroDe = (id: string) => enEsteLook.findIndex(p => p.id === id) + 1;
  const abiertoId = prodAbierto?.id;
  const linea = `color-mix(in srgb, ${tinta} 12%, transparent)`;
  // El número va sobre blanco: si el acento es muy claro, en tinta.
  const numeroColor = getReadableAccentText(ACC, "#ffffff", "#111");

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #ddd", color:"#111", borderRadius:4,
    padding:"7px 12px", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
  };

  const tarjetaDe = (prod: StorefrontProduct) => (
    <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAbrir(prod); }}
      onKeyDown={e => { if (e.key === "Enter") onAbrir(prod); }}
      style={{ position:"relative", pointerEvents:"auto", width:"100%", maxWidth:330, boxSizing:"border-box", display:"flex", alignItems:"center", gap:12,
        padding:8, paddingRight:16, cursor:"pointer", background:"rgba(255,255,255,0.97)", borderRadius:4, boxShadow:"0 12px 30px rgba(0,0,0,0.18)", color:"#111" }}>
      <div style={{ width:42, height:56, flexShrink:0, borderRadius:2, background:`#f5f5f5 url(${prod.images[0]}) center/cover` }} />
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.name}</p>
        <p style={{ margin:0, fontSize:13 }}>{precio(prod)}</p>
      </div>
      <span style={{ flexShrink:0, fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:15, color:numeroColor }}>Ver →</span>
    </div>
  );

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "52px 16px" : "88px 40px", borderTop:"1px solid #f0f0f0" }}>
      {children}
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom: isMobile ? 30 : 48 }}>
          <p style={{ fontSize:10, letterSpacing:4, color:acento, textTransform:"uppercase", fontWeight:700, margin:"0 0 8px" }}>
            <EditableZone field="lookbookKicker" label="Etiqueta del look">Lookbook</EditableZone>
          </p>
          <h2 style={{ fontFamily:PLAYFAIR, fontSize:"clamp(28px,3.4vw,44px)", fontWeight:300, fontStyle:"italic", margin:0, color:tinta }}>
            <EditableZone field="lookbookTitulo" label="Título del look">Comprá el look</EditableZone>
          </h2>
        </div>

        <div style={{ display:"grid", gap: isMobile ? 28 : 64, alignItems:"center", justifyContent:"center",
          gridTemplateColumns: isMobile || !look ? "minmax(0,1fr)" : `minmax(0,${ANCHO_FOTO}) minmax(0,420px)` }}>

          {look ? (
            <figure style={{ position:"relative", minWidth:0, margin:0 }}>
              <EditableImageButton field={`lookbook${look.n}`} label={`Foto del look ${look.n}`} />
              {/* El paspartú: el marco blanco ancho, como una lámina. */}
              <div style={{ background:"#fff", padding: isMobile ? 10 : 14, boxShadow:"0 18px 50px rgba(0,0,0,0.08)" }}>
                <div key={look.n} onClick={e => { if (marcando) marcar(e); else setPuntoAbierto(null); }}
                  style={{ position:"relative", aspectRatio:"4/5", width:"100%", overflow:"hidden", background:"#f0ebe5",
                    outline: marcando ? `1px dashed ${ACC}` : "none", outlineOffset:-8, cursor: marcando ? "crosshair" : "default" }}>
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
                            background:"transparent", border:"none", cursor:"pointer", padding:0, display:"grid", placeItems:"center" }}>
                          <span aria-hidden style={{ width:28, height:28, borderRadius:999, display:"grid", placeItems:"center",
                            background: !prod ? "#f59e0b" : resaltado ? ACC : "rgba(255,255,255,0.95)", color: !prod ? "#111" : resaltado ? textoSobre(ACC) : numeroColor,
                            fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:14, fontWeight:500, boxShadow:"0 0 0 4px rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.2)",
                            transform: resaltado ? "scale(1.12)" : "none", transition:"transform .25s, background .25s" }}>
                            {prod ? numeroDe(prod.id) : "?"}
                          </span>
                        </button>

                        {editMode && marcando && (
                          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:5 }}>
                            <select value={pt.id} aria-label={`Producto del punto ${i + 1}`} onChange={e => elegirProducto(i, e.target.value)}
                              style={{ background:"#fff", color:"#111", border:`1px solid ${pt.id ? "#ccc" : "#f59e0b"}`, borderRadius:4, padding:"5px 8px", fontSize:11, maxWidth:160, cursor:"pointer",
                                boxShadow:"0 4px 12px rgba(0,0,0,0.15)", fontFamily:"inherit" }}>
                              <option value="" style={{ color:"#111", background:"#fff" }}>Elegí el producto…</option>
                              {elegibles.map(p => <option key={p.id} value={p.id} style={{ color:"#111", background:"#fff" }}>{p.name}</option>)}
                            </select>
                            <button type="button" onClick={() => borrarPunto(i)} aria-label="Borrar el punto"
                              style={{ width:26, height:26, borderRadius:999, border:"none", background:"#c0392b", color:"#fff", cursor:"pointer", fontSize:13, lineHeight:1 }}>×</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ position:"absolute", left:10, right:10, bottom:10, zIndex:6, display:"flex", flexDirection:"column", alignItems:"flex-start", pointerEvents:"none" }}>
                    {prodAbierto && tarjetaDe(prodAbierto)}
                  </div>
                </div>
              </div>
              {/* El epígrafe, como en una revista. */}
              <figcaption style={{ marginTop:12, textAlign:"center", fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:14, color:suave }}>
                Look {indice + 1}{enEsteLook.length > 0 ? ` — ${PALABRAS[enEsteLook.length] ?? `${enEsteLook.length} prendas`}` : ""}
              </figcaption>
              {editMode && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12, justifyContent:"center" }}>
                  <button type="button" onClick={alternarMarcar} style={{ ...chip, ...(marcando ? { background:"#111", color:"#fff", borderColor:"#111" } : null) }}>
                    📍 {marcando ? "Listo" : "Marcar productos"}
                  </button>
                  {marcando && <span style={{ ...chip, cursor:"default", fontWeight:500 }}>Tocá la foto donde está cada prenda ({puntos.length}/{MAX_PUNTOS})</span>}
                  {sinProducto > 0 && (
                    <span style={{ ...chip, cursor:"default", color:"#92400e", borderColor:"#f59e0b" }}>
                      {sinProducto === 1 ? "1 punto" : `${sinProducto} puntos`} sin producto: no se ven en la tienda
                    </span>
                  )}
                </div>
              )}
            </figure>
          ) : (
            /* Sólo en el editor: todavía no hay ninguna foto. */
            <div style={{ position:"relative", maxWidth:620, margin:"0 auto", width:"100%", boxSizing:"border-box", background:"#fff", border:"1px solid #e8e2da",
              padding: isMobile ? "26px 20px" : "38px 42px", color:"#111" }}>
              <p style={{ margin:"0 0 8px", fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:22, fontWeight:400 }}>¿Qué es “Comprá el look”?</p>
              <p style={{ margin:"0 0 22px", fontSize:14, lineHeight:1.7, color:"#555" }}>
                Una foto de alguien vestido con ropa de tu tienda, como un maniquí en la vidriera. Encima de cada prenda va un número: el cliente lo toca, ve qué es y lo compra. Sirve para vender el conjunto entero, no una sola prenda.
              </p>
              {[
                "Subí la foto de alguien vestido con tus productos (botón de arriba a la derecha).",
                "Tocá “📍 Marcar productos” y después tocá la foto encima de cada prenda.",
                "En cada número elegí qué producto es.",
              ].map((paso, i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"baseline", marginBottom:12 }}>
                  <span style={{ flexShrink:0, width:22, fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:17, color:numeroColor }}>{i + 1}</span>
                  <span style={{ fontSize:14, lineHeight:1.55 }}>{paso}</span>
                </div>
              ))}
              <p style={{ margin:"14px 0 0", fontSize:13, color:"#92400e", fontWeight:600 }}>No se muestra en la tienda hasta que subas una foto.</p>
              <EditableImageButton field="lookbook1" label="Subir la foto del look" />
            </div>
          )}

          {look && (
            <div style={{ minWidth:0 }}>
              {(looks.length > 1 || huecoLibre > 0) && (
                <div style={{ display:"flex", gap:20, flexWrap:"wrap", alignItems:"center", marginBottom: isMobile ? 20 : 28, justifyContent: isMobile ? "center" : "flex-start" }}>
                  {looks.map((l, i) => {
                    const activo = i === indice;
                    return (
                      <button key={l.n} type="button" onClick={() => cambiarLook(i)} aria-pressed={activo}
                        style={{ background:"none", border:"none", padding:"0 0 5px", cursor:"pointer", fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:18,
                          color: activo ? tinta : suave, borderBottom:`1px solid ${activo ? acento : "transparent"}`, transition:"color .25s, border-color .25s" }}>
                        Look {i + 1}
                      </button>
                    );
                  })}
                  {huecoLibre > 0 && (
                    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", minHeight:38, padding:"0 46px 0 14px", border:"1px dashed #ccc", borderRadius:4,
                      fontSize:12, fontWeight:600, color:suave }}>
                      + Sumar look
                      <EditableImageButton field={`lookbook${huecoLibre}`} label={`Foto del look ${huecoLibre}`} compact />
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:18, color:tinta, margin:"0 0 10px" }}>En este look</p>
              <div style={{ borderTop:`1px solid ${linea}` }}>
                {enEsteLook.length > 0 ? enEsteLook.map((p, i) => {
                  const resaltado = p.id === abiertoId;
                  return (
                    <div key={p.id} role="button" tabIndex={0} onClick={() => onAbrir(p)}
                      onKeyDown={e => { if (e.key === "Enter") onAbrir(p); }}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:`1px solid ${linea}`, cursor:"pointer", color:tinta }}>
                      <span aria-hidden style={{ flexShrink:0, width:20, fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:17, color: resaltado ? acento : suave, transition:"color .25s" }}>{i + 1}</span>
                      <div style={{ width:54, height:72, flexShrink:0, borderRadius:2, background:`#f5f5f5 url(${p.images[0]}) center/cover` }} />
                      <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ margin:"0 0 4px", fontSize:14, fontWeight:600, lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</p>
                        <p style={{ margin:0, fontSize:14, color: ocultarPrecios ? suave : tinta }}>{precio(p)}</p>
                      </div>
                      <span style={{ flexShrink:0, fontSize:12.5, fontWeight:600, color:acento, textDecoration:"underline", textUnderlineOffset:4 }}>Ver</span>
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
