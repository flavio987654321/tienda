"use client";
import { HandHeart } from "lucide-react";
import type { useCartLogic } from "@/hooks/useCartLogic";
import type { CartTheme } from "./CartDrawer";
import { FadeImage } from "./FadeImage";
import { getReadableAccentText, getReadableAccentFill, textoSobre } from "@/contexts/EditContext";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { valoresElegidos } from "@/hooks/useStorefront";
import { textoSeleccion } from "@/components/store/shared/cartTypes";
import { resolveBasePrice, parseEscalones } from "@/lib/pricing";

// Checkout completo (datos del comprador, envío, pago, cupón, donación opcional
// y términos) compartido por todos los templates de un mismo tipo de negocio.
// Mismo motivo que CartDrawer: un solo lugar para arreglar/mantener en vez de
// una copia por template.
export function CheckoutModal({
  cart, theme, isPreview, storeSlug, zIndex = 300,
}: {
  cart: ReturnType<typeof useCartLogic>;
  theme: CartTheme;
  isPreview: boolean;
  storeSlug: string;
  /** Igual que en CartDrawer, y siempre por encima de él: el checkout se abre desde el carrito. */
  zIndex?: number;
}) {
  const { BG, S, T, MID, border, accent, accentText, serif } = theme;
  // Mismo motivo que en el carrito: el acento crudo se usaba como color de TEXTO
  // (total, cupon, links, precios). Con un acento claro esta pantalla quedaba
  // ilegible entera. `accent` se sigue usando de relleno en los botones.
  const accentTexto = getReadableAccentText(accent, BG, T);
  // El acento como RELLENO, que faltaba. `accentTexto` ya cuidaba el acento como
  // TEXTO (total, cupon, links), pero "Confirmar pedido" -el boton que MANDA el
  // pedido- se seguia pintando con el acento crudo. Con un acento claro sobre el
  // fondo claro del panel es blanco sobre blanco: se lee la etiqueta y no hay
  // boton. Es el ultimo paso de la compra; peor lugar no hay.
  // Si el acento se despega del fondo, se usa tal cual y se respeta el `accentText`
  // que calculo el template. Si no, se cae al color de texto del tema.
  const accentFill = getReadableAccentFill(accent, BG, T);
  const accentSobreFill = accentFill === accent ? accentText : textoSobre(accentFill);
  const {
    checkoutOpen, setCheckoutOpen, checkoutStatus, setCheckoutStatus, checkoutError,
    cartItems, updateQty, buyerForm, setBuyerForm, rememberData, setRememberData,
    envioOptions, envioId, setEnvioId, pagoOptions, pagoId, setPagoId,
    notas, setNotas, coupon, setCoupon, couponError, setAppliedCoupon,
    cuponAbierto, setCuponAbierto, cuponActivo, cuponBloqueado, motivoCupon,
    handleApplyCoupon, couponsAllowed, cartTotal, couponDiscount, envioPrice, envioCoordinar, orderTotal,
    appliedPromos,
    canastaDisponible, donationEnabled, setDonationEnabled, donationAmount, setDonationAmount,
    acceptedTerms, setAcceptedTerms, handlePlaceOrder, fmt, fmtEnvioPrice, fmtLiveQuote,
  } = cart;

  // Precio base (variante + mayorista + escalones) resuelto por el MOTOR, no por
  // una copia local. Antes esto era una tercera implementación de la misma cuenta
  // —y no idéntica: tenía un gate `isWholesale` que el motor NO tiene a propósito
  // (ver B-06 en PROMOCIONES.md, se sacó del carrito y de la caja y había quedado
  // vivo acá). Con una tienda sin el modo mayorista pero con productos que
  // califican por cantidad, esta pantalla mostraba el precio de lista mientras el
  // motor cobraba el mayorista, y la diferencia caía dentro de "Promoción
  // aplicada" — atribuyéndole a una promo lo que era descuento por volumen (B-10).
  function itemEffectiveUnitPrice(item: typeof cartItems[number], qty: number): number {
    const product = item.product;
    const vp = resolveVariantPrice(product.variants, valoresElegidos(item.seleccion), item.variantId);
    return resolveBasePrice({
      retailPrice: vp ?? product.price,
      precioMayorista: product.precioMayorista,
      cantMinMayorista: product.cantMinMayorista,
      preciosEscalonados: parseEscalones(product.preciosEscalonados),
    }, qty);
  }

  if (!checkoutOpen) return null;

  const inputStyle: React.CSSProperties = {
    display:"block", width:"100%", marginBottom:10, background:S, border:`1px solid ${border}`,
    color:T, padding:"11px 14px", fontSize:13, outline:"none", boxSizing:"border-box", borderRadius:6,
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex: isPreview ? 20010 : zIndex, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
      <div onClick={() => setCheckoutOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(10,10,10,0.6)", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", width:"min(480px, 100vw)", height:"100vh", background:BG, display:"flex", flexDirection:"column", overflowY:"auto", borderLeft:`1px solid ${border}` }}>
        <div style={{ padding:"24px 28px 16px", borderBottom:`1px solid ${border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <p style={{ fontFamily: serif ?? "inherit", fontSize:20, margin:"0 0 4px", color:T }}>Checkout</p>
            <p style={{ fontSize:11, opacity:0.5, margin:0, color:T }}>Completá tus datos para finalizar</p>
          </div>
          <button onClick={() => setCheckoutOpen(false)} aria-label="Cerrar checkout" style={{ background:"none", border:"none", color:T, fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {checkoutStatus === "done" ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", border:`2px solid ${accent}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ fontFamily: serif ?? "inherit", fontSize:22, color:T, marginBottom:12 }}>¡Pedido recibido!</p>
            <p style={{ fontSize:13, opacity:0.6, lineHeight:1.8, marginBottom:16, color:T }}>Te enviamos un email con el resumen. El vendedor te contactará para coordinar el envío.</p>
            <p style={{ fontSize:11, opacity:0.45, lineHeight:1.7, marginBottom:32, color:T }}>¿Algún inconveniente con tu pedido? Contactá directamente al vendedor. Tenés 10 días corridos para cancelar (Ley 24.240).</p>
            <button onClick={() => { setCheckoutOpen(false); setCheckoutStatus("idle"); }}
              style={{ background:accentFill, color:accentSobreFill, border:"none", padding:"14px 32px", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" }}>
              Seguir comprando
            </button>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} style={{ flex:1, display:"flex", flexDirection:"column" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

              <div style={{ marginBottom:28 }}>
                {cartItems.map((item, idx) => (
                  <div key={idx} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:`1px solid ${border}` }}>
                    {(() => {
                      // La foto atada a un valor —normalmente el color— se busca
                      // contra CUALQUIER valor elegido, sin mirar de qué opción viene.
                      const elegidos = valoresElegidos(item.seleccion).map(v => v.toLowerCase());
                      const propia = elegidos.length
                        ? item.product.imageItems.find(img => img.variantValue && elegidos.includes(img.variantValue.toLowerCase()))?.url
                        : null;
                      const src = propia ?? item.product.images[0];
                      return src
                        ? <FadeImage src={src} alt="" width={56} height={56} style={{ objectFit:"cover", flexShrink:0, borderRadius:6 }} />
                        : <div style={{ width:56, height:56, flexShrink:0, borderRadius:6, background:S }} />;
                    })()}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, margin:"0 0 3px", fontWeight:500, color:T }}>{item.product.name}</p>
                      {textoSeleccion(item.seleccion) && (
                        <p style={{ fontSize:11, opacity:0.5, margin:"0 0 6px", color:T }}>{textoSeleccion(item.seleccion)}</p>
                      )}
                      <p style={{ fontSize:13, color:accentTexto, fontWeight:700, margin:0 }}>
                        {fmt(itemEffectiveUnitPrice(item, item.qty))} × {item.qty}
                      </p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", border:`1px solid ${border}`, height:28, flexShrink:0 }}>
                      <button type="button" onClick={() => updateQty(idx, -1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>−</button>
                      <span style={{ width:24, textAlign:"center", fontSize:13, color:T }}>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(idx, 1)} style={{ width:28, height:28, background:"none", border:"none", color:T, cursor:"pointer", fontSize:16 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14 }}>Datos del comprador</p>
              {([["nombre","Nombre y apellido","text"],["email","Email","email"],["telefono","Teléfono","tel"],["direccion","Dirección","text"]] as const).map(([field, ph, type]) => (
                <input key={field} required type={type} placeholder={ph}
                  value={buyerForm[field]} onChange={e => setBuyerForm(f => ({ ...f, [field]: e.target.value }))}
                  style={inputStyle} />
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <input required placeholder="Ciudad"
                  value={buyerForm.ciudad} onChange={e => setBuyerForm(f => ({ ...f, ciudad: e.target.value }))}
                  style={{ ...inputStyle, marginBottom:0 }} />
                <select required value={buyerForm.provincia} onChange={e => setBuyerForm(f => ({ ...f, provincia: e.target.value }))}
                  style={{ ...inputStyle, marginBottom:0 }}>
                  <option value="">Provincia...</option>
                  {PROVINCIAS_ARGENTINA.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <input required placeholder="Código postal" value={buyerForm.cp} onChange={e => setBuyerForm(f => ({ ...f, cp: e.target.value }))} style={inputStyle} />
              <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, opacity:0.7, cursor:"pointer", marginBottom:28, color:T }}>
                <input type="checkbox" checked={rememberData} onChange={e => setRememberData(e.target.checked)} style={{ accentColor:accent }} />
                Recordar mis datos para la próxima compra
              </label>

              <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14 }}>Envío</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                {envioOptions.map(opt => (
                  <label key={opt.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:`1px solid ${envioId===opt.id ? accent : border}`, cursor:"pointer", borderRadius:6 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <input type="radio" name="envio" value={opt.id} checked={envioId===opt.id} onChange={() => setEnvioId(opt.id)} style={{ accentColor:accent }} />
                      <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color: (opt.isPickup || (!opt.coordinar && !opt.liveQuote && opt.price === 0)) ? accent : T }}>{opt.liveQuote ? fmtLiveQuote(opt.id) : fmtEnvioPrice(opt, fmt)}</span>
                  </label>
                ))}
              </div>

              <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:14 }}>Pago</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                {pagoOptions.map(opt => (
                  <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border:`1px solid ${pagoId===opt.id ? accent : border}`, cursor:"pointer", borderRadius:6 }}>
                    <input type="radio" name="pago" value={opt.id} checked={pagoId===opt.id} onChange={() => setPagoId(opt.id)} style={{ accentColor:accent }} />
                    <span style={{ fontSize:13, color:T }}>{opt.label}</span>
                  </label>
                ))}
              </div>

              <textarea placeholder="Notas para la tienda" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                style={{ ...inputStyle, marginBottom:20, resize:"vertical", fontFamily:"inherit" }} />

              {/* ── CUPÓN ────────────────────────────────────────────────────────
                  Plegado detrás de un link, como en casi todo el comercio grande.
                  Un campo de cupón abierto le avisa al comprador que existe un
                  descuento que él no tiene: se va a buscarlo a Google en mitad del
                  checkout y una parte no vuelve. El que TIENE un código lo busca
                  igual; el que no lo tiene, mejor que no se entere acá.

                  Y no se esconde cuando hay una promo que no combina: al que trae
                  el cupón en la mano, un campo que desapareció se le parece a la
                  página rota. Se muestra y se le dice por qué no entra.  */}
              {cuponActivo ? (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"10px 12px", background:`${accent}15`, border:`1px solid ${accent}40`, borderRadius:6 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:17, lineHeight:1 }}>🎉</span>
                    <span style={{ display:"flex", flexDirection:"column", lineHeight:1.25 }}>
                      <span style={{ fontSize:13, color:accentTexto, fontWeight:800, letterSpacing:0.3 }}>
                        {cuponActivo.discountValue
                          ? (cuponActivo.discountType === "percentage" ? `¡${cuponActivo.discountValue}% OFF!` : `¡${fmt(cuponActivo.discountValue)} OFF!`)
                          : "¡Cupón aplicado!"}
                      </span>
                      <span style={{ fontSize:10, color:MID, letterSpacing:0.5 }}>Cupón {cuponActivo.code}</span>
                    </span>
                  </span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} aria-label="Quitar cupón" style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
              ) : cuponBloqueado ? (
                // El cupón sigue guardado: si el carrito cambia y la promo deja de
                // aplicar, vuelve solo. Por eso se avisa en vez de borrarlo.
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:12, padding:"10px 12px", background:"rgba(217,119,6,0.10)", border:"1px solid rgba(217,119,6,0.30)", borderRadius:6 }}>
                  <span style={{ display:"flex", flexDirection:"column", lineHeight:1.3 }}>
                    <span style={{ fontSize:12.5, color:"#d97706", fontWeight:700 }}>El cupón {cuponBloqueado.code} no se está aplicando</span>
                    <span style={{ fontSize:10.5, color:MID }}>
                      {motivoCupon === "minimo"
                        ? `Es para compras desde ${fmt(cuponBloqueado.minOrderAmount)}.`
                        : "La promoción de tu carrito no se combina con cupones."}
                    </span>
                  </span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} aria-label="Quitar cupón" style={{ background:"none", border:"none", color:MID, cursor:"pointer", fontSize:14, flexShrink:0 }}>✕</button>
                </div>
              ) : !cuponAbierto ? (
                <button type="button" onClick={() => setCuponAbierto(true)}
                  style={{ display:"block", background:"none", border:"none", padding:0, marginBottom:28, color:accentTexto, fontSize:12, cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3 }}>
                  ¿Tenés un código de descuento?
                </button>
              ) : (
                <div style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", gap:0 }}>
                    <input placeholder="CÓDIGO DE CUPÓN" value={coupon} onChange={e => setCoupon(e.target.value)}
                      style={{ flex:1, minWidth:0, background:S, border:`1px solid ${border}`, borderRight:"none", color:T, padding:"11px 14px", fontSize:11, letterSpacing:1, outline:"none", borderRadius:"6px 0 0 6px" }} />
                    <button type="button" onClick={handleApplyCoupon} style={{ background:"transparent", border:`1px solid ${border}`, color:accentTexto, padding:"11px 18px", fontSize:11, letterSpacing:1, cursor:"pointer", borderRadius:"0 6px 6px 0", flexShrink:0 }}>Aplicar</button>
                  </div>
                  {!couponsAllowed && (
                    <p style={{ fontSize:11, opacity:0.75, margin:"8px 0 0", color:T }}>Tenés una promoción aplicada que no se combina con cupones.</p>
                  )}
                  {couponError && <p style={{ fontSize:11, color:"#f87171", margin:"8px 0 0" }}>{couponError}</p>}
                </div>
              )}

              <div style={{ borderTop:`1px solid ${border}`, paddingTop:20 }}>
                {(() => {
                  const fullTotal = cartItems.reduce((s, i) => s + itemEffectiveUnitPrice(i, i.qty) * i.qty, 0);
                  const promoSavings = fullTotal - cartTotal;
                  return <>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:13, opacity:0.6, color:T }}>Subtotal</span>
                      <span style={{ fontSize:13, opacity:0.6, color:T }}>{fmt(promoSavings > 0.01 ? fullTotal : cartTotal)}</span>
                    </div>
                    {/* F6-C6 — una fila POR promo, con su nombre y cuánto aportó,
                        en vez de un "Promoción aplicada" único que no decía cuál
                        ni permitía revisar la cuenta. Es la misma lista que sale
                        después en el email del pedido, así que el resumen del
                        checkout y el comprobante dicen exactamente lo mismo.
                        Si por lo que fuera no llegara el detalle, cae en la fila
                        genérica de antes: el ahorro nunca deja de mostrarse. */}
                    {promoSavings > 0.01 && (
                      appliedPromos?.length ? appliedPromos.map((p, i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, gap:12 }}>
                          <span style={{ fontSize:13, color:"#16a34a", fontWeight:600 }}>
                            {p.name ? `${p.name} · ${p.label}` : p.label}
                          </span>
                          <span style={{ fontSize:13, color:"#16a34a", fontWeight:600, whiteSpace:"nowrap" }}>-{fmt(p.savings)}</span>
                        </div>
                      )) : (
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                          <span style={{ fontSize:13, color:"#16a34a", fontWeight:600 }}>Promoción aplicada</span>
                          <span style={{ fontSize:13, color:"#16a34a", fontWeight:600 }}>-{fmt(promoSavings)}</span>
                        </div>
                      )
                    )}
                  </>;
                })()}
                {couponDiscount > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:13, color:accentTexto }}>
                      Descuento cupón{cuponActivo?.discountType === "percentage" && cuponActivo?.discountValue ? ` (${cuponActivo.discountValue}%)` : ""}
                    </span>
                    <span style={{ fontSize:13, color:accentTexto }}>-{fmt(couponDiscount)}</span>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                  <span style={{ fontSize:13, opacity:0.6, color:T }}>Envío</span>
                  <span style={{ fontSize:13, opacity:0.6, color:T }}>{envioCoordinar ? "A coordinar" : envioPrice === 0 ? "Gratis" : fmt(envioPrice)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:16, fontWeight:700, color:T }}>Total</span>
                  <span style={{ fontSize:20, fontWeight:800, color:accentTexto }}>{fmt(orderTotal)}</span>
                </div>
              </div>

              {canastaDisponible && (
                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${border}` }}>
                  <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                    <span style={{ fontSize:13, color:T, display:"flex", alignItems:"center", gap:6 }}><HandHeart size={16} style={{ color:accentTexto }} /> ¿Donar?</span>
                    <input type="checkbox" checked={donationEnabled} onChange={e => setDonationEnabled(e.target.checked)} style={{ accentColor:accent }} />
                  </label>
                  <p style={{ fontSize:10, opacity:0.6, marginTop:6, lineHeight:1.5, color:T }}>
                    Sumá un aporte aparte para completar una canasta de alimentos para un vecino — se paga por separado, no afecta tu compra.{" "}
                    <a href="/comunidad/campana" target="_blank" rel="noopener" style={{ color:accentTexto, textDecoration:"underline" }}>¿Cómo funciona?</a>
                  </p>
                  {donationEnabled && (
                    <div style={{ marginTop:10 }}>
                      <input type="number" min={1000} value={donationAmount} onChange={e => setDonationAmount(Number(e.target.value) || 0)}
                        style={{ width:"100%", background:S, border:`1px solid ${border}`, color:T, padding:"10px 14px", fontSize:13, outline:"none", borderRadius:6 }} />
                      <p style={{ fontSize:10, opacity:0.6, marginTop:6, color:T }}>Mínimo $1.000.</p>
                    </div>
                  )}
                </div>
              )}

              {checkoutError && <p style={{ fontSize:12, color:"#f87171", marginTop:12 }}>{checkoutError}</p>}
            </div>

            <div style={{ padding:"16px 28px 28px", borderTop:`1px solid ${border}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, padding:"10px 14px", border:`1px solid ${border}`, borderRadius:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color:"#4ade80", flexShrink:0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span style={{ fontSize:11, color:T, opacity:0.65, lineHeight:1.5 }}>
                  Pago seguro procesado por <strong>MercadoPago</strong> · SSL cifrado
                </span>
              </div>
              <label style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14, cursor:"pointer" }}>
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop:2, accentColor:accent, flexShrink:0 }} />
                <span style={{ fontSize:11, color:T, opacity:0.7, lineHeight:1.6 }}>
                  Acepto los{" "}
                  <a href={`/tienda/${storeSlug}/politicas?tipo=terminos`} target="_blank" rel="noopener" style={{ color:accentTexto, textDecoration:"underline" }}>Términos y Condiciones</a>
                  {" "}de la tienda y la{" "}
                  <a href="/privacidad?role=buyer" target="_blank" rel="noopener" style={{ color:accentTexto, textDecoration:"underline" }}>Política de Privacidad</a>
                </span>
              </label>
              <button type="submit" disabled={checkoutStatus === "placing" || !acceptedTerms}
                style={{ width:"100%", background:accentFill, color:accentSobreFill, border:"none", padding:"15px", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor: (!acceptedTerms || checkoutStatus === "placing") ? "not-allowed" : "pointer", opacity: (!acceptedTerms || checkoutStatus === "placing") ? 0.45 : 1 }}>
                {checkoutStatus === "placing" ? "Procesando..." : "Crear pedido"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
