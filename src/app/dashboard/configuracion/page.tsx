"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import type { StoreConfig, TextOverride, ImageOverride, TemplateId } from "@/types/store-config";
import { DEFAULT_CONFIG, TEMPLATES_WITH_CAROUSEL, TEMPLATE_DEFAULTS, TEMPLATE_NAV_BG, SECTION_BG_PHOTO } from "@/types/store-config";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext, useEditContext, getContrastColor } from "@/contexts/EditContext";
import { parseColor, toHex, contrastRatio, nearestLegible, MIN_LEGIBLE, MIN_LEGIBLE_GRANDE } from "@/lib/contrast";
import { parseBg, serializeBg, extremo, extremosDe, DIR_LABELS, type SectionBg, type BgDir, type BgHacia } from "@/lib/section-bg";
import { TEMPLATE_CATEGORIES, type TemplateInfo } from "@/lib/templateRegistry";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

/* ── Types ─────────────────────────────────────────────────── */
type Mode = "gallery" | "preview" | "editing";

type Category = { id: string; name: string; templates: TemplateInfo[] };

/* ── Template registry ─────────────────────────────────────── */
const CATEGORIES: Category[] = TEMPLATE_CATEGORIES;

/* ── Consejos por campo de imagen ──────────────────────────────────────────────
   Sólo consejos: los TÍTULOS los pone cada `<EditableImageButton>` y llegan por
   `data-edit-label`. Antes este mapa titulaba además el panel, y esa parte se cayó
   porque se olvidaba — `heroBanner1/2/3` de Chic Paris nunca tuvo entrada y el panel
   se titulaba "heroBanner1" en la cara del dueño de la tienda.

   Los consejos sí siguen acá, y a propósito: no dependen del template sino de qué
   ES el campo. "Foto de tu equipo, taller o espacio" vale igual en los diez, y
   repetirlo en cada uno sería la duplicación que acabamos de sacar, al revés.

   Están sólo los que dicen algo que el título no dice ya. "Foto del departamento"
   abajo de un panel titulado "Departamento 3 — imagen" no es ayuda, es relleno; y
   el que aprende que la ayuda es relleno deja de leerla el día que importa.
   Las medidas no hace falta escribirlas: el panel mide el hueco real y calcula la
   recomendada solo (ver `recomendado`). Las que quedan acá son el respaldo por si
   no llega a medir, y se descartan solas cuando sí. */
const IMAGE_FIELD_TIPS: Record<string, string> = {
  heroBackground: "Recomendado: 1920×1080px horizontal. Capa oscura para fotos claras, capa clara para fotos oscuras.",
  nosotrosImage:  "Foto de tu equipo, taller o espacio. Recomendado: 900×700px horizontal.",
  megaMenuImage:  "Foto decorativa que se ve al abrir el menú de departamentos. Recomendado: 600×500px.",
  // El "sin texto" es una restricción real, no un adorno: el carrusel recorta el
  // banner distinto en cada ancho y cualquier letra incrustada se corta sola.
  ...Object.fromEntries(Array.from({ length: 3 }, (_, i) => [
    `promoBanner${i + 1}`,
    "Recomendado: 1920×600px horizontal (imagen panorámica, sin texto).",
  ])),
};

/* Los títulos del editor de textos NO se listan acá: cada `<EditableZone>` trae el
   suyo y lo manda al abrirse (ver `activeLabel` en EditContext). Un mapa en este
   archivo se desincronizaba del template y no había forma de notarlo hasta verlo
   en pantalla. */

/* ── Thumbnail (real template scaled) ─────────────────────── */
const THUMB_W = 230;
const VIRTUAL_W = 1080;
const SCALE = THUMB_W / VIRTUAL_W;
const THUMB_H = 162;
const VIRTUAL_H = THUMB_H / SCALE;

function TemplateThumbnail({ component: Component }: { component: React.ComponentType }) {
  return (
    <div style={{ width: THUMB_W, height: THUMB_H, overflow: "hidden", position: "relative",
      borderRadius: "10px 10px 0 0", background: "#f8fafc" }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: VIRTUAL_W, height: VIRTUAL_H,
        transform: `scale(${SCALE})`, transformOrigin: "top left",
        pointerEvents: "none", userSelect: "none",
      }}>
        <Component />
      </div>
    </div>
  );
}

