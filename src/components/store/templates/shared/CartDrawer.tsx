"use client";
import { FadeImage } from "./FadeImage";
import type { useCartLogic } from "@/hooks/useCartLogic";
import { promoSavingsLabel } from "@/lib/promoLabel";

// Un solo componente de carrito reutilizado por todos los templates de un mismo
// tipo de negocio (hoy: Electro Prime, Tech Nova, Home Studio, Casa Clara) — así
// si hay que arreglar algo del carrito, se arregla en un solo lugar y se ve
// reflejado en los 4 a la vez, en vez de mantener 4 copias que se desincronizan.
export type CartTheme = {
  BG: string;
  S: string;
  T: string;
  MID: string;
  border: string;
  accent: string;
  // Color de texto a usar arriba de un fondo pintado con `accent` (calculado
  // con getContrastColor del lado del template, que sabe qué color elegiste).
  accentText: string;
  serif?: string;
};

export function CartDrawer({
  cart, theme, isOwner, isPreview, whatsapp,
}: {
  cart: ReturnType<typeof useCartLogic>;
  theme: CartTheme;
  isOwner: boolean;
  isPreview: boolean;
  whatsapp?: { enabled: boolean; number: string; message?: string };
}) {
  const { BG, T, MID, border, accent, accentText, serif } = theme;
  const {
    cartItems, cartOpen, setCartOpen, cartCount, cartTotal, removeFromCart, updateQty,
    openCheckout, fmt, wholesaleWarnings, pricedLines, cartPromoSavings, freeShipping, freeShippingGoal,
  } = cart;
  const blockBuy = isOwner || isPreview;

  // pricedLines viene del hook (una sola cuenta, la misma que el checkout que cobra):
  // ya trae la promo por producto Y las de tienda aplicadas, en el mismo orden que
  // cartItems. Acá solo se dibuja — no se recalcula nada.

  return (
    <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : 150, pointerEvents: cartOpen ? "auto" : "none" }}>
      <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.55)", opacity: cartOpen ? 1 : 0, transition:"opacity 0.3s" }} />
      <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"min(420px, 100vw)", background:BG, transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid ${border}` }}>
        <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid ${border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <p style={{ fontFamily: serif ?? "inherit", fontSize:18, margin:0, color:T }}>Tu carrito <span style={{ fontSize:13, color:MID }}>({cartCount})</span></p>
          <button onClick={() => setCartOpen(false)} aria-label="Cerrar carrito" style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", opacity:0.4 }}>
              <p style={{ fontSize:36, marginBottom:12 }}>🛒</p>
              <p style={{ fontSize:13, lineHeight:1.8, color:T }}>Tu carrito está vacío.<br/>Explorá el catálogo.</p>
            </div>
          ) : cartItems.map((item, idx) => (
            <div key={idx} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid ${border}` }}>
              {(() => {
                const colorSrc = item.color
                  ? item.product.imageItems.find(img => img.variantValue && img.variantValue.toLowerCase() === item.color.toLowerCase())?.url
                  : null;
                const src = colorSrc ?? item.product.images[0];
                return src
                  ? <FadeImage src={src} alt="" width={70} height={70} style={{ objectFit:"cover", flexShrink:0, borderRadius:6 }} />
                  : <div style={{ width:70, height:70, flexShrink:0, borderRadius:6, background:"#f0f0f0" }} />;
              })()}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500, color:T }}>{item.product.name}</p>
                {(item.size || item.color) && (
                  <p style={{ fontSize:11, opacity:0.6, margin:"0 0 10px", color:T }}>
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}` }}>
                    <button onClick={() => updateQty(idx, -1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>−</button>
                    <span style={{ width:24, textAlign:"center", fontSize:13, color:T }}>{item.qty}</span>
                    <button onClick={() => updateQty(idx, 1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>+</button>
                  </div>
                  {pricedLines[idx]?.promoApplied ? (
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:11, color:MID, textDecoration:"line-through", display:"block", lineHeight:1.3 }}>
                        {fmt(pricedLines[idx].lineTotal + pricedLines[idx].savings)}
                      </span>
                      <span style={{ color:accent, fontWeight:700, fontSize:14 }}>
                        {fmt(pricedLines[idx].lineTotal)}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color:accent, fontWeight:700, fontSize:14 }}>{fmt(pricedLines[idx]?.lineTotal ?? 0)}</span>
                  )}
                </div>
              </div>
              <button onClick={() => removeFromCart(idx)} aria-label="Quitar del carrito" style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:18, alignSelf:"flex-start" }}>×</button>
            </div>
          ))}
        </div>
        {cartItems.length > 0 && (() => {
          // El ahorro ya lo sumó el motor (Σ savings de la promo por producto Y de tienda).
          const promoSavings = cartPromoSavings;
          return (
          <div style={{ padding:"16px 24px 28px", borderTop:`1px solid ${border}`, flexShrink:0 }}>
            {/* Envío gratis en vivo: empujón hacia el umbral, o confirmación si ya llegó. */}
            {freeShippingGoal ? (
              <div style={{ marginBottom:14, padding:"10px 12px", background:"rgba(13,148,136,0.10)", border:"1px solid rgba(13,148,136,0.28)", borderRadius:8 }}>
                <p style={{ fontSize:12.5, margin:0, color:"#0d9488", fontWeight:700 }}>🚚 Agregá {fmt(freeShippingGoal.remaining)} más y el envío es gratis</p>
              </div>
            ) : freeShipping ? (
              <div style={{ marginBottom:14, padding:"10px 12px", background:"rgba(22,163,74,0.10)", border:"1px solid rgba(22,163,74,0.28)", borderRadius:8 }}>
                <p style={{ fontSize:12.5, margin:0, color:"#16a34a", fontWeight:700 }}>🎉 ¡Tenés envío gratis!</p>
              </div>
            ) : null}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, opacity:0.6, letterSpacing:1, textTransform:"uppercase", color:T }}>Subtotal</span>
              <span style={{ fontSize:11, opacity:0.6, color:T }}>{cartCount} {cartCount === 1 ? "producto" : "productos"}</span>
            </div>
            {promoSavings > 0.01 && (() => {
              // Etiqueta de la promo por producto (3×2, % off) si la hay; si el ahorro
              // viene solo de una promo de tienda, un texto genérico.
              const pi = cartItems.find(i => i.discountPct && i.discountPct > 0);
              const label = pi ? promoSavingsLabel(pi.product.promoType, pi.product.promoQtyMin, pi.product.promoPayQty, pi.discountPct) : "Promoción aplicada";
              return (
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>-{fmt(promoSavings)}</span>
                </div>
              );
            })()}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:13, opacity:0.7, color:T }}>Total</span>
              <span style={{ fontSize:22, fontWeight:700, color:accent }}>{fmt(cartTotal)}</span>
            </div>
            {wholesaleWarnings.length > 0 && (
              <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(234,179,8,0.1)", borderLeft:"3px solid #eab308", borderRadius:"0 6px 6px 0" }}>
                <p style={{ fontSize:11, margin:0, color:"#eab308", fontWeight:600 }}>Cantidad mínima no alcanzada</p>
                {wholesaleWarnings.map((item, i) => (
                  <p key={i} style={{ fontSize:10, margin:"4px 0 0", color:T, opacity:0.7 }}>
                    {item.product.name}: mín. {item.product.cantMinMayorista} uds.
                  </p>
                ))}
              </div>
            )}
            <button onClick={blockBuy ? undefined : openCheckout} disabled={blockBuy}
              title={isOwner ? "No podés comprar en tu propia tienda" : isPreview ? "No disponible en modo edición" : undefined}
              style={{ width:"100%", background: blockBuy ? `${accent}40` : accent, color: blockBuy ? `${accentText}80` : accentText, border:"none", padding:"15px", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor: blockBuy ? "not-allowed" : "pointer", marginBottom:10 }}>
              {isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : "Finalizar compra"}
            </button>
            <button onClick={() => setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid ${border}`, padding:"12px", fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
              Seguir comprando
            </button>
            {whatsapp?.enabled && whatsapp.number && (
              <a href={`https://wa.me/${whatsapp.number.replace(/\D/g, "")}${whatsapp.message ? "?text=" + encodeURIComponent(whatsapp.message) : ""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:10, marginTop:14, padding:"11px 14px", background:"rgba(37,211,102,0.08)", borderRadius:6, textDecoration:"none" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink:0 }}><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
                <div>
                  <p style={{ fontSize:10, margin:0, color:T, opacity:0.6 }}>¿TENÉS DUDAS?</p>
                  <p style={{ fontSize:12, margin:0, color:"#25D366", fontWeight:600 }}>Consultá por WhatsApp</p>
                </div>
              </a>
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
