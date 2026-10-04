"use client";
import { useState } from "react";
import { EditableZone } from "@/contexts/EditContext";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";
import { CLAVE_ARREPENTIMIENTO, type ClaveLegal } from "@/lib/politicas-tienda";

/* ══════════════════════════════════════════════════════════════════════════
   PREGUNTAS FRECUENTES (B-5 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Lo que todos preguntan por WhatsApp antes de comprar: envíos, pagos, cambios,
   talles y cómo hablar con la tienda. Un acordeón de vidrio: la pregunta
   abierta se enciende con un filo de luz y su respuesta se despliega.

   Las respuestas NO se escriben dos veces: salen de lo que la tienda ya cargó
   —sus métodos de envío con sus precios, Mercado Pago, transferencia, efectivo,
   las políticas que publicó—. Así no se contradicen con el checkout. Y nunca
   prometen algo que la tienda no cargó: sin política de cambios publicada, la
   respuesta manda a consultar en vez de inventar un plazo.

   La dueña igual puede reescribir cualquier pregunta o respuesta tocándola en
   el editor (campos `faqP1`…`faqR5`); si no la toca, se arma sola. */

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

  /* ── Las respuestas, armadas con los datos de la tienda ── */
  const activos = (envios ?? []).filter(m => m.enabled);
  const precioEnvio = (m: ShippingMethod) =>
    m.liveQuote ? "se calcula con tu código postal" : m.coordinar ? "a coordinar" : m.price > 0 ? fmt(m.price) : "sin cargo";
  const rEnvios = activos.length
    ? `Podés elegir entre: ${activos.map(m => `${m.label} (${precioEnvio(m)})`).join(", ")}. Lo elegís al finalizar la compra.`
    : "Coordinamos la entrega con vos después de la compra.";

  const medios = [
    mercadoPago && "Mercado Pago (tarjeta de crédito, débito o dinero en cuenta)",
    pagos?.transferencia?.enabled && "transferencia bancaria",
    pagos?.efectivo?.enabled && "efectivo",
  ].filter((x): x is string => !!x);
  const rPagos = medios.length
    ? `Aceptamos ${medios.length > 1 ? medios.slice(0, -1).join(", ") + " y " + medios[medios.length - 1] : medios[0]}.`
    : "Al confirmar tu pedido te pasamos los medios de pago disponibles.";

  const hayCambios = !!legales?.includes("devoluciones");
  const rCambios = (hayCambios
    ? "Sí. Las condiciones están en nuestra política de cambios y devoluciones."
    : "Escribinos y te contamos cómo hacerlo.")
    + " Además, por ley tenés 10 días desde que lo recibís para arrepentirte de una compra online.";

  const politica = (tipo: string) => `/tienda/${slug ?? ""}/politicas?tipo=${tipo}`;
  const link = (href: string, texto: string) => isPreview || !slug
    ? <span style={{ color:GT, fontWeight:600 }}>{texto} →</span>
    : <a href={href} style={{ color:GT, fontWeight:600, textDecoration:"none" }}>{texto} →</a>;

  const items: { p: string; r: string; extra?: React.ReactNode }[] = [
    { p: "¿Cómo me llega el pedido?", r: rEnvios, extra: legales?.includes("envios") ? link(politica("envios"), "Política de envíos") : undefined },
    { p: "¿Cómo puedo pagar?", r: rPagos },
    { p: "¿Puedo cambiar o devolver?", r: rCambios, extra: (
      <span style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
        {hayCambios && link(politica("devoluciones"), "Cambios y devoluciones")}
        {link(politica(CLAVE_ARREPENTIMIENTO), "Botón de arrepentimiento")}
      </span>
    ) },
    { p: "¿Cómo sé cuál es mi talle?", r: "En cada producto ves los talles que hay. Si tenés dudas entre dos, escribinos y te ayudamos a elegir." },
    { p: "¿Cómo me comunico con ustedes?", r: conWhatsapp ? "Por WhatsApp, con el botón verde de abajo, o desde la página de contacto." : "Desde la página de contacto: dejanos tu mensaje y te escribimos.", extra: (
      <button type="button" onClick={onContacto} style={{ background:"none", border:"none", padding:0, color:GT, fontWeight:600, cursor:"pointer", fontSize:"inherit", fontFamily:"inherit" }}>Ir a contacto →</button>
    ) },
  ];

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
