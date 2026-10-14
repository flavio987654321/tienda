"use client";
/**
 * La cartelera de Ruta (15/10/26): tres carteles que pasan solos, cada uno con
 * foto, título, texto y botón. Flavio: "le falta un bloque de banner que pueda
 * mostrar una imagen, como que vayan pasando solas tres".
 *
 * Usa las mismas ranuras de foto que el carrusel compartido de Hogar y Tecno
 * (`promoBanner1/2/3`, con `esCarrusel` el panel ofrece "cada cuánto pasa"),
 * pero se ve como un cartel de ruta: la foto a todo el ancho, el texto en una
 * placa oscura y, abajo, tres trazos de la raya de la ruta que se van llenando
 * mientras corre el tiempo de cada cartel.
 *
 * Qué se muestra: los carteles con foto propia. Sin ninguna cargada, los tres
 * de ejemplo (como la foto de la portada, que también es de fábrica). En el
 * editor siempre los tres, para poder cargarlos.
 */
import { useEffect, useRef, useState } from "react";
import type { ImageOverride } from "@/types/store-config";
import { EditableImageButton, EditableZone, BgDragHandle, getContrastColor } from "@/contexts/EditContext";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { fotoLiviana } from "@/lib/foto-liviana";
import { TINTA, TITULAR } from "./estiloRuta";

/* Fotos de ejemplo (Pexels): 800 px para el celular (70-90 KB) y 1200 para
   la compu (150-210 KB). */
