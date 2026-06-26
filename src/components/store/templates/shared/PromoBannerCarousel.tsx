"use client";
import { useState, useEffect, useRef } from "react";
import { FadeImage } from "./FadeImage";
import { EditableImageButton, BgDragHandle, useEditContext } from "@/contexts/EditContext";
import type { ImageOverride } from "@/types/store-config";

// Carrusel de banner promocional (solo imagen, sin texto) compartido por los
// templates de Hogar y Tecnología — mismo motivo que CartDrawer/CheckoutModal:
// un solo lugar para arreglar/mantener en vez de una copia por template.
// El campo de cada slide se llama "promoBanner1/2/3" y usa el mismo sistema
// de imagen (img:) que ya tiene tip de tamaño recomendado en el editor.
const SLOT_COUNT = 3;

type Slide = { url: string | undefined; ov: ImageOverride | undefined; isDemo: boolean };

// Mismo estilo "chevron simple" que el resto de las flechas de scroll de los
// templates (sin círculo ni fondo) — solo cambia el color a blanco con sombra
// porque acá va arriba de una foto, no de un fondo plano.
function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", top: "50%", [side]: 14, transform: "translateY(-50%)",
    border: "none", background: "none", color: "#fff", opacity: 0.85,
    textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.6)", fontSize: 40, lineHeight: 1,
    cursor: "pointer", zIndex: 10, padding: 0,
  };
}

function Overlay({ ov }: { ov: ImageOverride | undefined }) {
  if (!ov?.url || !ov.overlayType || ov.overlayType === "none") return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
      background: ov.overlayType === "light" ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.45})` : `rgba(0,0,0,${ov.overlayOpacity ?? 0.45})` }} />
  );
}

export function PromoBannerCarousel({
  images, demoImages, intervalMs, editMode, isPreview, accent, bg = "#111111", height = 320,
}: {
  images: (ImageOverride | undefined)[]; // longitud 3, índice = slide - 1
  // Fotos de ejemplo (Unsplash) que se muestran hasta que el dueño suba las
  // suyas — así el bloque se entiende de un vistazo en vez de verse vacío.
  demoImages?: string[];
  intervalMs: number;
  editMode: boolean;
  isPreview: boolean;
  accent: string;
  bg?: string;
  height?: number;
}) {
  const [editSlide, setEditSlide] = useState(0);
  const [publicSlide, setPublicSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { activeField, setActiveField } = useEditContext();

  const slots: Slide[] = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const ov = images[i];
    const demo = demoImages?.[i];
    return { ov, url: ov?.url ?? demo, isDemo: !ov?.url && !!demo };
  });
  const filled = slots
    .map((s, i) => ({ ...s, i }))
    .filter((s): s is Slide & { i: number; url: string } => !!s.url);

  useEffect(() => {
    if (editMode || filled.length <= 1) return;
    intervalRef.current = setInterval(() => setPublicSlide(s => (s + 1) % filled.length), intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [editMode, intervalMs, filled.length]);

  // Si el editor de imagen está abierto en algún banner y cambiás de slide
  // (con los puntos o las flechas), el editor sigue al slide activo.
  useEffect(() => {
    if (!editMode) return;
    if (activeField?.startsWith("img:promoBanner")) {
      setActiveField(`img:promoBanner${editSlide + 1}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlide, editMode]);

  // En la tienda real, sin imágenes ni demo, no mostramos el bloque vacío.
  // En cualquier preview del dashboard (galería de diseños o edición) sí se
  // muestra como placeholder para que el dueño sepa que existe y lo cargue.
  if (!isPreview && filled.length === 0) return null;

  if (editMode) {
    return (
      <section data-reveal style={{ position: "relative", height, overflow: "hidden", background: bg }}>
        {slots.map((s, i) => {
          const isActive = editSlide === i;
          return (
            <div key={i} style={{ position: "absolute", inset: 0, opacity: isActive ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents: isActive ? "auto" : "none" }}>
              {s.url && (
                <FadeImage src={s.url} alt="" fill sizes="100vw" priority={i === 0}
                  style={{ objectFit: "cover", objectPosition: `${s.ov?.posX ?? 50}% ${s.ov?.posY ?? 50}%` }} />
              )}
              <Overlay ov={s.ov} />
              {isActive && s.isDemo && (
                <span style={{ position: "absolute", top: 16, right: 16, zIndex: 9, background: "rgba(15,23,42,0.75)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                  Imagen de ejemplo
                </span>
              )}
              {isActive && (
                <>
                  <BgDragHandle imgKey={`promoBanner${i + 1}`} />
                  <EditableImageButton field={`promoBanner${i + 1}`} label={`Banner promocional ${i + 1}`} />
                </>
              )}
            </div>
          );
        })}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <button key={i} onClick={() => setEditSlide(i)} aria-label={`Editar banner ${i + 1}`} style={{
              width: editSlide === i ? 24 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
              background: editSlide === i ? accent : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.3s",
            }} />
          ))}
        </div>
        {([[-1, "left"], [1, "right"]] as const).map(([dir, side]) => (
          <button key={side} aria-label={dir === -1 ? "Banner anterior" : "Banner siguiente"}
            onClick={() => setEditSlide((editSlide + dir + SLOT_COUNT) % SLOT_COUNT)}
            style={arrowStyle(side)}>
            {dir === -1 ? "‹" : "›"}
          </button>
        ))}
      </section>
    );
  }

  return (
    <section data-reveal style={{ position: "relative", height, overflow: "hidden", background: bg }}>
      {filled.map((s, idx) => {
        const isActive = publicSlide === idx;
        return (
          <div key={s.i} style={{ position: "absolute", inset: 0, opacity: isActive ? 1 : 0, transition: "opacity 0.8s ease" }}>
            {/* Sin priority: este banner siempre va debajo del hero, que ya es
                la imagen prioritaria (LCP) de la página — cargarlo eager acá
                compite por ancho de banda con el hero sin necesidad. */}
            <FadeImage src={s.url} alt="" fill sizes="100vw"
              style={{ objectFit: "cover", objectPosition: `${s.ov?.posX ?? 50}% ${s.ov?.posY ?? 50}%` }} />
            <Overlay ov={s.ov} />
          </div>
        );
      })}
      {filled.length > 1 && (
        <>
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
            {filled.map((_, idx) => (
              <button key={idx} onClick={() => { setPublicSlide(idx); if (intervalRef.current) clearInterval(intervalRef.current); }} aria-label={`Banner ${idx + 1}`} style={{
                width: publicSlide === idx ? 24 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
                background: publicSlide === idx ? accent : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.3s",
              }} />
            ))}
          </div>
          {([[-1, "left"], [1, "right"]] as const).map(([dir, side]) => (
            <button key={side} aria-label={dir === -1 ? "Banner anterior" : "Banner siguiente"}
              onClick={() => { setPublicSlide(s => (s + dir + filled.length) % filled.length); if (intervalRef.current) clearInterval(intervalRef.current); }}
              style={arrowStyle(side)}>
              {dir === -1 ? "‹" : "›"}
            </button>
          ))}
        </>
      )}
    </section>
  );
}
