"use client";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   GARANTÍAS (rediseño del bloque heredado, ver AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Era la tira de Fashion Noir: cuatro celdas con borde y un ícono suelto.
   Ahora son cuatro paneles de vidrio flotando sobre un haz de luz que los
   recorre por detrás; cada ícono vive adentro de una esfera de luz del acento,
   y el filo de arriba del panel se enciende al pasar el mouse.

   Qué se edita no cambia: los títulos, las descripciones, el ícono de cada una
   (el botón ↻ en el editor) y el fondo del bloque. Si la dueña le pone un
   fondo claro, el vidrio pasa a ser oscuro sobre claro (`tinta`). */

export type Garantia = {
  titulo: React.ReactNode;
  desc: React.ReactNode;
  icono: React.ReactNode;
  /** Sólo en el editor: pasa al ícono siguiente. */
  onCambiarIcono?: () => void;
};

export function GarantiasAurora({ items, fondo, tinta, escena, isMobile, children }: {
  items: Garantia[];
  fondo: string;
  /** El color del texto sobre `fondo`: claro sobre oscuro, oscuro sobre claro. */
  tinta: string;
  escena: EscenaCatalogo;
  isMobile: boolean;
  /** Los controles del editor para el fondo, que van adentro de la sección. */
  children?: React.ReactNode;
}) {
  const { G, T, luz } = escena;
  const oscuro = tinta === T;
  // El vidrio se arma con la tinta: blanco translúcido sobre oscuro, y al revés.
  const vidrioFondo = oscuro ? "rgba(255,255,255,0.045)" : "rgba(6,7,13,0.04)";
  const vidrioBorde = oscuro ? "rgba(242,242,247,0.12)" : "rgba(6,7,13,0.12)";
  const iconoColor = oscuro ? escena.GT : G;

  return (
    <section data-reveal className="au-garantias" style={{ position:"relative", overflow:"hidden", background:fondo }}>
      <style>{`
        @keyframes au-haz { from { transform: translateX(-100%) } to { transform: translateX(100%) } }
        .au-garantia { transition: box-shadow .45s, border-color .45s }
        .au-garantia .au-filo { opacity: .35; transition: opacity .45s }
        .au-garantia .au-esfera { transition: transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .45s }
        /* Al pasar el mouse el panel se ENCIENDE, no se levanta: con el vidrio
           (backdrop-filter) un translate hacía que el navegador redibujara el
           texto como imagen y quedaba borroso, justo donde se edita (04/10/26). */
        @media (hover: hover) {
          .au-garantia:hover { border-color: ${luz(0.5)} !important; box-shadow: 0 18px 40px rgba(0,0,0,0.35), 0 0 36px ${luz(0.2)} !important }
          .au-garantia:hover .au-filo { opacity: 1 }
          .au-garantia:hover .au-esfera { transform: scale(1.08) }
        }
        @media (prefers-reduced-motion: reduce) { .au-garantias .au-destello { animation: none !important; opacity: 0 } }
      `}</style>
      {children}

      {/* El haz: una línea de luz que cruza el bloque por detrás de los
          paneles, con un destello que la recorre. */}
      <div aria-hidden style={{ position:"absolute", left:0, right:0, top:"50%", height:1, overflow:"hidden",
        background:`linear-gradient(90deg, transparent, ${luz(0.4)} 20%, ${luz(0.4)} 80%, transparent)` }}>
        <div className="au-destello" style={{ position:"absolute", inset:0, background:`linear-gradient(90deg, transparent 40%, ${luz(1)} 50%, transparent 60%)`,
          animation:"au-haz 6s linear infinite" }} />
      </div>
      <div aria-hidden style={{ position:"absolute", left:"50%", top:"50%", width:"70%", height:220, transform:"translate(-50%,-50%)", pointerEvents:"none",
        background:`radial-gradient(50% 50% at 50% 50%, ${luz(oscuro ? 0.12 : 0.08)}, transparent 70%)` }} />

      <div style={{ position:"relative", maxWidth:1240, margin:"0 auto", padding: isMobile ? "36px 16px" : "60px 32px",
        display:"grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: isMobile ? 10 : 16 }}>
        {items.map((g, i) => (
          <div key={i} className="au-garantia" style={{ position:"relative", overflow:"hidden", borderRadius: isMobile ? 18 : 22,
            padding: isMobile ? "18px 14px" : "26px 24px", background:vidrioFondo, border:`1px solid ${vidrioBorde}`,
            backdropFilter:"blur(14px) saturate(140%)", WebkitBackdropFilter:"blur(14px) saturate(140%)",
            boxShadow: oscuro ? "0 18px 40px rgba(0,0,0,0.35)" : "0 14px 34px rgba(6,7,13,0.08)" }}>
            {/* El filo: se enciende al pasar el mouse. */}
            <div aria-hidden className="au-filo" style={{ position:"absolute", top:0, left:18, right:18, height:1,
              background:`linear-gradient(90deg, transparent, ${luz(0.9)}, transparent)` }} />
            <span className="au-esfera" style={{ position:"relative", display:"grid", placeItems:"center", width: isMobile ? 44 : 54, height: isMobile ? 44 : 54,
              borderRadius:999, marginBottom: isMobile ? 12 : 18, color:iconoColor, border:`1px solid ${luz(0.35)}`,
              background:`radial-gradient(circle at 50% 40%, ${luz(0.28)}, ${luz(0.04)} 70%)`, boxShadow:`0 0 26px ${luz(0.25)}` }}>
              <span style={{ display:"grid", placeItems:"center", transform: isMobile ? "scale(0.8)" : undefined }}>{g.icono}</span>
              {g.onCambiarIcono && (
                <button onClick={g.onCambiarIcono} title="Cambiar ícono"
                  style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.9)", border:"none", borderRadius:999, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, opacity:0, transition:"opacity 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}>↻</button>
              )}
            </span>
            <p style={{ margin:"0 0 6px", fontSize: isMobile ? 13 : 14, fontWeight:600, color:tinta, lineHeight:1.3 }}>{g.titulo}</p>
            <p style={{ margin:0, fontSize: isMobile ? 11 : 12, lineHeight:1.55, color:tinta, opacity:0.68 }}>{g.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
