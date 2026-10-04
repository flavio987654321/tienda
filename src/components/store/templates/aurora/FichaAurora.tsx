"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import type { useCartLogic } from "@/hooks/useCartLogic";
import { useResenasProducto, type ResenaProducto } from "@/hooks/useResenasProducto";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { useTurnstile } from "@/components/Turnstile";
import { opcionesVisibles, esOpcionDeColor, valoresElegidos } from "@/lib/opciones";
import { colorToSwatch } from "@/lib/colorSwatch";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { discountPercent } from "@/lib/discount";
import { PromoTag, PromoBlock } from "@/components/store/PromoDisplay";
import { OfferBadge } from "@/components/store/OfferBadge";
import StoreProductReels from "@/components/store/ProductReels";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { MS_IDA } from "@/components/store/templates/shared/vueloDeFicha";
import { TarjetaAurora, type TintaTarjeta } from "@/components/store/templates/aurora/TarjetaAurora";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   LA FICHA DE AURORA
   ══════════════════════════════════════════════════════════════════════════

   Hasta el 03/10/26 la ficha era la de todos los templates con la paleta de
   Aurora: foto a la izquierda, datos a la derecha, talles en cuadraditos y
   botones rectos. Flavio: "el modal es siempre el mismo que los otros". Es lo
   que más se ve —se abre desde la portada, los dos bloques en foco y el
   catálogo— así que es lo que más tenía que ser de Aurora.

   Lo que cambia es la cara:
     · El fondo es el producto: su foto difuminada y teñida con la luz.
     · La foto en un marco redondeado, con flechas de vidrio y miniaturas que
       se encienden.
     · Talles en cápsulas que se encienden; colores en esferas con su color
       real y un anillo de luz en la elegida.
     · Cantidad y "Agregar" en una sola fila de vidrio; en el celular, una
       barra de vidrio fija abajo.
     · Detalles y reseñas en paneles; el formulario de reseña se despliega
       cuando se pide.
     · "También te puede gustar" con las mismas piezas de la portada.

   La LÓGICA es la de siempre y no se toca: opciones, stock por combinación,
   promos y 3×2 salen de `useCartLogic`; las reseñas, de `useResenasProducto`.
   El vuelo desde la tarjeta lo maneja Aurora con `fichaRef` y `fotoFichaRef`:
   la foto mantiene la proporción 3/4 de la tarjeta para que la escala del
   vuelo sea una sola. */

/* Las reseñas de EJEMPLO, para el editor. Nunca se publican: el hook las
   muestra sólo con `isPreview`, y son propias de este template. */
const RESENAS_EJEMPLO: ResenaProducto[] = [
  { id:"au-ej-1", rating:5, comment:"La caída de la tela es impecable y el negro es negro de verdad. Lo usé para una boda y me preguntaron de dónde era.", reviewer:"Victoria S.", verified:true,  verifiedBy:"auto",  createdAt:"2026-07-18T14:00:00.000Z" },
  { id:"au-ej-2", rating:5, comment:"Las terminaciones son de otra categoría. Se nota que no es una prenda de producción masiva.", reviewer:"Federico L.", verified:false, verifiedBy:null,   createdAt:"2026-07-11T14:00:00.000Z" },
  { id:"au-ej-3", rating:4, comment:"Hermoso y muy bien embalado. Le saco una estrella porque tardó un par de días más de lo previsto.", reviewer:"Renata M.", verified:true,  verifiedBy:"owner", createdAt:"2026-06-29T14:00:00.000Z" },
];
const PASO_RESENAS = 5;

type Carrito = ReturnType<typeof useCartLogic>;

/* ¿Entra el total adentro del botón de comprar? Con la columna de datos de una
   tablet (768) "Agregar al carrito · $35.900" no entra; ahí el botón dice sólo
   "Agregar al carrito", que el precio ya está grande arriba. */
