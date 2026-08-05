"use client";
import { FadeImage } from "./FadeImage";
import { getReadableAccentText, getReadableAccentFill, textoSobre } from "@/contexts/EditContext";
import type { useCartLogic } from "@/hooks/useCartLogic";
import { valoresElegidos } from "@/lib/opciones";
import { textoSeleccion } from "@/components/store/shared/cartTypes";

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

// ── Cómo LLAMA cada template a las cosas ─────────────────────────────────────
// El carrito es compartido a propósito (un solo lugar donde arreglar la cuenta),
// pero eso hacía que la voz del template se cortara justo acá. Boho Terra dice
// "piezas" y "Ver pieza" en toda la portada, y al abrir el carrito le aparecía
// "Quitar del carrito · 3 productos": el comprador cambiaba de tienda a mitad de
// la compra.
//
// Es vocabulario, no diseño: lo que se comparte sigue siendo la lógica —el
// mismo motor de precios, la misma cuenta que cobra el checkout— y lo único que
// cada template elige es cómo se llaman las cosas.
//
// Lo que NO entra acá a propósito: los avisos del sistema ("No disponible para
// el dueño", "Solo en la tienda real", el mínimo mayorista). Esos no son la voz
// de la marca, son la app hablando, y tienen que sonar igual en todas.
export type CartVocabulario = {
  titulo: string;
  cerrar: string;
  vacioIcono: string;
  vacio: string;
  vacioSub: string;
  quitar: string;
  /** Cómo se cuentan las unidades: "2 productos", "2 piezas". */
  unidad: string;
  unidades: string;
  finalizar: string;
  seguir: string;
};

const VOCABULARIO_BASE: CartVocabulario = {
  titulo: "Tu carrito",
  cerrar: "Cerrar carrito",
  vacioIcono: "🛒",
  vacio: "Tu carrito está vacío.",
  vacioSub: "Explorá el catálogo.",
  quitar: "Quitar del carrito",
  unidad: "producto",
  unidades: "productos",
  finalizar: "Finalizar compra",
  seguir: "Seguir comprando",
};

