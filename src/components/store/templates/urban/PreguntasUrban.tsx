"use client";
import { useState } from "react";
import { EditableZone, textoSobre } from "@/contexts/EditContext";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import type { ClaveLegal } from "@/lib/politicas-tienda";
import { armarPreguntas, rutaPolitica } from "@/lib/preguntasFrecuentes";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES de Urban Pulse
   ══════════════════════════════════════════════════════════════════════════

   Las respuestas son las de todos (`lib/preguntasFrecuentes`); el dibujo es de
   Urban: el título en negro 900 y mayúsculas, gigante a la izquierda, y las
   preguntas como filas separadas por la raya negra de 3px del template, cada
   una con su número grande "01", "02"… La abierta se marca con el acento, y
   el + vive en un cuadrado de borde grueso que se rellena de negro.

   Abajo, una franja entera del acento: "¿OTRA DUDA? ESCRIBINOS →", como los
   carteles de la marca. Esquinas rectas en todo. */

const dos = (n: number) => String(n).padStart(2, "0");

export function PreguntasUrban({
  envios, mercadoPago, pagos, legales, slug, isPreview, fmt, onContacto, conWhatsapp,
  fondo, tinta, suave, acentoTexto, ACC, textoSobreACC, isMobile, children,
}: {
  envios: ShippingMethod[] | null | undefined;
  mercadoPago: boolean;
  pagos: StorePaymentInfo | undefined;
  legales: ClaveLegal[] | undefined;
  slug: string | undefined;
  isPreview: boolean;
  fmt: (n: number) => string;
  onContacto: () => void;
  conWhatsapp: boolean;
  /** El fondo de la sección (editable) y el texto que se lee sobre él. */
  fondo: string; tinta: string; suave: string;
  /** El acento como TEXTO sobre `fondo` (si el acento no se lee ahí, la tinta). */
  acentoTexto: string;
  /** El acento como relleno, y el texto que va encima. */
  ACC: string; textoSobreACC: string;
  isMobile: boolean;
  children?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState<number | null>(0);
  const items = armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp });

  const enlace = (href: string, texto: string) => {
    const estilo: React.CSSProperties = { color:tinta, fontSize:10.5, fontWeight:900, letterSpacing:2, textTransform:"uppercase", textDecoration:"none",
      borderBottom:`2px solid ${tinta}`, paddingBottom:2 };
    return isPreview || !slug
      ? <span key={href} style={estilo}>{texto} →</span>
      : <a key={href} href={href} style={estilo}>{texto} →</a>;
  };

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "48px 16px 0" : "80px 40px 0", borderTop:`3px solid ${tinta}` }}>
      {children}
      <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gap: isMobile ? 26 : 56,
        gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,0.8fr) minmax(0,1.2fr)", alignItems:"start" }}>
        <div style={{ position: isMobile ? "static" : "sticky", top:110 }}>
          <p style={{ fontSize:9, letterSpacing:5, color:acentoTexto, textTransform:"uppercase", fontWeight:900, margin:"0 0 10px" }}>
            <EditableZone field="faqKicker" label="Etiqueta de preguntas">Antes de comprar</EditableZone>
          </p>
          <h2 style={{ fontSize: isMobile ? "clamp(34px,10vw,44px)" : "clamp(36px,3.7vw,54px)", fontWeight:900, textTransform:"uppercase", letterSpacing:"-2px",
            lineHeight:0.95, margin:0, color:tinta }}>
            <EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>
          </h2>
        </div>

        <div style={{ borderBottom:`3px solid ${tinta}` }}>
          {items.map((it, i) => {
            const abierto = abierta === i;
            const id = `up-faq-${i}`;
            return (
              <div key={it.tema} style={{ borderTop:`3px solid ${tinta}` }}>
                <button type="button" onClick={() => setAbierta(abierto ? null : i)} aria-expanded={abierto} aria-controls={id}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap: isMobile ? 14 : 20, textAlign:"left", background:"none", border:"none",
                    cursor:"pointer", color:tinta, padding: isMobile ? "16px 0" : "20px 0", fontFamily:"inherit" }}>
                  <span aria-hidden style={{ flexShrink:0, width: isMobile ? 34 : 48, fontSize: isMobile ? 20 : 28, fontWeight:900, letterSpacing:"-1px",
                    color: abierto ? acentoTexto : suave, transition:"color .2s" }}>{dos(i + 1)}</span>
                  <span style={{ flex:1, minWidth:0, fontSize: isMobile ? 14 : 16, fontWeight:900, textTransform:"uppercase", letterSpacing:0.3, lineHeight:1.3 }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  {/* El cuadrado del +: de borde grueso, se rellena de negro abierto. */}
                  <span aria-hidden style={{ flexShrink:0, width:32, height:32, display:"grid", placeItems:"center", border:`2px solid ${tinta}`,
                    background: abierto ? tinta : "transparent", color: abierto ? textoSobre(tinta) : tinta, transition:"background .2s, color .2s" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"
                      style={{ transform: abierto ? "rotate(45deg)" : "none", transition:"transform .25s" }}><path d="M12 4v16M4 12h16" /></svg>
                  </span>
                </button>
                <div id={id} role="region" style={{ display:"grid", gridTemplateRows: abierto ? "1fr" : "0fr", transition:"grid-template-rows .35s cubic-bezier(.2,.8,.2,1)" }}>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ padding: isMobile ? "0 0 20px 48px" : "0 52px 24px 68px", fontSize:14, lineHeight:1.7, color:suave }}>
                      <p style={{ margin: it.politicas.length || it.contacto ? "0 0 14px" : 0 }}>
                        <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                      </p>
                      {it.politicas.length > 0 && (
                        <span style={{ display:"flex", gap:"10px 22px", flexWrap:"wrap" }}>
                          {it.politicas.map(pol => enlace(rutaPolitica(slug, pol.tipo), pol.texto))}
                        </span>
                      )}
                      {it.contacto && (
                        <button type="button" onClick={onContacto} style={{ background:"none", border:"none", borderBottom:`2px solid ${tinta}`, padding:"0 0 2px", color:tinta,
                          cursor:"pointer", fontSize:10.5, fontWeight:900, letterSpacing:2, textTransform:"uppercase", fontFamily:"inherit" }}>
                          Ir a contacto →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* La franja del acento, a todo lo ancho, como un cartel. */}
      <button type="button" onClick={onContacto} className="up-faq-franja"
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, width: isMobile ? "calc(100% + 32px)" : "calc(100% + 80px)",
          margin: isMobile ? "48px -16px 0" : "72px -40px 0", padding: isMobile ? "22px 16px" : "28px 40px", background:ACC, color:textoSobreACC, border:"none",
          cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
        <span style={{ fontSize: isMobile ? 18 : 28, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.5px", lineHeight:1.05 }}>¿Otra duda?</span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:10, fontSize: isMobile ? 11 : 13, fontWeight:900, letterSpacing:3, textTransform:"uppercase", whiteSpace:"nowrap" }}>
          Escribinos <span aria-hidden className="up-faq-flecha" style={{ fontSize: isMobile ? 18 : 24, transition:"transform .25s" }}>→</span>
        </span>
      </button>
      <style>{`@media (hover: hover) { .up-faq-franja:hover .up-faq-flecha { transform: translateX(6px) } }`}</style>
    </section>
  );
}
