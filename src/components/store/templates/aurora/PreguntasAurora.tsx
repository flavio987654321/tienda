"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import type { ClaveLegal } from "@/lib/politicas-tienda";
import { armarPreguntas, rutaPolitica } from "@/lib/preguntasFrecuentes";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES (B-5 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Lo que todos preguntan por WhatsApp antes de comprar: envíos, pagos, cambios,
   talles y cómo hablar con la tienda. Un acordeón de vidrio: la pregunta
   abierta se enciende con un filo de luz y su respuesta se despliega.

   Las respuestas las arma `lib/preguntasFrecuentes` con los datos de la
   tienda (lo comparten todos los templates de moda); acá sólo se dibujan. */

export function PreguntasAurora({
  envios, mercadoPago, pagos, legales, slug, isPreview, fmt, onContacto, conWhatsapp, escena, isMobile,
}: {
  envios: ShippingMethod[] | null | undefined;
  mercadoPago: boolean;
  pagos: StorePaymentInfo | undefined;
  legales: ClaveLegal[] | undefined;
  slug: string | undefined;
  isPreview: boolean;
  fmt: (n: number) => string;
  onContacto: () => void;
  /** Si el botón de WhatsApp está prendido: la respuesta de contacto lo nombra. */
  conWhatsapp: boolean;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, GT, LINEA_FUERTE, luz } = escena;
  const [abierta, setAbierta] = useState<number | null>(0);

  /* ── Las respuestas, armadas con los datos de la tienda (lib/preguntasFrecuentes) ── */
  const link = (href: string, texto: string) => isPreview || !slug
    ? <span key={href} style={{ color:GT, fontWeight:600 }}>{texto} →</span>
    : <a key={href} href={href} style={{ color:GT, fontWeight:600, textDecoration:"none" }}>{texto} →</a>;

  const items = armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp }).map(it => ({
    ...it,
    extra: it.contacto
      ? <button type="button" onClick={onContacto} style={{ background:"none", border:"none", padding:0, color:GT, fontWeight:600, cursor:"pointer", fontSize:"inherit", fontFamily:"inherit" }}>Ir a contacto →</button>
      : it.politicas.length
        ? <span style={{ display:"flex", gap:18, flexWrap:"wrap" }}>{it.politicas.map(pol => link(rutaPolitica(slug, pol.tipo), pol.texto))}</span>
        : undefined,
  }));

  return (
    <section data-reveal className="au-preguntas" style={{ position:"relative", overflow:"hidden", background:BG, padding: isMobile ? "60px 16px" : "110px 40px" }}>
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(40% 50% at 85% 30%, ${luz(0.14)}, transparent 70%)` }} />
      <div style={{ position:"relative", maxWidth:1140, margin:"0 auto", display:"grid", gap: isMobile ? 28 : 64,
        gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,0.8fr) minmax(0,1.2fr)", alignItems:"start" }}>
        <div style={{ position: isMobile ? "static" : "sticky", top:120 }}>
          <p style={{ margin:"0 0 14px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="faqKicker" label="Etiqueta de preguntas">Antes de comprar</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 18px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.08, color:T,
            fontSize: isMobile ? "clamp(28px,8vw,36px)" : "clamp(32px,3.4vw,50px)" }}>
            <EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>
          </h2>
          <p style={{ margin:0, fontSize:14, lineHeight:1.7, color:"rgba(242,242,247,0.6)", maxWidth:360 }}>
            <EditableZone field="faqTexto" label="Texto de preguntas">Lo que más nos preguntan, contestado acá para que no tengas que esperar.</EditableZone>
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.map((it, i) => {
            const abierto = abierta === i;
            const id = `au-faq-${i}`;
            return (
              <div key={i} style={{ position:"relative", borderRadius:20, overflow:"hidden",
                background: abierto ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${abierto ? luz(0.45) : LINEA_FUERTE}`,
                boxShadow: abierto ? `0 20px 50px rgba(0,0,0,0.35), 0 0 40px ${luz(0.14)}` : "none",
                transition:"background .35s, border-color .35s, box-shadow .35s" }}>
                {/* El filo de luz de la pregunta abierta. */}
                <div aria-hidden style={{ position:"absolute", top:0, left:24, right:24, height:1, opacity: abierto ? 1 : 0, transition:"opacity .35s",
                  background:`linear-gradient(90deg, transparent, ${luz(1)}, transparent)` }} />
                <button type="button" onClick={() => setAbierta(abierto ? null : i)} aria-expanded={abierto} aria-controls={id}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, textAlign:"left",
                    background:"none", border:"none", cursor:"pointer", color:T, padding: isMobile ? "18px 18px" : "22px 26px", fontFamily:"inherit" }}>
                  <span style={{ fontSize: isMobile ? 14.5 : 16, fontWeight:500, lineHeight:1.4 }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  {/* El + gira a × al abrirse, adentro de una esfera que se enciende. */}
                  <span aria-hidden style={{ flexShrink:0, width:32, height:32, borderRadius:999, display:"grid", placeItems:"center",
                    border:`1px solid ${abierto ? luz(0.6) : LINEA_FUERTE}`, background: abierto ? luz(0.18) : "transparent", color: abierto ? GT : T,
                    transform: abierto ? "rotate(45deg)" : "none", transition:"transform .4s cubic-bezier(.2,.8,.2,1), background .35s, border-color .35s" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </button>
                {/* Se despliega con `grid-template-rows` de 0fr a 1fr: anima la
                    altura real sin medirla. */}
                <div id={id} role="region" style={{ display:"grid", gridTemplateRows: abierto ? "1fr" : "0fr", transition:"grid-template-rows .45s cubic-bezier(.2,.8,.2,1)" }}>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ padding: isMobile ? "0 18px 20px" : "0 26px 24px", fontSize:14, lineHeight:1.75, color:"rgba(242,242,247,0.68)" }}>
                      <p style={{ margin: it.extra ? "0 0 12px" : 0 }}>
                        <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                      </p>
                      {it.extra && <div style={{ fontSize:13 }}>{it.extra}</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