export function CartDrawer({
  cart, theme, isOwner, isPreview, whatsapp, zIndex = 150, vocabulario,
}: {
  cart: ReturnType<typeof useCartLogic>;
  theme: CartTheme;
  isOwner: boolean;
  isPreview: boolean;
  whatsapp?: { enabled: boolean; number: string; message?: string };
  /**
   * Palabras propias del template. Es parcial: lo que no se pasa queda con el
   * texto de siempre, así un template puede cambiar sólo "productos" por
   * "piezas" sin tener que reescribir las diez.
   */
  vocabulario?: Partial<CartVocabulario>;
  /**
   * Por encima de qué tiene que quedar el carrito. El 150 de siempre alcanza para
   * los templates cuyo navbar vive en 100/110, pero no es universal: Chic Paris
   * tiene el navbar en 1000 y la barra de anuncios en 1001, así que se dibujaban
   * ENCIMA del carrito y le tapaban el título y el primer producto. Un panel que
   * el comprador abrió siempre gana contra el chrome de la página.
   */
  zIndex?: number;
}) {
  const { BG, T, MID, border, accent, accentText, serif } = theme;
  const voz = vocabulario ? { ...VOCABULARIO_BASE, ...vocabulario } : VOCABULARIO_BASE;
  const {
    cartItems, cartOpen, setCartOpen, cartCount, cartTotal, removeFromCart, updateQty,
    openCheckout, fmt, wholesaleWarnings, pricedLines, cartPromoSavings, freeShipping, freeShippingGoal,
  } = cart;
  const blockBuy = isOwner || isPreview;
  // Los precios y el nombre de la promo iban pintados con el acento CRUDO. Con un
  // acento claro —beige, arena, pastel— eso es texto casi blanco sobre el fondo
  // blanco del carrito: el total y el descuento quedaban invisibles justo en el
  // paso donde el comprador decide. Se calcula acá y no en cada template porque
  // el carrito es el único que sabe contra qué fondo se está dibujando.
  // Ojo: `accent` a secas se sigue usando de RELLENO (el botón), donde no hay
  // problema de contraste porque `accentText` ya está calculado contra él.
  const accentTexto = getReadableAccentText(accent, BG, T);
  // Y lo mismo para el acento usado de RELLENO, que era la mitad que faltaba.
  // `accentTexto` ya cuidaba el acento como TEXTO —el total, el nombre de la
  // promo—, pero el botón de "Finalizar compra" se seguía pintando con el acento
  // crudo. Con un acento claro sobre el fondo claro del carrito, ese botón es
  // blanco sobre blanco: la etiqueta se lee, pero no hay botón. Es el botón que
  // lleva a la caja, así que el que no lo encuentra no compra.
  // Cuando el acento SÍ se despega del fondo, `getReadableAccentFill` lo devuelve
  // tal cual y se respeta el `accentText` que calculó el template, que sabe contra
  // qué color lo eligió. Sólo cuando no se despega se cae al color de texto del
  // tema y se recalcula la tinta encima.
  const accentFill  = getReadableAccentFill(accent, BG, T);
  const accentSobreFill = accentFill === accent ? accentText : textoSobre(accentFill);
  // El tachado se apoya en el color de texto del carrito, que ya contrasta con su
  // fondo, en vez de un gris fijo que se pierde en los carritos oscuros.
  const tachado = { color: MID || T, opacity: 0.75, textDecoration: "line-through" as const };

  // pricedLines viene del hook (una sola cuenta, la misma que el checkout que cobra):
  // ya trae la promo por producto Y las de tienda aplicadas, en el mismo orden que
  // cartItems. Acá solo se dibuja — no se recalcula nada.

  return (
    <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20000 : zIndex, pointerEvents: cartOpen ? "auto" : "none" }}>
      <div onClick={() => setCartOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.55)", opacity: cartOpen ? 1 : 0, transition:"opacity 0.3s" }} />
      <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"min(420px, 100vw)", background:BG, transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition:"transform 0.35s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column", borderLeft:`1px solid ${border}` }}>
        <div style={{ padding:"24px 24px 16px", borderBottom:`1px solid ${border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <p style={{ fontFamily: serif ?? "inherit", fontSize:18, margin:0, color:T }}>{voz.titulo} <span style={{ fontSize:13, color:MID }}>({cartCount})</span></p>
          <button onClick={() => setCartOpen(false)} aria-label={voz.cerrar} style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", opacity:0.4 }}>
              <p style={{ fontSize:36, marginBottom:12 }}>{voz.vacioIcono}</p>
              <p style={{ fontSize:13, lineHeight:1.8, color:T }}>{voz.vacio}<br/>{voz.vacioSub}</p>
            </div>
          ) : cartItems.map((item, idx) => {
            // ¿Esta línea se está cobrando al precio de lista del producto? Si no
            // —porque mandó el precio de una variante, el mayorista o un escalón por
            // cantidad—, `comparePrice` deja de ser una referencia válida: anunciar
            // la oferta o tachar ese número puede mostrar un "antes" MÁS BARATO que
            // lo que se paga. Es el mismo cuidado que ya tiene el modal (CP-15).
            // El unitario sale del motor (lineTotal + lo que ahorró la promo), no de
            // una cuenta propia.
            const linea = pricedLines[idx];
            const unitario = linea && item.qty > 0 ? (linea.lineTotal + linea.savings) / item.qty : item.product.price;
            const precioDeLista = Math.abs(unitario - item.product.price) < 0.01;
            const enOferta = precioDeLista && (item.product.comparePrice ?? 0) > item.product.price;
            return (
            <div key={idx} style={{ display:"flex", gap:14, padding:"16px 0", borderBottom:`1px solid ${border}` }}>
              {(() => {
                // La foto atada a un valor —normalmente el color— se busca contra
                // CUALQUIER valor elegido, sin preguntar de qué opción viene.
                const elegidos = valoresElegidos(item.seleccion).map(v => v.toLowerCase());
                const propia = elegidos.length
                  ? item.product.imageItems.find(img => img.variantValue && elegidos.includes(img.variantValue.toLowerCase()))?.url
                  : null;
                const src = propia ?? item.product.images[0];
                return src
                  ? <FadeImage src={src} alt="" width={70} height={70} style={{ objectFit:"cover", flexShrink:0, borderRadius:6 }} />
                  : <div style={{ width:70, height:70, flexShrink:0, borderRadius:6, background:"#f0f0f0" }} />;
              })()}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500, color:T }}>{item.product.name}</p>
                {textoSeleccion(item.seleccion) && (
                  <p style={{ fontSize:11, opacity:0.6, margin:"0 0 10px", color:T }}>
                    {textoSeleccion(item.seleccion)}
                  </p>
                )}
                {/* F6-C6 — QUÉ promo bajó este precio. Antes el carrito tachaba el
                    precio y no decía por qué: el comprador veía el descuento pero no
                    sabía si era el 3×2, el 20% o el combo, y menos si convenía sumar
                    una unidad más. Sale de `promo` que ya trae la línea del motor
                    (misma cuenta que cobra el checkout), NO de una segunda cuenta acá. */}
                {pricedLines[idx]?.promo ? (
                  <p style={{ fontSize:11, margin:"0 0 8px", color:accentTexto, fontWeight:700 }}>
                    {pricedLines[idx].promo!.name
                      ? `${pricedLines[idx].promo!.name} · ${pricedLines[idx].promo!.label}`
                      : pricedLines[idx].promo!.label}
                  </p>
                ) : enOferta ? (
                  /* La OFERTA del producto (precio anterior) no se anunciaba en
                     ningún lado del carrito: el comprador venía de ver "$48.000
                     antes $60.000" y acá le aparecía el precio solo, sin rastro de
                     que el descuento se hubiera respetado. Es la promo de tienda
                     la que tiene su propia línea arriba; esto cubre el otro caso. */
                  <p style={{ fontSize:11, margin:"0 0 8px", color:"#dc2626", fontWeight:700 }}>
                    Oferta · {Math.round((1 - item.product.price / item.product.comparePrice!) * 100)}% OFF
                  </p>
                ) : null}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}` }}>
                    <button onClick={() => updateQty(idx, -1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>−</button>
                    <span style={{ width:24, textAlign:"center", fontSize:13, color:T }}>{item.qty}</span>
                    <button onClick={() => updateQty(idx, 1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>+</button>
                  </div>
                  {(() => {
                    const linea = pricedLines[idx];
                    // Qué precio tachar: si mandó una promo de tienda, lo que la
                    // línea valdría sin ella; si no, el precio anterior de la
                    // oferta × cantidad. Nunca los dos: se tachan por la misma razón
                    // y encimados parecerían dos descuentos distintos.
                    //
                    // `precioDeLista` es la condición que evita el mismo error que
                    // CP-15: `comparePrice` es el precio anterior del PRODUCTO, así
                    // que solo sirve de referencia si la línea se está cobrando a
                    // ese precio. Si mandó el precio de una variante o el mayorista
                    // por cantidad, el tachado puede terminar por DEBAJO de lo que
                    // se paga — un "descuento" que en la pantalla resta plata.
                    const antes = linea?.promoApplied
                      ? linea.lineTotal + linea.savings
                      : precioDeLista && (item.product.comparePrice ?? 0) > item.product.price
                        ? item.product.comparePrice! * item.qty
                        : null;
                    return (
                      <div style={{ textAlign:"right" }}>
                        {antes != null && (
                          <span style={{ fontSize:11, display:"block", lineHeight:1.3, ...tachado }}>{fmt(antes)}</span>
                        )}
                        <span style={{ color:accentTexto, fontWeight:700, fontSize:14 }}>{fmt(linea?.lineTotal ?? 0)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => removeFromCart(idx)} aria-label={voz.quitar} style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:18, alignSelf:"flex-start" }}>×</button>
            </div>
            );
          })}
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
              <span style={{ fontSize:11, opacity:0.6, color:T }}>{cartCount} {cartCount === 1 ? voz.unidad : voz.unidades}</span>
            </div>
            {promoSavings > 0.01 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>Promoción aplicada</span>
                <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>-{fmt(promoSavings)}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:13, opacity:0.7, color:T }}>Total</span>
              <span style={{ fontSize:22, fontWeight:700, color:accentTexto }}>{fmt(cartTotal)}</span>
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
              style={{ width:"100%", background: blockBuy ? `${accentFill}40` : accentFill, color: blockBuy ? `${accentSobreFill}80` : accentSobreFill, border:"none", padding:"15px", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor: blockBuy ? "not-allowed" : "pointer", marginBottom:10 }}>
              {isOwner ? "No disponible para el dueño" : isPreview ? "Solo en la tienda real" : voz.finalizar}
            </button>
            <button onClick={() => setCartOpen(false)} style={{ width:"100%", background:"transparent", color:T, border:`1px solid ${border}`, padding:"12px", fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer" }}>
              {voz.seguir}
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
