"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import type { ClaveLegal } from "@/lib/politicas-tienda";
import { armarPreguntas, rutaPolitica, type TemaPregunta } from "@/lib/preguntasFrecuentes";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES de Aire
   ══════════════════════════════════════════════════════════════════════════

   Las respuestas son las mismas que en Aurora (las arma
   `lib/preguntasFrecuentes` con los envíos, pagos y políticas de la tienda);
   el dibujo es de Aire: una tarjeta blanca sobre el papel, como las garantías
   y la suscripción, con el título en mayúsculas a la izquierda y la lista a la
   derecha. Cada pregunta lleva el ícono de su tema en la misma baldosa que
   usan las garantías, así se lee de un vistazo de qué trata cada una.

   Abajo del título, "¿Otra duda?" lleva a contacto: si la respuesta no está en
   la lista, el siguiente paso queda a mano y no hay que buscarlo. */

const ICONOS: Record<TemaPregunta, React.ReactNode> = {
  envios: <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />,
  pagos: <path d="M3 6h18v12H3zM3 10h18M7 15h4" />,
  cambios: <path d="M4 9h13l-3-3M20 15H7l3 3" />,
  talles: <path d="M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4" />,
  contacto: <path d="M4 5h16v11H9l-4 4v-4H4z" />,
};

export function PreguntasAire({
  envios, mercadoPago, pagos, legales, slug, isPreview, fmt, onContacto, conWhatsapp,
  fondo, G, accentText, T, T2, S, LN, RAD, ANCHO, MARGEN, isMobile, children,
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
  /** El papel de alrededor de la tarjeta (editable con "Fondo"). */
  fondo: string;
  G: string; accentText: string; T: string; T2: string; S: string; LN: string;
  RAD: number; ANCHO: number; MARGEN: number;
  isMobile: boolean;
  /** El botón "Fondo" del editor, que va adentro de la sección. */
  children?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState<number | null>(0);
  const items = armarPreguntas({ envios, mercadoPago, pagos, legales, fmt, conWhatsapp });

  const enlace = (href: string, texto: string) => isPreview || !slug
    ? <span key={href} style={{ color:G, fontWeight:700 }}>{texto} →</span>
    : <a key={href} href={href} style={{ color:G, fontWeight:700, textDecoration:"none" }}>{texto} →</a>;

  return (
    <section data-reveal style={{ background:fondo, position:"relative", padding:`${isMobile ? 4 : 6}px ${MARGEN}px ${isMobile ? 26 : 38}px` }}>
      {children}
      <div className="ai-entrada" style={{ maxWidth:ANCHO, margin:"0 auto", background:S, border:`1px solid ${LN}`, borderRadius:RAD,
        display:"grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,0.75fr) minmax(0,1.25fr)",
        gap: isMobile ? 18 : 48, padding: isMobile ? "26px 18px 14px" : "44px 44px 30px" }}>
        {/* ── El título, y la salida a contacto ── */}
        <div style={{ position: isMobile ? "static" : "sticky", top:110, alignSelf:"start" }}>
          <h2 style={{ fontSize: isMobile ? 21 : 28, fontWeight:800, letterSpacing:"-0.8px", color:T, margin:0, lineHeight:1.12, textTransform:"uppercase" }}>
            <EditableZone field="faqTitulo" label="Título de preguntas">Preguntas frecuentes</EditableZone>
          </h2>
          <p style={{ fontSize: isMobile ? 14 : 15, color:T2, margin:"12px 0 0", lineHeight:1.55, maxWidth:400 }}>
            <EditableZone field="faqTexto" label="Texto de preguntas">Lo que más nos preguntan antes de comprar, contestado acá para que no tengas que esperar.</EditableZone>
          </p>
          {!isMobile && (
            <div style={{ marginTop:26, paddingTop:20, borderTop:`1px solid ${LN}` }}>
              <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:T }}>¿Otra duda?</p>
              <button type="button" onClick={onContacto}
                style={{ display:"inline-flex", alignItems:"center", gap:8, background:G, color:accentText, border:"none", borderRadius:999,
                  padding:"11px 20px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Escribinos <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>

        {/* ── La lista ── */}
        <div>
          {items.map((it, i) => {
            const abierto = abierta === i;
            const id = `ai-faq-${i}`;
            return (
              <div key={it.tema} style={{ borderTop: i > 0 ? `1px solid ${LN}` : "none" }}>
                <button type="button" onClick={() => setAbierta(abierto ? null : i)} aria-expanded={abierto} aria-controls={id}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:14, textAlign:"left", background:"none", border:"none",
                    cursor:"pointer", color:T, padding: isMobile ? "14px 0" : "16px 0", fontFamily:"inherit" }}>
                  {/* La baldosa del tema: la misma de las garantías. Se pinta con
                      el acento cuando la pregunta está abierta. */}
                  <span aria-hidden style={{ flexShrink:0, width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, display:"grid", placeItems:"center",
                    background: abierto ? G : "rgba(20,22,26,0.05)", color: abierto ? accentText : G, transition:"background .25s, color .25s" }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONOS[it.tema]}</svg>
                  </span>
                  <span style={{ flex:1, minWidth:0, fontSize: isMobile ? 14.5 : 16, fontWeight:700, lineHeight:1.35 }}>
                    <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                  </span>
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={abierto ? G : T2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink:0, transform: abierto ? "rotate(180deg)" : "none", transition:"transform .3s" }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {/* Se despliega con `grid-template-rows` de 0fr a 1fr: anima la
                    altura real sin medirla. La respuesta arranca alineada con
                    el texto de la pregunta, no con la baldosa. */}
                <div id={id} role="region" style={{ display:"grid", gridTemplateRows: abierto ? "1fr" : "0fr", transition:"grid-template-rows .35s cubic-bezier(.2,.8,.2,1)" }}>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ padding: isMobile ? "0 0 16px 52px" : "0 32px 20px 56px", fontSize:14, lineHeight:1.65, color:T2 }}>
                      <p style={{ margin: it.politicas.length || it.contacto ? "0 0 10px" : 0 }}>
                        <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
                      </p>
                      {it.politicas.length > 0 && (
                        <span style={{ display:"flex", gap:"8px 18px", flexWrap:"wrap", fontSize:13 }}>
                          {it.politicas.map(pol => enlace(rutaPolitica(slug, pol.tipo), pol.texto))}
                        </span>
                      )}
                      {it.contacto && (
                        <button type="button" onClick={onContacto} style={{ background:"none", border:"none", padding:0, color:G, fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
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
    </section>
  );
}
