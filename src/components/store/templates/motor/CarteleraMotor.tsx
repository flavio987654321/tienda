"use client";
/**
 * La cartelera de Auto Motor (15/10/26): un índice de cine. La foto a todo el
 * ancho y, a la derecha, los tres carteles numerados como capítulos; el que se
 * está viendo tiene una barra del acento que baja mientras corre su tiempo.
 * En el celular el índice se esconde y quedan tres líneas finas abajo.
 *
 * Cómo funciona (qué carteles, el tiempo, la pausa) está en auto/useCartelera:
 * se comparte con Ruta, Drive y Volt; acá sólo se decide cómo se ve.
 */
import Link from "next/link";
import type { ImageOverride } from "@/types/store-config";
import { EditableImageButton, EditableZone, BgDragHandle, getContrastColor, useEditContext } from "@/contexts/EditContext";
import { useCartelera, fotoDelCartel, CARTELES_AUTOS } from "@/components/store/auto/useCartelera";

/* Autos oscuros de estudio y un salón de noche (Pexels): 18-38 KB en el celular, 35-76 KB en la compu. */
const EJEMPLOS = [261985, 11936975, 5864155];

const CSS = `
  .cm-cartel { position: relative; overflow: hidden; background: #050506; width: 100%; height: clamp(380px, 42vw, 540px); display: grid; grid-template-columns: minmax(0,1fr) 300px; }
  .cm-slide { position: absolute; inset: 0; transition: opacity .9s ease; }
  .cm-slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cm-placa { position: absolute; left: clamp(20px,4vw,56px); bottom: clamp(36px,5vw,64px); max-width: min(560px, calc(100% - 360px)); z-index: 2; }
  /* Con un solo cartel no hay índice: el texto usa todo el ancho. */
  .cm-cartel[data-solo] { grid-template-columns: minmax(0,1fr); }
  .cm-cartel[data-solo] .cm-placa { max-width: min(560px, calc(100% - 40px)); }
  .cm-indice { position: relative; z-index: 3; grid-column: 2; align-self: center; margin-right: clamp(16px,3vw,40px); display: flex; flex-direction: column; border-left: 1px solid rgba(255,255,255,.14); }
  .cm-cap { position: relative; display: flex; gap: 14px; align-items: baseline; padding: 14px 0 14px 18px; background: none; border: none; text-align: left; cursor: pointer; font-family: inherit; color: rgba(255,255,255,.45); transition: color .3s; }
  .cm-cap:hover, .cm-cap[aria-current="true"] { color: #fff; }
  .cm-cap:focus-visible, .cm-linea:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .cm-cap i { position: absolute; left: -1px; top: 0; bottom: 0; width: 2px; transform-origin: top; transform: scaleY(0); }
  .cm-lineas { display: none; }
  @keyframes cm-baja { from { transform: scaleY(0) } to { transform: scaleY(1) } }
  @keyframes cm-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @media (max-width: 860px) {
    .cm-cartel { grid-template-columns: minmax(0,1fr); height: clamp(420px, 110vw, 520px); }
    .cm-indice { display: none; }
    .cm-placa { max-width: calc(100% - 40px); bottom: 44px; }
    .cm-lineas { display: flex; position: absolute; left: 20px; right: 20px; bottom: 16px; gap: 8px; z-index: 3; }
    .cm-linea { flex: 1; height: 22px; padding: 10px 0; background: none; border: none; cursor: pointer; }
    .cm-linea span { display: block; height: 2px; background: rgba(255,255,255,.25); position: relative; overflow: hidden; }
    .cm-linea i { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); }
  }
  @media (prefers-reduced-motion: reduce) { .cm-slide, .cm-cap { transition: none; } }
`;

