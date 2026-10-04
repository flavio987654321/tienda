"use client";
import { useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { PromoTag } from "@/components/store/PromoDisplay";
import { OfferBadge } from "@/components/store/OfferBadge";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { PiezaQueLlega } from "@/components/store/templates/shared/GrillaProfunda";
import { vidrio, Inclinable } from "@/components/store/templates/shared/Materia";
import { discountPercent } from "@/lib/discount";

/** Los colores que la tarjeta toma de la escena de Aurora. */
export type TintaTarjeta = {
  /** Acento (relleno del corazón) y acento legible como texto. */
  G: string; GT: string;
  /** Tinta, superficie, texto del bloque y texto apagado. */
  T: string; S: string; texto: string; mid: string;
  /** Precio rebajado. */
  rebaja: string;
};

/**
 * La pieza de producto de Aurora: UN cuerpo de vidrio con la foto y el texto
 * adentro, que llega desde lejos (`PiezaQueLlega`) y se inclina con el mouse
 * (`Inclinable`, sólo escritorio).
 *
 * Vivía escrita dentro de la grilla de la portada. Se separó cuando Aurora tuvo
 * catálogo propio (03/10/26): la portada y el catálogo tienen que mostrar la
 * MISMA pieza, si no al tocar "Ver colección" parece otra tienda.
 *
 * `data-foto` marca de dónde sale el vuelo de la ficha: va en la foto y no en
 * la tarjeta entera, porque es la foto la que crece y tiene que salir del
 * rectángulo exacto donde ya se estaba viendo.
 */
export function TarjetaAurora({
  product, indice, promotions, fmt, ocultarPrecios, favorito, onFavorito, onAbrir, tinta,
}: {
  product: StorefrontProduct;
  indice: number;
  promotions: ActivePromotion[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  favorito: boolean;
  onFavorito: () => void;
  onAbrir: (e: React.MouseEvent) => void;
  tinta: TintaTarjeta;
}) {
  const [encima, setEncima] = useState(false);
  const { G, GT, T, S, texto, mid, rebaja } = tinta;
  const promo = resolveProductPromo(product, promotions);
  const agotado = product.variants.length > 0 && product.variants.reduce((s, v) => s + (v.stock || 0), 0) === 0;
  return (
    <PiezaQueLlega indice={indice}>
      <Inclinable grados={5} style={{ borderRadius:18 }}>
        <div onClick={onAbrir} onMouseEnter={() => setEncima(true)} onMouseLeave={() => setEncima(false)}
          style={{ ...vidrio("oscuro"), borderRadius:18, overflow:"hidden", cursor:"pointer", position:"relative" }}>
          {/* El cartel es el compartido y se estira hasta el 78% del ancho: con
              un nombre de promo largo ("Liquidación invierno - 20% OFF") llegaba
              al corazón y lo tapaba. Este marco le deja libre la esquina derecha:
              el 78% pasa a ser de lo que queda. */}
          <div style={{ position:"absolute", top:0, left:0, right:50, height:"100%", pointerEvents:"none", zIndex:5 }}>
            {(() => {
              if (promo.primaryPromo) return <PromoTag tipo={promo.primaryPromo.type} label={describePromo(promo.primaryPromo).headline} size="sm" />;
              const hasOffer = !!product.comparePrice && product.comparePrice > product.price;
              if (!hasOffer) return null;
              return <OfferBadge badge={product.offerBadge} pct={discountPercent(product.price, product.comparePrice)} size="sm" />;
            })()}
          </div>
          <div data-foto style={{ position:"relative", aspectRatio:"3/4", overflow:"hidden", background:S }}>
            {product.images[0] && <FadeImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit:"cover", transition:"transform 0.6s cubic-bezier(.2,.8,.2,1)", transform: encima ? "scale(1.06)" : "scale(1)" }} onError={e => { e.currentTarget.style.opacity="0"; }}/>}
            {agotado && (
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(6,7,13,0.78)", display:"flex", alignItems:"center", justifyContent:"center", padding:"9px 0", zIndex:2 }}>
                <span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:4, textTransform:"uppercase" }}>Sin stock</span>
              </div>
            )}
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16, opacity: encima ? 1 : 0, transition:"opacity 0.3s", background:"linear-gradient(to top, rgba(6,7,13,0.7) 30%, transparent)", pointerEvents:"none" }}>
              <span style={{ color:T, fontSize:10, letterSpacing:3, textTransform:"uppercase", borderBottom:`1px solid ${G}`, paddingBottom:3 }}>Ver detalle</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onFavorito(); }}
              aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              style={{ position:"absolute", top:12, right:12, background:"rgba(6,7,13,0.55)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.12)", borderRadius:"50%", width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform="scale(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill={favorito ? G : "none"} stroke={favorito ? GT : T} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
          <div style={{ padding:"16px 18px 20px" }}>
            <p style={{ fontSize:9, color:mid, letterSpacing:2.5, textTransform:"uppercase", margin:"0 0 7px" }}>{product.category}</p>
            <p style={{ fontSize:15, color:texto, margin:"0 0 10px", fontWeight:400, letterSpacing:"-0.01em" }}>{product.name}</p>
            <div style={{ display:"flex", gap:10, alignItems:"baseline", flexWrap:"wrap" }}>
              {ocultarPrecios ? (
                <span style={{ fontSize:16, fontWeight:600, color:GT }}>Consultá precio</span>
              ) : promo.hasPriceDrop ? (
                <>
                  <span style={{ fontSize:16, fontWeight:600, color:rebaja }}>{fmt(promo.effectivePrice)}</span>
                  <span style={{ fontSize:12, color:mid, textDecoration:"line-through" }}>{fmt(promo.originalPrice)}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize:16, fontWeight:600, color:T }}>{fmt(product.price)}</span>
                  {product.comparePrice && <span style={{ fontSize:12, color:mid, textDecoration:"line-through" }}>{fmt(product.comparePrice)}</span>}
                </>
              )}
            </div>
          </div>
        </div>
      </Inclinable>
    </PiezaQueLlega>
  );
}
