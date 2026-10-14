"use client";
/**
 * La cartelera de Auto Volt (15/10/26): una pantalla. La foto enmarcada con
 * esquinas del acento que brillan, una barra de carga arriba con el contador
 * en letra de máquina ("CARTEL 02 / 03"), y el título con el mismo degradado
 * blanco → acento que el showroom. Cada foto entra con un acercamiento suave.
 *
 * Cómo funciona está en auto/useCartelera (compartido con Ruta, Motor y Drive).
 */
import Link from "next/link";
import type { ImageOverride } from "@/types/store-config";
import { EditableImageButton, EditableZone, BgDragHandle, getContrastColor } from "@/contexts/EditContext";
import { useCartelera, fotoDelCartel, CARTELES_AUTOS } from "@/components/store/auto/useCartelera";
import { conAlfa, MONO } from "./EscenaVolt";

/* Carga eléctrica de noche, carga en un garaje y un salón iluminado (Pexels): 50-58 KB en el celular, 88-111 KB en la compu. */
const EJEMPLOS = [12860663, 28851165, 5864150];

const CSS = `
  .cv-pantalla { position: relative; width: 100%; height: clamp(380px, 40vw, 520px); border-radius: 14px; overflow: hidden; background: #05070d; }
  .cv-slide { position: absolute; inset: 0; transition: opacity .8s ease; }
  .cv-slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.06); transition: transform 6s ease-out; }
  .cv-slide[data-activo="1"] img { transform: scale(1); }
  .cv-rayas { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px); }
  .cv-esq { position: absolute; width: 26px; height: 26px; pointer-events: none; z-index: 3; }
  .cv-placa { position: absolute; left: clamp(20px,4vw,52px); bottom: clamp(28px,4vw,52px); max-width: min(560px, calc(100% - 40px)); z-index: 2; }
  .cv-barra { position: absolute; left: clamp(20px,4vw,52px); right: clamp(20px,4vw,52px); top: 20px; display: flex; align-items: center; gap: 14px; z-index: 3; }
  .cv-seg { flex: 1; height: 22px; padding: 10px 0; background: none; border: none; cursor: pointer; }
  .cv-seg span { display: block; height: 2px; background: rgba(232,236,246,.18); position: relative; overflow: hidden; border-radius: 2px; }
  .cv-seg i { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); }
  .cv-flecha { width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(232,236,246,.22); background: rgba(5,7,13,.55); color: #e8ecf6; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
  .cv-flecha:focus-visible, .cv-seg:focus-visible { outline: 2px solid #e8ecf6; outline-offset: 2px; }
  @keyframes cv-carga { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @media (max-width: 640px) {
    .cv-pantalla { height: clamp(440px, 125vw, 540px); }
    .cv-flechas { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) { .cv-slide, .cv-slide img { transition: none; transform: none !important; } }
`;

