"use client";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import { colorRepresentativo } from "@/lib/section-bg";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   FRASE DE MARCA (rediseño del bloque heredado, ver AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Era una cita en cursiva centrada entre dos rayas. Ahora la frase está escrita
   en luz: un destello del acento la recorre de punta a punta, despacio, y abajo
   asoma un horizonte —el borde de un planeta iluminado de atrás—, que es la
   imagen que le da nombre al template.

   El destello va con `background-clip: text`, y ese truco pisa el color del
   texto. Por eso se apaga (`conLuz`) si la dueña le eligió un color a la frase
   en el editor: su color manda. También se apaga con menos movimiento pedido. */

export function FraseAurora({ texto, fondo, foto, velo, tinta, conLuz, escena, isMobile, children }: {
  texto: React.ReactNode;
  fondo: string;
  /** La foto de fondo que subió la dueña, con su encuadre. */
  foto?: { url: string; posicion: string } | null;
  /** El velo sobre la foto (claro u oscuro, con su opacidad), ya armado. */
  velo?: React.ReactNode;
  tinta: string;
  /** false cuando la frase tiene color propio elegido en el editor. */
  conLuz: boolean;
  escena: EscenaCatalogo;
  isMobile: boolean;
  /** Los controles del editor para el fondo. */
  children?: React.ReactNode;
}) {
  const { G, luz } = escena;

  return (
    <section data-reveal className="au-frase" style={{ position:"relative", overflow:"hidden", textAlign:"center",
      ...(foto ? { backgroundImage:`url(${foto.url})`, backgroundSize:"cover", backgroundPosition:foto.posicion } : { background:fondo }) }}>
      <style>{`
        @keyframes au-destello-frase { from { background-position: 120% 0 } to { background-position: -20% 0 } }
        @keyframes au-horizonte { 0%,100% { opacity: .8 } 50% { opacity: 1 } }
        .au-frase-luz {
          background-image: linear-gradient(100deg, var(--au-tinta) 0%, var(--au-tinta) 42%, var(--au-brillo) 50%, var(--au-tinta) 58%, var(--au-tinta) 100%);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: au-destello-frase 9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .au-frase-luz { animation: none; background-position: 0 0 }
          .au-frase .au-horizonte { animation: none }
        }
      `}</style>
      {children}
      {velo}

      {/* El horizonte: una elipse enorme de la que sólo asoma el borde,
          iluminada desde atrás. */}
      <div aria-hidden className="au-horizonte" style={{ position:"absolute", left:"50%", top: isMobile ? "80%" : "74%", width: isMobile ? "320%" : "170%",
        aspectRatio:"1", transform:"translateX(-50%)", borderRadius:"50%", pointerEvents:"none", zIndex:0,
        borderTop:`1px solid ${luz(0.85)}`,
        boxShadow:`0 -1px 40px ${luz(0.45)}, inset 0 30px 80px ${luz(0.18)}`,
        background:`radial-gradient(50% 50% at 50% 50%, transparent 92%, ${luz(0.08)})`,
        animation:"au-horizonte 7s ease-in-out infinite" }} />
      <div aria-hidden style={{ position:"absolute", left:"50%", bottom:0, width:"60%", height:"55%", transform:"translateX(-50%)", pointerEvents:"none", zIndex:0,
        background:`radial-gradient(50% 100% at 50% 100%, ${luz(0.22)}, transparent 70%)` }} />

      {/* El resplandor se funde con el fondo al llegar abajo: si no, se cortaba
          en seco contra el bloque siguiente. Con foto no, que la taparía. */}
      {!foto && <div aria-hidden style={{ position:"absolute", left:0, right:0, bottom:0, height:"22%", pointerEvents:"none", zIndex:0,
        background:`linear-gradient(to bottom, transparent, ${colorRepresentativo(fondo)})` }} />}

      <div style={{ position:"relative", zIndex:1, padding: isMobile ? "84px 24px 104px" : "128px 40px 150px" }}>
        {/* Un punto de luz arriba, como una estrella sobre el horizonte. */}
        <span aria-hidden style={{ display:"block", width:6, height:6, borderRadius:999, margin:"0 auto 34px", background:G, boxShadow:`0 0 18px ${luz(0.9)}, 0 0 46px ${luz(0.5)}` }} />
        <p className={conLuz ? "au-frase-luz" : undefined}
          style={{ ["--au-tinta" as string]: tinta, ["--au-brillo" as string]: G,
            fontFamily:TITULO, fontSize: isMobile ? "clamp(21px,6.4vw,28px)" : "clamp(26px,3.4vw,46px)", fontWeight:300,
            letterSpacing:"-0.02em", lineHeight:1.3, color:tinta, maxWidth:900, margin:"0 auto", overflowWrap:"break-word" }}>
          {texto}
        </p>
      </div>
    </section>
  );
}
