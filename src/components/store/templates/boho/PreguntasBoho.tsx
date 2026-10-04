"use client";
import { useState } from "react";
import { EditableZone, textoSobre } from "@/contexts/EditContext";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import type { ClaveLegal } from "@/lib/politicas-tienda";
import { armarPreguntas, rutaPolitica } from "@/lib/preguntasFrecuentes";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES de Boho Terra
   ══════════════════════════════════════════════════════════════════════════

   Las respuestas son las de todos (`lib/preguntasFrecuentes`); el dibujo es de
   Boho: una página de revista. Todo centrado y angosto, el título en Georgia
   cursiva con la ramita de separador, y cada pregunta numerada en romanos
   (I, II, III…) en terracota, sin cajas: sólo una línea finita entre una y
   otra, como un índice. Esquinas rectas y botón de borde fino, como el resto
   del template. */

const ROMANOS = ["I", "II", "III", "IV", "V", "VI"];
const SERIF = "Georgia, 'Times New Roman', serif";

/** La ramita que separa el título de la lista: una línea con una hojita. */
export function Ramita({ color }: { color: string }) {
  return (
    <svg aria-hidden width="120" height="18" viewBox="0 0 120 18" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" style={{ display:"block", margin:"0 auto" }}>
      <path d="M4 9h44M72 9h44" opacity="0.6" />
      <path d="M60 15c0-5 0-8 0-12M60 9c-4-1-7-3-8-6 4 0 7 2 8 6zM60 11c4-1 7-3 8-6-4 0-7 2-8 6z" />
    </svg>
  );
}

export function PreguntasBoho({
  envios, mercadoPago, pagos, legales, slug, isPreview, fmt, onContacto, conWhatsapp,
  fondo, tinta, suave, A, isMobile, children,
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
  /** El acento (terracota de fábrica), ya legible sobre `fondo`. */
  A: string;
  isMobile: boolean;
  /** El botón "Fondo" del editor. */
  children?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState<number | null>(0);
  const items = armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp });
  const linea = `color-mix(in srgb, ${tinta} 16%, transparent)`;

  const enlace = (href: string, texto: string) => {
    const estilo: React.CSSProperties = { color:A, fontSize:10.5, letterSpacing:2.5, textTransform:"uppercase", textDecoration:"none", borderBottom:`1px solid ${A}`, paddingBottom:2 };
    return isPreview || !slug
      ? <span key={href} style={estilo}>{texto}</span>
      : <a key={href} href={href} style={estilo}>{texto}</a>;
  };

  return (
    <section data-reveal style={{ position:"relative", background:fondo, padding: isMobile ? "56px 20px" : "96px 32px" }}>
      {children}
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom: isMobile ? 30 : 44 }}>
          <p style={{ fontSize:10, letterSpacing:5, color:A, textTransform:"uppercase", margin:"0 0 10px", fontFamily:SERIF, fontStyle:"italic" }}>
            <EditableZone field="faqKicker" label="Etiqueta de preguntas">Antes de comprar</EditableZone>
          </p>
          <h2 style={{ fontFamily:SERIF, fontSize:"clamp(26px,3vw,38px)", fontWeight:400, fontStyle:"italic", margin:"0 0 16px", color:tinta }}>
            <EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>
          </h2>
          <Ramita color={A} />
        </div>

        <div style={{ borderTop:`1px solid ${linea}` }}>
          {items.map((it, i) => {
            const abierto = abierta === i;
            const id = `bt-faq-${i}`;
            return (
              <div key={it.tema} style={{ borderBottom:`1px solid ${linea}` }}>
                <button type="button" onClick={() => setAbierta(abierto ? null : i)} aria-expanded={abierto} aria-controls={id}
                  style={{ width:"100%", display:"flex", alignItems:"baseline", gap: isMobile ? 14 : 22, textAlign:"left", background:"none", border:"none",
                    cursor:"pointer", color:tinta, padding: isMobile ? "20px 2px" : "24px 4px", fontFamily:SERIF }}>
                  <span aria-hidden style={{ flexShrink:0, width: isMobile ? 26 : 34, fontSize:13, fontStyle:"italic", color:A, letterSpacing:1 }}>{ROMANOS[i]}.</span>
                  <span style={{ flex:1, minWidth:0, fontSize: isMobile ? 17 : 20, fontStyle:"italic", lineHeight:1.35 }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  {/* Un + de trazo fino que se vuelve −: nada de círculos ni cajas. */}
                  <span aria-hidden style={{ flexShrink:0, position:"relative", width:14, height:14, alignSelf:"center" }}>
                    <span style={{ position:"absolute", left:0, right:0, top:6.5, height:1, background:tinta }} />
                    <span style={{ position:"absolute", top:0, bottom:0, left:6.5, width:1, background:tinta, transform: abierto ? "scaleY(0)" : "none", transition:"transform .3s" }} />
                  </span>
                </button>
                <div id={id} role="region" style={{ display:"grid", gridTemplateRows: abierto ? "1fr" : "0fr", transition:"grid-template-rows .4s cubic-bezier(.2,.8,.2,1)" }}>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ padding: isMobile ? "0 2px 22px 40px" : "0 40px 26px 60px", fontSize:14.5, lineHeight:1.75, color:suave }}>
                      <p style={{ margin: it.politicas.length || it.contacto ? "0 0 14px" : 0 }}>
                        <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                      </p>
                      {it.politicas.length > 0 && (
                        <span style={{ display:"flex", gap:"10px 22px", flexWrap:"wrap" }}>
                          {it.politicas.map(pol => enlace(rutaPolitica(slug, pol.tipo), pol.texto))}
                        </span>
                      )}
                      {it.contacto && (
                        <button type="button" onClick={onContacto} style={{ background:"none", border:"none", padding:"0 0 2px", color:A, cursor:"pointer",
                          fontSize:10.5, letterSpacing:2.5, textTransform:"uppercase", borderBottom:`1px solid ${A}`, fontFamily:"inherit" }}>
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

        {/* El cierre: la salida a contacto, centrada, con el botón de borde fino de Boho. */}
        <div style={{ textAlign:"center", marginTop: isMobile ? 34 : 48 }}>
          <p style={{ fontFamily:SERIF, fontStyle:"italic", fontSize: isMobile ? 16 : 18, color:tinta, margin:"0 0 16px" }}>¿Te quedó otra duda?</p>
          <button type="button" onClick={onContacto} className="bt-faq-boton"
            style={{ border:`1px solid ${tinta}`, color:tinta, background:"transparent", padding:"13px 36px", fontSize:11, letterSpacing:3, textTransform:"uppercase",
              cursor:"pointer", fontFamily:SERIF, fontStyle:"italic", transition:"background .25s, color .25s" }}>
            Escribinos
          </button>
          {/* El texto del botón relleno se mide contra la tinta, no se usa el fondo:
              el fondo puede ser un degradado, que no sirve como color. */}
          <style>{`@media (hover: hover) { .bt-faq-boton:hover { background: ${tinta} !important; color: ${textoSobre(tinta)} !important } }`}</style>
        </div>
      </div>
    </section>
  );
}