export function CarteleraMotor({ fotos, acento, intervalMs, editMode, ejemplosEnTienda, hrefStock }: {
  fotos: (ImageOverride | undefined)[];
  acento: string;
  intervalMs: number;
  editMode: boolean;
  ejemplosEnTienda: boolean;
  hrefStock: string;
}) {
  const sobreAcento = getContrastColor(acento) === "dark" ? "#0b0c0e" : "#fff";
  const { visibles, n, pos, ir, corre, contenedor, vacio } = useCartelera({ fotos, intervalMs, editMode, ejemplosEnTienda });
  // El índice repite el título como texto (se edita en el cartel, no acá).
  const { overrides } = useEditContext();
  const tituloDe = (r: number) => overrides[`cartel${r + 1}Titulo`]?.text?.trim() || CARTELES_AUTOS[r].titulo;
  if (vacio) return null;
  // El progreso del cartel actual: corre con el tiempo, lleno si está quieto, vacío en los demás.
  const progreso = (k: number, anim: string) => (k < pos ? { transform: "none" } : k === pos ? (corre ? { animation: `${anim} ${intervalMs}ms linear forwards` } : { transform: "none" }) : {});

  return (
    <div className="cm-cartel" aria-label="Cartelera" data-solo={n === 1 ? "" : undefined} {...contenedor}>
      <style>{CSS}</style>
      {visibles.map((ranura, k) => {
        const ov = fotos[ranura];
        const activo = k === pos;
        const t = CARTELES_AUTOS[ranura];
        return (
          <div key={ranura} className="cm-slide" aria-hidden={!activo} role="group" aria-roledescription="cartel" aria-label={`${k + 1} de ${n}`}
            style={{ opacity: activo ? 1 : 0, pointerEvents: activo ? "auto" : "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto propia achicada con fotoLiviana, o de ejemplo con su srcSet */}
            <img alt="" decoding="async" loading={k === 0 ? "eager" : "lazy"} {...fotoDelCartel(ov, EJEMPLOS[ranura])} />
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,5,6,.88) 0%, rgba(5,5,6,.45) 45%, rgba(5,5,6,.65) 100%), linear-gradient(to top, rgba(5,5,6,.8), rgba(5,5,6,0) 55%)" }} />
            {editMode && activo && (
              <>
                <BgDragHandle imgKey={`promoBanner${ranura + 1}`} />
                <EditableImageButton field={`promoBanner${ranura + 1}`} label={`Foto del cartel ${ranura + 1}`} esCarrusel />
              </>
            )}
            <div className="cm-placa">
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: acento }}>
                {String(k + 1).padStart(2, "0")} — {String(n).padStart(2, "0")}
              </p>
              <h3 style={{ margin: "12px 0 0", fontSize: "clamp(30px,4.6vw,58px)", fontWeight: 800, lineHeight: 0.98, letterSpacing: -0.5, textTransform: "uppercase", color: "#f4f4f5", overflowWrap: "anywhere" }}>
                <EditableZone field={`cartel${ranura + 1}Titulo`} label={`Cartel ${ranura + 1} — título`}>{t.titulo}</EditableZone>
              </h3>
              <p style={{ margin: "14px 0 0", fontSize: "clamp(14px,1.4vw,16px)", lineHeight: 1.6, color: "rgba(255,255,255,.7)", maxWidth: 440 }}>
                <EditableZone field={`cartel${ranura + 1}Texto`} label={`Cartel ${ranura + 1} — texto`}>{t.texto}</EditableZone>
              </p>
              <Link href={hrefStock} tabIndex={activo ? 0 : -1}
                style={{ marginTop: 22, display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 24px", borderRadius: 2, background: acento, color: sobreAcento,
                  fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>
                <EditableZone field={`cartel${ranura + 1}Boton`} label={`Cartel ${ranura + 1} — botón`}>{t.boton}</EditableZone>
              </Link>
            </div>
          </div>
        );
      })}

      {n > 1 && (
        <>
          {/* El índice: los tres carteles como capítulos. */}
          <div className="cm-indice">
            {visibles.map((ranura, k) => (
              <button key={ranura} type="button" className="cm-cap" aria-current={k === pos} onClick={() => ir(k)}>
                <i key={`${pos}-${corre}`} aria-hidden="true" style={{ background: acento, ...progreso(k, "cm-baja") }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: k === pos ? acento : "inherit" }}>{String(k + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", lineHeight: 1.35 }}>{tituloDe(ranura)}</span>
              </button>
            ))}
          </div>
          <div className="cm-lineas">
            {visibles.map((ranura, k) => (
              <button key={ranura} type="button" className="cm-linea" aria-label={`Ir al cartel ${k + 1}`} aria-current={k === pos} onClick={() => ir(k)}>
                <span><i key={`${pos}-${corre}`} style={{ background: acento, ...progreso(k, "cm-llena") }} /></span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