const PX = (id: number, w: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const EJEMPLOS = [2348359, 27627498, 5125783];

const TEXTOS = [
  { titulo: "Nuevos ingresos todas las semanas", texto: "Camiones, utilitarios y máquinas revisados, con la ficha completa a la vista.", boton: "Ver el stock" },
  { titulo: "Tomamos tu usado en parte de pago", texto: "Contanos qué unidad tenés y te pasamos una oferta para la que necesitás.", boton: "Ver el stock" },
  { titulo: "Financiación a la medida del trabajo", texto: "Armamos la cuota según lo que la unidad te va a producir. Consultanos.", boton: "Ver el stock" },
];

export const CARTELERA_RUTA_CSS = `
  /* Alto fijo que acompaña el ancho, no aspect-ratio con alto mínimo: esa combinación
     ensanchaba la cartelera más que la pantalla a 768 px (visto el 15/10/26). */
  .cr-cartel { position: relative; overflow: hidden; border-radius: 4px; background: ${TINTA}; width: 100%; height: clamp(340px, 38vw, 470px); }
  .cr-slide { position: absolute; inset: 0; transition: opacity .7s ease; }
  .cr-slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cr-placa { position: absolute; left: clamp(16px,4vw,48px); bottom: clamp(44px,6vw,64px); max-width: min(520px, calc(100% - 32px)); }
  /* Las dos flechas juntas arriba a la derecha: a los costados tapaban el título. */
  .cr-flecha { position: absolute; top: 16px; width: 44px; height: 44px; border-radius: 3px; border: 1px solid rgba(255,255,255,.35);
    background: rgba(22,25,29,.55); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 3; }
  .cr-flecha:hover { background: rgba(22,25,29,.8); }
  .cr-flecha:focus-visible, .cr-trazo:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .cr-trazos { position: absolute; left: clamp(16px,4vw,48px); right: clamp(16px,4vw,48px); bottom: 18px; display: flex; gap: 10px; z-index: 3; }
  .cr-trazo { flex: 1; height: 24px; border: none; background: none; padding: 10px 0; cursor: pointer; }
  .cr-trazo span { display: block; height: 4px; background: rgba(255,255,255,.3); position: relative; overflow: hidden; }
  .cr-trazo i { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); }
  @keyframes cr-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @media (max-width: 640px) {
    .cr-cartel { height: auto; aspect-ratio: 4 / 5; }
    .cr-flecha { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .cr-slide { transition: none; } }
`;

export function CarteleraRuta({ fotos, acento, intervalMs, editMode, hrefStock, onStock }: {
  /** Las tres ranuras (`promoBanner1/2/3`). */
  fotos: (ImageOverride | undefined)[];
  acento: string;
  intervalMs: number;
  editMode: boolean;
  hrefStock: string;
  onStock: (e: React.MouseEvent) => void;
}) {
  const sobreAcento = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const propios = [0, 1, 2].filter((i) => !!fotos[i]?.url);
  // En el editor, siempre los tres; en la tienda, los que tienen foto (o los de ejemplo si no hay ninguna).
  const visibles = editMode || propios.length === 0 ? [0, 1, 2] : propios;
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [quieto, setQuieto] = useState(false);
  const n = visibles.length;
  const pos = Math.min(actual, n - 1);
  const ir = (k: number) => setActual(((k % n) + n) % n);
  const swipe = useTouchSwipe(() => ir(pos + 1), () => ir(pos - 1));
  const raiz = useRef<HTMLDivElement>(null);

  // "Reducir movimiento": no pasa solo (se puede pasar con las flechas y los trazos).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ver = () => setQuieto(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);

  const corre = !editMode && !pausa && !quieto && n > 1;
  useEffect(() => {
    if (!corre) return;
    const id = window.setTimeout(() => setActual((a) => (Math.min(a, n - 1) + 1) % n), intervalMs);
    return () => window.clearTimeout(id);
  }, [corre, pos, n, intervalMs]);

  return (
    <div ref={raiz} className="cr-cartel" role="region" aria-roledescription="carrusel" aria-label="Cartelera"
      onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)} onBlur={(e) => { if (!raiz.current?.contains(e.relatedTarget as Node)) setPausa(false); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") ir(pos + 1); if (e.key === "ArrowLeft") ir(pos - 1); }}
      {...swipe}>
      <style>{CARTELERA_RUTA_CSS}</style>

      {visibles.map((ranura, k) => {
        const ov = fotos[ranura];
        const activo = k === pos;
        const ej = EJEMPLOS[ranura];
        const t = TEXTOS[ranura];
        return (
          <div key={ranura} className="cr-slide" aria-hidden={!activo} role="group" aria-roledescription="cartel" aria-label={`${k + 1} de ${n}`}
            style={{ opacity: activo ? 1 : 0, pointerEvents: activo ? "auto" : "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto propia achicada con fotoLiviana, o de ejemplo con su srcSet */}
            <img alt="" decoding="async" loading={k === 0 ? "eager" : "lazy"}
              src={ov?.url ? fotoLiviana(ov.url, 1600) : PX(ej, 1200)}
              srcSet={ov?.url ? undefined : `${PX(ej, 800)} 800w, ${PX(ej, 1200)} 1200w`} sizes="(max-width: 640px) 100vw, 1240px"
              style={{ objectPosition: `${ov?.posX ?? 50}% ${ov?.posY ?? 50}%` }} />
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,25,29,.85) 0%, rgba(22,25,29,.3) 50%, rgba(22,25,29,0) 100%), linear-gradient(to right, rgba(22,25,29,.7) 0%, rgba(22,25,29,.25) 55%, rgba(22,25,29,0) 80%)" }} />
            {editMode && activo && (
              <>
                <BgDragHandle imgKey={`promoBanner${ranura + 1}`} />
                <EditableImageButton field={`promoBanner${ranura + 1}`} label={`Foto del cartel ${ranura + 1}`} esCarrusel />
                {!ov?.url && (
                  <span style={{ position: "absolute", top: 16, right: 16, zIndex: 4, background: "rgba(22,25,29,.75)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 3 }}>Foto de ejemplo</span>
                )}
              </>
            )}
            <div className="cr-placa">
              <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: acento }}>
                <span aria-hidden="true" style={{ width: 22, height: 3, background: acento }} />
                {String(k + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </p>
              <h3 style={{ margin: "8px 0 0", fontFamily: TITULAR, fontSize: "clamp(28px,4.4vw,52px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", color: "#fff", overflowWrap: "anywhere" }}>
                <EditableZone field={`rtCartel${ranura + 1}Titulo`} label={`Cartel ${ranura + 1} — título`}>{t.titulo}</EditableZone>
              </h3>
              <p style={{ margin: "10px 0 0", fontSize: "clamp(14px,1.5vw,16px)", lineHeight: 1.55, color: "rgba(255,255,255,.85)" }}>
                <EditableZone field={`rtCartel${ranura + 1}Texto`} label={`Cartel ${ranura + 1} — texto`}>{t.texto}</EditableZone>
              </p>
              <a href={hrefStock} onClick={onStock} tabIndex={activo ? 0 : -1}
                style={{ marginTop: 16, display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 20px", borderRadius: 3, background: acento, color: sobreAcento,
                  fontWeight: 800, fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", textDecoration: "none" }}>
                <EditableZone field={`rtCartel${ranura + 1}Boton`} label={`Cartel ${ranura + 1} — botón`}>{t.boton}</EditableZone>
              </a>
            </div>
          </div>
        );
      })}

      {n > 1 && (
        <>
          <button type="button" className="cr-flecha" aria-label="Cartel anterior" onClick={() => ir(pos - 1)} style={{ right: 66 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" className="cr-flecha" aria-label="Cartel siguiente" onClick={() => ir(pos + 1)} style={{ right: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          {/* Los trazos de la ruta: el actual se llena mientras corre su tiempo. */}
          <div className="cr-trazos">
            {visibles.map((ranura, k) => (
              <button key={ranura} type="button" className="cr-trazo" aria-label={`Ir al cartel ${k + 1}`} aria-current={k === pos} onClick={() => ir(k)}>
                <span>
                  <i key={`${pos}-${corre}`} style={{ background: acento,
                    ...(k < pos ? { transform: "scaleX(1)" } : k === pos ? (corre ? { animation: `cr-llena ${intervalMs}ms linear forwards` } : { transform: "scaleX(1)" }) : {}) }} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
