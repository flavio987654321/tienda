"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import type { ClaveLegal } from "@/lib/politicas-tienda";
import { armarPreguntas, rutaPolitica } from "@/lib/preguntasFrecuentes";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES de Chic Paris
   ══════════════════════════════════════════════════════════════════════════

   Las respuestas son las de todos (`lib/preguntasFrecuentes`); el dibujo es de
   Chic: una página de revista de moda a dos columnas. A la izquierda el título
   en Playfair cursiva y finita, una bajada y "Escribinos" subrayado en el
   acento; a la derecha la lista, con "N° 1", "N° 2"… en versalitas y líneas
   de un pelo. La pregunta abierta se marca con un filete del acento que crece
   a su izquierda, como el subrayado de una nota al margen. */

const PLAYFAIR = "'Playfair Display', Georgia, serif";

export function PreguntasChic({
  envios, mercadoPago, pagos, legales, slug, isPreview, fmt, onContacto, conWhatsapp,
  fondo, tinta, suave, acento, isMobile, children,
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
  fondo: string; tinta: string; suave: string;
  /** El acento, ya legible como texto sobre `fondo`. */
  acento: string;
  isMobile: boolean;
  children?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState<number | null>(0);
  const items = armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp });
  const linea = `color-mix(in srgb, ${tinta} 12%, transparent)`;

  const enlace = (href: string, texto: string) => {
    const estilo: React.CSSProperties = { color:acento, fontSize:12.5, fontWeight:600, textDecoration:"underline", textUnderlineOffset:4 };
    return isPreview || !slug
      ? <span key={href} style={estilo}>{texto}</span>
      : <a key={href} href={href} style={estilo}>{texto}</a>;
  };

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "52px 20px" : "88px 40px", borderTop:"1px solid #f0f0f0" }}>
      {children}
      <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gap: isMobile ? 30 : 72,
        gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,0.75fr) minmax(0,1.25fr)", alignItems:"start" }}>
        <div style={{ position: isMobile ? "static" : "sticky", top:130 }}>
          <p style={{ fontSize:10, letterSpacing:4, color:acento, textTransform:"uppercase", fontWeight:700, margin:"0 0 10px" }}>
            <EditableZone field="faqKicker" label="Etiqueta de preguntas">Antes de comprar</EditableZone>
          </p>
          <h2 style={{ fontFamily:PLAYFAIR, fontSize: isMobile ? "clamp(28px,8vw,34px)" : "clamp(30px,3.4vw,46px)", fontWeight:300, fontStyle:"italic",
            lineHeight:1.12, margin:"0 0 18px", color:tinta }}>
            <EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>
          </h2>
          <p style={{ fontSize:14, lineHeight:1.7, color:suave, margin:"0 0 18px", maxWidth:340 }}>
            <EditableZone field="faqTexto" label="Texto de preguntas">Lo que más nos preguntan, contestado acá para que no tengas que esperar.</EditableZone>
          </p>
          <button type="button" onClick={onContacto}
            style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontFamily:PLAYFAIR, fontStyle:"italic", fontSize:17, color:tinta }}>
            ¿Otra duda? <span style={{ color:acento, textDecoration:"underline", textUnderlineOffset:5, textDecorationThickness:1 }}>Escribinos</span> →
          </button>
        </div>

        <div style={{ borderTop:`1px solid ${linea}` }}>
          {items.map((it, i) => {
            const abierto = abierta === i;
            const id = `cp-faq-${i}`;
            return (
              <div key={it.tema} style={{ position:"relative", borderBottom:`1px solid ${linea}` }}>
                {/* El filete del acento: crece a la izquierda de la abierta. */}
                <span aria-hidden style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:acento,
                  transform: abierto ? "scaleY(1)" : "scaleY(0)", transformOrigin:"top", transition:"transform .4s cubic-bezier(.2,.8,.2,1)" }} />
                <button type="button" onClick={() => setAbierta(abierto ? null : i)} aria-expanded={abierto} aria-controls={id}
                  style={{ width:"100%", display:"flex", alignItems:"baseline", gap: isMobile ? 14 : 20, textAlign:"left", background:"none", border:"none",
                    cursor:"pointer", color:tinta, padding: isMobile ? "20px 0 20px 16px" : "24px 0 24px 22px", fontFamily:"inherit" }}>
                  <span aria-hidden style={{ flexShrink:0, width: isMobile ? 34 : 40, fontSize:10, letterSpacing:2, textTransform:"uppercase", fontWeight:600,
                    color: abierto ? acento : suave, transition:"color .3s" }}>N° {i + 1}</span>
                  <span style={{ flex:1, minWidth:0, fontSize: isMobile ? 15 : 16.5, fontWeight:500, lineHeight:1.4 }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  <span aria-hidden style={{ flexShrink:0, alignSelf:"center", fontFamily:PLAYFAIR, fontSize:22, fontWeight:300, lineHeight:1, color: abierto ? acento : tinta,
                    transform: abierto ? "rotate(45deg)" : "none", transition:"transform .35s, color .3s" }}>+</span>
                </button>
                <div id={id} role="region" style={{ display:"grid", gridTemplateRows: abierto ? "1fr" : "0fr", transition:"grid-template-rows .4s cubic-bezier(.2,.8,.2,1)" }}>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ padding: isMobile ? "0 4px 22px 64px" : "0 40px 26px 82px", fontSize:14, lineHeight:1.75, color:suave }}>
                      <p style={{ margin: it.politicas.length || it.contacto ? "0 0 12px" : 0 }}>
                        <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                      </p>
                      {it.politicas.length > 0 && (
                        <span style={{ display:"flex", gap:"8px 22px", flexWrap:"wrap" }}>
                          {it.politicas.map(pol => enlace(rutaPolitica(slug, pol.tipo), pol.texto))}
                        </span>
                      )}
                      {it.contacto && (
                        <button type="button" onClick={onContacto} style={{ background:"none", border:"none", padding:0, color:acento, cursor:"pointer",
                          fontSize:12.5, fontWeight:600, textDecoration:"underline", textUnderlineOffset:4, fontFamily:"inherit" }}>
                          Ir a contacto
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
    </section>
  );
}