const ANCHA = "(min-width: 1024px)";
function suscribirAncho(avisar: () => void) {
  const mq = window.matchMedia(ANCHA);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

export function FichaAurora({
  producto, cart, products, promotions, slug, ocultarPrecios, isMobile, isPreview, enEditor, isOwner,
  modoConsulta, isWholesale, hasWA, escena, tinta, rebaja, tachado, apagadoFondo, apagadoTexto,
  fichaRef, fotoFichaRef, panelListo, capa, onCerrar, onAmpliar, onConsultar, onCopiarLink, onWhatsapp,
}: {
  producto: StorefrontProduct;
  cart: Carrito;
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  slug: string | undefined;
  ocultarPrecios: boolean;
  isMobile: boolean;
  isPreview: boolean;
  enEditor: boolean;
  isOwner: boolean;
  /** Consulta en vez de carrito (catálogo sin precios o modo consulta). */
  modoConsulta: boolean;
  isWholesale: boolean;
  hasWA: boolean;
  escena: EscenaCatalogo;
  tinta: TintaTarjeta;
  rebaja: string; tachado: string; apagadoFondo: string; apagadoTexto: string;
  fichaRef: React.RefObject<HTMLDivElement | null>;
  fotoFichaRef: React.RefObject<HTMLDivElement | null>;
  panelListo: boolean;
  capa: number;
  onCerrar: () => void;
  onAmpliar: (src: string) => void;
  onConsultar: (p: StorefrontProduct) => void;
  onCopiarLink: (p: StorefrontProduct) => void;
  onWhatsapp: (p: StorefrontProduct) => void;
}) {
  const { BG, T, G, GT, LINEA, LINEA_FUERTE, luz, textoSobreAcento } = escena;
  const {
    modalImg, setModalImg, seleccion, setOpcion, qty, setQty, selectedVariantStock, sinStock,
    addToCart, modalScrollRef, openModal, favorites, toggleFavorite, fmt,
  } = cart;

  const total = producto.images.length;
  const pantallaAncha = useSyncExternalStore(suscribirAncho, () => window.matchMedia(ANCHA).matches, () => true);
  const imgSwipe = useTouchSwipe(
    () => setModalImg(i => (i + 1) % Math.max(total, 1)),
    () => setModalImg(i => (i - 1 + Math.max(total, 1)) % Math.max(total, 1)),
  );

  /* ── Precio vivo (variante, promo y 3×2) ── */
  const variantPrice = resolveVariantPrice(producto.variants, valoresElegidos(seleccion));
  const precio = variantPrice ?? producto.price;
  const promo = resolveProductPromo({ id: producto.id, price: precio, category: producto.category }, promotions);
  const nxmPaid = promo.nxm ? qty - Math.floor(qty / promo.nxm.n) * (promo.nxm.n - promo.nxm.m) : null;
  const totalAPagar = nxmPaid != null ? nxmPaid * precio : (promo.hasPriceDrop ? promo.effectivePrice : precio) * qty;
  const agotada = selectedVariantStock === 0;
  const favorito = favorites.includes(producto.id);

  const similares = useMemo(() => {
    const otros = products.filter(p => p.id !== producto.id);
    const mismaSub = producto.subcategory ? otros.filter(p => p.subcategory === producto.subcategory) : [];
    const mismaCat = otros.filter(p => p.category === producto.category && !mismaSub.includes(p));
    const resto = otros.filter(p => !mismaSub.includes(p) && !mismaCat.includes(p));
    return [...mismaSub, ...mismaCat, ...resto].filter(p => p.images[0]).slice(0, 4);
  }, [products, producto]);

  /* ── Reseñas ── */
  const resenas = useResenasProducto({ slug, productId: producto.id, paso: PASO_RESENAS, ejemplos: RESENAS_EJEMPLO, isPreview });
  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState({ reviewer: "", rating: 5, comment: "", email: "" });
  const captcha = useTurnstile("review");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [errorResena, setErrorResena] = useState<string | null>(null);
  /** Corta el doble envío en la misma vuelta, antes de que el estado se entere. */
  const enviandoRef = useRef(false);

  /* Otra ficha (desde "También te puede gustar"): formulario limpio. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una interacción (abrir otra ficha), no se puede calcular durante el render
    setListo(false); setFormAbierto(false);
    setForm(p => ({ ...p, rating: 5, comment: "" }));
  }, [producto.id]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner || trampa || enviandoRef.current) return;
    if (!slug || !form.reviewer.trim()) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: producto.id, rating: form.rating, comment: form.comment, reviewer: form.reviewer, buyerEmail: form.email.trim() || undefined, turnstileToken: captcha.token }),
      });
      if (res.ok) {
        const data = await res.json();
        resenas.agregar(data.review);
        setForm({ reviewer: "", rating: 5, comment: "", email: "" });
        setErrorResena(null); setFormAbierto(false);
        setListo(true); setTimeout(() => setListo(false), 4000);
      } else {
        const d = await res.json().catch(() => null);
        setErrorResena(d?.error || "No se pudo publicar tu reseña. Probá de nuevo en un momento.");
      }
    } catch {
      setErrorResena("No se pudo conectar. Revisá tu internet y probá de nuevo.");
    } finally { enviandoRef.current = false; captcha.reset(); setEnviando(false); }
  }

  /* ── Datos técnicos ── */
  const attrs = producto.attributes ?? [];
  const condicion = attrs.find(a => a.key === "Condición");
  const otros = attrs.filter(a => a.key !== "Condición" && a.key !== "Servicios");
  let servicios: string[] = [];
  const serviciosAttr = attrs.find(a => a.key === "Servicios");
  if (serviciosAttr) { try { servicios = Object.entries(JSON.parse(serviciosAttr.value)).filter(([, v]) => v).map(([k]) => k); } catch {} }

  /* ── Piezas de estilo ── */
  const vidrio: React.CSSProperties = {
    background:"rgba(255,255,255,0.04)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:18,
  };
  const rotulo: React.CSSProperties = { margin:"0 0 12px", fontSize:9.5, letterSpacing:3, textTransform:"uppercase", color:"rgba(242,242,247,0.5)", fontWeight:600 };
  const botonRedondo: React.CSSProperties = {
    width:44, height:44, borderRadius:999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
    background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, color:T, flexShrink:0,
    backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
  };
  const capsula = (elegida: boolean, agotadaOp: boolean): React.CSSProperties => ({
    minWidth:48, height:44, padding:"0 16px", borderRadius:999, cursor:"pointer", fontSize:13, fontWeight:600,
    background: elegida ? luz(0.22) : "rgba(255,255,255,0.03)",
    border:`1px solid ${elegida ? G : LINEA_FUERTE}`, color:T,
    boxShadow: elegida ? `0 0 22px ${luz(0.45)}, inset 0 0 12px ${luz(0.25)}` : "none",
    opacity: agotadaOp ? 0.35 : 1, textDecoration: agotadaOp ? "line-through" : "none",
    transition:"background .2s, box-shadow .2s, border-color .2s",
  });
  const botonComprar: React.CSSProperties = {
    flex:"1 1 240px", minHeight:54, borderRadius:999, border:"none", cursor: agotada ? "not-allowed" : "pointer",
    background: agotada ? apagadoFondo : G, color: agotada ? apagadoTexto : textoSobreAcento,
    fontSize: isMobile ? 11 : 11.5, fontWeight:800, letterSpacing: isMobile ? 1.2 : 2.5, textTransform:"uppercase", padding: isMobile ? "0 14px" : "0 22px", whiteSpace:"nowrap",
    boxShadow: agotada ? "none" : `0 0 34px ${luz(0.45)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
  };

  const precioGrande = (tam: number) => ocultarPrecios ? (
    <span style={{ fontFamily:TITULO, fontSize:tam * 0.8, fontWeight:400, color:GT }}>Consultá precio</span>
  ) : promo.hasPriceDrop ? (
    <>
      <span style={{ fontFamily:TITULO, fontSize:tam, fontWeight:400, color:rebaja }}>{fmt(promo.effectivePrice)}</span>
      <span style={{ fontSize:tam * 0.45, color:tachado, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</span>
      {promo.pctOff != null && <span style={{ fontSize:11, fontWeight:800, letterSpacing:1, color:"#4ade80", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", padding:"4px 10px", borderRadius:999 }}>{promo.pctOff}% OFF</span>}
    </>
  ) : (
    <>
      <span style={{ fontFamily:TITULO, fontSize:tam, fontWeight:400, color:T }}>{fmt(precio)}</span>
      {!variantPrice && producto.comparePrice && producto.comparePrice > producto.price && <span style={{ fontSize:tam * 0.45, color:tachado, textDecoration:"line-through" }}>{fmt(producto.comparePrice)}</span>}
    </>
  );

  const cantidad = (
    <div style={{ display:"flex", alignItems:"center", borderRadius:999, border:`1px solid ${LINEA_FUERTE}`, background:"rgba(255,255,255,0.04)", height:54, flexShrink:0 }}>
      <button aria-label="Menos" onClick={() => setQty(q => Math.max(isWholesale && producto.cantMinMayorista ? producto.cantMinMayorista : 1, q - 1))}
        style={{ width:46, height:"100%", background:"none", border:"none", color:T, fontSize:20, cursor:"pointer" }}>−</button>
      <span style={{ minWidth:26, textAlign:"center", fontFamily:TITULO, fontSize:15, fontVariantNumeric:"tabular-nums" }}>{qty}</span>
      <button aria-label="Más" onClick={() => setQty(q => selectedVariantStock !== null ? Math.min(selectedVariantStock, q + 1) : q + 1)}
        style={{ width:46, height:"100%", background:"none", border:"none", color:T, fontSize:20, cursor:"pointer" }}>+</button>
    </div>
  );

  const accion = modoConsulta ? (
    <button onClick={() => onConsultar(producto)} style={{ ...botonComprar, background:G, color:textoSobreAcento, cursor:"pointer", boxShadow:`0 0 34px ${luz(0.45)}` }}>
      Consultar disponibilidad
    </button>
  ) : (
    <button onClick={addToCart} disabled={agotada} style={botonComprar}>
      {agotada ? "Sin stock" : pantallaAncha && !isMobile ? `Agregar al carrito · ${fmt(totalAPagar)}` : "Agregar al carrito"}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={producto.name} onClick={onCerrar}
      style={{ position:"fixed", inset:0, zIndex:capa, display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center" }}>
      {/* ── El fondo es el producto ─────────────────────────────────────
          Su foto, enorme y difuminada, apagada y teñida con la luz. Entra con
          la ficha y no de golpe: si aparece entero en el primer cuadro, tapa
          la tarjeta justo cuando la foto sale de ella y el vuelo no se lee. */}
      <div aria-hidden style={{ position:"absolute", inset:0, overflow:"hidden", opacity: panelListo ? 1 : 0, transition:`opacity ${MS_IDA}ms ease` }}>
        {producto.images[0] && (
          <FadeImage src={producto.images[modalImg] ?? producto.images[0]} alt="" fill sizes="40vw"
            style={{ objectFit:"cover", filter:"blur(60px) saturate(140%)", transform:"scale(1.3)", opacity:0.45 }} />
        )}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(60% 60% at 30% 40%, ${luz(0.22)}, transparent 70%), rgba(4,5,10,0.78)`, backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }} />
      </div>

      <div ref={fichaRef} onClick={e => e.stopPropagation()}
        style={{ position:"relative", width: isMobile ? "100%" : "min(1100px, calc(100% - 48px))", maxHeight: isMobile ? (isPreview ? "100%" : "94vh") : (isPreview ? "100%" : "90vh"),
          display:"flex", flexDirection:"column", overflow:"hidden", color:T,
          background:`linear-gradient(160deg, rgba(22,23,38,0.92), rgba(10,11,20,0.94))`,
          backdropFilter:"blur(30px) saturate(150%)", WebkitBackdropFilter:"blur(30px) saturate(150%)",
          border:`1px solid ${LINEA_FUERTE}`, borderRadius: isMobile ? "26px 26px 0 0" : 28,
          boxShadow:`0 50px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 90px ${luz(0.12)}`, willChange:"transform" }}>

        <button onClick={onCerrar} aria-label="Cerrar"
          style={{ ...botonRedondo, position:"absolute", top:14, right:14, zIndex:10, background:"rgba(6,7,13,0.6)", opacity: panelListo ? 1 : 0, transition:"opacity .3s ease" }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* El ref lo manda arriba `openModal` al abrir otra ficha desde "También
            te puede gustar", que está al final. */}
        <div ref={modalScrollRef} style={{ overflowY:"auto", overscrollBehavior:"contain", flex:1, minHeight:0 }}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.02fr) minmax(0,1fr)", gap: isMobile ? 0 : 8 }}>

            {/* ── LA FOTO ───────────────────────────────────────────── */}
            <div style={{ padding: isMobile ? 10 : 16, position: isMobile ? "relative" : "sticky", top:0, alignSelf:"start" }}>
              <div ref={fotoFichaRef} {...imgSwipe}
                style={{ position:"relative", width:"100%", aspectRatio:"3/4", borderRadius:22, overflow:"hidden", background:"#0e0f1a", boxShadow:`0 30px 60px rgba(0,0,0,0.45)` }}>
                {producto.images[modalImg] && (
                  <FadeImage src={producto.images[modalImg]} alt={producto.name} fill sizes="(max-width: 768px) 100vw, 540px"
                    style={{ objectFit:"cover", cursor:"zoom-in" }} onError={e => { e.currentTarget.style.opacity = "0"; }}
                    onClick={() => onAmpliar(producto.images[modalImg])} />
                )}
                {/* Marco que le deja libre la esquina del ×: el cartel compartido
                    llega al 78% del ancho y una promo larga la pisaba. */}
                <div style={{ position:"absolute", top:0, left:0, right:64, height:"100%", pointerEvents:"none", zIndex:5 }}>
                  {(() => {
                    if (promo.primaryPromo) return <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} />;
                    const hayOferta = !variantPrice && !!producto.comparePrice && producto.comparePrice > producto.price;
                    return hayOferta ? <OfferBadge badge={producto.offerBadge} pct={discountPercent(producto.price, producto.comparePrice)} size="md" /> : null;
                  })()}
                </div>
                {total > 1 && (
                  <>
                    <button onClick={() => setModalImg(i => (i - 1 + total) % total)} aria-label="Imagen anterior"
                      style={{ ...botonRedondo, position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", background:"rgba(6,7,13,0.45)" }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button onClick={() => setModalImg(i => (i + 1) % total)} aria-label="Imagen siguiente"
                      style={{ ...botonRedondo, position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"rgba(6,7,13,0.45)" }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    {/* El contador, en la letra de los títulos. */}
                    <span style={{ position:"absolute", left:14, bottom:14, padding:"6px 12px", borderRadius:999, background:"rgba(6,7,13,0.55)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", border:`1px solid ${LINEA_FUERTE}`, fontFamily:TITULO, fontSize:11, letterSpacing:1, fontVariantNumeric:"tabular-nums" }}>
                      {String(modalImg + 1).padStart(2, "0")} <span style={{ opacity:0.45 }}>/ {String(total).padStart(2, "0")}</span>
                    </span>
                  </>
                )}
              </div>
              {/* Padding con margen negativo: deja lugar al brillo de la miniatura
                  elegida, que el borde de la fila cortaba en un rectángulo. */}
              {total > 1 && (
                <div style={{ display:"flex", gap:8, marginTop:4, overflowX:"auto", scrollbarWidth:"none", padding:"10px 10px 12px", margin:"0 -10px" }}>
                  {producto.images.map((img, i) => (
                    <button key={i} onClick={() => setModalImg(i)} aria-label={`Foto ${i + 1}`}
                      style={{ position:"relative", width:58, height:72, flexShrink:0, borderRadius:12, overflow:"hidden", padding:0, cursor:"pointer", background:"#0e0f1a",
                        border:`1.5px solid ${i === modalImg ? G : "transparent"}`, boxShadow: i === modalImg ? `0 0 16px ${luz(0.5)}` : "none", opacity: i === modalImg ? 1 : 0.55, transition:"opacity .2s" }}>
                      <FadeImage src={img} alt="" fill sizes="58px" style={{ objectFit:"cover" }} onError={e => { e.currentTarget.style.opacity = "0.3"; }} />
                    </button>
                  ))}
                </div>
              )}
              {producto.reelUrls.length > 0 && (
                <div style={{ marginTop:14 }}>
                  <p style={rotulo}>Videos</p>
                  <StoreProductReels reelUrls={producto.reelUrls} theme={{ accent: G, text: T, border: LINEA_FUERTE, radius: 14 }} />
                </div>
              )}
            </div>

            {/* ── LOS DATOS ─────────────────────────────────────────── */}
            <div style={{ padding: isMobile ? "14px 20px 28px" : "44px 40px 36px 24px", display:"flex", flexDirection:"column", gap:24, minWidth:0 }}>
              <div>
                <p style={{ margin:"0 0 12px", fontSize:10, letterSpacing:4, textTransform:"uppercase", color:GT, fontWeight:700 }}>
                  {producto.category}{producto.subcategory && <span style={{ opacity:0.6 }}> · {producto.subcategory}</span>}
                </p>
                <h2 style={{ margin:"0 0 18px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.08, fontSize: isMobile ? 28 : 34, overflowWrap:"break-word", paddingRight: isMobile ? 0 : 40 }}>
                  {producto.name}
                </h2>
                <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>{precioGrande(isMobile ? 28 : 34)}</div>
              </div>

              {promo.primaryPromo && <PromoBlock promo={promo.primaryPromo} freeShippingExtra={promo.freeShipping} />}
              {!ocultarPrecios && producto.offerNote && (
                <p style={{ margin:0, fontSize:12.5, color:"#4ade80", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.22)", borderRadius:14, padding:"9px 14px" }}>✓ {producto.offerNote}</p>
              )}

              {/* ── Opciones ── */}
              {opcionesVisibles(producto.opciones).map(op => {
                if (op.tipo === "dato") return (
                  <p key={op.nombre} style={{ ...rotulo, margin:0 }}>{op.nombre} · <strong style={{ color:T, letterSpacing:1 }}>{op.valor}</strong></p>
                );
                const deColor = esOpcionDeColor(op.nombre);
                return (
                  <div key={op.nombre}>
                    <p style={rotulo}>{op.nombre} · <strong style={{ color:T, letterSpacing:1 }}>{seleccion[op.nombre]}</strong></p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap: deColor ? 12 : 8 }}>
                      {op.valores.map(valor => {
                        const elegida = seleccion[op.nombre] === valor;
                        const sin = sinStock(op.nombre, valor);
                        if (deColor) {
                          const muestra = colorToSwatch(valor);
                          return (
                            /* Una esfera con su color, con brillo arriba como una
                               gota. La elegida lleva un anillo de luz. */
                            <button key={valor} onClick={() => setOpcion(op.nombre, valor)} title={valor} aria-label={valor} aria-pressed={elegida}
                              style={{ width:38, height:38, borderRadius:"50%", cursor:"pointer", padding:0, position:"relative",
                                background: muestra ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 42%), ${muestra}` : "rgba(255,255,255,0.08)",
                                border:"1px solid rgba(255,255,255,0.22)", opacity: sin ? 0.3 : 1,
                                boxShadow: elegida ? `0 0 0 3px ${BG}, 0 0 0 4.5px ${G}, 0 0 22px ${luz(0.6)}` : "0 4px 10px rgba(0,0,0,0.35)",
                                transition:"box-shadow .2s" }}>
                              {!muestra && <span style={{ fontSize:9, color:T }}>{valor.slice(0, 2)}</span>}
                            </button>
                          );
                        }
                        return (
                          <button key={valor} onClick={() => setOpcion(op.nombre, valor)} aria-pressed={elegida} style={capsula(elegida, sin)}>{valor}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Stock y 3×2 ── */}
              {selectedVariantStock !== null && selectedVariantStock > 0 && selectedVariantStock <= 5 && (
                <p style={{ margin:0, fontSize:12.5, color:"#fca5a5", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#f87171", boxShadow:"0 0 10px #f87171" }} />
                  Quedan {selectedVariantStock} {selectedVariantStock === 1 ? "unidad" : "unidades"}
                </p>
              )}
              {agotada && <p style={{ margin:0, fontSize:12.5, opacity:0.55 }}>Sin stock en esta combinación</p>}
              {promo.nxm && nxmPaid != null && (() => {
                const { n, m } = promo.nxm;
                const gratis = qty - nxmPaid;
                const faltan = (n - (qty % n)) % n;
                return (
                  <div style={{ ...vidrio, padding:"12px 14px", borderColor: gratis > 0 ? "rgba(74,222,128,0.35)" : luz(0.35) }}>
                    <p style={{ margin:"0 0 8px", fontSize:12.5, fontWeight:600, color: gratis > 0 ? "#4ade80" : T }}>
                      {gratis > 0 ? `Llevás ${qty}, pagás ${nxmPaid} · ${gratis} gratis` : `Promo ${n}×${m}: sumá ${faltan} y una te sale gratis`}
                    </p>
                    <div style={{ height:3, borderRadius:3, background:LINEA_FUERTE, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${((qty % n) || n) / n * 100}%`, background: gratis > 0 && faltan === 0 ? "#4ade80" : G, boxShadow:`0 0 10px ${luz(0.8)}`, transition:"width .3s" }} />
                    </div>
                  </div>
                );
              })()}

              {/* ── Comprar (en la compu; en el celular va la barra de abajo) ── */}
              {!isMobile && (
                <div style={{ display:"flex", gap:10, alignItems:"stretch", flexWrap:"wrap" }}>
                  {!modoConsulta && cantidad}
                  {accion}
                </div>
              )}

              {/* ── Acciones chicas ── */}
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <button onClick={() => toggleFavorite(producto.id)} aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"} title="Favoritos"
                  style={{ ...botonRedondo, background: favorito ? luz(0.18) : botonRedondo.background, borderColor: favorito ? luz(0.55) : LINEA_FUERTE }}>
                  <svg width={17} height={17} viewBox="0 0 24 24" fill={favorito ? G : "none"} stroke={favorito ? GT : T} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
                <button onClick={() => onCopiarLink(producto)} aria-label="Copiar link" title="Copiar link" style={botonRedondo}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                {hasWA && (
                  <button onClick={() => onWhatsapp(producto)} aria-label="Consultar por WhatsApp" title="Consultar por WhatsApp" style={{ ...botonRedondo, color:"#4ade80", borderColor:"rgba(74,222,128,0.3)" }}>
                    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M11.897 0C5.395 0 .13 5.266.13 11.767c0 2.078.545 4.03 1.495 5.727L.057 24l6.7-1.757A11.71 11.71 0 0 0 11.897 23.534c6.503 0 11.768-5.265 11.768-11.767C23.67 5.266 18.4 0 11.897 0zm0 21.536h-.004a9.726 9.726 0 0 1-4.96-1.358l-.356-.211-3.678.965.982-3.581-.232-.368A9.73 9.73 0 0 1 2.158 11.767C2.158 6.355 6.551 2 11.897 2c2.581 0 5.007 1.007 6.831 2.831a9.604 9.604 0 0 1 2.828 6.83c0 5.347-4.393 9.875-9.659 9.875z"/></svg>
                  </button>
                )}
              </div>

              {/* ── Descripción y datos ── */}
              {producto.description && (
                <div style={{ ...vidrio, padding:"16px 18px" }}>
                  <p style={rotulo}>Descripción</p>
                  <div className="product-rte" dangerouslySetInnerHTML={{ __html: producto.description }} style={{ fontSize:13.5, lineHeight:1.75, color:"rgba(242,242,247,0.72)" }} />
                </div>
              )}
              {(condicion || otros.length > 0 || servicios.length > 0) && (
                <div>
                  <p style={rotulo}>Detalles</p>
                  {condicion && <span style={{ display:"inline-block", marginBottom:10, fontSize:10, letterSpacing:2, textTransform:"uppercase", fontWeight:700, color:GT, border:`1px solid ${luz(0.5)}`, borderRadius:999, padding:"5px 12px" }}>{condicion.value}</span>}
                  {otros.length > 0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:8 }}>
                      {otros.map(a => (
                        <div key={a.key} style={{ ...vidrio, borderRadius:14, padding:"10px 12px" }}>
                          <p style={{ margin:"0 0 4px", fontSize:9, letterSpacing:2, textTransform:"uppercase", opacity:0.5 }}>{a.key}</p>
                          <p style={{ margin:0, fontSize:13, fontWeight:500, overflowWrap:"anywhere" }}>{a.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {servicios.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
                      {servicios.map(k => <span key={k} style={{ fontSize:11, padding:"5px 12px", borderRadius:999, border:`1px solid ${luz(0.35)}`, color:GT }}>✓ {k}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Reseñas ── */}
              <div>
                <p style={rotulo}>Reseñas{resenas.total > 0 && ` · ${resenas.total}`}</p>
                {resenas.usandoEjemplos && enEditor && (
                  <div style={{ display:"flex", gap:9, margin:"0 0 14px", padding:"10px 13px", borderRadius:14, background:"rgba(253,230,138,0.1)", border:"1px solid rgba(253,230,138,0.3)" }}>
                    <span style={{ flexShrink:0 }}>⚠️</span>
                    <p style={{ margin:0, fontSize:11.5, color:"#fde68a", lineHeight:1.55 }}>
                      <strong>Estas reseñas son de ejemplo.</strong> Este producto todavía no tiene ninguna: están para que veas cómo queda el bloque. No se publican y desaparecen solas en cuanto llegue la primera de verdad.
                    </p>
                  </div>
                )}
                {resenas.cargando ? (
                  <p style={{ fontSize:12, opacity:0.45 }}>Cargando…</p>
                ) : resenas.lista.length > 0 ? (
                  <>
                    <div style={{ ...vidrio, display:"flex", gap:20, alignItems:"center", padding:"16px 18px", marginBottom:12 }}>
                      <div style={{ textAlign:"center", minWidth:64 }}>
                        <p style={{ margin:0, fontFamily:TITULO, fontSize:36, fontWeight:400, lineHeight:1, textShadow:`0 0 24px ${luz(0.5)}` }}>{resenas.promedio.toFixed(1)}</p>
                        <p style={{ margin:"6px 0 0", fontSize:11, color:GT, letterSpacing:1 }}>{"★".repeat(Math.round(resenas.promedio))}<span style={{ opacity:0.25 }}>{"★".repeat(5 - Math.round(resenas.promedio))}</span></p>
                      </div>
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                        {[5,4,3,2,1].map(s => {
                          const n = resenas.distribucion[s] ?? 0;
                          return (
                            <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:9.5, opacity:0.55, minWidth:12 }}>{s}</span>
                              <div style={{ flex:1, height:3, background:LINEA_FUERTE, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${resenas.total ? (n / resenas.total) * 100 : 0}%`, background:G, boxShadow:`0 0 8px ${luz(0.8)}` }} />
                              </div>
                              <span style={{ fontSize:9.5, opacity:0.4, minWidth:12, textAlign:"right" }}>{n}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {resenas.lista.slice(0, resenas.mostradas).map(r => (
                        <div key={r.id} style={{ ...vidrio, borderRadius:16, padding:"14px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                              <span style={{ width:30, height:30, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:GT, background:luz(0.15), border:`1px solid ${luz(0.35)}` }}>{r.reviewer.charAt(0).toUpperCase()}</span>
                              <span style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.reviewer}</span>
                              {r.verified && <span style={{ fontSize:9.5, fontWeight:700, color:"#34d399", border:"1px solid rgba(52,211,153,0.3)", borderRadius:999, padding:"2px 8px", flexShrink:0 }}>✓ Verificada</span>}
                            </div>
                            <span style={{ fontSize:11, color:GT, flexShrink:0 }}>{"★".repeat(r.rating)}</span>
                          </div>
                          {r.comment && <p style={{ margin:0, fontSize:12.5, lineHeight:1.65, opacity:0.7 }}>{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                    {resenas.hayMas && (
                      <button onClick={resenas.verMas} disabled={resenas.cargandoMas}
                        style={{ marginTop:10, background:"none", border:`1px solid ${LINEA_FUERTE}`, borderRadius:999, color:T, fontSize:10.5, fontWeight:700, letterSpacing:2, textTransform:"uppercase", padding:"10px 20px", cursor:"pointer" }}>
                        {resenas.cargandoMas ? "Cargando…" : `Ver más (${resenas.faltan})`}
                      </button>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize:12.5, opacity:0.5, margin:"0 0 4px" }}>Todavía no hay reseñas. Sé el primero.</p>
                )}

                {isOwner ? (
                  <p style={{ fontSize:11.5, opacity:0.45, marginTop:12 }}>El dueño no puede dejar reseñas en su propia tienda.</p>
                ) : listo ? (
                  <p style={{ fontSize:12.5, color:GT, fontWeight:600, marginTop:12 }}>¡Gracias por tu reseña!</p>
                ) : !formAbierto ? (
                  <button onClick={() => setFormAbierto(true)}
                    style={{ marginTop:12, background:"rgba(255,255,255,0.04)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:999, color:T, fontSize:10.5, fontWeight:700, letterSpacing:2, textTransform:"uppercase", padding:"11px 20px", cursor:"pointer" }}>
                    ✎ Escribir una reseña
                  </button>
                ) : (
                  <form onSubmit={isPreview ? e => e.preventDefault() : publicar}
                    style={{ ...vidrio, marginTop:12, padding:16, display:"flex", flexDirection:"column", gap:10, opacity: isPreview ? 0.6 : 1 }}>
                    {errorResena && <p style={{ margin:0, fontSize:12, color:"#fca5a5", background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.35)", borderRadius:12, padding:"9px 12px" }}>⚠ {errorResena}</p>}
                    <input value={trampa} onChange={e => setTrampa(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ opacity:0, height:0, position:"absolute", pointerEvents:"none" }} />
                    <div style={{ display:"flex", gap:4 }}>
                      {[1,2,3,4,5].map(s => (
                        <button key={s} type="button" onClick={() => !isPreview && setForm(p => ({ ...p, rating: s }))} aria-label={`${s} estrellas`}
                          style={{ background:"none", border:"none", fontSize:22, cursor: isPreview ? "default" : "pointer", color: s <= form.rating ? G : "rgba(242,242,247,0.2)", padding:2, textShadow: s <= form.rating ? `0 0 12px ${luz(0.7)}` : "none" }}>★</button>
                      ))}
                    </div>
                    {[
                      { k: "reviewer" as const, ph: "Tu nombre", tipo: "text" },
                      { k: "email" as const, ph: "Tu email (opcional, para verificar tu compra)", tipo: "email" },
                    ].map(c => (
                      <input key={c.k} type={c.tipo} value={form[c.k]} placeholder={c.ph} readOnly={isPreview}
                        onChange={e => !isPreview && setForm(p => ({ ...p, [c.k]: e.target.value }))}
                        style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:12, color:T, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit" }} />
                    ))}
                    <textarea value={form.comment} placeholder="Contá qué te pareció (opcional)" rows={3} readOnly={isPreview}
                      onChange={e => !isPreview && setForm(p => ({ ...p, comment: e.target.value }))}
                      style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${LINEA_FUERTE}`, borderRadius:12, color:T, padding:"11px 14px", fontSize:13, resize:"none", outline:"none", fontFamily:"inherit" }} />
                    <p style={{ margin:0, fontSize:10.5, opacity:0.4, lineHeight:1.5 }}>Si compraste en esta tienda, tu reseña sale con el sello &ldquo;Compra verificada&rdquo;. El email no se muestra.</p>
                    {!isPreview && captcha.widget}
                    <button type="submit" disabled={isPreview || enviando || !form.reviewer.trim() || !captcha.ready}
                      style={{ ...botonComprar, minHeight:46, flex:"none",
                        background: isPreview || enviando || !form.reviewer.trim() ? apagadoFondo : G,
                        color: isPreview || enviando || !form.reviewer.trim() ? apagadoTexto : textoSobreAcento,
                        cursor: isPreview ? "default" : "pointer", boxShadow:"none" }}>
                      {enviando ? "Publicando…" : "Publicar reseña"}
                    </button>
                    {isPreview && <p style={{ margin:0, fontSize:10.5, opacity:0.45 }}>Vista previa: sólo se puede opinar en la tienda real.</p>}
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ── También te puede gustar ── */}
          {similares.length > 0 && (
            <div style={{ borderTop:`1px solid ${LINEA}`, padding: isMobile ? "24px 20px 30px" : "30px 40px 40px" }}>
              <p style={{ ...rotulo, marginBottom:18 }}>También te puede gustar</p>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: isMobile ? 10 : 16, perspective:"1200px" }}>
                {similares.map((p, i) => (
                  <TarjetaAurora key={p.id} product={p} indice={i} promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
                    favorito={favorites.includes(p.id)} onFavorito={() => toggleFavorite(p.id)} onAbrir={() => openModal(p)} tinta={tinta} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── La barra de compra del celular ── */}
        {isMobile && (
          <div style={{ flexShrink:0, padding:"12px 14px calc(12px + env(safe-area-inset-bottom))", borderTop:`1px solid ${LINEA_FUERTE}`,
            background:"rgba(10,11,20,0.9)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap:10 }}>
              <span style={{ fontFamily:TITULO, fontSize:20, color: promo.hasPriceDrop ? rebaja : T }}>
                {ocultarPrecios ? "Consultá precio" : fmt(totalAPagar)}
              </span>
              {qty > 1 && !ocultarPrecios && <span style={{ fontSize:11, opacity:0.5 }}>{qty} unidades</span>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {!modoConsulta && cantidad}
              {accion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
