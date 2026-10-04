"use client";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   MAYORISTA (rediseño del bloque heredado, ver AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Era un cartel centrado con un botón de esquinas vivas. Ahora es un panel de
   vidrio con un filo de luz que le da la vuelta despacio —un `conic-gradient`
   que gira detrás de un panel apenas más chico, así sólo se ve el borde— y el
   botón es una píldora con brillo, como el resto de Aurora.

   Sólo aparece en tiendas mayoristas. Lo que dice es fijo, como antes. */

export function MayoristaAurora({ onConsultar, fondoPanel, escena, isMobile }: {
  onConsultar: () => void;
  fondoPanel: string;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, G, GT, luz, textoSobreAcento } = escena;
  return (
    <section data-reveal className="au-mayorista" style={{ position:"relative", overflow:"hidden", background:BG, padding: isMobile ? "48px 16px" : "90px 32px" }}>
      <style>{`
        @keyframes au-giro { to { transform: translate(-50%,-50%) rotate(1turn) } }
        @media (prefers-reduced-motion: reduce) { .au-mayorista .au-anillo { animation: none !important } }
      `}</style>
      <div style={{ position:"relative", maxWidth:880, margin:"0 auto", borderRadius: isMobile ? 26 : 34, padding:1, overflow:"hidden",
        boxShadow:`0 40px 90px rgba(0,0,0,0.5), 0 0 70px ${luz(0.16)}` }}>
        {/* El anillo: gira entero, pero el panel de adentro lo tapa todo menos 1px. */}
        <div aria-hidden className="au-anillo" style={{ position:"absolute", left:"50%", top:"50%", width:"150%", aspectRatio:"1",
          transform:"translate(-50%,-50%)", animation:"au-giro 8s linear infinite",
          background:`conic-gradient(from 0deg, transparent 0deg, ${luz(0.15)} 60deg, ${luz(1)} 110deg, ${luz(0.15)} 160deg, transparent 220deg, transparent 360deg)` }} />
        <div style={{ position:"relative", borderRadius: isMobile ? 25 : 33, background:fondoPanel, overflow:"hidden",
          padding: isMobile ? "40px 22px" : "64px 56px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap: isMobile ? 18 : 22 }}>
          <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(60% 70% at 50% 0%, ${luz(0.18)}, transparent 70%)` }} />
          <span style={{ position:"relative", fontSize:10, letterSpacing:4, color:GT, textTransform:"uppercase", fontWeight:700,
            border:`1px solid ${luz(0.45)}`, background:luz(0.08), padding:"7px 14px", borderRadius:999 }}>Tienda mayorista</span>
          <h2 style={{ position:"relative", fontSize: isMobile ? "clamp(26px,8vw,34px)" : "clamp(30px,3.6vw,46px)", fontWeight:300, color:T, margin:0, letterSpacing:"-0.02em", fontFamily:TITULO, lineHeight:1.12 }}>
            Solicitá tu lista<br/><span style={{ color:GT }}>de precios</span>
          </h2>
          <p style={{ position:"relative", fontSize:14, color:"rgba(242,242,247,0.6)", maxWidth:500, margin:0, lineHeight:1.75 }}>
            Precios exclusivos para revendedores y distribuidores. Completá el formulario de contacto y te respondemos con tu lista personalizada en menos de 24 hs.
          </p>
          <button onClick={onConsultar}
            style={{ position:"relative", marginTop:6, background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"16px 38px",
              fontSize:11, fontWeight:700, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", boxShadow:`0 0 36px ${luz(0.5)}` }}>
            Consultar ahora →
          </button>
        </div>
      </div>
    </section>
  );
}