export function CarteleraVolt({ fotos, acento, intervalMs, editMode, ejemplosEnTienda, hrefStock }: {
  fotos: (ImageOverride | undefined)[];
  acento: string;
  intervalMs: number;
  editMode: boolean;
  ejemplosEnTienda: boolean;
  hrefStock: string;
}) {
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";
  const { visibles, n, pos, ir, corre, contenedor, vacio } = useCartelera({ fotos, intervalMs, editMode, ejemplosEnTienda });
  if (vacio) return null;
  const brillo = `0 0 14px ${conAlfa(acento, 0.75)}`;
  const esquina = (pos: React.CSSProperties, bordes: React.CSSProperties) => (
    <span aria-hidden="true" className="cv-esq" style={{ ...pos, ...bordes, borderColor: acento, filter: `drop-shadow(${brillo})` }} />
  );

  return (
    <div className="cv-pantalla" aria-label="Cartelera" {...contenedor}
      style={{ border: `1px solid ${conAlfa(acento, 0.28)}`, boxShadow: `0 0 0 1px rgba(255,255,255,.03), 0 30px 80px ${conAlfa(acento, 0.12)}` }}>
      <style>{CSS}</style>

      {visibles.map((ranura, k) => {
        const ov = fotos[ranura];
        const activo = k === pos;
        const t = CARTELES_AUTOS[ranura];
        return (
          <div key={ranura} className="cv-slide" data-activo={activo ? "1" : "0"} aria-hidden={!activo} role="group" aria-roledescription="cartel" aria-label={`${k + 1} de ${n}`}
            style={{ opacity: activo ? 1 : 0, pointerEvents: activo ? "auto" : "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto propia achicada con fotoLiviana, o de ejemplo con su srcSet */}
            <img alt="" decoding="async" loading={k === 0 ? "eager" : "lazy"} {...fotoDelCartel(ov, EJEMPLOS[ranura])} />
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(5,7,13,.92) 0%, rgba(5,7,13,.35) 50%, rgba(5,7,13,.55) 100%), radial-gradient(ellipse at 15% 100%, ${conAlfa(acento, 0.22)}, transparent 60%)` }} />
            <span className="cv-rayas" aria-hidden="true" />
            {editMode && activo && (
              <>
                <BgDragHandle imgKey={`promoBanner${ranura + 1}`} />
                <EditableImageButton field={`promoBanner${ranura + 1}`} label={`Foto del cartel ${ranura + 1}`} esCarrusel />
              </>
            )}
            <div className="cv-placa">
              <h3 style={{ margin: 0, fontSize: "clamp(30px,4.4vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.98, overflowWrap: "anywhere",
                backgroundImage: `linear-gradient(180deg, #ffffff 35%, ${conAlfa(acento, 0.95)} 150%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#fff" }}>
                <EditableZone field={`cartel${ranura + 1}Titulo`} label={`Cartel ${ranura + 1} — título`}>{t.titulo}</EditableZone>
              </h3>
              <p style={{ margin: "12px 0 0", fontSize: "clamp(14px,1.4vw,16px)", lineHeight: 1.6, color: "rgba(232,236,246,.72)", maxWidth: 440 }}>
                <EditableZone field={`cartel${ranura + 1}Texto`} label={`Cartel ${ranura + 1} — texto`}>{t.texto}</EditableZone>
              </p>
              <Link href={hrefStock} tabIndex={activo ? 0 : -1}
                style={{ marginTop: 20, display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 22px", borderRadius: 10, background: acento, color: sobreAcento,
                  fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: `0 0 24px ${conAlfa(acento, 0.45)}` }}>
                <EditableZone field={`cartel${ranura + 1}Boton`} label={`Cartel ${ranura + 1} — botón`}>{t.boton}</EditableZone>
              </Link>
            </div>
          </div>
        );
      })}

      {/* Las esquinas del visor */}
      {esquina({ top: 10, left: 10 }, { borderTop: "2px solid", borderLeft: "2px solid", borderTopLeftRadius: 6 })}
      {esquina({ top: 10, right: 10 }, { borderTop: "2px solid", borderRight: "2px solid", borderTopRightRadius: 6 })}
      {esquina({ bottom: 10, left: 10 }, { borderBottom: "2px solid", borderLeft: "2px solid", borderBottomLeftRadius: 6 })}
      {esquina({ bottom: 10, right: 10 }, { borderBottom: "2px solid", borderRight: "2px solid", borderBottomRightRadius: 6 })}

      {/* La barra de carga, con el contador en letra de máquina */}
      <div className="cv-barra">
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, whiteSpace: "nowrap", textShadow: brillo }}>
          Cartel {String(pos + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
        {n > 1 && visibles.map((ranura, k) => (
          <button key={ranura} type="button" className="cv-seg" aria-label={`Ir al cartel ${k + 1}`} aria-current={k === pos} onClick={() => ir(k)}>
            <span><i key={`${pos}-${corre}`} style={{ background: acento, boxShadow: brillo,
              ...(k < pos ? { transform: "none" } : k === pos ? (corre ? { animation: `cv-carga ${intervalMs}ms linear forwards` } : { transform: "none" }) : {}) }} /></span>
          </button>
        ))}
        {n > 1 && (
          <span className="cv-flechas" style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" className="cv-flecha" aria-label="Cartel anterior" onClick={() => ir(pos - 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" className="cv-flecha" aria-label="Cartel siguiente" onClick={() => ir(pos + 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
