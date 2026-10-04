"use client";
import { useMemo } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { EditableZone, EditableImageButton, BgDragHandle, useEditContext } from "@/contexts/EditContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { TarjetaAurora, type TintaTarjeta } from "@/components/store/templates/aurora/TarjetaAurora";
import { TITULO } from "@/components/store/templates/aurora/fuentes";
import type { EscenaCatalogo } from "@/components/store/templates/aurora/CatalogoAurora";

/* ══════════════════════════════════════════════════════════════════════════
   COLECCIÓN EN FOCO (B-1 de AURORA.md)
   ══════════════════════════════════════════════════════════════════════════

   Una sola colección —una categoría de la tienda— contada como una escena:
   su foto de fondo bajo la luz de Aurora, el nombre grande, cuántas piezas
   tiene y tres de ellas flotando a distintas alturas. Sirve para empujar UNA
   cosa ("Denim", "Otoño") en vez de mostrar todo mezclado, que es lo único
   que la portada sabía hacer.

   La dueña elige cuál en el editor (se guarda como el override
   `coleccionFoco`, igual que el carrusel guarda el suyo). Sin elegir, va la
   categoría con más productos: el bloque nunca arranca vacío.

   La foto de fondo es suya (`coleccionImagen`); sin foto, la de la primera
   pieza de la colección. Nunca una de stock — misma regla que el hero. */

