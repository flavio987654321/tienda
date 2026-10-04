"use client";
import { useMemo, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo } from "@/lib/promoDisplay";
import { EditableZone, EditableImageButton, useEditContext } from "@/contexts/EditContext";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   LOOKBOOK (B-7 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Looks completos, comprables desde la foto. Cada look es una foto grande en
   un marco de vidrio con puntos de luz encima de cada prenda: se toca un punto
   y aparece la tarjeta del producto (abre la ficha, que vuela desde su foto).
   Al costado, la lista "En este look" con todo lo que tiene puesto —en el
   celular, debajo—, porque un punto es chico para el dedo y la lista no.
   Se cambia de look con las miniaturas, y el nuevo llega desde el fondo.

   Lo arma la dueña en el editor:
   - hasta MAX_LOOKS fotos (`lookbook1`…, con el botón de imagen de siempre);
   - "📍 Marcar productos": toca la foto donde está cada prenda y elige cuál es.
     Los puntos se guardan por look en el override `lookbookPuntos<n>` como
     JSON [{ id, x, y }] con x/y en % de la foto, así valen en cualquier ancho.

   Sin ninguna foto, en la tienda no existe. */

export const MAX_LOOKS = 3;
const MAX_PUNTOS = 6;

type Punto = { id: string; x: number; y: number };

function leerPuntos(texto: string | undefined): Punto[] {
  try {
    const crudo = JSON.parse(texto ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo
      .filter(p => p && typeof p.id === "string" && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(p => ({ id: p.id, x: Math.max(0, Math.min(100, p.x)), y: Math.max(0, Math.min(100, p.y)) }))
      .slice(0, MAX_PUNTOS);
  } catch { return []; }
}

/** El ancho de la columna de la foto en compu: lo que le da 72% del alto de la
 *  pantalla (tope 640px) en 4/5, y nunca más de 55% del ancho, para que en
 *  tablet quede lugar para "En este look". */
const ANCHO_FOTO = "min(calc(min(72vh, 640px) * 0.8), 55%)";

export function LookbookAurora({ products, promotions, imagenes, fmt, ocultarPrecios, onAbrir, escena, isMobile }: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  /** Las fotos de cada look (`lookbook1`…), en orden; `undefined` donde no hay. */
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, G, GT, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const { editMode, overrides, setOverride } = useEditContext();
  const [elegido, setElegido] = useState(0);
  const [puntoAbierto, setPuntoAbierto] = useState<number | null>(null);
  const [marcando, setMarcando] = useState(false);

  const porId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  /* Los looks que existen: los que tienen foto. En el editor se suma el
     siguiente hueco vacío, para poder subir uno más. */
  const looks = imagenes.map((url, i) => ({ n: i + 1, url })).filter(l => !!l.url);
  /* El "+" para sumar otro look aparece recién cuando ya hay uno: sin ninguno,
     repetía lo mismo que el botón grande de la foto y confundía (04/10/26). */
  const huecoLibre = editMode && looks.length > 0 && looks.length < MAX_LOOKS ? imagenes.findIndex(u => !u) + 1 : 0;

  if (looks.length === 0 && !editMode) return null;

  const indice = Math.min(elegido, Math.max(0, looks.length - 1));
  const look = looks[indice] ?? null;
  const campoPuntos = look ? `lookbookPuntos${look.n}` : "";
  const puntos = look ? leerPuntos(overrides[campoPuntos]?.text) : [];
  // En la tienda sólo cuentan los puntos con un producto que existe todavía.
  const puntosVisibles = editMode ? puntos : puntos.filter(p => porId.has(p.id));
  const enEsteLook = [...new Set(puntosVisibles.map(p => p.id))].map(id => porId.get(id)).filter((p): p is StorefrontProduct => !!p);

  const guardar = (lista: Punto[]) => setOverride(campoPuntos, { text: JSON.stringify(lista.map(p => ({ id: p.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))) });
  const marcar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!marcando || puntos.length >= MAX_PUNTOS) return;
    const r = e.currentTarget.getBoundingClientRect();
    guardar([...puntos, { id: "", x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }]);
  };
  const precio = (p: StorefrontProduct) => {
    if (ocultarPrecios) return "Consultá precio";
    const pr = resolveProductPromo(p, promotions);
    return fmt(pr.hasPriceDrop ? pr.effectivePrice : p.price);
  };
  const cambiarLook = (i: number) => { setElegido(i); setPuntoAbierto(null); };
  /** La tarjeta del producto de un punto: abre la ficha, que vuela desde su foto. */
  const tarjetaDe = (prod: StorefrontProduct, lugar: React.CSSProperties) => (
    <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onAbrir(prod, e); }}
      onKeyDown={e => { if (e.key === "Enter") onAbrir(prod, e as unknown as React.MouseEvent); }}
      style={{ ...lugar, zIndex:5, display:"flex", alignItems:"center", gap:10, padding:8, paddingRight:12, borderRadius:16, cursor:"pointer",
        background:"rgba(10,11,20,0.8)", border:`1px solid ${luz(0.45)}`, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
        boxShadow:`0 20px 40px rgba(0,0,0,0.5), 0 0 30px ${luz(0.25)}`, color:T }}>
      <div data-foto style={{ width:46, height:58, flexShrink:0, borderRadius:10, backgroundImage:`url(${prod.images[0]})`, backgroundSize:"cover", backgroundPosition:"center" }} />
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:"0 0 4px", fontSize:12.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.name}</p>
        <p style={{ margin:0, fontSize:13, fontWeight:600, color:GT }}>{precio(prod)} →</p>
      </div>
    </div>
  );
  const prodAbierto = puntoAbierto !== null && !marcando ? porId.get(puntosVisibles[puntoAbierto]?.id ?? "") : undefined;

  const chip: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", gap:6, background:"rgba(14,15,26,0.9)", backdropFilter:"blur(14px)", border:`1px solid ${LINEA_FUERTE}`,
    color:T, borderRadius:999, padding:"7px 13px", fontSize:11, fontWeight:600, cursor:"pointer",
  };

  return (
    <section data-reveal className="au-lookbook" style={{ position:"relative", overflow:"hidden", background:BG, padding: isMobile ? "60px 16px" : "110px 40px" }}>
      <style>{`
        @keyframes au-pulso { 0% { transform: translate(-50%,-50%) scale(1); opacity: .7 } 100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0 } }
        @keyframes au-look-llega { from { opacity: 0; transform: translateZ(-160px) scale(.94); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } }
        @media (prefers-reduced-motion: reduce) { .au-lookbook .au-onda { animation: none !important; opacity: 0 } .au-lookbook .au-look { animation: none !important } }
      `}</style>
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(45% 55% at 30% 45%, ${luz(0.16)}, transparent 70%)` }} />

      <div style={{ position:"relative", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom: isMobile ? 26 : 44, maxWidth:620 }}>
          <p style={{ margin:"0 0 14px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="lookbookKicker" label="Etiqueta del lookbook">Lookbook</EditableZone>
          </p>
          <h2 style={{ margin:0, fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.08, color:T,
            fontSize: isMobile ? "clamp(28px,8vw,36px)" : "clamp(32px,3.6vw,52px)" }}>
            <EditableZone field="lookbookTitulo" label="Título del lookbook">Armado para vos</EditableZone>
          </h2>
        </div>

        <div style={{ display:"grid", gap: isMobile ? 22 : 48, alignItems:"start",
          gridTemplateColumns: isMobile || !look ? "minmax(0,1fr)" : `minmax(0,${ANCHO_FOTO}) minmax(0,1fr)`, ...(look ? null : { maxWidth:640 }) }}>
          {/* ── La foto del look, con sus puntos ── */}
          <div style={{ perspective:"1400px" }}>
            {look ? (
              /* Alto tope: a lo ancho de la columna la foto medía ~800px y no
                 entraba en la pantalla (Flavio, 04/10/26). Se achica el ANCHO de la
                 columna (ANCHO_FOTO) y no el alto: sigue en 4/5 y los puntos
                 (en %) no se corren. */
              <div key={look.n} className="au-look" onClick={marcar}
                style={{ position:"relative", aspectRatio:"4/5", width:"100%",
                  borderRadius: isMobile ? 22 : 28, overflow:"hidden", background:"#0e0f1a",
                  border:`1px solid ${marcando ? luz(0.8) : LINEA_FUERTE}`, cursor: marcando ? "crosshair" : "default",
                  boxShadow:`0 40px 90px rgba(0,0,0,0.55), 0 0 70px ${luz(0.18)}`, animation:"au-look-llega .7s cubic-bezier(.16,.84,.32,1) both" }}>
                <div aria-hidden style={{ position:"absolute", inset:0, backgroundImage:`url(${look.url})`, backgroundSize:"cover", backgroundPosition:"center" }} />
                <div aria-hidden style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(6,7,13,0.45), transparent 40%)", pointerEvents:"none" }} />

                {puntosVisibles.map((pt, i) => {
                  const prod = porId.get(pt.id);
                  const abierto = puntoAbierto === i && !!prod && !marcando;
                  // La tarjeta se abre hacia el lado donde hay lugar, y para arriba si el punto está abajo.
                  const haciaIzq = pt.x > 55;
                  const haciaArriba = pt.y > 72;
                  return (
                    <div key={i} style={{ position:"absolute", left:`${pt.x}%`, top:`${pt.y}%`, zIndex: abierto ? 4 : 3 }}>
                      <button type="button" aria-label={prod ? `Ver ${prod.name}` : "Punto sin producto"}
                        onClick={e => { e.stopPropagation(); if (!marcando) setPuntoAbierto(abierto ? null : i); }}
                        style={{ position:"absolute", left:0, top:0, transform:"translate(-50%,-50%)", width:44, height:44, borderRadius:999,
                          background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
                        <span aria-hidden className="au-onda" style={{ position:"absolute", left:"50%", top:"50%", width:18, height:18, borderRadius:999,
                          border:`2px solid ${luz(0.9)}`, animation:"au-pulso 2s ease-out infinite" }} />
                        <span aria-hidden style={{ position:"absolute", left:"50%", top:"50%", width:18, height:18, transform:"translate(-50%,-50%)", borderRadius:999,
                          background: prod ? G : "#fbbf24", border:"2px solid rgba(255,255,255,0.9)", boxShadow:`0 0 18px ${luz(0.9)}` }} />
                      </button>

                      {/* En la compu la tarjeta sale al lado del punto; en el celular va abajo
                          de la foto, a lo ancho (ver más abajo): al lado del punto no entraba. */}
                      {abierto && prod && !isMobile && tarjetaDe(prod, { position:"absolute", ...(haciaArriba ? { bottom:26 } : { top:26 }), ...(haciaIzq ? { right:-14 } : { left:-14 }), width:230 })}

                      {/* En el editor, con "Marcar productos": a qué producto apunta y borrarlo. */}
                      {editMode && marcando && (
                        <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:24, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:5 }}>
                          <select value={pt.id} aria-label={`Producto del punto ${i + 1}`}
                            onChange={e => guardar(puntos.map((q, j) => j === i ? { ...q, id: e.target.value } : q))}
                            style={{ background:"rgba(14,15,26,0.95)", color:T, border:`1px solid ${LINEA_FUERTE}`, borderRadius:999, padding:"4px 8px", fontSize:10.5, maxWidth:150, cursor:"pointer" }}>
                            <option value="" style={{ color:"#f2f2f7", background:"#14151f" }}>Elegí el producto…</option>
                            {products.filter(p => p.images[0]).map(p => <option key={p.id} value={p.id} style={{ color:"#f2f2f7", background:"#14151f" }}>{p.name}</option>)}
                          </select>
                          <button type="button" onClick={() => guardar(puntos.filter((_, j) => j !== i))} aria-label="Borrar el punto"
                            style={{ width:24, height:24, borderRadius:999, border:"none", background:"#ef4444", color:"#fff", cursor:"pointer", fontSize:12, lineHeight:1 }}>×</button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isMobile && prodAbierto && tarjetaDe(prodAbierto, { position:"absolute", left:12, right:12, bottom: editMode ? 58 : 12 })}
                <EditableImageButton field={`lookbook${look.n}`} label={`Foto del look ${look.n}`} />
                {editMode && (
                  <div style={{ position:"absolute", left:12, bottom:12, zIndex:6, display:"flex", gap:8, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => { setMarcando(m => !m); setPuntoAbierto(null); }}
                      style={{ ...chip, ...(marcando ? { background:G, color:textoSobreAcento, border:"none" } : null) }}>
                      📍 {marcando ? "Listo" : "Marcar productos"}
                    </button>
                    {marcando && <span style={{ ...chip, cursor:"default", fontWeight:500 }}>Tocá la foto donde está cada prenda ({puntos.length}/{MAX_PUNTOS})</span>}
                    {/* Un punto sin producto no se muestra en la tienda: se avisa
                        en el momento, también con "Marcar" cerrado. */}
                    {puntos.some(pt => !porId.has(pt.id)) && (
                      <span style={{ ...chip, cursor:"default", fontWeight:600, color:"#fbbf24", borderColor:"rgba(251,191,36,0.5)" }}>
                        {puntos.filter(pt => !porId.has(pt.id)).length === 1 ? "1 punto" : `${puntos.filter(pt => !porId.has(pt.id)).length} puntos`} sin producto: no se ven en la tienda
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Sólo en el editor: todavía no hay ninguna foto. Explica QUÉ es y
                 para qué sirve, porque "lookbook" no lo entiende cualquiera, y
                 los tres pasos para armarlo. */
              <div style={{ position:"relative", minHeight:360, borderRadius:28, border:`1px dashed ${luz(0.55)}`, display:"flex", flexDirection:"column", justifyContent:"center",
                padding: isMobile ? "26px 20px" : "40px 36px", color:T, fontFamily:"system-ui, -apple-system, sans-serif", background:"rgba(255,255,255,0.025)" }}>
                <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:700 }}>¿Qué es un lookbook?</p>
                <p style={{ margin:"0 0 22px", fontSize:13, lineHeight:1.6, color:"rgba(242,242,247,0.78)" }}>
                  Una foto de un look completo con ropa de tu tienda. Encima de cada prenda va un punto de luz: el cliente lo toca, ve qué es y lo compra. Sirve para vender el conjunto entero, no una sola prenda.
                </p>
                {[
                  "Subí la foto de alguien vestido con tus productos (botón de arriba a la derecha).",
                  "Tocá “📍 Marcar productos” y después tocá la foto encima de cada prenda.",
                  "En cada punto elegí qué producto es.",
                ].map((paso, i) => (
                  <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                    <span style={{ flexShrink:0, width:24, height:24, borderRadius:999, display:"grid", placeItems:"center", background:G, color:textoSobreAcento, fontSize:12, fontWeight:800 }}>{i + 1}</span>
                    <span style={{ fontSize:13, lineHeight:1.55, color:"rgba(242,242,247,0.85)", paddingTop:2 }}>{paso}</span>
                  </div>
                ))}
                <p style={{ margin:"12px 0 0", fontSize:12, color:"#fbbf24", fontWeight:600 }}>No se muestra en la tienda hasta que subas una foto.</p>
                <EditableImageButton field="lookbook1" label="Subir la foto del look" />
              </div>
            )}
          </div>

          {/* ── Los looks y lo que tiene puesto el elegido ──
              Sin ninguna foto todavía no hay look del que hablar: la columna
              decía "no marcaste productos en este look" y confundía. */}
          {look && <div style={{ minWidth:0 }}>
            {(looks.length > 1 || huecoLibre > 0) && (
              <div style={{ display:"flex", gap:12, marginBottom: isMobile ? 22 : 34, flexWrap:"wrap" }}>
                {looks.map((l, i) => (
                  <button key={l.n} type="button" onClick={() => cambiarLook(i)} aria-pressed={i === indice} aria-label={`Look ${String(i + 1).padStart(2, "0")}`}
                    style={{ position:"relative", width: isMobile ? 64 : 78, aspectRatio:"4/5", padding:0, borderRadius:14, overflow:"hidden", cursor:"pointer",
                      border:`1.5px solid ${i === indice ? G : "rgba(255,255,255,.16)"}`, opacity: i === indice ? 1 : 0.55,
                      boxShadow: i === indice ? `0 0 24px ${luz(0.5)}` : "none", background:"#0e0f1a", transition:"opacity .3s, box-shadow .3s, border-color .3s" }}>
                    <span aria-hidden style={{ position:"absolute", inset:0, backgroundImage:`url(${l.url})`, backgroundSize:"cover", backgroundPosition:"center" }} />
                    <span style={{ position:"absolute", left:0, right:0, bottom:0, padding:"10px 0 5px", fontSize:9, letterSpacing:1.5, fontWeight:700, color:"#fff",
                      background:"linear-gradient(to top, rgba(0,0,0,.7), transparent)" }}>{String(i + 1).padStart(2, "0")}</span>
                  </button>
                ))}
                {huecoLibre > 0 && (
                  <div style={{ position:"relative", width: isMobile ? 64 : 78, aspectRatio:"4/5", borderRadius:14, border:`1px dashed ${luz(0.5)}`,
                    display:"grid", placeItems:"center", color:"rgba(242,242,247,0.68)", fontSize:22 }}>
                    +
                    <EditableImageButton field={`lookbook${huecoLibre}`} label={`Foto del look ${huecoLibre}`} compact />
                  </div>
                )}
              </div>
            )}

            <p style={{ margin:"0 0 14px", fontSize:10, letterSpacing:4, textTransform:"uppercase", color:"rgba(242,242,247,0.68)", fontWeight:700 }}>
              En este look
            </p>
            {enEsteLook.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {enEsteLook.map(p => (
                  <div key={p.id} role="button" tabIndex={0} onClick={e => onAbrir(p, e)}
                    onKeyDown={e => { if (e.key === "Enter") onAbrir(p, e as unknown as React.MouseEvent); }}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:10, paddingRight:16, borderRadius:18, cursor:"pointer", color:T,
                      background:"rgba(255,255,255,0.04)", border:`1px solid ${LINEA_FUERTE}` }}>
                    <div data-foto style={{ width:54, height:68, flexShrink:0, borderRadius:12, backgroundImage:`url(${p.images[0]})`, backgroundSize:"cover", backgroundPosition:"center" }} />
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:"0 0 5px", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:600, color: ocultarPrecios ? GT : T }}>{precio(p)}</p>
                    </div>
                    <span aria-hidden style={{ width:34, height:34, borderRadius:999, flexShrink:0, display:"grid", placeItems:"center", border:`1px solid ${luz(0.5)}`, color:GT }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin:0, fontSize:13, lineHeight:1.6, color:"rgba(242,242,247,0.68)" }}>
                {editMode ? "Todavía no marcaste productos en este look: tocá \"📍 Marcar productos\" sobre la foto." : "Consultanos por las prendas de este look."}
              </p>
            )}
          </div>}
        </div>
      </div>
    </section>
  );
}
