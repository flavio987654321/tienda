"use client";
/**
 * La cartelera de Auto Drive (15/10/26): una tarjeta de revista. El texto en
 * una placa blanca a la izquierda y la foto redondeada a la derecha; abajo,
 * pastillas que se estiran y se llenan del acento mientras corre el tiempo.
 * En el celular la foto va arriba y el texto abajo.
 *
 * Cómo funciona está en auto/useCartelera (compartido con Ruta, Motor y Volt).
 */
import Link from "next/link";
import type { ImageOverride } from "@/types/store-config";
import { EditableImageButton, EditableZone, BgDragHandle, getContrastColor } from "@/contexts/EditContext";
import { useCartelera, fotoDelCartel, CARTELES_AUTOS } from "@/components/store/auto/useCartelera";

/* Un salón luminoso, la entrega de llaves y alguien estrenando (Pexels): 59-73 KB en el celular, 115-143 KB en la compu. */
const EJEMPLOS = [18108314, 7144207, 7144213];
const TINTA = "#0f172a";
const SUAVE = "#64748b";

const CSS = `
  .cd-cartel { position: relative; display: grid; grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr); gap: 0; background: #fff; border: 1px solid #e8ebf0; border-radius: 22px; overflow: hidden; box-shadow: 0 14px 40px rgba(15,23,42,.08); min-height: 400px; }
  .cd-panel { position: relative; display: grid; padding: clamp(24px,3.4vw,44px); }
  .cd-texto { grid-area: 1 / 1; transition: opacity .5s ease, transform .5s ease; align-self: center; }
  .cd-foto { position: relative; margin: 12px; border-radius: 16px; overflow: hidden; background: #eef1f5; }
  .cd-foto > div { position: absolute; inset: 0; transition: opacity .7s ease; }
  .cd-foto img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cd-pie { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 28px; }
  .cd-pastillas { display: flex; gap: 6px; }
  .cd-pastilla { height: 32px; padding: 12px 0; background: none; border: none; cursor: pointer; }
  .cd-pastilla span { display: block; height: 8px; border-radius: 999px; background: #e2e8f0; position: relative; overflow: hidden; transition: width .3s; }
  .cd-pastilla i { position: absolute; inset: 0; border-radius: 999px; transform-origin: left; transform: scaleX(0); }
  .cd-flecha { width: 44px; height: 44px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; color: ${TINTA}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
  .cd-flecha:hover { border-color: #cbd5e1; background: #f8fafc; }
  .cd-flecha:focus-visible, .cd-pastilla:focus-visible { outline: 2px solid ${TINTA}; outline-offset: 2px; }
  @keyframes cd-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @media (max-width: 820px) {
    .cd-cartel { grid-template-columns: minmax(0,1fr); min-height: 0; }
    .cd-foto { order: -1; aspect-ratio: 4 / 3; margin: 10px 10px 0; }
  }
  @media (prefers-reduced-motion: reduce) { .cd-texto, .cd-foto > div, .cd-pastilla span { transition: none; } }
`;

export function CarteleraDrive({ fotos, acento, intervalMs, editMode, ejemplosEnTienda, hrefStock }: {
  fotos: (ImageOverride | undefined)[];
  acento: string;
  intervalMs: number;
  editMode: boolean;
  ejemplosEnTienda: boolean;
  hrefStock: string;
}) {
  const sobreAcento = getContrastColor(acento) === "dark" ? "#111" : "#fff";
  const { visibles, n, pos, ir, corre, contenedor, vacio } = useCartelera({ fotos, intervalMs, editMode, ejemplosEnTienda });
  if (vacio) return null;

  return (
    <div className="cd-cartel" aria-label="Cartelera" {...contenedor}>
      <style>{CSS}</style>

      {/* El texto: los tres apilados en la misma celda, se ve el actual. */}
      <div className="cd-panel">
        {visibles.map((ranura, k) => {
          const activo = k === pos;
          const t = CARTELES_AUTOS[ranura];
          return (
            <div key={ranura} className="cd-texto" aria-hidden={!activo} role="group" aria-roledescription="cartel" aria-label={`${k + 1} de ${n}`}
              style={{ opacity: activo ? 1 : 0, transform: activo ? "none" : "translateY(8px)", pointerEvents: activo ? "auto" : "none" }}>
              <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, color: acento, background: `${acento}1a`, padding: "5px 12px", borderRadius: 999 }}>
                {k + 1} de {n}
              </span>
              <h3 style={{ margin: "16px 0 0", fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: -0.8, color: TINTA, overflowWrap: "anywhere" }}>
                <EditableZone field={`cartel${ranura + 1}Titulo`} label={`Cartel ${ranura + 1} — título`}>{t.titulo}</EditableZone>
              </h3>
              <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6, color: SUAVE }}>
                <EditableZone field={`cartel${ranura + 1}Texto`} label={`Cartel ${ranura + 1} — texto`}>{t.texto}</EditableZone>
              </p>
              <Link href={hrefStock} tabIndex={activo ? 0 : -1}
                style={{ marginTop: 22, display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 22px", borderRadius: 12, background: acento, color: sobreAcento, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
                <EditableZone field={`cartel${ranura + 1}Boton`} label={`Cartel ${ranura + 1} — botón`}>{t.boton}</EditableZone>
              </Link>
            </div>
          );
        })}

        {n > 1 && (
          <div className="cd-pie" style={{ gridArea: "2 / 1" }}>
            <div className="cd-pastillas">
              {visibles.map((ranura, k) => (
                <button key={ranura} type="button" className="cd-pastilla" aria-label={`Ir al cartel ${k + 1}`} aria-current={k === pos} onClick={() => ir(k)}>
                  <span style={{ width: k === pos ? 44 : 10 }}>
                    <i key={`${pos}-${corre}`} style={{ background: acento,
                      ...(k === pos ? (corre ? { animation: `cd-llena ${intervalMs}ms linear forwards` } : { transform: "none" }) : {}) }} />
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="cd-flecha" aria-label="Cartel anterior" onClick={() => ir(pos - 1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" className="cd-flecha" aria-label="Cartel siguiente" onClick={() => ir(pos + 1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* La foto */}
      <div className="cd-foto">
        {visibles.map((ranura, k) => {
          const ov = fotos[ranura];
          const activo = k === pos;
          return (
            <div key={ranura} aria-hidden="true" style={{ opacity: activo ? 1 : 0, pointerEvents: activo ? "auto" : "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto propia achicada con fotoLiviana, o de ejemplo con su srcSet */}
              <img alt="" decoding="async" loading={k === 0 ? "eager" : "lazy"} {...fotoDelCartel(ov, EJEMPLOS[ranura])} />
              {editMode && activo && (
                <>
                  <BgDragHandle imgKey={`promoBanner${ranura + 1}`} />
                  <EditableImageButton field={`promoBanner${ranura + 1}`} label={`Foto del cartel ${ranura + 1}`} esCarrusel />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
