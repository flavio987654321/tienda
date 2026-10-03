"use client";
import { useMemo, useRef } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { opcionesVisibles, esOpcionDeColor } from "@/lib/opciones";
import { colorToSwatch } from "@/lib/colorSwatch";
import { EditableZone, useEditContext } from "@/contexts/EditContext";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { Inclinable } from "@/components/store/templates/shared/Materia";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCTO EN FOCO (B-2 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   UN producto, enorme: la foto en un marco de vidrio que se inclina, una luz
   que sigue al mouse por toda la escena, y al costado lo que hace falta para
   decidir —precio (con su promo), qué talles y colores hay, cuántas reseñas—
   en paneles de vidrio.

   "Ver y comprar" abre la FICHA de Aurora, que vuela desde la foto grande
   (`data-foto`). No se compra acá adentro a propósito: elegir talle y color,
   el stock por combinación y el 3×2 viven en la ficha, y copiarlos acá sería
   una segunda versión que se queda atrás el día que cambie la primera.

   La dueña elige el producto en el editor (override `productoFoco`). Sin
   elegir, el más visto; sin vistas todavía, el último que entró. */

const LARGO_RESUMEN = 170;

/** El texto plano de la descripción, cortado en una palabra. */
function resumen(html: string): string {
  const texto = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (texto.length <= LARGO_RESUMEN) return texto;
  const corte = texto.slice(0, LARGO_RESUMEN);
  return corte.slice(0, corte.lastIndexOf(" ")) + "…";
}

export function ProductoEnFoco({
  products, promotions, fmt, ocultarPrecios, favorites, onFavorito, onAbrir, escena, isMobile, rebaja, tachado,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  favorites: string[];
  onFavorito: (id: string) => void;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  escena: EscenaCatalogo;
  isMobile: boolean;
  rebaja: string;
  tachado: string;
}) {
  const { BG, T, G, GT, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const { editMode, overrides, setOverride, vistaCelular } = useEditContext();
  const escenaRef = useRef<HTMLElement>(null);
  /** La pieza grande: de acá sale el vuelo de la ficha, toque lo que se toque. */
  const piezaRef = useRef<HTMLDivElement>(null);

  const conFoto = useMemo(() => products.filter(p => p.images[0]), [products]);
  const elegido = overrides["productoFoco"]?.text;
  const producto = conFoto.find(p => p.id === elegido)
    ?? [...conFoto].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))[0];
  if (!producto) return null;

  const promo = resolveProductPromo(producto, promotions);
  const opciones = opcionesVisibles(producto.opciones).filter(o => o.tipo === "elegir");
  const favorito = favorites.includes(producto.id);
  const texto = producto.description ? resumen(producto.description) : "";

  /* La luz sigue al mouse. Va por variables CSS escritas directo en el nodo y
     no por estado de React: mover el mouse dispara decenas de eventos por
     segundo y cada uno sería un render. En el celular no hay mouse: la luz
     queda en su lugar y respira sola (ver la animación de abajo). */
  const moverLuz = (e: React.MouseEvent) => {
    const el = escenaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--au-luz-x", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--au-luz-y", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const panel: React.CSSProperties = {
    background:"rgba(255,255,255,0.045)", backdropFilter:"blur(16px) saturate(140%)", WebkitBackdropFilter:"blur(16px) saturate(140%)",
    border:`1px solid ${LINEA_FUERTE}`, borderRadius:16, padding:"14px 16px",
  };

  return (
    <section ref={escenaRef} data-reveal onMouseMove={isMobile ? undefined : moverLuz}
      style={{ position:"relative", overflow:"hidden", background:BG, ["--au-luz-x" as string]:"30%", ["--au-luz-y" as string]:"40%" }}>
      <style>{`
        @keyframes au-luz-respira { 0%,100% { opacity:.75; transform:scale(1) } 50% { opacity:1; transform:scale(1.08) } }
        @media (prefers-reduced-motion: reduce) { .au-luz-foco { animation:none !important } }
      `}</style>
      {/* La luz: un halo del acento que se mueve con el mouse. */}
      <div aria-hidden className="au-luz-foco" style={{ position:"absolute", inset:"-20%", pointerEvents:"none",
        background:`radial-gradient(30% 34% at var(--au-luz-x) var(--au-luz-y), ${luz(0.34)}, transparent 70%)`,
        transition:"background .15s linear", animation: isMobile ? "au-luz-respira 6s ease-in-out infinite" : undefined }} />

      {editMode && !vistaCelular && (
        <label style={{ position:"absolute", top:16, left:16, zIndex:6, display:"flex", alignItems:"center", gap:8, background:"rgba(14,15,26,0.85)", backdropFilter:"blur(14px)", border:`1px solid ${LINEA_FUERTE}`, color:T, borderRadius:999, padding:"6px 8px 6px 14px", fontSize:11, letterSpacing:1, fontWeight:600 }}>
          🔦 Producto
          <select value={producto.id} onChange={e => setOverride("productoFoco", { text: e.target.value })}
            style={{ background:"rgba(0,0,0,.35)", color:T, border:"1px solid rgba(255,255,255,.2)", borderRadius:999, padding:"5px 10px", fontSize:11, cursor:"pointer", maxWidth:220 }}>
            {conFoto.map(p => <option key={p.id} value={p.id} style={{ color:"#111" }}>{p.name}</option>)}
          </select>
        </label>
      )}

      <div style={{ position:"relative", maxWidth:1240, margin:"0 auto", padding: isMobile ? "60px 20px 52px" : "110px 40px",
        display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)", gap: isMobile ? 34 : 70, alignItems:"center" }}>

        {/* ── La pieza ── */}
        <div style={{ perspective:"1400px", maxWidth: isMobile ? 420 : 520, width:"100%", margin:"0 auto" }}>
          <Inclinable grados={7} style={{ borderRadius:26 }}>
            <div ref={piezaRef} onClick={e => onAbrir(producto, e)}
              style={{ position:"relative", borderRadius:26, overflow:"hidden", cursor:"pointer", border:`1px solid ${LINEA_FUERTE}`,
                boxShadow:`0 40px 90px rgba(0,0,0,0.6), 0 0 80px ${luz(0.22)}` }}>
              <div data-foto style={{ position:"relative", aspectRatio:"4/5", background:"#0e0f1a" }}>
                <FadeImage src={producto.images[0]} alt={producto.name} fill sizes="(max-width: 768px) 90vw, 520px" style={{ objectFit:"cover" }} />
              </div>
              {promo.primaryPromo && (
                <span style={{ position:"absolute", top:16, left:16, background:G, color:textoSobreAcento, borderRadius:999, padding:"6px 12px", fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", boxShadow:`0 0 24px ${luz(0.5)}` }}>
                  {describePromo(promo.primaryPromo).headline}
                </span>
              )}
            </div>
          </Inclinable>
        </div>

        {/* ── Lo que hace falta para decidir ── */}
        <div style={{ minWidth:0 }}>
          <p style={{ margin:"0 0 16px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="productoFocoKicker" label="Etiqueta del producto en foco">Producto en foco</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 18px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.05,
            fontSize: isMobile ? "clamp(30px,9vw,42px)" : "clamp(34px,4vw,60px)", color:T, overflowWrap:"break-word" }}>
            {producto.name}
          </h2>
          <div style={{ display:"flex", alignItems:"baseline", gap:14, flexWrap:"wrap", marginBottom: texto ? 18 : 26 }}>
            {ocultarPrecios ? (
              <span style={{ fontSize:24, fontWeight:600, color:GT }}>Consultá precio</span>
            ) : promo.hasPriceDrop ? (
              <>
                <span style={{ fontFamily:TITULO, fontSize:30, fontWeight:400, color:rebaja }}>{fmt(promo.effectivePrice)}</span>
                <span style={{ fontSize:16, color:tachado, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</span>
              </>
            ) : (
              <>
                <span style={{ fontFamily:TITULO, fontSize:30, fontWeight:400, color:T }}>{fmt(producto.price)}</span>
                {producto.comparePrice && producto.comparePrice > producto.price && <span style={{ fontSize:16, color:tachado, textDecoration:"line-through" }}>{fmt(producto.comparePrice)}</span>}
              </>
            )}
          </div>
          {texto && <p style={{ margin:"0 0 26px", fontSize:14, lineHeight:1.75, color:"rgba(242,242,247,0.66)", maxWidth:480 }}>{texto}</p>}

          {/* Paneles de vidrio: talles, colores y reseñas, de un vistazo. */}
          {(opciones.length > 0 || (producto.reviewCount ?? 0) > 0) && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))", gap:10, marginBottom:30, maxWidth:520 }}>
              {opciones.map(op => op.tipo === "elegir" && (
                <div key={op.nombre} style={panel}>
                  <p style={{ margin:"0 0 10px", fontSize:9.5, letterSpacing:2.5, textTransform:"uppercase", opacity:0.55 }}>{op.nombre}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {esOpcionDeColor(op.nombre)
                      ? op.valores.slice(0, 8).map(v => (
                          <span key={v} title={v} style={{ width:18, height:18, borderRadius:"50%", background:colorToSwatch(v) ?? "#777", border:"1px solid rgba(255,255,255,0.3)" }} />
                        ))
                      : op.valores.slice(0, 8).map(v => (
                          <span key={v} style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:8, border:`1px solid ${LINEA_FUERTE}`, color:T }}>{v}</span>
                        ))}
                    {op.valores.length > 8 && <span style={{ fontSize:11, opacity:0.5, alignSelf:"center" }}>+{op.valores.length - 8}</span>}
                  </div>
                </div>
              ))}
              {(producto.reviewCount ?? 0) > 0 && (
                <div style={panel}>
                  <p style={{ margin:"0 0 8px", fontSize:9.5, letterSpacing:2.5, textTransform:"uppercase", opacity:0.55 }}>Reseñas</p>
                  <p style={{ margin:0, fontSize:13 }}>
                    <span style={{ color:GT, fontWeight:700 }}>★ {(producto.rating ?? 0).toFixed(1)}</span>
                    <span style={{ opacity:0.6 }}> · {producto.reviewCount} {producto.reviewCount === 1 ? "opinión" : "opiniones"}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            {/* La ficha busca la foto de la que sale adentro de `currentTarget`;
                el botón no la tiene, así que se le pasa la pieza grande. Así vuela
                desde la foto aunque se toque el botón. */}
            <button onClick={e => onAbrir(producto, { ...e, currentTarget: piezaRef.current ?? e.currentTarget } as React.MouseEvent)}
              style={{ background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"15px 34px", fontSize:11, letterSpacing:2.5, fontWeight:700, textTransform:"uppercase", cursor:"pointer", boxShadow:`0 0 36px ${luz(0.5)}` }}>
              <EditableZone field="productoFocoCta" label="Botón del producto en foco">Ver y comprar</EditableZone>
            </button>
            <button onClick={() => onFavorito(producto.id)} aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              style={{ width:48, height:48, borderRadius:999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background: favorito ? luz(0.18) : "rgba(255,255,255,0.05)", border:`1px solid ${favorito ? luz(0.55) : LINEA_FUERTE}`, color:T }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill={favorito ? G : "none"} stroke={favorito ? GT : T} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