export function ColeccionEnFoco({
  products, categorias, promotions, fmt, ocultarPrecios, favorites, onFavorito, onAbrir,
  onVerColeccion, tinta, escena, isMobile,
}: {
  products: StorefrontProduct[];
  /** Las categorías que la tienda tiene de verdad (las del mazo de la vidriera). */
  categorias: string[];
  promotions: ActivePromotion[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  favorites: string[];
  onFavorito: (id: string) => void;
  onAbrir: (p: StorefrontProduct, e: React.MouseEvent) => void;
  onVerColeccion: (categoria: string) => void;
  tinta: TintaTarjeta;
  escena: EscenaCatalogo;
  isMobile: boolean;
}) {
  const { BG, T, GT, LINEA_FUERTE, luz, G, textoSobreAcento } = escena;
  const { editMode, overrides, setOverride, vistaCelular } = useEditContext();
  const config = useStoreConfig();

  /* Cuál: la elegida, si todavía existe; si no, la que más productos tiene. */
  const cuenta = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of products) if (p.category) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [products]);
  const elegida = overrides["coleccionFoco"]?.text;
  const categoria = elegida && categorias.includes(elegida)
    ? elegida
    : [...categorias].sort((a, b) => (cuenta[b] ?? 0) - (cuenta[a] ?? 0))[0];

  const piezas = useMemo(
    () => products.filter(p => p.category === categoria && p.images[0]).slice(0, 3),
    [products, categoria],
  );
  if (!categoria || piezas.length === 0) return null;

  const total = cuenta[categoria] ?? piezas.length;
  const nombre = categoria.charAt(0).toUpperCase() + categoria.slice(1);
  const fotoOv = config?.imageOverrides?.["coleccionImagen"];
  const foto = fotoOv?.url ?? piezas[0].images[0];
  const posicion = `${fotoOv?.posX ?? 50}% ${fotoOv?.posY ?? 40}%`;

  return (
    <section data-reveal style={{ position:"relative", overflow:"hidden", background:BG, borderTop:`1px solid ${LINEA_FUERTE}`, borderBottom:`1px solid ${LINEA_FUERTE}` }}>
      {/* ── El fondo: la foto de la colección, apagada hacia el texto ── */}
      <div aria-hidden style={{ position:"absolute", inset:0 }}>
        <FadeImage src={foto} alt="" fill sizes="100vw" style={{ objectFit:"cover", objectPosition:posicion, opacity:0.55, filter:"saturate(0.9)" }} />
        <div style={{ position:"absolute", inset:0, background: isMobile
          ? `linear-gradient(180deg, ${BG}55 0%, ${BG}cc 55%, ${BG} 100%)`
          : `linear-gradient(90deg, ${BG} 0%, ${BG}e6 34%, ${BG}a6 68%, ${BG}cc 100%)` }} />
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(45% 60% at ${isMobile ? "50% 20%" : "22% 50%"}, ${luz(0.28)}, transparent 70%)` }} />
      </div>
      <BgDragHandle imgKey="coleccionImagen" />
      <EditableImageButton field="coleccionImagen" label="Foto de la colección" />

      {/* La colección se elige en el editor, como el mazo del carrusel. */}
      {editMode && !vistaCelular && categorias.length > 0 && (
        <label style={{ position:"absolute", top:16, left:16, zIndex:6, display:"flex", alignItems:"center", gap:8, background:"rgba(14,15,26,0.85)", backdropFilter:"blur(14px)", border:`1px solid ${LINEA_FUERTE}`, color:T, borderRadius:999, padding:"6px 8px 6px 14px", fontSize:11, letterSpacing:1, fontWeight:600 }}>
          🎯 Colección
          <select value={categoria} onChange={e => setOverride("coleccionFoco", { text: e.target.value })}
            style={{ background:"rgba(0,0,0,.35)", color:T, border:"1px solid rgba(255,255,255,.2)", borderRadius:999, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>
            {categorias.map(c => <option key={c} value={c} style={{ color:"#f2f2f7", background:"#14151f" }}>{c}</option>)}
          </select>
        </label>
      )}

      <div style={{ position:"relative", maxWidth:1320, margin:"0 auto", padding: isMobile ? "64px 0 44px" : "110px 40px",
        display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,0.85fr) minmax(0,1.15fr)", gap: isMobile ? 30 : 48, alignItems:"center" }}>
        {/* ── El texto ── */}
        <div style={{ padding: isMobile ? "0 20px" : 0, maxWidth:520 }}>
          <p style={{ margin:"0 0 16px", fontSize:10, letterSpacing:5, textTransform:"uppercase", color:GT, fontWeight:700 }}>
            <EditableZone field="coleccionKicker" label="Etiqueta de la colección">Colección en foco</EditableZone>
          </p>
          <h2 style={{ margin:"0 0 18px", fontFamily:TITULO, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.02,
            fontSize: isMobile ? "clamp(30px,10vw,46px)" : "clamp(34px,4.4vw,76px)", color:T, overflowWrap:"break-word" }}>
            {nombre}
          </h2>
          <p style={{ margin:"0 0 28px", fontSize:14, lineHeight:1.75, color:"rgba(242,242,247,0.68)", maxWidth:440 }}>
            <EditableZone field="coleccionTexto" label="Texto de la colección">Una selección pensada para combinarse entre sí. Piezas que se eligen juntas y se usan todo el año.</EditableZone>
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
            <button onClick={() => onVerColeccion(categoria)}
              style={{ background:G, color:textoSobreAcento, border:"none", borderRadius:999, padding:"14px 30px", fontSize:11, letterSpacing:2.5, fontWeight:700, textTransform:"uppercase", cursor:"pointer", boxShadow:`0 0 32px ${luz(0.45)}` }}>
              <EditableZone field="coleccionCta" label="Botón de la colección">Ver la colección</EditableZone>
            </button>
            <span style={{ fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"rgba(242,242,247,0.68)", fontVariantNumeric:"tabular-nums" }}>
              {total} {total === 1 ? "pieza" : "piezas"}
            </span>
          </div>
        </div>

        {/* ── Las piezas, flotando a distintas alturas ──
            En la compu, escalonadas: la del medio baja, como si estuvieran a
            distintas distancias. En el celular, en fila que se desliza. */}
        {isMobile ? (
          <div style={{ display:"flex", gap:12, overflowX:"auto", scrollSnapType:"x mandatory", padding:"4px 20px 8px", scrollbarWidth:"none", perspective:"1200px" }}>
            {piezas.map((p, i) => (
              <div key={p.id} style={{ flex:"0 0 62%", scrollSnapAlign:"start" }}>
                <TarjetaAurora product={p} indice={i} promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
                  favorito={favorites.includes(p.id)} onFavorito={() => onFavorito(p.id)} onAbrir={e => onAbrir(p, e)} tinta={tinta} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${piezas.length}, minmax(0,270px))`, justifyContent:"center", gap:20, alignItems:"start", perspective:"1400px" }}>
            {piezas.map((p, i) => (
              <div key={p.id} style={{ marginTop: i === 1 ? 70 : i === 2 ? 26 : 0 }}>
                <TarjetaAurora product={p} indice={i} promotions={promotions} fmt={fmt} ocultarPrecios={ocultarPrecios}
                  favorito={favorites.includes(p.id)} onFavorito={() => onFavorito(p.id)} onAbrir={e => onAbrir(p, e)} tinta={tinta} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