/* ── Template card ──────────────────────────────────────────── */
function TemplateCard({ t, isSaved, disabled, onSelect, onGoToEditing }: {
  t: TemplateInfo;
  isSaved?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onGoToEditing?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    if (isSaved && onGoToEditing) return onGoToEditing();
    onSelect();
  };
  const tags = t.desc.split(" · ");
  return (
    <div
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        flexShrink: 0, width: THUMB_W, borderRadius: 14, overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        border: "2px solid",
        borderColor: disabled ? "#e2e8f0" : isSaved ? "#059669" : hovered ? "#6366f1" : "#e2e8f0",
        background: "white", transition: "all 0.22s ease",
        opacity: disabled ? 0.45 : 1,
        boxShadow: disabled ? "none"
          : isSaved ? "0 6px 20px rgba(5,150,105,0.22)"
          : hovered ? "0 10px 30px rgba(99,102,241,0.2)" : "0 2px 10px rgba(0,0,0,0.08)",
        transform: !disabled && hovered ? "translateY(-4px)" : "none",
        position: "relative",
        filter: disabled ? "grayscale(1)" : "none",
      }}>
      {isSaved && !disabled && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: "#059669", color: "white", borderRadius: 20,
          fontSize: 9, fontWeight: 800, padding: "3px 8px", letterSpacing: 0.5,
          boxShadow: "0 2px 8px rgba(5,150,105,0.5)",
        }}>
          ✓ Tu diseño
        </div>
      )}
      {disabled && (
        <div style={{
          position: "absolute", top: 10, left: 10, right: 10, zIndex: 2,
          background: "rgba(0,0,0,0.72)", color: "white", borderRadius: 8,
          fontSize: 9, fontWeight: 700, padding: "5px 8px", textAlign: "center",
          letterSpacing: 0.4, backdropFilter: "blur(4px)",
        }}>
          No disponible para tu rubro
        </div>
      )}
      {/* hover overlay on thumbnail */}
      {!disabled && hovered && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: THUMB_H, zIndex: 1,
          background: isSaved ? "rgba(5,150,105,0.12)" : "rgba(99,102,241,0.1)",
          transition: "all 0.2s",
        }} />
      )}
      <TemplateThumbnail component={t.component} />
      <div style={{ padding: "12px 14px 14px" }}>
        {/* palette + name row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>{t.name}</p>
          <div style={{ display: "flex", gap: 3 }}>
            {t.palette.map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c,
                border: "1.5px solid rgba(0,0,0,0.1)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
            ))}
          </div>
        </div>
        {/* tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
              background: i === 0 ? "#f1f5f9" : "#f8fafc",
              color: i === 0 ? "#475569" : "#94a3b8",
              border: "1px solid #e2e8f0", letterSpacing: 0.3, textTransform: "uppercase",
            }}>{tag}</span>
          ))}
        </div>
        {!disabled && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "7px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: isSaved
              ? (hovered ? "#059669" : "#dcfce7")
              : hovered ? "#6366f1" : "#f8fafc",
            color: isSaved
              ? (hovered ? "white" : "#059669")
              : hovered ? "white" : "#64748b",
            border: `1px solid ${isSaved ? (hovered ? "#059669" : "#bbf7d0") : hovered ? "#6366f1" : "#e2e8f0"}`,
            transition: "all 0.2s",
          }}>
            {isSaved
              ? (hovered ? "Editar diseño →" : "✓ Editar diseño")
              : (hovered ? "Ver diseño →" : "Ver diseño")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Carousel row ───────────────────────────────────────────── */
const CARD_GAP = 16;
const VISIBLE_CARDS = 3;
const CLIP_WIDTH = VISIBLE_CARDS * THUMB_W + (VISIBLE_CARDS - 1) * CARD_GAP;

function CarouselArrow({ dir, onClick, disabled }: { dir: "l" | "r"; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  const active = !disabled && hov;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0,
        width: 44, height: 44, borderRadius: "50%",
        border: active ? "2px solid #6366f1" : "2px solid #e2e8f0",
        background: active ? "#6366f1" : disabled ? "#f8fafc" : "white",
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? "0 4px 18px rgba(99,102,241,0.35)" : "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 0.18s ease",
        opacity: disabled ? 0.35 : 1,
      }}>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        {dir === "l"
          ? <polyline points="10,3 5,8 10,13" stroke={active ? "white" : "#64748b"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
          : <polyline points="6,3 11,8 6,13" stroke={active ? "white" : "#64748b"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
    </button>
  );
}

function CarouselRow({ templates, savedTemplateId, storeTipoTienda, onSelect, onGoToEditing }: {
  templates: TemplateInfo[];
  savedTemplateId?: string | null;
  storeTipoTienda?: string;
  onSelect: (t: TemplateInfo) => void;
  onGoToEditing?: (t: TemplateInfo) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const step = THUMB_W + CARD_GAP;

  const scroll = (dir: "l" | "r") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "l" ? -step : step, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (scrollRef.current) setScrollPos(scrollRef.current.scrollLeft);
  };

  const totalWidth = templates.length * THUMB_W + (templates.length - 1) * CARD_GAP;
  const atStart = scrollPos <= 4;
  const atEnd = scrollPos >= totalWidth - CLIP_WIDTH - 4;
  const showArrows = templates.length > VISIBLE_CARDS;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 6 }}>
      {showArrows
        ? <CarouselArrow dir="l" onClick={() => scroll("l")} disabled={atStart} />
        : <div style={{ width: 44 }} />}

      {/* clip wrapper — hides partial cards */}
      <div style={{ width: CLIP_WIDTH, overflow: "hidden", flexShrink: 0 }}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: "flex", gap: CARD_GAP,
            overflowX: "auto", scrollbarWidth: "none",
            scrollSnapType: "x mandatory",
          }}>
          {templates.map(t => {
            const isDisabled = !!storeTipoTienda && !t.tipoTiendas.includes(storeTipoTienda);
            return (
              <div key={t.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <TemplateCard
                  t={t}
                  isSaved={savedTemplateId === t.id}
                  disabled={isDisabled}
                  onSelect={() => onSelect(t)}
                  onGoToEditing={onGoToEditing ? () => onGoToEditing(t) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {showArrows
        ? <CarouselArrow dir="r" onClick={() => scroll("r")} disabled={atEnd} />
        : <div style={{ width: 44 }} />}
    </div>
  );
}

/* ── Browser frame wrapper ──────────────────────────────────── */
function BrowserFrame({ storeName, children }: { storeName: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "clip" }}>
      <div style={{ background: "#1e293b", padding: "10px 16px", display: "flex",
        alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28ca41" }} />
        </div>
        <div style={{ flex: 1, background: "#0f172a", borderRadius: 6, padding: "5px 14px",
          fontSize: 12, color: P.muted, textAlign: "center", userSelect: "none" }}>
          mitienda.com/tienda/{storeName.toLowerCase().replace(/\s+/g, "-")}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", transform: "translateZ(0)" }}>
        <div style={{ height: "100%", overflowY: "auto", overflowX: "clip" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} aria-label="toggle"
      style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        padding: 2, background: value ? "#6366f1" : "#cbd5e1", position: "relative",
        transition: "background 0.2s", flexShrink: 0 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "white",
        position: "absolute", top: 2, left: value ? 22 : 2, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "block" }} />
    </button>
  );
}

/* ── Config avanzada modal ──────────────────────────────────── */
/* ── Flyer image slot (upload individual) ──────────────────── */
function FlyerImageSlot({ url, slot, onUpload, onRemove }: {
  url?: string;
  slot: number;
  onUpload: (slot: number, url: string) => void;
  onRemove: (slot: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `tienda-imagenes/flyer-${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tienda-imagenes").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("tienda-imagenes").getPublicUrl(path);
      onUpload(slot, data.publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [slot, onUpload]);

  return (
    <div style={{ border: "1.5px dashed #e2e8f0", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, background: "white" }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {url ? (
        <>
          <img src={url} alt="" style={{ width: 40, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Flyer {slot + 1}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Imagen cargada ✓</p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", color: P.muted, whiteSpace: "nowrap" }}>
            Cambiar
          </button>
          <button onClick={() => onRemove(slot)}
            style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #fecaca", borderRadius: 6, background: "white", cursor: "pointer", color: "#ef4444", whiteSpace: "nowrap" }}>
            Quitar
          </button>
        </>
      ) : (
        <>
          <div style={{ width: 40, height: 54, background: "#f8fafc", borderRadius: 6, border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, color: "#cbd5e1" }}>
            🖼
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: P.muted }}>Flyer {slot + 1}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#cbd5e1" }}>Sin imagen</p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: 6, background: uploading ? "#f8fafc" : "white", cursor: uploading ? "default" : "pointer", color: P.muted, whiteSpace: "nowrap" }}>
            {uploading ? "Subiendo…" : "Subir imagen"}
          </button>
        </>
      )}
      {error && <span style={{ fontSize: 10, color: "#ef4444", flexShrink: 0 }}>⚠ {error}</span>}
    </div>
  );
}

/* ── Config avanzada modal ──────────────────────────────────── */
function ConfigModal({ config, update, onClose, onSave, onDelete, storeSlug, isPremium }: {
  config: StoreConfig;
  update: <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete: () => void;
  storeSlug?: string | null;
  isPremium?: boolean;
}) {
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // `undefined` = este template no deja tocar el nav, y entonces el bloque entero
  // no se dibuja. Si deja, este es el color que muestra el selector mientras nadie
  // haya elegido otro.
  const navBgDeFabrica = TEMPLATE_NAV_BG[config.template];

  useEffect(() => {
    if (!storeSlug) return;
    fetch(`/api/public/${storeSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const cats: string[] = [...new Set(
          (data?.store?.products ?? [])
            .map((p: { category?: string }) => p.category)
            .filter((c: string | undefined) => c && c !== "general")
        )] as string[];
        setAvailableCategories(cats);
      })
      .catch(() => {});
  }, [storeSlug]);

  function toggleFeaturedCategory(cat: string) {
    const current = config.featuredCategories ?? [];
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    update("featuredCategories", next);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
    borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", color: "#111", background: "white",
    transition: "border-color 0.15s",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600, color: "#555",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4,
  };
  const sec: React.CSSProperties = {
    background: "#f8fafc", borderRadius: 12, padding: "16px 18px", marginBottom: 12,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99990,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }} onClick={onClose}>
      <div style={{
        background: "white", borderRadius: 18, width: "100%", maxWidth: 480,
        maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Configuración avanzada</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: P.muted }}>Usá &quot;Guardar y cerrar&quot; para que los cambios queden guardados</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 18, color: P.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>

          <p style={{ margin: "4px 0 10px", fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: 1 }}>Apariencia</p>

          {/* Colores */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              🎨 Color de acento
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={config.colors.accent}
                onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                style={{ width: 40, height: 38, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
              <input style={{ ...inp, fontFamily: "monospace" }} value={config.colors.accent}
                onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                onFocus={e => (e.target.style.borderColor = "#6366f1")}
                onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: P.muted }}>Afecta botones, precios y elementos destacados.</p>
          </div>

          {/* Color nav — sólo los templates que lo declaran en TEMPLATE_NAV_BG */}
          {navBgDeFabrica && (
            <div style={sec}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                🧭 Color de la barra de navegación
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color"
                  value={config.sectionColors?.["navBg"] ?? navBgDeFabrica}
                  onChange={e => update("sectionColors", { ...config.sectionColors, navBg: e.target.value })}
                  style={{ width: 40, height: 38, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                <input style={{ ...inp, fontFamily: "monospace" }}
                  value={config.sectionColors?.["navBg"] ?? navBgDeFabrica}
                  onChange={e => update("sectionColors", { ...config.sectionColors, navBg: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                {config.sectionColors?.["navBg"] && (
                  <button onClick={() => { const next = { ...config.sectionColors }; delete next["navBg"]; update("sectionColors", next); }}
                    style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 12, color: P.muted, whiteSpace: "nowrap" }}>
                    ↺ Reset
                  </button>
                )}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: P.muted }}>El texto y los íconos del nav se adaptan automáticamente al color elegido.</p>
            </div>
          )}

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: 1 }}>Contacto y comunicación</p>

          {/* WhatsApp */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              💬 WhatsApp
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Botón flotante</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: P.muted }}>Visible en todas las páginas</p>
                </div>
                <Toggle value={config.whatsapp.enabled}
                  onChange={v => update("whatsapp", { ...config.whatsapp, enabled: v })} />
              </div>
              {config.whatsapp.enabled && (
                <>
                  <div>
                    <label style={lbl}>Número</label>
                    <input style={inp} value={config.whatsapp.number}
                      placeholder="+54 9 11 0000-0000"
                      onChange={e => update("whatsapp", { ...config.whatsapp, number: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  </div>
                  <div>
                    <label style={lbl}>Mensaje de bienvenida</label>
                    <input style={inp} value={config.whatsapp.message ?? ""}
                      placeholder="Hola! Me gustaría consultar sobre sus productos 😊"
                      onChange={e => update("whatsapp", { ...config.whatsapp, message: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: P.muted }}>Texto que se pre-carga cuando el cliente hace click en el botón</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Barra de promoción */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              📢 Barra de promoción
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Mostrar barra</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: P.muted }}>Franja promocional en la parte superior</p>
                </div>
                <Toggle value={config.promoBanner?.enabled !== false}
                  onChange={v => update("promoBanner", { enabled: v })} />
              </div>
              {config.promoBanner?.enabled !== false && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {([
                    ["🚚 Envío gratis en compras mayores a $30.000", "Mensaje 1"],
                    ["🔄 Cambios sin cargo hasta 30 días",           "Mensaje 2"],
                    ["💳 6 cuotas sin interés",                      "Mensaje 3"],
                  ] as const).map(([ph, lbTxt], i) => (
                    <div key={i}>
                      <label style={lbl}>{lbTxt}</label>
                      <input style={inp}
                        maxLength={120}
                        value={config.promoBanner?.messages?.[i] ?? ""}
                        placeholder={ph}
                        onChange={e => {
                          const msgs = [...(config.promoBanner?.messages ?? ["", "", ""])];
                          msgs[i] = e.target.value;
                          update("promoBanner", { enabled: config.promoBanner?.enabled !== false, ...config.promoBanner, messages: msgs });
                        }}
                        onFocus={e => (e.target.style.borderColor = "#6366f1")}
                        onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                    </div>
                  ))}
                  <p style={{ margin: 0, fontSize: 11, color: P.muted }}>Los mensajes vacíos no se muestran. Se rotan automáticamente cada 3.5 seg.</p>
                </div>
              )}
            </div>
          </div>

          {/* Redes sociales */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              🔗 Redes sociales
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                ["instagram", "📸 Instagram",  "https://instagram.com/tutienda"],
                ["facebook",  "👤 Facebook",   "https://facebook.com/tutienda"],
                ["tiktok",    "🎵 TikTok",     "https://tiktok.com/@tutienda"],
                ["youtube",   "▶ YouTube",     "https://youtube.com/@tutienda"],
                ["pinterest", "📌 Pinterest",  "https://pinterest.com/tutienda"],
              ] as const).map(([key, label, ph]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input style={inp} value={config.socialLinks?.[key] ?? ""}
                    placeholder={ph}
                    onChange={e => update("socialLinks", { ...config.socialLinks, [key]: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
              ))}
            </div>
          </div>

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: 1 }}>Configuración de la tienda</p>

          {/* Moneda & Idioma */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              💱 Moneda &amp; Idioma
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Moneda</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ARS", "USD"] as const).map(c => (
                    <button key={c} type="button" onClick={() => update("currency", c)}
                      style={{ flex: 1, padding: "9px",
                        border: `2px solid ${config.currency === c ? "#6366f1" : "#e2e8f0"}`,
                        borderRadius: 8, background: config.currency === c ? "#f0f0ff" : "white",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        color: config.currency === c ? "#6366f1" : "#64748b" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Idioma</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([["ES", "🇦🇷 Español"], ["EN", "🇺🇸 English"]] as const).map(([l, label]) => (
                    <button key={l} type="button" onClick={() => update("language", l)}
                      style={{ flex: 1, padding: "9px 6px",
                        border: `2px solid ${config.language === l ? "#6366f1" : "#e2e8f0"}`,
                        borderRadius: 8, background: config.language === l ? "#f0f0ff" : "white",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: config.language === l ? "#6366f1" : "#64748b" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Carrusel de banner — solo si el template lo tiene */}
          {TEMPLATES_WITH_CAROUSEL.includes(config.template) && (
            <div style={sec}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                🎠 Carrusel de banner
              </p>
              <div>
                <label style={lbl}>Velocidad de avance: {((config.bannerInterval ?? 4000) / 1000).toFixed(0)}s</label>
                <input type="range" min={2000} max={10000} step={500}
                  value={config.bannerInterval ?? 4000}
                  onChange={e => update("bannerInterval", Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>2s (rápido)</span>
                  <span style={{ fontSize: 11, color: P.muted }}>10s (lento)</span>
                </div>
              </div>
            </div>
          )}

          {/* Mayorista — solo si la tienda tiene ventaMayorista */}
          {config.tieneVentaMayorista && (
            <div style={sec}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                🏭 Venta mayorista
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Ocultar precios al público</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: P.muted }}>Muestra &quot;Consultá precio&quot; — clientes consultan antes de ver valores</p>
                  </div>
                  <Toggle value={config.ocultarPreciosPublico ?? false}
                    onChange={v => update("ocultarPreciosPublico", v)} />
                </div>
                {(config.ocultarPreciosPublico) && (
                  <div style={{ background: "#fef3c7", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#92400e" }}>
                    Los botones de carrito cambian a &quot;Consultar precio&quot; y los visitantes son dirigidos al formulario de contacto. Las vendedoras afiliadas siguen siendo acreditadas por cada consulta generada.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categorías destacadas */}
          {availableCategories.length > 0 && (
            <div style={sec}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                📌 Categorías destacadas
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: P.muted }}>
                Elegí cuáles aparecen como secciones en el inicio. Si no seleccionás ninguna, se muestran todas.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {availableCategories.map(cat => {
                  const active = (config.featuredCategories ?? []).includes(cat);
                  return (
                    <button key={cat} type="button" onClick={() => toggleFeaturedCategory(cat)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${active ? "#6366f1" : "#e2e8f0"}`, background: active ? "#eef2ff" : "white", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#4338ca" : "#374151" }}>{cat}</span>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${active ? "#6366f1" : "#cbd5e1"}`, background: active ? "#6366f1" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {active && <svg width={10} height={10} viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                    </button>
                  );
                })}
              </div>
              {(config.featuredCategories ?? []).length > 0 && (
                <button type="button" onClick={() => update("featuredCategories", [])}
                  style={{ marginTop: 8, width: "100%", padding: "6px", border: "1px solid #e2e8f0", borderRadius: 7, background: "white", color: P.muted, fontSize: 11, cursor: "pointer" }}>
                  Mostrar todas las categorías
                </button>
              )}
            </div>
          )}

          {/* Flyer de publicidad — solo Premium */}
          <div style={sec}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                🪄 Flyer de publicidad
              </p>
              {isPremium ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>★ Premium</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: P.muted, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>Solo Premium</span>
              )}
            </div>

            {!isPremium ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>Disponible en Tienda Premium</p>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#b45309", lineHeight: 1.5 }}>
                  Mostrá un flyer o folleto publicitario cada vez que alguien entra a tu tienda. Perfecto para promociones, lanzamientos y novedades.
                </p>
                <a href="/dashboard/mi-plan" style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textDecoration: "underline" }}>Actualizar a Premium →</a>
              </div>
            ) : (
              <>
                {/* Toggle activar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Activar flyer</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: P.muted }}>Aparece al entrar a la tienda, en cada visita</p>
                  </div>
                  <Toggle
                    value={config.flyerConfig?.enabled ?? false}
                    onChange={v => update("flyerConfig", { enabled: v, images: config.flyerConfig?.images ?? [] })}
                  />
                </div>

                {config.flyerConfig?.enabled && (
                  <>
                    {/* Info */}
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 11, color: "#0369a1", lineHeight: 1.5 }}>
                      📸 <strong>Formato recomendado:</strong> imagen vertical tipo historia de Instagram (1080×1920px). Subí hasta 3 flyers — el visitante puede navegar entre ellos con flechas.
                    </div>

                    {/* Slots de imagen */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[0, 1, 2].map(slot => (
                        <FlyerImageSlot
                          key={slot}
                          slot={slot}
                          url={config.flyerConfig?.images?.[slot]}
                          onUpload={(s, url) => {
                            const next = [...(config.flyerConfig?.images ?? [])];
                            next[s] = url;
                            update("flyerConfig", { enabled: true, images: next.filter(Boolean) as string[] });
                          }}
                          onRemove={(s) => {
                            const next = (config.flyerConfig?.images ?? []).filter((_, i) => i !== s);
                            update("flyerConfig", { enabled: true, images: next });
                          }}
                        />
                      ))}
                    </div>

                    {/* Alerta sin imágenes */}
                    {(config.flyerConfig?.images?.length ?? 0) === 0 && (
                      <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "9px 12px", marginTop: 10, fontSize: 11, color: "#92400e" }}>
                        ⚠ Agregá al menos una imagen para que el flyer sea visible a tus visitantes.
                      </div>
                    )}

                    {/* Info PWA */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", marginTop: 10, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
                      📱 Si tus clientes tienen la tienda instalada como app (PWA), el flyer aparece justo después de la pantalla de carga.
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: 1 }}>Marketing y descubribilidad</p>

          {/* SEO */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              🔍 SEO / Google
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Activar SEO</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: P.muted }}>Mejora la visibilidad en Google</p>
                </div>
                <Toggle value={config.seo.enabled}
                  onChange={v => update("seo", { ...config.seo, enabled: v })} />
              </div>
              {config.seo.enabled && (
                <>
                  <div>
                    <label style={lbl}>Título SEO</label>
                    <input style={inp} value={config.seo.title}
                      placeholder="Mi Tienda - Ropa y Accesorios"
                      onChange={e => update("seo", { ...config.seo, title: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  </div>
                  <div>
                    <label style={lbl}>Descripción</label>
                    <textarea style={{ ...inp, resize: "vertical" }} rows={3}
                      value={config.seo.description}
                      placeholder="Encontrá los mejores productos en nuestra tienda..."
                      onChange={e => update("seo", { ...config.seo, description: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 16px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
          {!confirmingDelete ? (
            <>
              <button
                onClick={async () => { await onSave(); onClose(); }}
                style={{ width: "100%", padding: "11px", border: "none", borderRadius: 10, background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Guardar y cerrar
              </button>
              <button onClick={() => setConfirmingDelete(true)}
                style={{ width: "100%", padding: "9px", border: "1px solid #fecaca", borderRadius: 10,
                  background: "white", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                Eliminar diseño y volver a la galería
              </button>
            </>
          ) : (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>¿Eliminar el diseño?</p>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "#b91c1c", lineHeight: 1.5 }}>
                Se borrará toda la configuración visual y volvés a elegir una plantilla. Los productos y pedidos no se tocan.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmingDelete(false)}
                  style={{ flex: 1, padding: "9px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={onDelete}
                  style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: "#ef4444", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Image field editor (sub-componente con su propio estado) ── */
/* ── Paleta del panel de edición ─────────────────────────────────────────────
   Una sola definición para los tres editores (texto, imagen y fondo). Antes cada
   uno repetía sus propios colores oscuros, así que cambiar el tema significaba
   tocar tres lugares y esperar que no se olvidara ninguno.
   El panel es claro porque convive con la vista previa de la tienda, que casi
   siempre es clara: un bloque oscuro al lado competía con lo que estás mirando en
   vez de acompañarlo. */
const P = {
  bg: "#ffffff",
  bgSoft: "#f8fafc",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  hint: "#94a3b8",
  accent: "#6366f1",
  accentSoft: "#eef2ff",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
};

const panelBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 6, border: `1.5px solid ${P.border}`,
  background: P.bg, color: P.text, cursor: "pointer",
  fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
};
const panelBtnActive: React.CSSProperties = {
  ...panelBtn, border: `1.5px solid ${P.accent}`, background: P.accent, color: "#fff",
};

/** Mismo tope que `textOverrides.text` en el esquema de zod. Los dos se tocan juntos. */
const TEXTO_MAX = 500;

function ImageFieldEditor({
  field, ov, tip, currentOverlay, hasChanges, base, setImageOverride, setActiveField,
}: {
  field: string;
  ov: ImageOverride;
  tip: string | undefined;
  currentOverlay: string;
  hasChanges: boolean;
  base: React.CSSProperties;
  setImageOverride: (field: string, partial: Partial<ImageOverride>) => void;
  setActiveField: (f: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // `uploading` es estado: recién bloquea en el render siguiente. Si se eligen dos
  // fotos rápido, las dos subidas arrancan, y la que termina última gana — que
  // puede ser la PRIMERA. Quedaba puesta una foto distinta de la última elegida,
  // sin ningún error a la vista. El candado tiene que ser sincrónico.
  const subiendo = useRef(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || subiendo.current) return;
    subiendo.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `tienda-imagenes/${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tienda-imagenes").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("tienda-imagenes").getPublicUrl(path);
      setImageOverride(field, { url: data.publicUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir la imagen";
      setUploadError(msg);
    } finally {
      subiendo.current = false;
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [field, setImageOverride]);

  const dk = { color: P.text };
  const dkMuted = { color: P.muted };
  const dkBtn = panelBtn;
  const dkBtnActive = panelBtnActive;

  // ── El hueco real donde va esta foto ───────────────────────────────────────
  // El consejo de medidas estaba escrito a mano y era el mismo siempre, pero el
  // hueco NO es siempre el mismo: cambia según el template y según la pantalla.
  // En una sección vertical el panel recomendaba "horizontal" — justo al revés.
  // Así que en vez de afirmar, se mide.
  //
  // Con ResizeObserver y no con una medición suelta: alcanza con que el dueño
  // pase de escritorio a celular, o achique la ventana, para que el hueco cambie
  // de forma. Si se midiera una sola vez, el consejo quedaría viejo enseguida.
  // Guarda de qué campo es la medida. Al pasar de una imagen a otra, si la nueva
  // no se puede medir, sin esto el panel seguía mostrando —con total seguridad—
  // la recomendación del hueco anterior.
  const [medido, setMedido] = useState<{ campo: string; w: number; h: number } | null>(null);
  const hueco = medido && medido.campo === field ? medido : null;
  useEffect(() => {
    const slot = document.querySelector(`[data-edit-image="${CSS.escape(field)}"]`)?.parentElement;
    if (!slot) return;
    // `observe` dispara una primera vez con el tamaño actual, así que no hace
    // falta medir a mano acá (que además encadenaría un render de más).
    const ro = new ResizeObserver(() => {
      const r = slot.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setMedido(prev => (prev && prev.campo === field && prev.w === w && prev.h === h ? prev : { campo: field, w, h }));
    });
    ro.observe(slot);
    return () => ro.disconnect();
  }, [field]);

  const forma = hueco
    ? hueco.w / hueco.h > 1.25 ? "horizontal"
    : hueco.w / hueco.h < 0.8  ? "vertical"
    : "cuadrada"
    : null;

  /* ── Título y aviso, puestos por el template ───────────────────────────────
     El título del panel de imágenes SIEMPRE sale de acá: cada `EditableImageButton`
     emite `data-edit-label` (su `panelLabel`, o el texto del botón si no lo pasa).
     Antes lo ponía un mapa por nombre de campo en este mismo archivo, y se olvidaba:
     `heroBanner1/2/3` de Chic Paris nunca tuvo entrada y el panel se titulaba
     "heroBanner1" en la pantalla del dueño de la tienda.
     Se leen del mismo elemento que ya se mide dos efectos más arriba (por qué van
     por el DOM y no por el contexto, que los dos cuelgan del mismo provider, está
     explicado en `EditableImageButton`).
     Con `MutationObserver` y no una lectura suelta: en las baldosas de categoría de
     Urban Pulse el dueño puede cambiar la categoría CON el panel abierto, y ahí el
     título y el aviso tienen que seguirla en vez de quedarse hablando de la
     anterior. Lo mismo cuando el carrusel de banner mueve el campo activo de slide. */
  const [delTemplate, setDelTemplate] = useState<{ campo: string; label?: string; note?: string } | null>(null);
  const puesto = delTemplate && delTemplate.campo === field ? delTemplate : null;
  useEffect(() => {
    const el = document.querySelector(`[data-edit-image="${CSS.escape(field)}"]`);
    if (!el) return;
    const leer = () => {
      const label = el.getAttribute("data-edit-label") ?? undefined;
      const note  = el.getAttribute("data-edit-note")  ?? undefined;
      setDelTemplate(prev =>
        (prev && prev.campo === field && prev.label === label && prev.note === note)
          ? prev
          : { campo: field, label, note });
    };
    leer();
    const mo = new MutationObserver(leer);
    mo.observe(el, { attributes: true, attributeFilter: ["data-edit-label", "data-edit-note"] });
    return () => mo.disconnect();
  }, [field]);

  // Se pide el doble del hueco para que no se vea pixelada en pantallas retina,
  // con techo: en un hero ancho, "el doble" serían 3000px y eso solo hace que la
  // tienda cargue lento.
  const recomendado = hueco
    ? (() => {
        const escala = Math.max(1, Math.min(2, 1800 / hueco.w));
        const r = (n: number) => Math.round((n * escala) / 50) * 50;
        return { w: r(hueco.w), h: r(hueco.h) };
      })()
    : null;

  // La parte del tip escrita a mano que hablaba de medidas se cae cuando tenemos
  // la medida de verdad: dos consejos que se contradicen es peor que ninguno.
  // El aviso que pone el template REEMPLAZA al tip del mapa, no se suma: cuando
  // hay uno, el del mapa es justamente el que está equivocado.
  const tipBase = puesto?.note ?? tip;
  const tipSinMedidas = recomendado
    ? (tipBase ?? "").replace(/\s*Recomendad[oa]:[^.]*\.?/i, " ").trim()
    : tipBase;

  // ── Encuadre ───────────────────────────────────────────────────────────────
  // Los diez templates recortan las fotos con `cover` y ya leen `posX`/`posY`
  // para decidir qué parte se ve. El panel nunca lo ofreció: una foto vertical
  // metida en un hero panorámico se recortaba por el centro y no había forma de
  // correrla. Se arrastra sobre la muestra, y las barras quedan para el ajuste
  // fino (y para quien no puede arrastrar).
  // ── Foco por dispositivo (Nivel 2) ─────────────────────────────────────────
  // El banner es a pantalla completa: su recorte cambia mucho entre celular
  // (alto y angosto) y PC (ancho y bajo), y con un solo punto de foco no se puede
  // controlar el recorte en los dos. Para esas imágenes se ofrece un encuadre
  // aparte para celular. En el resto (forma fija, ej. la foto de "Nosotros" 4:5)
  // el toggle no aparece: el recorte es el mismo en celular y PC.
  const esHero = field.startsWith("heroBanner");
  const [modoMobil, setModoMobil] = useState(false);
  const mobil = esHero && modoMobil;
  // En celular el valor arranca del de PC (que es lo que hoy se ve en el celu por
  // el fallback) y se vuelve propio recién cuando se mueve.
  const posX = mobil ? (ov.posXMobile ?? ov.posX ?? 50) : (ov.posX ?? 50);
  const posY = mobil ? (ov.posYMobile ?? ov.posY ?? 50) : (ov.posY ?? 50);
  // El botón "volver al centro" aparece cuando el foco del MODO ACTUAL fue tocado.
  // En celular eso es tener posXMobile/posYMobile propios (no el valor heredado de
  // PC por el fallback); en PC, estar fuera del 50/50. Sin distinguir el modo, en
  // celular el botón aparecía por el valor de PC y al tocarlo no hacía nada.
  const focoModificado = mobil
    ? (ov.posXMobile !== undefined || ov.posYMobile !== undefined)
    : (posX !== 50 || posY !== 50);

  // Medidas reales de la foto. Hacen falta para dos cosas distintas, y sin ellas
  // las barras mienten (ver `sobraX`/`sobraY` acá abajo).
  const [natural, setNatural] = useState<{ url: string; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!ov.url) return;
    const img = new window.Image();
    const url = ov.url;
    img.onload = () => setNatural({ url, w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => { img.onload = null; };
  }, [ov.url]);
  // Se compara la URL en vez de limpiar el estado al cambiar de foto: así no hay
  // un instante mostrando las medidas de la foto anterior.
  const medidas = natural && natural.url === ov.url ? natural : null;

  // ── Cuánto se puede mover, de verdad ───────────────────────────────────────
  // La sección recorta con `cover`: la foto se agranda hasta tapar el hueco, y
  // SOBRA por un solo lado. Una foto más apaisada que el hueco sobra a lo ancho y
  // encaja justo de alto — moverla para arriba o abajo no hace absolutamente
  // nada, por más que la barra se mueva.
  //
  // Y lo que sobra no es del tamaño del hueco: si sobra poco, arrastrar el dedo
  // 100px tiene que mover la foto muchísimo menos que si sobra mucho. Repartir el
  // arrastre sobre el ancho de la caja —que es lo que hacía antes— daba un
  // movimiento que no seguía al dedo: lento cuando sobraba poco, disparado cuando
  // sobraba mucho.
  const propHueco = hueco ? hueco.w / hueco.h : 16 / 9;
  // En modo celular la muestra tiene forma de celular a pantalla completa
  // (~390×844), no la del hueco medido (que en el editor suele ser el de PC).
  const PROP_MOBIL = 390 / 844;
  const propMuestra = mobil ? PROP_MOBIL : propHueco;
  const propFoto = medidas ? medidas.w / medidas.h : null;
  const sobraX = propFoto ? Math.max(0, propFoto / propMuestra - 1) : null;
  const sobraY = propFoto ? Math.max(0, propMuestra / propFoto - 1) : null;
  // Menos de un 2% de sobra es un pelito de nada: la barra se movería entera para
  // correr la foto dos píxeles. Mejor decir que ese eje no se mueve.
  const mueveX = sobraX === null || sobraX > 0.02;
  const mueveY = sobraY === null || sobraY > 0.02;

  const arrastre = useRef<{ x: number; y: number; px: number; py: number; w: number; h: number } | null>(null);
  const topes = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const alArrastrar = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a) return;
    // Se invierte a propósito: uno arrastra LA FOTO, no la ventana. Llevarla a la
    // derecha tiene que mostrar lo que estaba tapado a la izquierda.
    const avanceX = ((e.clientX - a.x) / a.w) * 100;
    const avanceY = ((e.clientY - a.y) / a.h) * 100;
    const nx = mueveX ? topes(a.px - avanceX / (sobraX || 1)) : posX;
    const ny = mueveY ? topes(a.py - avanceY / (sobraY || 1)) : posY;
    // Sin esto, apoyar el dedo y moverlo dos píxeles sobre un eje muerto escribía
    // 50/50 igual: la tienda quedaba marcada como "con cambios sin guardar" por
    // algo que no cambió nada.
    if (nx === posX && ny === posY) return;
    setImageOverride(field, mobil ? { posXMobile: nx, posYMobile: ny } : { posX: nx, posY: ny });
  };

  const capaMuestra = currentOverlay === "none" ? null
    : currentOverlay === "light"
      ? `rgba(255,255,255,${ov.overlayOpacity ?? 0.6})`
      : `rgba(0,0,0,${ov.overlayOpacity ?? 0.6})`;

  return (
    <div data-editor-panel style={{ ...base, display: "flex", flexDirection: "column" }}>
      {/* ── Encabezado ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid #eef1f5", position: "sticky", top: 0, background: P.bg, zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.accent, background: P.accentSoft, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
          📷 {puesto?.label ?? field}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setActiveField(null)} aria-label="Cerrar editor"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, ...dkMuted, flexShrink: 0, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* ── Foto ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Foto</p>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 8, padding: "8px 16px", borderRadius: 7, border: "none", background: uploading ? "#4338ca" : "#6366f1", color: "white", fontSize: 12, fontWeight: 700, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1 }}>
          {uploading ? "Subiendo..." : ov.url ? "Cambiar imagen" : "Elegir imagen"}
        </button>
        {uploadError && <p style={{ margin: "6px 0 0", fontSize: 11, color: P.danger }}>⚠ {uploadError}</p>}

        {recomendado && forma && (
          <div style={{ marginTop: 9, background: P.bgSoft, border: `1px solid ${P.border}`, borderRadius: 8, padding: "9px 11px" }}>
            <p style={{ margin: 0, fontSize: 10.5, color: P.text, lineHeight: 1.5 }}>
              📐 Acá el hueco es <strong>{forma}</strong> ({hueco!.w}×{hueco!.h}).
              Subí una foto <strong>{forma}</strong> de al menos{" "}
              <strong>{recomendado.w}×{recomendado.h}px</strong>.
            </p>
            <p style={{ margin: "5px 0 0", fontSize: 10, color: P.muted, lineHeight: 1.45 }}>
              Esta medida sale del hueco tal como está ahora: cambia según el template y según la
              pantalla. Si vas a mirar la tienda en celular, revisala también ahí.
            </p>
          </div>
        )}

        {tipSinMedidas && <p style={{ margin: "7px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>{tipSinMedidas}</p>}
      </div>

      {/* ── Encuadre ── */}
      {ov.url && (
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Encuadre</p>

        {/* Toggle PC / Celular — solo en el banner, que es la imagen cuya forma
            cambia entre dispositivos. Cada uno guarda su propio foco. */}
        {esHero && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[{ k: false, label: "🖥️ PC" }, { k: true, label: "📱 Celular" }].map(({ k, label }) => (
              <button key={String(k)} onClick={() => setModoMobil(k)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${modoMobil === k ? "#6366f1" : P.border}`, background: modoMobil === k ? "#6366f1" : "transparent", color: modoMobil === k ? "#fff" : P.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        )}
        {mobil && (
          <p style={{ margin: "8px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
            Estás encuadrando cómo se ve el banner <strong>en celular</strong> (pantalla alta y angosta).
            La muestra tiene forma de celular. En PC se encuadra por separado.
          </p>
        )}

        <div
          onPointerDown={e => {
            const r = e.currentTarget.getBoundingClientRect();
            arrastre.current = { x: e.clientX, y: e.clientY, px: posX, py: posY, w: r.width, h: r.height };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={alArrastrar}
          // Se suelta solo si de verdad se había agarrado: liberar una captura que
          // nunca se tomó tira excepción y mata el render del panel entero.
          onPointerUp={e => {
            if (!arrastre.current) return;
            arrastre.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => { arrastre.current = null; }}
          style={{
            position: "relative", marginTop: 8,
            // La muestra copia la forma del hueco de verdad. Dibujarla siempre
            // apaisada mentía justo donde más importa: en un hueco vertical uno
            // encuadra mirando una franja ancha que no existe.
            aspectRatio: mobil ? "390 / 844" : (hueco ? `${hueco.w} / ${hueco.h}` : "16 / 9"),
            // Una muestra alta (celular, o un hueco vertical) se manda por el alto y
            // no por el ancho: si se fijara el ancho al 100%, saldría larguísima,
            // empujaría las barras fuera de la pantalla y habría que scrollear.
            ...((mobil || (hueco && hueco.h > hueco.w))
              ? { height: 260, width: "auto", maxWidth: "100%", marginLeft: "auto", marginRight: "auto" }
              : { width: "100%" }),
            borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden",
            backgroundImage: `url(${ov.url})`, backgroundSize: "cover",
            backgroundPosition: `${posX}% ${posY}%`, backgroundRepeat: "no-repeat",
            cursor: "grab",
            // Sin esto, arrastrar hacia abajo en un celular scrollea el panel en
            // vez de mover la foto.
            touchAction: "none", userSelect: "none",
          }}
        >
          {capaMuestra && <div style={{ position: "absolute", inset: 0, background: capaMuestra, pointerEvents: "none" }} />}
          <span style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            fontSize: 10.5, fontWeight: 700, color: "#fff", background: "rgba(15,23,42,0.55)",
            padding: "4px 9px", borderRadius: 20, pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            ✥ Arrastrá la foto
          </span>
        </div>

        {/* Una barra apagada dice más que una barra que se mueve sin efecto: si
            está viva, se puede mover; si no, se explica por qué no. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, opacity: mueveX ? 1 : 0.4 }}>
          <span style={{ fontSize: 11, ...dkMuted, width: 66, flexShrink: 0 }}>Izq. / Der.</span>
          <input type="range" min={0} max={100} step={1} value={posX} disabled={!mueveX}
            onChange={e => setImageOverride(field, mobil ? { posXMobile: Number(e.target.value) } : { posX: Number(e.target.value) })}
            style={{ flex: 1, minWidth: 0, accentColor: "#6366f1" }} />
          <span style={{ fontSize: 12, fontWeight: 700, ...dk, width: 36, textAlign: "right" }}>{posX}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, opacity: mueveY ? 1 : 0.4 }}>
          <span style={{ fontSize: 11, ...dkMuted, width: 66, flexShrink: 0 }}>Arr. / Abajo</span>
          <input type="range" min={0} max={100} step={1} value={posY} disabled={!mueveY}
            onChange={e => setImageOverride(field, mobil ? { posYMobile: Number(e.target.value) } : { posY: Number(e.target.value) })}
            style={{ flex: 1, minWidth: 0, accentColor: "#6366f1" }} />
          <span style={{ fontSize: 12, fontWeight: 700, ...dk, width: 36, textAlign: "right" }}>{posY}%</span>
        </div>

        {medidas && (!mueveX || !mueveY) && (
          <p style={{ margin: "7px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
            {!mueveX && !mueveY
              ? "Esta foto tiene justo la forma del hueco: entra entera y no hay nada que correr."
              : !mueveX
                ? "De izquierda a derecha no hay nada que mover: la foto entra justa de ancho. Lo que sobra es alto — usá la barra de arriba/abajo."
                : "De arriba a abajo no hay nada que mover: la foto entra justa de alto. Lo que sobra es ancho — usá la barra de izquierda/derecha."}
          </p>
        )}

        {focoModificado && (
          <button onClick={() => setImageOverride(field, mobil ? { posXMobile: undefined, posYMobile: undefined } : { posX: undefined, posY: undefined })}
            style={{ ...dkBtn, marginTop: 8, width: "100%" }}>↺ Volver al centro{mobil ? " (celular)" : ""}</button>
        )}

        <p style={{ margin: "8px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
          La sección recorta la foto para llenarla. Con esto elegís qué parte queda a la vista —
          útil cuando lo importante no está justo en el centro.
          {hueco
            ? " La muestra tiene la forma exacta del hueco, así que lo que ves acá es lo que va a salir."
            : " La sección real puede ser más alta o más ancha que esta muestra; mirá la tienda al lado para confirmar."}
        </p>
      </div>
      )}

      {/* ── Capa + extras ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, ...dkMuted, whiteSpace: "nowrap" }}>Capa:</span>
        {(["none", "dark", "light"] as const).map(t => (
          <button key={t} onClick={() => setImageOverride(field, { overlayType: t })}
            style={currentOverlay === t ? dkBtnActive : dkBtn}>
            {t === "none" ? "Sin capa" : t === "dark" ? "🌑 Oscura" : "☀️ Clara"}
          </button>
        ))}
        {currentOverlay !== "none" && (
          <>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <span style={{ fontSize: 11, ...dkMuted }}>Opacidad</span>
            <input type="range" min={10} max={90} step={5}
              value={Math.round((ov.overlayOpacity ?? 0.6) * 100)}
              onChange={e => setImageOverride(field, { overlayOpacity: Number(e.target.value) / 100 })}
              style={{ width: 90, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 12, fontWeight: 700, ...dk, minWidth: 32 }}>
              {Math.round((ov.overlayOpacity ?? 0.6) * 100)}%
            </span>
          </>
        )}
        {field.startsWith("heroBanner") && (
          <>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={!!ov.hideContent}
                onChange={e => setImageOverride(field, { hideContent: e.target.checked ? true : undefined })}
                style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1", flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, ...dkMuted, whiteSpace: "nowrap" }}>Ocultar texto del slide</span>
            </label>
          </>
        )}
        {(field.startsWith("heroBanner") || field.startsWith("promoBanner")) && (
          <>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <span title="El tiempo de rotación del carrusel se configura en ⚙ Configuración avanzada → Carrusel de banner (es el mismo para los 3 banners)."
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, ...dkMuted, whiteSpace: "nowrap", cursor: "help" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>?</span>
              Velocidad del carrusel: en ⚙ Configuración avanzada
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        {hasChanges && (
          <button onClick={() => setImageOverride(field, { url: undefined, overlayType: undefined, overlayOpacity: undefined, hideContent: undefined, posX: undefined, posY: undefined, posXMobile: undefined, posYMobile: undefined })}
            style={{ ...dkBtn, padding: "5px 12px" }} title="Restablecer">↺ Restablecer</button>
        )}
      </div>

      {/* ── Consejos ── */}
      {/* El consejo cambia según lo que la persona está por hacer: repetir siempre
          lo mismo hace que se deje de leer. */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Consejos</p>
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
          {(!ov.url
            ? [
                forma
                  ? `Este hueco es ${forma}: una foto ${forma} entra casi entera. Si subís una de la forma contraria, la sección le va a recortar los costados para llenarla.`
                  : "Elegí una foto bien iluminada: la sección la estira para llenarla, y una foto chica se ve pixelada.",
                "Evitá fotos con texto adentro — en el celular la sección se angosta y ese texto se corta.",
              ]
            : [
                "Arrastrá la foto para elegir qué parte se ve. Si lo importante está arriba (una cara, un cartel), subí la barra de Arr./Abajo.",
                capaMuestra
                  ? "La capa existe para que el texto se lea. Bajala hasta donde el texto todavía se distinga: cuanta menos capa, más se ve tu foto."
                  : "Sin capa la foto se ve tal cual, pero si tiene zonas claras y oscuras el texto encima va a costar leerlo en alguna.",
                "El hueco cambia de forma entre escritorio y celular. Encuadrá en uno y después pasate al otro para ver si sigue bien.",
              ]
          ).map((consejo, i) => (
            <li key={i} style={{ display: "flex", gap: 7, fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
              <span style={{ flexShrink: 0 }}>💡</span>
              <span>{consejo}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Background + image editor for section bg fields ────────── */
function BgFieldEditor({ field, base, setActiveField, aceptaFoto }: {
  field: string;
  base: React.CSSProperties;
  setActiveField: (f: string | null) => void;
  /** ¿Este template dibuja foto de fondo en ESTA sección? Si no, no se ofrece. */
  aceptaFoto: boolean;
}) {
  const { sectionColors, setSectionColor, imageOverrides, setImageOverride } = useEditContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Mismo candado sincrónico que en el editor de imágenes: dos fotos elegidas
  // rápido lanzaban dos subidas y ganaba la que terminaba última, no la última
  // elegida. Ver el comentario largo allá.
  const subiendo = useRef(false);

  const imgKey = `sectionbg_${field}`;
  const ov: ImageOverride = imageOverrides[imgKey] ?? {};
  const currentOverlay = ov.overlayType ?? "dark";
  const hasImage = !!ov.url;

  // Lo guardado puede ser un color o un degradado. Se lee siempre de vuelta al
  // mismo objeto para que las barras aparezcan donde quedaron la última vez.
  const bg: SectionBg = parseBg(sectionColors[field]);
  const esDegradado = bg.tipo === "degradado";

  // El color que el TEMPLATE trae de fábrica para esta sección. El panel no lo
  // conoce —vive adentro de cada template— así que se lo pregunta al navegador:
  // se busca el botón de "Fondo" de esa sección y se lee el fondo que su
  // contenedor está mostrando. Es el mismo truco que usa el editor de texto para
  // saber sobre qué color está escribiendo.
  const [fondoDeFabrica, setFondoDeFabrica] = useState<string | null>(null);
  const yaTieneColor = !!sectionColors[field];
  useEffect(() => {
    if (yaTieneColor) return; // hay uno elegido: el de fábrica no interesa
    let el = document.querySelector(`[data-edit-bg="${CSS.escape(field)}"]`)?.parentElement ?? null;
    // Se sube hasta encontrar un fondo de verdad. Un `backgroundColor` con alfa 0
    // es "no pinta nada" y se lee como negro: dar eso por bueno haría que un
    // difuminado sobre una sección transparente arrancara del negro.
    while (el) {
      const crudo = getComputedStyle(el).backgroundColor;
      if (!/,\s*0(\.0+)?\s*\)$/.test(crudo)) {
        const rgb = parseColor(crudo);
        if (rgb) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- el color de fábrica solo existe en el DOM ya pintado; leerlo durante el render daría distinto en el servidor y en el cliente. Es un solo set por sección y no se encadena: `yaTieneColor` no cambia por esto.
          setFondoDeFabrica(toHex(rgb));
          return;
        }
      }
      el = el.parentElement;
    }
  }, [field, yaTieneColor]);

  // Prioridad: lo elegido → lo que el template ya muestra → negro. El negro es el
  // último recurso y en la práctica no se usa, pero sin él el input se queda sin
  // valor y React lo convierte en no-controlado.
  const currentColor = (bg.color || fondoDeFabrica || "#0a0a0a").trim();

  const escribir = (next: SectionBg) => setSectionColor(field, serializeBg(next));

  /** Cambiar el color base sin perder el difuminado que ya estaba puesto. */
  const setBase = (color: string) =>
    escribir(esDegradado ? { ...bg, color } : { tipo: "color", color });

  // Al prender el difuminado por primera vez conviene que se note: sobre un fondo
  // oscuro se va hacia claro y al revés. Arrancar siempre "hacia claro" haría que
  // en una sección blanca el primer clic no cambiara nada y pareciera roto.
  const encenderDegradado = (dir: BgDir) =>
    escribir(
      esDegradado
        ? { ...bg, dir }
        : {
            tipo: "degradado", color: currentColor, dir,
            hacia: getContrastColor(currentColor) === "light" ? "claro" : "oscuro",
            fuerza: 35, desde: 0,
          }
    );

  // Los dos extremos del fondo, para poder avisar si el texto se pierde en uno.
  const [extremoA, extremoB] = extremosDe(bg);
  const contrasteA = getContrastColor(extremoA);
  const contrasteB = getContrastColor(extremoB);
  // El template elige el color del texto UNA vez para toda la sección. Si una
  // punta pide texto claro y la otra oscuro, en una de las dos no se va a leer.
  const puntasPeleadas = esDegradado && contrasteA !== contrasteB;

  /** El difuminado más fuerte que no hace que las puntas pidan textos distintos. */
  const maxFuerzaLegible = (color: string, hacia: BgHacia): number => {
    const lado = getContrastColor(color);
    for (let f = 100; f > 0; f -= 5) {
      if (getContrastColor(extremo(color, hacia, f)) === lado) return f;
    }
    return 0;
  };

  const contrast = hasImage
    ? (currentOverlay === "light" ? "dark" : "light")
    : getContrastColor(sectionColors[field] || currentColor);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || subiendo.current) return;
    subiendo.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `tienda-imagenes/${imgKey}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tienda-imagenes").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("tienda-imagenes").getPublicUrl(path);
      setImageOverride(imgKey, { url: data.publicUrl, overlayType: "dark", overlayOpacity: 0.45 });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      subiendo.current = false;
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [imgKey, setImageOverride]);

  const dkBtn = panelBtn;
  const dkBtnActive = panelBtnActive;

  return (
    <div data-editor-panel style={{ ...base, display: "flex", flexDirection: "column" }}>
      {/* ── Encabezado ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid #eef1f5", position: "sticky", top: 0, background: P.bg, zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.accent, background: P.accentSoft, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
          🎨 Fondo
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setActiveField(null)} aria-label="Cerrar editor"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: P.muted, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* ── Color ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Color</p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          {/* El picker nativo solo entiende #rrggbb: si le llega el degradado
              entero se queda en negro y engaña. Por eso todo esto trabaja contra
              el color BASE, y el degradado se arma en la sección de abajo. */}
          <input type="color" value={parseColor(currentColor) ? currentColor : "#0a0a0a"} onChange={e => setBase(e.target.value)}
            style={{ width: 34, height: 32, padding: 2, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
          <input value={currentColor} onChange={e => setBase(e.target.value)} placeholder="#ffffff"
            style={{ flex: 1, minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 9px", fontSize: 12, outline: "none", fontFamily: "monospace", background: "#f8fafc", color: P.text }}
            onFocus={e => (e.target.style.borderColor = "#6366f1")}
            onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
        </div>

        {/* Tonos que funcionan de fondo. Elegir un color a ojo en la rueda es la
            forma más rápida de arruinar una tienda: casi todos los colores puros
            pelean con las fotos de los productos. Estos son neutros y apagados a
            propósito — el color fuerte va en los botones, no en el fondo. */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[
            ["#ffffff", "Blanco"], ["#fafaf8", "Hueso"], ["#f5f0eb", "Crema"],
            ["#f1f5f9", "Gris frío"], ["#e7e5e4", "Gris cálido"],
            ["#1e293b", "Azul noche"], ["#1c1917", "Café oscuro"], ["#0a0a0a", "Negro"],
          ].map(([hex, nombre]) => (
            <button key={hex} type="button" title={nombre}
              onClick={() => setBase(hex)}
              style={{
                width: 30, height: 30, borderRadius: 7, cursor: "pointer", background: hex,
                border: currentColor.toLowerCase() === hex ? `2px solid ${P.accent}` : "1px solid rgba(0,0,0,0.15)",
                boxShadow: currentColor.toLowerCase() === hex ? `0 0 0 2px ${P.accentSoft}` : "none",
              }} />
          ))}
        </div>

        {/* Consecuencia, no solo el dato: se dice qué le pasa al texto. */}
        <p style={{ margin: "10px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
          Con este fondo, los textos de la sección se muestran en{" "}
          <strong style={{ color: P.text }}>{contrast === "light" ? "claro" : "oscuro"}</strong>.
          Se ajusta solo — no hace falta que cambies cada texto.
        </p>
      </div>

      {/* ── Difuminado ── */}
      {/* No se ofrece si hay foto: la foto tapa el color, así que las barras
          moverían algo que no se ve y parecería que están rotas. */}
      {!hasImage && (
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Difuminado</p>

        {/* La muestra es el valor real que se va a guardar, no una imitación:
            si acá se ve raro, en la tienda se va a ver igual de raro. */}
        <div style={{
          marginTop: 8, height: 48, borderRadius: 8, border: "1px solid #e2e8f0",
          // Si todavía no se eligió nada, se muestra el color que trae el template
          // —no un recuadro vacío que no se parece a la sección real.
          background: serializeBg(bg) || currentColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: contrast === "light" ? "#f5f5f5" : "#111111" }}>
            Texto de ejemplo
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {/* Si ya está sin difuminado no hace nada: apretarlo no puede fijar el
              color de fábrica como si lo hubieras elegido vos —después no habría
              forma de volver a "sin tocar". */}
          <button type="button" disabled={!esDegradado}
            onClick={() => escribir({ tipo: "color", color: currentColor })}
            style={{ ...(!esDegradado ? dkBtnActive : dkBtn), cursor: esDegradado ? "pointer" : "default" }}>
            Sin difuminado
          </button>
          {(Object.keys(DIR_LABELS) as BgDir[]).map(d => (
            <button key={d} type="button" title={DIR_LABELS[d].nombre} aria-label={DIR_LABELS[d].nombre}
              onClick={() => encenderDegradado(d)}
              style={{ ...(esDegradado && bg.dir === d ? dkBtnActive : dkBtn), width: 32, padding: "6px 0", fontSize: 14, lineHeight: 1 }}>
              {DIR_LABELS[d].flecha}
            </button>
          ))}
        </div>

        {bg.tipo === "degradado" && (<>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {(["claro", "oscuro"] as const).map(h => (
              <button key={h} type="button" onClick={() => escribir({ ...bg, hacia: h })}
                style={{ ...(bg.hacia === h ? dkBtnActive : dkBtn), flex: 1 }}>
                {h === "claro" ? "☀️ Hacia claro" : "🌑 Hacia oscuro"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: P.muted, width: 66, flexShrink: 0 }}>Fuerza</span>
            <input type="range" min={0} max={100} step={5} value={bg.fuerza}
              onChange={e => escribir({ ...bg, fuerza: Number(e.target.value) })}
              style={{ flex: 1, minWidth: 0, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: P.text, width: 36, textAlign: "right" }}>{bg.fuerza}%</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: P.muted, width: 66, flexShrink: 0 }}>Arranca en</span>
            <input type="range" min={0} max={80} step={5} value={bg.desde}
              onChange={e => escribir({ ...bg, desde: Number(e.target.value) })}
              style={{ flex: 1, minWidth: 0, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: P.text, width: 36, textAlign: "right" }}>{bg.desde}%</span>
          </div>

          <p style={{ margin: "9px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
            <strong style={{ color: P.text }}>Fuerza</strong> es cuánto se aclara u oscurece la punta.{" "}
            <strong style={{ color: P.text }}>Arranca en</strong> es cuánto tramo queda del color liso antes de que empiece a difuminar.
          </p>

          {/* La parte inteligente: no alcanza con que el degradado se vea lindo
              en el panel. El template elige el color del texto UNA sola vez para
              toda la sección, así que si las dos puntas piden textos distintos,
              media sección queda ilegible — y eso no se nota mirando la barra. */}
          {puntasPeleadas && (
            <div style={{ marginTop: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 11px" }}>
              <p style={{ margin: 0, fontSize: 10.5, color: "#92400e", lineHeight: 1.45 }}>
                ⚠ Una punta queda clara y la otra oscura. El texto se elige una sola vez para toda la sección,
                así que en una de las dos se va a perder.
              </p>
              <button type="button"
                onClick={() => escribir({ ...bg, fuerza: maxFuerzaLegible(bg.color, bg.hacia) })}
                style={{ ...dkBtn, marginTop: 7, width: "100%", borderColor: "#fbbf24", color: "#92400e" }}>
                Bajarlo a lo máximo que se lee
              </button>
            </div>
          )}
        </>)}
      </div>
      )}

      {/* ── Foto ── */}
      {/* Solo donde el template de verdad la dibuja. Ofrecerla en todos lados era
          prometer algo que no pasaba: la foto se subía, se guardaba y no aparecía
          nunca — y nadie podía darse cuenta salvo esperando. Fondo es color; la
          foto es la excepción, no la regla. */}
      {aceptaFoto && (
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #eef1f5" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.hint, letterSpacing: 1, textTransform: "uppercase" }}>Foto de fondo</p>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          {ov.url && <img src={ov.url} alt="" style={{ width: 40, height: 34, objectFit: "cover", borderRadius: 5, border: "1px solid #e2e8f0", flexShrink: 0 }} />}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ ...dkBtn, ...(ov.url ? dkBtnActive : {}), flex: 1, padding: "7px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            📷 {uploading ? "Subiendo..." : ov.url ? "Cambiar foto" : "Elegir foto"}
          </button>
        </div>
        {uploadError && <p style={{ margin: "6px 0 0", fontSize: 11, color: P.danger }}>⚠ {uploadError}</p>}
        <p style={{ margin: "7px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>
          {ov.url
            ? "La foto tapa el color. Usá la capa de abajo para que los textos se sigan leyendo encima."
            : "Opcional. Sin foto se usa el color de arriba, que es lo más liviano y lo que más rápido carga."}
        </p>
      </div>
      )}

      {/* Fila 2: capa (solo si hay imagen) + reset color */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 20px", flexWrap: "wrap" }}>
        {hasImage && (<>
          <span style={{ fontSize: 11, fontWeight: 600, color: P.muted, whiteSpace: "nowrap" }}>Capa:</span>
          {(["dark", "light", "none"] as const).map(t => (
            <button key={t} onClick={() => setImageOverride(imgKey, { overlayType: t })}
              style={currentOverlay === t ? dkBtnActive : dkBtn}>
              {t === "none" ? "Sin capa" : t === "dark" ? "🌑 Oscura" : "☀️ Clara"}
            </button>
          ))}
          {currentOverlay !== "none" && (<>
            <input type="range" min={10} max={80} step={5}
              value={Math.round((ov.overlayOpacity ?? 0.45) * 100)}
              onChange={e => setImageOverride(imgKey, { overlayOpacity: Number(e.target.value) / 100 })}
              style={{ width: 80, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: P.text, minWidth: 32 }}>
              {Math.round((ov.overlayOpacity ?? 0.45) * 100)}%
            </span>
          </>)}
          <button onClick={() => setImageOverride(imgKey, { url: undefined, overlayType: undefined, overlayOpacity: undefined })}
            style={{ ...dkBtn, border: "1.5px solid rgba(239,68,68,0.4)", color: P.danger }}>
            ✕ Quitar foto
          </button>
        </>)}
        {sectionColors[field] && !hasImage && (
          <button onClick={() => setSectionColor(field, "")} style={dkBtn} title="Restablecer color">
            ↺ Restablecer color
          </button>
        )}
        {!hasImage && !sectionColors[field] && (
          <span style={{ fontSize: 11, color: P.muted }}>💡 El contraste del texto se ajusta automáticamente al color elegido.</span>
        )}
      </div>
    </div>
  );
}

/* ── Floating editor (text + image) ─────────────────────────── */
function FloatingEditor({ template }: { template: TemplateId }) {
  const { activeField, activeLabel, setActiveField, overrides, setOverride, resetOverride, imageOverrides, setImageOverride } = useEditContext();

  // Cerrar con Escape o tocando fuera del panel.
  //
  // El clic va en `pointerdown` y no en `click` por un motivo: si tocás OTRA zona
  // editable de la tienda, queremos cambiar de campo, no cerrar y perder el panel.
  // `pointerdown` corre antes que el `click` de la zona, así que primero cerramos
  // y enseguida la zona abre el campo nuevo — el panel nunca parpadea a media
  // interacción ni queda abierto sobre el campo equivocado.
  useEffect(() => {
    if (!activeField) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveField(null); };
    const fuera = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-editor-panel]")) return;
      setActiveField(null);
    };
    document.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", fuera);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", fuera);
    };
  }, [activeField, setActiveField]);

  if (!activeField) return null;

  const isImageField = activeField.startsWith("img:");
  const isBgField = activeField.startsWith("bg:");
  // Solo tipografías que EXISTEN en el dispositivo de quien mira la tienda.
  //
  // El proyecto no carga ninguna fuente web —no hay next/font, ni Google Fonts, ni
  // @font-face—, así que cuando un template pide 'Inter' o 'Playfair Display' el
  // navegador no las tiene y cae a la siguiente de la lista. Ofrecer una fuente que
  // no carga es peor que no ofrecerla: la elegís, no cambia nada y no entendés por
  // qué. Cada opción de acá termina en una familia genérica, así que siempre se ve
  // algo parecido a lo prometido.
  //
  // Los nombres describen CÓMO SE VE, no cómo se llama: "Elegante con serifa" le
  // dice algo a quien arma su tienda; "Georgia" no.
  const FONT_OPTIONS = [
    { label: "Del diseño",           value: "" },
    { label: "Moderna",              value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    { label: "Clásica sin serifa",   value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: "Ancha y legible",      value: "Verdana, Geneva, Tahoma, sans-serif" },
    { label: "Redondeada",           value: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
    { label: "Elegante con serifa",  value: "Georgia, 'Times New Roman', serif" },
    { label: "Editorial",            value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    { label: "Titular impactante",   value: "Impact, 'Arial Narrow Bold', sans-serif" },
    { label: "Máquina de escribir",  value: "'Courier New', Courier, monospace" },
  ];
  const FONT_SIZES = [10, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64];

  // Panel a la derecha, no una barra abajo. La barra tapaba justo lo que estabas
  // editando: el título del hero queda en la mitad baja de la pantalla y la barra
  // se le sentaba encima. Además medía 100 px de alto — no entraba ni un renglón
  // de ayuda, y por eso el editor de textos nunca tuvo consejos.
  //
  // La tienda NO se achica para hacerle lugar: los templates deciden si dibujan la
  // versión de celular mirando `window.innerWidth`, no el ancho de su contenedor.
  // Si angostáramos la vista previa, seguirían creyendo que están en escritorio y
  // mostrarían ese diseño apretujado — una pantalla que no existe en la realidad.
  // La vista previa tiene un solo trabajo y es no mentir.
  const PANEL_W = 340;
  const TOPBAR_H = 44;
  const base: React.CSSProperties = {
    position: "fixed", top: TOPBAR_H, right: 0, bottom: 0, width: PANEL_W, zIndex: 99999,
    background: P.bg, borderLeft: `1px solid ${P.border}`,
    boxShadow: "-10px 0 30px rgba(15,23,42,0.10)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflowY: "auto",
    animation: "editorPanelIn 0.28s cubic-bezier(0.22,1,0.36,1)",
  };

  /* ── Background color + image editor ── */
  if (isBgField) {
    const field = activeField.slice(3);
    return <BgFieldEditor field={field} base={base} setActiveField={setActiveField} aceptaFoto={SECTION_BG_PHOTO[template]?.includes(field) ?? false} />;
  }

  /* ── Image editor ── */
  if (isImageField) {
    const field = activeField.slice(4);
    const ov = imageOverrides[field] ?? {};
    const tip = IMAGE_FIELD_TIPS[field];
    const currentOverlay = ov.overlayType ?? "dark";
    // El encuadre cuenta como cambio: sin esto, mover la foto y no tocar nada más
    // dejaba el botón de restablecer escondido y no había forma de deshacerlo.
    const hasChanges = ov.url !== undefined || ov.overlayType !== undefined || ov.overlayOpacity !== undefined
      || ov.hideContent !== undefined || ov.posX !== undefined || ov.posY !== undefined
      || ov.posXMobile !== undefined || ov.posYMobile !== undefined;

    return <ImageFieldEditor
      field={field}
      ov={ov}
      tip={tip}
      currentOverlay={currentOverlay}
      hasChanges={hasChanges}
      base={base}
      setImageOverride={setImageOverride}
      setActiveField={setActiveField}
    />;
  }

  /* ── Text editor ── */
  // El nombre crudo del campo queda sólo para los campos que se abren sin pasar por
  // `EditableZone`. No debería verse nunca en la tienda de nadie; si aparece, el
  // que abrió el campo se olvidó de decir cómo se llama.
  const label = activeLabel ?? activeField;
  const ov = overrides[activeField] ?? {};
  const hasOverride = Object.entries(ov).some(([, v]) => v !== undefined);
  const isHidden = !!ov.hidden;

  const fmtBtn = (active: boolean): React.CSSProperties => ({
    width: 28, height: 28,
    border: `1.5px solid ${active ? "#6366f1" : "#e2e8f0"}`,
    borderRadius: 6, background: active ? "#6366f1" : "#f8fafc",
    cursor: "pointer", color: active ? "#fff" : P.text,
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12,
  });
  // Cada control lleva su renglón de ayuda. En la barra de abajo esto era
  // imposible —100 px de alto no dan para explicar nada— así que el editor de
  // textos se manejaba a pura adivinanza: nadie sabía qué pasaba al dejar el
  // campo vacío, ni qué hacía "Visible".
  const ayuda = (texto: string) => (
    <p style={{ margin: "5px 0 0", fontSize: 10.5, color: P.muted, lineHeight: 1.45 }}>{texto}</p>
  );
  const titulo = (texto: string) => (
    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: P.muted, letterSpacing: 1, textTransform: "uppercase" }}>{texto}</p>
  );
  const bloque: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #eef1f5" };

  // ── ¿El color elegido se lee sobre su fondo? ────────────────────────────────
  // El fondo NO se deduce de la configuración: cada template pinta sus secciones a
  // su manera y muchos usan colores escritos en el código. Se lee de la pantalla
  // misma, subiendo por los contenedores del texto hasta dar con uno que tenga
  // color propio — que es exactamente lo que va a ver un comprador.
  //
  // Si el fondo es una foto no hay color que leer y no se avisa nada: preferimos
  // callarnos antes que dar un veredicto sobre algo que no medimos.
  const fondoDetras = (() => {
    if (typeof document === "undefined") return null;
    let el = document.querySelector(`[data-edit-field="${CSS.escape(activeField)}"]`)?.parentElement ?? null;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      const c = parseColor(bg);
      // Transparente llega como alfa 0 — hay que seguir subiendo.
      if (c && !/,\s*0\s*\)$/.test(bg)) return c;
      el = el.parentElement;
    }
    return null;
  })();

  const colorElegido = ov.color ? parseColor(ov.color) : null;
  const ratio = colorElegido && fondoDetras ? contrastRatio(colorElegido, fondoDetras) : null;
  // A los títulos grandes se les exige menos: se leen mejor por su tamaño.
  const minimoContraste = (ov.fontSize ?? 0) >= 24 ? MIN_LEGIBLE_GRANDE : MIN_LEGIBLE;
  const colorSugerido = ratio != null && ratio < minimoContraste && colorElegido && fondoDetras
    ? nearestLegible(colorElegido, fondoDetras, minimoContraste)
    : null;

  return (
    <div data-editor-panel style={{ ...base, display: "flex", flexDirection: "column" }}>
      {/* ── Encabezado: qué estoy editando ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid #eef1f5", position: "sticky", top: 0, background: P.bg, zIndex: 2 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: P.accent,
          background: P.accentSoft, borderRadius: 20, padding: "3px 10px",
          flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ✏ {label}
        </span>
        <div style={{ flex: 1 }} />
        {hasOverride && (
          <button type="button" onClick={() => resetOverride(activeField)}
            title="Volver este texto a como venía en el diseño"
            style={{ ...fmtBtn(false), fontSize: 14, width: 26, height: 26 }}>↺</button>
        )}
        <button type="button" onClick={() => setActiveField(null)} aria-label="Cerrar editor"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: P.muted, flexShrink: 0, lineHeight: 1, padding: 0 }}>
          ×
        </button>
      </div>

      {/* ── Texto ── */}
      <div style={bloque}>
        {titulo("Texto")}
        {/* El tope NO es cosmético: al guardar, zod rechaza cualquier texto de más
            de 500 y hace fallar la validación ENTERA. Un párrafo largo en un solo
            texto dejaba la tienda sin poder guardar nada —ni colores, ni fotos, ni
            precios— con un "Error al guardar" que no decía dónde estaba el
            problema. Es mucho mejor frenar acá, donde se ve lo que pasa. */}
        <textarea
          value={ov.text ?? ""}
          placeholder={label}
          rows={3}
          maxLength={TEXTO_MAX}
          onChange={e => setOverride(activeField, { text: e.target.value || undefined })}
          style={{
            width: "100%", boxSizing: "border-box", marginTop: 7,
            border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "8px 11px", fontSize: 13, outline: "none", resize: "vertical",
            fontFamily: "inherit", color: P.text, background: "#f8fafc",
          }}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
          onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
        />
        {ov.text && ov.text.length > TEXTO_MAX - 60 && (
          <p style={{ margin: "5px 0 0", fontSize: 10.5, color: ov.text.length >= TEXTO_MAX ? P.danger : P.muted }}>
            {ov.text.length} de {TEXTO_MAX} caracteres
            {ov.text.length >= TEXTO_MAX ? " — llegaste al máximo." : ""}
          </p>
        )}
        {ayuda(ov.text
          ? "Se muestra este texto en lugar del que trae el diseño."
          : "Vacío significa que se usa el texto original del diseño. Escribí para reemplazarlo.")}
      </div>

      {/* ── Formato ── */}
      <div style={bloque}>
        {titulo("Formato")}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input type="color" value={ov.color ?? "#000000"}
            onChange={e => setOverride(activeField, { color: e.target.value })}
            title="Color del texto"
            style={{ width: 30, height: 30, padding: 2, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
          {([
            ["bold",      "B", { fontWeight: 700 }],
            ["italic",    "I", { fontStyle: "italic" as const }],
            ["underline", "U", { textDecoration: "underline" as const }],
          ] as const).map(([key, lbl, st]) => (
            <button key={key} type="button"
              onClick={() => setOverride(activeField, { [key]: !ov[key as keyof TextOverride] })}
              style={{ ...fmtBtn(!!ov[key as keyof TextOverride]), width: 30, height: 30, ...st }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select value={ov.fontFamily ?? ""}
            onChange={e => setOverride(activeField, { fontFamily: e.target.value || undefined })}
            style={{ flex: 1, minWidth: 0, fontSize: 11, padding: "6px 6px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: P.text, background: "#f8fafc", height: 30 }}>
            {/* Cada opción se dibuja con SU tipografía: se elige viendo, no
                imaginándose a qué suena el nombre. */}
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value} style={{ color: "#111", background: "#fff", fontFamily: f.value || "inherit" }}>
                {f.label}
              </option>
            ))}
          </select>
          <select value={ov.fontSize ?? ""}
            onChange={e => setOverride(activeField, { fontSize: e.target.value ? Number(e.target.value) : undefined })}
            style={{ width: 92, flexShrink: 0, fontSize: 11, padding: "6px 6px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: P.text, background: "#f8fafc", height: 30 }}>
            <option value="" style={{ color: "#111", background: "#fff" }}>Tamaño</option>
            {FONT_SIZES.map(s => <option key={s} value={s} style={{ color: "#111", background: "#fff" }}>{s}px</option>)}
          </select>
        </div>
        {/* Alineación + mayúsculas: los dos ajustes que más se usan, a la vista. */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {([
              ["left",   "Izquierda", "M3 5h18M3 10h11M3 15h18M3 20h11"],
              ["center", "Centrado",  "M3 5h18M6 10h12M3 15h18M6 20h12"],
              ["right",  "Derecha",   "M3 5h18M10 10h11M3 15h18M10 20h11"],
            ] as const).map(([val, titulo2, d]) => (
              <button key={val} type="button" title={titulo2}
                onClick={() => setOverride(activeField, { align: ov.align === val ? undefined : val })}
                style={{ ...fmtBtn(ov.align === val), width: 30, height: 30 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d={d} /></svg>
              </button>
            ))}
          </div>
          <button type="button" title="Todo en mayúsculas"
            onClick={() => setOverride(activeField, { uppercase: ov.uppercase ? undefined : true })}
            style={{ ...fmtBtn(!!ov.uppercase), width: 30, height: 30, fontSize: 11, fontWeight: 800 }}>
            AA
          </button>
        </div>
        {ayuda("Si no elegís nada, se respeta el estilo del diseño — que ya está pensado para que todo combine.")}

        {/* Aviso, no bloqueo: la decisión sigue siendo tuya, pero con el dato a la
            vista en vez de descubrirlo cuando un cliente no puede leer tu tienda. */}
        {ratio != null && ratio < minimoContraste && (
          <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
              <strong>Este color casi no se lee sobre su fondo.</strong> El contraste
              da {ratio.toFixed(1)} y para leerse cómodo necesita al menos {minimoContraste}.
            </p>
            {colorSugerido ? (
              <button type="button"
                onClick={() => setOverride(activeField, { color: colorSugerido })}
                style={{ ...panelBtn, marginTop: 8, width: "100%", padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <span style={{ width: 13, height: 13, borderRadius: 3, background: colorSugerido, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                Usar el tono más parecido que sí se lee
              </button>
            ) : (
              <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#92400e", opacity: 0.85, lineHeight: 1.45 }}>
                Con este fondo no hay ningún tono de ese color que se lea bien. Convendría
                cambiar el fondo de la sección.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Ajuste fino ── */}
      {/* Detrás de un desplegable a propósito: son los que casi nunca se tocan, y
          a la vista competían con los de arriba. La queja no era que faltaran
          herramientas sino que el panel estuviera desordenado — más controles
          sueltos lo empeoran. */}
      <details style={bloque}>
        <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
          {titulo("Ajuste fino")}
          <span style={{ fontSize: 10, color: P.hint }}>▾</span>
        </summary>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: P.muted }}>Separación entre renglones</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: P.text }}>
              {ov.lineHeight != null ? `${ov.lineHeight.toFixed(2)}×` : "del diseño"}
            </span>
          </div>
          <input type="range" min={0.8} max={2.4} step={0.05}
            value={ov.lineHeight ?? 1.4}
            onChange={e => setOverride(activeField, { lineHeight: Number(e.target.value) })}
            style={{ width: "100%", accentColor: P.accent, marginTop: 4 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: P.muted }}>Separación entre letras</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: P.text }}>
              {ov.letterSpacing != null ? `${ov.letterSpacing}px` : "del diseño"}
            </span>
          </div>
          <input type="range" min={-3} max={12} step={0.5}
            value={ov.letterSpacing ?? 0}
            onChange={e => setOverride(activeField, { letterSpacing: Number(e.target.value) })}
            style={{ width: "100%", accentColor: P.accent, marginTop: 4 }} />
        </div>

        {/* Sin esto no habría vuelta atrás: una vez que movés la barra, no existe
            el valor "sin definir" — quedarías pegado a un número para siempre. */}
        {(ov.lineHeight != null || ov.letterSpacing != null) && (
          <button type="button"
            onClick={() => setOverride(activeField, { lineHeight: undefined, letterSpacing: undefined })}
            style={{ ...panelBtn, marginTop: 12, width: "100%", padding: "6px 0" }}>
            ↺ Volver a los valores del diseño
          </button>
        )}
      </details>

      {/* ── Visibilidad ── */}
      <div style={bloque}>
        {titulo("Visibilidad")}
        <button type="button"
          onClick={() => setOverride(activeField, { hidden: isHidden ? undefined : true })}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", marginTop: 8, padding: "8px 11px", borderRadius: 6,
            border: `1.5px solid `,
            background: isHidden ? "rgba(239,68,68,0.15)" : "#f8fafc",
            color: isHidden ? "#f87171" : "#94a3b8",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>
          {isHidden ? "👁 Oculto en tu tienda" : "👁 Visible en tu tienda"}
        </button>
        {ayuda(isHidden
          ? "Nadie lo ve en tu tienda. Acá en el editor te lo seguimos mostrando para que puedas volver a activarlo."
          : "Tocá para esconderlo de tu tienda sin borrar lo que escribiste.")}
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const [mode, setMode] = useState<Mode>("gallery");
  const [selected, setSelected] = useState<TemplateInfo | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<StoreConfig | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // El campo abierto y su título van en UN solo estado, no en dos. Con dos
  // `useState` separados, pasar de un texto a otro los actualiza en llamadas
  // distintas y hay un render en el que el panel ya cambió de campo pero todavía
  // se titula con el nombre del anterior. Juntos no puede pasar: o cambian los dos
  // o no cambia ninguno.
  const [active, setActive] = useState<{ field: string; label?: string } | null>(null);
  const activeField = active?.field ?? null;
  const activeLabel = active?.label ?? null;
  const setActiveField = useCallback((field: string | null, label?: string) => {
    setActive(field === null ? null : { field, label });
  }, []);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [, setDeleting] = useState(false);
  const [, setConfirmDelete] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [imageLoadingFields, setImageLoadingFields] = useState<Record<string, boolean>>({});
  const [storeTipoTienda, setStoreTipoTienda] = useState<string>("GENERAL");
  const [isMobile, setIsMobile] = useState(false);

  /* Cargar config guardada al montar */
  const allTemplates = CATEGORIES.flatMap(c => c.templates);
  useEffect(() => {
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(({ store, isPremium: premium }) => {
        setIsPremium(premium ?? false);
        if (!store) return;
        if (store.slug) setStoreSlug(store.slug);
        if (store.tipoTienda) setStoreTipoTienda(store.tipoTienda);
        // Campos de la tienda que siempre deben estar en el config del preview
        const storeFields: Partial<StoreConfig> = {
          ...(store.id   && { storeId: store.id }),
          ...(store.slug && { slug:    store.slug }),
          tieneVentaMayorista: Boolean(store.tieneVentaMayorista),
          tipoTienda: store.tipoTienda ?? "GENERAL",
        };
        try {
          const saved: StoreConfig = JSON.parse(store.storeConfig || "{}");
          if (saved.template) {
            const tmpl = allTemplates.find(t => t.id === saved.template) ?? null;
            const loaded = { ...DEFAULT_CONFIG, ...saved, ...storeFields };
            setSelected(tmpl);
            setConfig(loaded);
            setSavedConfig(loaded);
            setSavedTemplateId(saved.template);
            setMode("gallery");
          } else {
            // Sin template guardado aún: igual inyectamos storeId/slug para que
            // el preview muestre los productos reales al elegir un diseño
            setConfig(c => ({ ...c, ...storeFields }));
          }
        } catch { /* config vacía o inválida, mostrar galería */ }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoadingConfig(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Text override helpers */
  const setOverride = useCallback((field: string, partial: Partial<TextOverride>) => {
    setConfig(c => ({
      ...c,
      textOverrides: { ...c.textOverrides, [field]: { ...(c.textOverrides[field] ?? {}), ...partial } },
    }));
    setIsDirty(true);
  }, []);

  const resetOverride = useCallback((field: string) => {
    setConfig(c => {
      // `[field]: _` se saca sólo para que NO entre en `rest`: así se borra ese
      // override sin mutar el objeto.
      const { [field]: _, ...rest } = c.textOverrides;
      return { ...c, textOverrides: rest };
    });
    setIsDirty(true);
  }, []);

  /* Image override helpers */
  const setImageOverride = useCallback((field: string, partial: Partial<ImageOverride>) => {
    if ("url" in partial && partial.url) {
      // Preload new image before applying so the block doesn't flash
      setImageLoadingFields(prev => ({ ...prev, [field]: true }));
      const preload = new window.Image();
      const apply = () => {
        setConfig(c => ({
          ...c,
          imageOverrides: { ...c.imageOverrides, [field]: { ...(c.imageOverrides[field] ?? {}), ...partial } },
        }));
        setImageLoadingFields(prev => { const n = { ...prev }; delete n[field]; return n; });
      };
      preload.onload = apply;
      preload.onerror = apply;
      preload.src = partial.url;
    } else {
      setConfig(c => ({
        ...c,
        imageOverrides: { ...c.imageOverrides, [field]: { ...(c.imageOverrides[field] ?? {}), ...partial } },
      }));
    }
    setIsDirty(true);
  }, []);

  /* Section color helpers */
  const setSectionColor = useCallback((field: string, color: string) => {
    setConfig(c => {
      const next = { ...c.sectionColors };
      if (color) next[field] = color;
      else delete next[field];
      return { ...c, sectionColors: next };
    });
    setIsDirty(true);
  }, []);

  const toggleHiddenSection = useCallback((id: string) => {
    setConfig(c => {
      const current = c.hiddenSections ?? [];
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...c, hiddenSections: next };
    });
    setIsDirty(true);
  }, []);

  const moveSection = useCallback((id: string, defaultOrder: string[], direction: "up" | "down") => {
    setConfig(c => {
      const persisted = c.sectionOrder ?? [];
      const effective = [...persisted.filter(i => defaultOrder.includes(i)), ...defaultOrder.filter(i => !persisted.includes(i))];
      const idx = effective.indexOf(id);
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapWith < 0 || swapWith >= effective.length) return c;
      const next = [...effective];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return { ...c, sectionOrder: next };
    });
    setIsDirty(true);
  }, []);

  const update = useCallback(<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
    setIsDirty(true);
  }, []);

  /* Step 1 → 2 */
  const handlePreview = (t: TemplateInfo) => {
    setSelected(t);
    // Si es el mismo diseño que ya tenés guardado, restauramos la versión guardada
    // en vez de arrastrar ediciones sin guardar de una sesión anterior (esas quedaban
    // "pegadas" en memoria al salir sin guardar y reaparecían al volver a entrar).
    if (savedConfig && savedConfig.template === t.id) {
      setConfig(savedConfig);
    } else {
      // Diseño que todavía no guardaste: arranca con el acento propio de
      // ese template en vez de arrastrar el color del que estabas viendo antes.
      const tplDefaults = TEMPLATE_DEFAULTS[t.id];
      setConfig(c => ({
        ...c,
        template: t.id,
        colors: tplDefaults ? { ...c.colors, accent: tplDefaults.accent } : c.colors,
        bannerInterval: undefined,
        promoBanner: c.promoBanner ?? { enabled: true },
      }));
    }
    setMode("preview");
  };

  /* Step 2 → 3 */
  const handleUseTemplate = () => { setIsDirty(false); setMode("editing"); };

  /* Any → 1 */
  const handleBackToGallery = () => {
    if (mode === "editing" && isDirty) { setConfirmLeave(true); return; }
    setMode("gallery");
  };

  /* Gallery → editing (click on saved template) — restaura config guardado */
  const handleGoToEditing = (t: TemplateInfo) => {
    setSelected(t);
    if (savedConfig && savedConfig.template === t.id) setConfig(savedConfig);
    setIsDirty(false);
    setMode("editing");
  };

  const handlePreviewBellClick = () => {
    const dest = isPremium ? "/dashboard/notificaciones" : "/dashboard/mi-plan";
    if (isDirty) {
      setPendingNavUrl(dest);
      setConfirmLeave(true);
    } else {
      window.location.href = dest;
    }
  };

  const handleSave = async () => {
    if (config.whatsapp.enabled && !config.whatsapp.number.trim()) {
      setSaveError("Completá el número de WhatsApp o desactivalo antes de guardar.");
      setTimeout(() => setSaveError(null), 4000);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeConfig: config }),
      });
      if (!res.ok) {
        // La validación rechaza el config ENTERO por un solo campo, y hasta ahora
        // el detalle que manda el servidor se tiraba a la basura: quedaba un
        // "No se pudo guardar" y nada que tocar. Reintentar no arregla un dato
        // inválido — hay que decir cuál es.
        const detalle = await res.json().catch(() => null);
        const campos = detalle?.details?.fieldErrors
          ? Object.keys(detalle.details.fieldErrors as Record<string, unknown>)
          : [];
        throw new Error(
          campos.length
            ? `Hay un dato que el sistema no acepta en: ${campos.join(", ")}. Revisalo y volvé a guardar.`
            : "No se pudo guardar. Intentá de nuevo."
        );
      }
      setSavedTemplateId(config.template);
      setSavedConfig(config);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "No se pudo guardar. Intentá de nuevo.";
      setSaveError(msg);
      // Un error explicativo necesita más tiempo en pantalla que un "reintentá".
      setTimeout(() => setSaveError(null), msg.length > 45 ? 8000 : 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch("/api/configuracion", { method: "DELETE" });
      setConfig(DEFAULT_CONFIG);
      setSelected(null);
      setSavedTemplateId(null);
      setMode("gallery");
      setConfirmDelete(false);
    } catch { /* ignorar */ }
    finally { setDeleting(false); }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Mobile block ── */
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Usá una pantalla más grande</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            El editor de tu tienda está diseñado para usarse desde una computadora o tablet grande.
            Abrilo desde tu PC para diseñar y personalizar.
          </p>
          <div className="mt-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 max-w-xs">
            Desde el celular podés ver pedidos, productos, cupones y estadísticas sin problema.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Loading ── */
  if (loadingConfig) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "#f1f5f9", padding: "24px 40px 0" }}>
            <div style={{ width: "100%", maxWidth: 960, flex: 1,
              borderRadius: "14px 14px 0 0", background: "#1e293b",
              boxShadow: "0 0 0 2px #334155, 0 20px 60px rgba(0,0,0,0.35)",
              display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              <div style={{ height: 36, background: "#1e293b", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155" }} />
              </div>
              <div style={{ flex: 1, background: "white", overflowY: "auto", padding: "32px 48px" }}>
                <div style={{ width: 80, height: 11, background: "#e2e8f0", borderRadius: 6, marginBottom: 10,
                  animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: 260, height: 22, background: "#e2e8f0", borderRadius: 8, marginBottom: 8,
                  animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: 200, height: 14, background: "#f1f5f9", borderRadius: 6, marginBottom: 36,
                  animation: "pulse 1.5s ease-in-out infinite" }} />
                {[0, 1].map((row) => (
                  <div key={row} style={{ marginBottom: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <div style={{ width: 80, height: 12, background: "#e2e8f0", borderRadius: 4,
                        animation: "pulse 1.5s ease-in-out infinite" }} />
                      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} style={{ width: 180, height: 200, borderRadius: 12,
                          background: "#f1f5f9", flexShrink: 0,
                          animation: "pulse 1.5s ease-in-out infinite" }} />
                      ))}
                    </div>
                  </div>
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16, color: P.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <p style={{ margin: 0, fontSize: 28 }}>⚠️</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>No se pudo cargar la configuración</p>
          <p style={{ margin: 0, fontSize: 14 }}>Verificá tu conexión e intentá de nuevo.</p>
          <button
            onClick={() => { setFetchError(false); setLoadingConfig(true); window.location.reload(); }}
            style={{ marginTop: 8, padding: "10px 24px", background: "#6366f1", color: "white",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── STEP 1: Gallery ── */
  if (mode === "gallery") {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "#f1f5f9", padding: "24px 40px 0" }}>

            <div style={{
              width: "100%", maxWidth: 960, flex: 1,
              borderRadius: "14px 14px 0 0", background: "#1e293b",
              boxShadow: "0 0 0 2px #334155, 0 20px 60px rgba(0,0,0,0.35)",
              display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0,
            }}>
              <div style={{ height: 36, background: "#1e293b", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155" }} />
              </div>
              <div style={{ flex: 1, background: "white", overflowY: "auto", overflowX: "hidden",
                padding: "32px 48px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: P.muted,
                  textTransform: "uppercase", letterSpacing: 1 }}>Paso 1 de 3</p>
                <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                  Elegí el diseño de tu tienda
                </h1>
                <p style={{ margin: "0 0 36px", fontSize: 13, color: P.muted }}>
                  Hacé click en un diseño para verlo en detalle.
                </p>

                {CATEGORIES.map(cat => (
                  <div key={cat.id} style={{ marginBottom: 44 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a",
                        textTransform: "uppercase", letterSpacing: 1.2 }}>{cat.name}</span>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #e2e8f0, transparent)" }} />
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: "#f1f5f9", color: P.muted, border: "1px solid #e2e8f0",
                        textTransform: "uppercase", letterSpacing: 0.5,
                      }}>{cat.templates.length} diseños</span>
                    </div>
                    <CarouselRow
                      templates={cat.templates}
                      savedTemplateId={savedTemplateId}
                      storeTipoTienda={storeTipoTienda}
                      onSelect={handlePreview}
                      onGoToEditing={handleGoToEditing}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1",
                      textTransform: "uppercase", letterSpacing: 1 }}>Más rubros próximamente</span>
                    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {[
                      { label: "Gastronomía", icon: "🍽️" },
                      { label: "Belleza", icon: "💅" },
                      { label: "Tecnología", icon: "💻" },
                      { label: "Hogar", icon: "🏠" },
                    ].map(({ label, icon }) => (
                      <div key={label} style={{
                        width: THUMB_W, height: THUMB_H + 70, borderRadius: 14,
                        border: "2px dashed #e2e8f0", background: "#fafbfc",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", color: "#cbd5e1", gap: 8,
                      }}>
                        <span style={{ fontSize: 30, filter: "grayscale(1)", opacity: 0.5 }}>{icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", letterSpacing: 0.3 }}>{label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: "#f1f5f9", color: "#cbd5e1", border: "1px solid #e2e8f0",
                          textTransform: "uppercase", letterSpacing: 0.5,
                        }}>Próximamente</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 960, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 120, height: 18, background: "#1e293b", borderRadius: "0 0 4px 4px",
                boxShadow: "0 4px 0 #334155" }} />
            </div>
            <div style={{ width: "100%", maxWidth: 960, display: "flex", justifyContent: "center",
              flexShrink: 0, paddingBottom: 24 }}>
              <div style={{ width: 220, height: 10, background: "#334155", borderRadius: "0 0 8px 8px" }} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const TemplateComponent = selected!.component;

  /* ── STEP 2: Preview ── */
  if (mode === "preview") {
    return (
      <DashboardLayout fullHeight>
        <div style={{ display: "flex", height: "100%", overflow: "hidden",
          flexDirection: "column", background: "#0f172a" }}>

          {/* Barra paso 2 */}
          <div style={{
            background: "white", borderBottom: "1px solid #e2e8f0",
            padding: "10px 20px", display: "flex", alignItems: "center",
            gap: 12, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            position: "relative", zIndex: 50,
          }}>
            {/* Izquierda */}
            <button onClick={handleBackToGallery}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                border: "1px solid #e2e8f0", borderRadius: 8, background: "white",
                color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#374151"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
              ← Diseños
            </button>

            {/* Info template */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {selected!.palette.map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c,
                    border: "1.5px solid rgba(0,0,0,0.08)" }} />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                {selected!.name}
              </span>
              <span style={{ fontSize: 11, color: P.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selected!.desc}
              </span>
            </div>

            {/* Derecha */}
            <button onClick={handleUseTemplate}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                border: "none", borderRadius: 8, background: "#6366f1", color: "white",
                fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}>
              {savedTemplateId === selected?.id ? "Seguir editando" : "Usar este diseño"}
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "stretch", padding: "12px 20px 20px", minHeight: 0 }}>
            <div style={{ flex: 1, borderRadius: 10, overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
              transform: "translateZ(0)" }}>
              <StoreConfigContext.Provider value={{ ...config, previewFill: true, templateSaved: savedTemplateId === selected?.id, showPushBell: isPremium, onPreviewBellClick: handlePreviewBellClick }}>
                <BrowserFrame storeName={config.storeName}>
                  <TemplateComponent />
                </BrowserFrame>
              </StoreConfigContext.Provider>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── STEP 3: Editing ── */
  return (
    <DashboardLayout fullHeight hideHelp>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f1f5f9" }}>

        {/* Barra paso 3 */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #e8ecf0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 44, padding: "0 16px", flexShrink: 0, position: "relative", zIndex: 50,
        }}>
          {/* Izquierda */}
          <button onClick={handleBackToGallery}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
              borderRadius: 6, background: "none", border: "none",
              color: P.muted, fontSize: 12, fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0, transition: "background 0.12s, color 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#1e293b"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748b"; }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Cambiar diseño
          </button>

          {/* Centro: info template */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {selected!.palette.map((c, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c,
                  border: "1px solid rgba(0,0,0,0.1)" }} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", letterSpacing: "-0.01em" }}>
              {selected!.name}
            </span>
            <span style={{ width: 1, height: 12, background: "#e2e8f0" }} />
            <span style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Editando
            </span>
          </div>

          {/* Derecha: acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {savedTemplateId && (
              <a href={`/tienda/${storeSlug ?? config.storeName.toLowerCase().replace(/\s+/g, "-")}`}
                target="_blank" rel="noopener noreferrer"
                title="Ver tienda en una pestaña nueva"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                  borderRadius: 6, background: "none", border: "none",
                  color: P.muted, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  whiteSpace: "nowrap", textDecoration: "none", transition: "background 0.12s, color 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#1e293b"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748b"; }}>
                Ver tienda
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}

            <button onClick={() => setConfigModalOpen(true)} title="Configuración avanzada"
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 6, background: "none", border: "none",
                color: P.muted, cursor: "pointer", transition: "background 0.12s, color 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94a3b8"; }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            <div style={{ width: 1, height: 20, background: "#e8ecf0", margin: "0 4px" }} />

            {saveError ? (
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap",
                background: "#fef2f2", border: "1px solid #fecaca", padding: "5px 10px", borderRadius: 6 }}>
                ✕ {saveError}
              </span>
            ) : (
              <button onClick={handleSave} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 16px",
                  border: "none", borderRadius: 6,
                  background: saved ? "#059669" : "#6366f1",
                  color: "white", fontSize: 12, fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.2s", whiteSpace: "nowrap",
                  opacity: saving ? 0.75 : 1,
                  letterSpacing: "-0.01em" }}>
                {saving ? (
                  <>
                    <span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite",
                      display: "inline-block" }} />
                    Guardando
                  </>
                ) : saved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            )}
          </div>
        </div>

        {/* Preview — full width */}
        <EditContext.Provider value={{
          editMode: true,
          activeField,
          activeLabel,
          setActiveField,
          overrides: config.textOverrides,
          setOverride,
          resetOverride,
          imageOverrides: config.imageOverrides,
          setImageOverride,
          sectionColors: config.sectionColors,
          setSectionColor,
          imageLoading: imageLoadingFields,
          hiddenSections: config.hiddenSections ?? [],
          toggleHiddenSection,
          sectionOrder: config.sectionOrder ?? [],
          moveSection,
        }}>
          <div style={{ flex: 1, overflow: "hidden", position: "relative", padding: "12px 16px 0" }}>
            <div style={{ height: "100%", borderRadius: "12px 12px 0 0", overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
              transform: "translateZ(0)" }}>
              <StoreConfigContext.Provider value={{ ...config, previewFill: true, templateSaved: savedTemplateId === selected?.id, showPushBell: isPremium, onPreviewBellClick: handlePreviewBellClick }}>
                <BrowserFrame storeName={config.storeName}>
                  <TemplateComponent />
                </BrowserFrame>
              </StoreConfigContext.Provider>
            </div>
          </div>
          <FloatingEditor template={config.template} />
        </EditContext.Provider>

      </div>

      {/* Config modal */}
      {configModalOpen && (
        <ConfigModal config={config} update={update} onClose={() => setConfigModalOpen(false)} onSave={handleSave} onDelete={() => { setConfigModalOpen(false); handleDelete(); }} storeSlug={storeSlug} isPremium={isPremium} />
      )}

      {/* Confirmar salir sin guardar */}
      {confirmLeave && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }} onClick={() => setConfirmLeave(false)} />
          <div style={{ position:"relative", background:"#0f172a", border:"1px solid #e2e8f0", borderRadius:16, padding:24, maxWidth:360, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display:"flex", gap:16, marginBottom:20 }}>
              <div style={{ width:40, height:40, background:"rgba(245,158,11,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <p style={{ color:"white", fontWeight:700, fontSize:15, margin:"0 0 4px" }}>Cambios sin guardar</p>
                <p style={{ color:"#94a3b8", fontSize:13, margin:0, lineHeight:1.5 }}>Tenés cambios que no guardaste todavía. Si salís ahora los perdés.</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmLeave(false)}
                style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid #e2e8f0", color:"white", borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Quedarme
              </button>
              <button onClick={() => {
                setConfirmLeave(false);
                setIsDirty(false);
                // Descartar las ediciones sin guardar acá mismo, para que no queden
                // "pegadas" en memoria y reaparezcan al volver a entrar a este diseño.
                setConfig(savedConfig ?? DEFAULT_CONFIG);
                if (pendingNavUrl) {
                  setPendingNavUrl(null);
                  window.location.href = pendingNavUrl;
                } else {
                  setMode("gallery");
                }
              }}
                style={{ flex:1, background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesGuard isDirty={isDirty} />
    </DashboardLayout>
  );
}
