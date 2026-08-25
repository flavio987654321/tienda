"use client";
import { useState, useEffect, useRef } from "react";
import { FadeImage } from "./FadeImage";
import { EditableImageButton, BgDragHandle, useEditContext } from "@/contexts/EditContext";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
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

// Los puntos de abajo. Sin las flechas en el celular pasan a ser el único botón
// del carrusel, y una barrita de 8px de alto es imposible de tocar con el dedo.
// Así que el botón NO es la barrita: es una caja transparente de 16×32 con la
// barrita adentro. Se ve exactamente igual que antes —la separación de 8px entre
// puntos ahora la dan los 4px de padding de cada lado en vez del `gap`, y el
// `bottom` baja de 16 a 4 para compensar los 12 de padding de arriba, así el
// punto queda a los mismos 16px del borde— pero se puede tocar.
const dotsRow: React.CSSProperties = {
  position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
  display: "flex", gap: 0, zIndex: 10,
};
const dotHit: React.CSSProperties = {
  border: "none", background: "none", padding: "12px 4px", cursor: "pointer", lineHeight: 0,
};
const dotStyle = (activo: boolean, accent: string): React.CSSProperties => ({
  display: "block", width: activo ? 24 : 8, height: 8, borderRadius: 4,
  background: activo ? accent : "rgba(255,255,255,0.5)", transition: "all 0.3s",
});

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

  // Swipe táctil en la tienda real (mobile): el carrusel es fade por opacidad, no
  // un scroll nativo, así que sin esto en el celular solo se pasa con flechas/puntos.
  // Igual que las flechas, cortar el auto-avance al interactuar.
  const bannerSwipe = useTouchSwipe(
    () => { setPublicSlide(s => (s + 1) % Math.max(1, filled.length)); if (intervalRef.current) clearInterval(intervalRef.current); },
    () => { setPublicSlide(s => (s - 1 + filled.length) % Math.max(1, filled.length)); if (intervalRef.current) clearInterval(intervalRef.current); }
  );

  useEffect(() => {
    if (editMode || filled.length <= 1) return;
    const len = filled.length;
    const id = setInterval(() => setPublicSlide(s => (s + 1) % len), intervalMs);
    intervalRef.current = id;
    return () => clearInterval(id);
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
                  {/* Este bloque ES un carrusel: sus tres fotos se pasan solas. Con
                      esto el panel de la foto ofrece cada cuantos segundos, al lado
                      de la foto y no escondido en Configuracion avanzada. */}
                  <EditableImageButton field={`promoBanner${i + 1}`} label={`Banner promocional ${i + 1}`} esCarrusel />
                </>
              )}
            </div>
          );
        })}
        <div style={dotsRow}>
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <button key={i} onClick={() => setEditSlide(i)} aria-label={`Editar banner ${i + 1}`} style={dotHit}>
              <span style={dotStyle(editSlide === i, accent)} />
            </button>
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
    <section data-reveal style={{ position: "relative", height, overflow: "hidden", background: bg }} {...(filled.length > 1 ? bannerSwipe : {})}>
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
          <div style={dotsRow}>
            {filled.map((_, idx) => (
              <button key={idx} onClick={() => { setPublicSlide(idx); if (intervalRef.current) clearInterval(intervalRef.current); }} aria-label={`Banner ${idx + 1}`} style={dotHit}>
                <span style={dotStyle(publicSlide === idx, accent)} />
              </button>
            ))}
          </div>
          {/* `promo-banner-arrow` las esconde donde hay dedo — el porqué está en
              globals.css. Va sólo acá, no en la rama de edición. */}
          {([[-1, "left"], [1, "right"]] as const).map(([dir, side]) => (
            <button key={side} className="promo-banner-arrow" aria-label={dir === -1 ? "Banner anterior" : "Banner siguiente"}
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
