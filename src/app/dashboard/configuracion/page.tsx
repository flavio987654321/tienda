"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import type { StoreConfig, TextOverride, ImageOverride } from "@/types/store-config";
import { DEFAULT_CONFIG, TEMPLATES_WITH_CAROUSEL, TEMPLATE_DEFAULTS } from "@/types/store-config";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext, useEditContext, getContrastColor } from "@/contexts/EditContext";
import { TEMPLATE_CATEGORIES, type TemplateInfo } from "@/lib/templateRegistry";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

/* ── Types ─────────────────────────────────────────────────── */
type Mode = "gallery" | "preview" | "editing";

type Category = { id: string; name: string; templates: TemplateInfo[] };

/* ── Template registry ─────────────────────────────────────── */
const CATEGORIES: Category[] = TEMPLATE_CATEGORIES;

/* ── Image field info ──────────────────────────────────────── */
const IMAGE_FIELD_INFO: Record<string, { label: string; tip: string }> = {
  heroBackground: {
    label: "Imagen de fondo del hero",
    tip: "Recomendado: 1920×1080px horizontal. Capa oscura para fotos claras, capa clara para fotos oscuras.",
  },
  heroImage: {
    label: "Imagen del hero",
    tip: "Foto principal junto al titular. Recomendado: 800×900px vertical.",
  },
  heroImage1: {
    label: "Imagen hero izquierda",
    tip: "Columna izquierda del hero (vertical). Recomendado: 600×900px.",
  },
  heroImage2: {
    label: "Imagen hero superior",
    tip: "Foto superior derecha del hero. Recomendado: 600×500px.",
  },
  heroImage3: {
    label: "Imagen hero inferior",
    tip: "Foto inferior derecha del hero. Recomendado: 600×500px.",
  },
  catMujer: {
    label: "Imagen categoría Mujer",
    tip: "Foto representativa de la categoría Mujer. Recomendado: 800×1200px vertical.",
  },
  catHombre: {
    label: "Imagen categoría Hombre",
    tip: "Foto representativa de la categoría Hombre. Recomendado: 800×1200px vertical.",
  },
  catAccesorios: {
    label: "Imagen categoría Accesorios",
    tip: "Foto representativa de la categoría Accesorios. Recomendado: 800×1200px vertical.",
  },
  nosotrosImage: {
    label: "Imagen sección Nosotros",
    tip: "Foto de tu equipo, taller o espacio. Recomendado: 900×700px horizontal.",
  },
  contactBackground: {
    label: "Imagen de fondo contacto",
    tip: "Fondo de la sección de contacto. Recomendado: 1920×700px horizontal.",
  },
  // Electro Prime / Tech Nova / Home Studio / Casa Clara (Hogar y Tecnología)
  contactImage: {
    label: "Imagen sección Contacto",
    tip: "Foto junto al formulario de contacto. Recomendado: 900×700px.",
  },
  contactoImage: {
    label: "Imagen de fondo (contacto)",
    tip: "Fondo de la sección de contacto. Recomendado: 1920×700px horizontal.",
  },
  megaMenuImage: {
    label: "Imagen del menú Departamentos",
    tip: "Foto decorativa que se ve al abrir el menú de departamentos. Recomendado: 600×500px.",
  },
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [
    `dept${i}Image`,
    { label: `Departamento ${i + 1} — imagen`, tip: "Foto del departamento. Recomendado: 600×500px." },
  ])),
  // Electro Prime / Tech Nova / Home Studio — carrusel de banner promocional (sin texto)
  promoBanner1: { label: "Banner promocional 1", tip: "Recomendado: 1920×600px horizontal (imagen panorámica, sin texto)." },
  promoBanner2: { label: "Banner promocional 2", tip: "Recomendado: 1920×600px horizontal (imagen panorámica, sin texto)." },
  promoBanner3: { label: "Banner promocional 3", tip: "Recomendado: 1920×600px horizontal (imagen panorámica, sin texto)." },
};

/* ── Text field labels ─────────────────────────────────────── */
const TEXT_FIELD_LABELS: Record<string, string> = {
  announcementText:    "Barra de anuncios",
  heroHeading:         "Título principal",
  heroSubtext:         "Subtítulo hero",
  heroCta:             "Botón principal",
  heroCtaSecondary:    "Botón secundario",
  featuredLabel:       "Etiqueta destacado",
  featuredDescription: "Descripción destacado",
  categoriesHeading:   "Sección categorías",
  testimonialsHeading: "Sección testimonios",
  quoteText:           "Frase destacada",
  aboutKicker:         "Etiqueta 'Nosotros'",
  aboutHeading:        "Título 'Nosotros'",
  aboutParagraph1:     "Párrafo 1 'Nosotros'",
  aboutParagraph2:     "Párrafo 2 'Nosotros'",
  aboutStat1:          "Stat 1 (número)",
  aboutStatLabel1:     "Stat 1 (etiqueta)",
  aboutStat2:          "Stat 2 (número)",
  aboutStatLabel2:     "Stat 2 (etiqueta)",
  aboutStat3:          "Stat 3 (número)",
  aboutStatLabel3:     "Stat 3 (etiqueta)",
  aboutStat4:          "Stat 4 (número)",
  aboutStatLabel4:     "Stat 4 (etiqueta)",
  contactKicker:       "Etiqueta contacto",
  contactHeading:      "Título contacto",
  contactSubtext:      "Subtítulo contacto",
  contactFormHeading:  "Subtítulo formulario",
  newsletterText:      "Título newsletter",
  newsletterSubtext:   "Subtítulo newsletter",
  footerDescription:   "Descripción footer",
  footerCopyright:     "Copyright",
  footerMadeIn:        "Hecho en",
  storeName:           "Nombre de la tienda",
  storeTagline:        "Tagline",
  // Garantías (compartido en los 3 templates)
  garantia1Title:      "Garantía 1 — Título",
  garantia1Desc:       "Garantía 1 — Descripción",
  garantia2Title:      "Garantía 2 — Título",
  garantia2Desc:       "Garantía 2 — Descripción",
  garantia3Title:      "Garantía 3 — Título",
  garantia3Desc:       "Garantía 3 — Descripción",
  garantia4Title:      "Garantía 4 — Título",
  garantia4Desc:       "Garantía 4 — Descripción",
  // BohoTerra
  navHistoriaLabel:    "Enlace Nuestra Historia",
  footerBrandName:     "Nombre en footer",
  contactEmail:        "Email de contacto",
  contactUbicacion:    "Ubicación",
  contactInstagram:    "Instagram",
  contactHorario:      "Horario de atención",
  // UrbanPulse
  heroNewDropBadge:    "Badge hero",
  categoryViewAll:     "Botón ver todo",
  collectionHeading:   "Título sección productos",
  contactDireccion:    "Dirección",
  contactWhatsApp:     "WhatsApp de contacto",
};

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
          fontSize: 12, color: "#64748b", textAlign: "center", userSelect: "none" }}>
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
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Imagen cargada ✓</p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", color: "#64748b", whiteSpace: "nowrap" }}>
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
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Flyer {slot + 1}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#cbd5e1" }}>Sin imagen</p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontSize: 11, padding: "5px 9px", border: "1px solid #e2e8f0", borderRadius: 6, background: uploading ? "#f8fafc" : "white", cursor: uploading ? "default" : "pointer", color: "#64748b", whiteSpace: "nowrap" }}>
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Usá &quot;Guardar y cerrar&quot; para que los cambios queden guardados</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>

          <p style={{ margin: "4px 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Apariencia</p>

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
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8" }}>Afecta botones, precios y elementos destacados.</p>
          </div>

          {/* Color nav — solo templates auto y Hogar/Tecnología */}
          {["auto-motor", "auto-drive", "electro-prime", "tech-nova", "home-studio", "casa-clara"].includes(config.template) && (
            <div style={sec}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                🧭 Color de la barra de navegación
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color"
                  value={config.sectionColors?.["navBg"] ?? (config.template === "auto-motor" ? "#1b3f6e" : config.template === "home-studio" ? "#faf8f4" : "#ffffff")}
                  onChange={e => update("sectionColors", { ...config.sectionColors, navBg: e.target.value })}
                  style={{ width: 40, height: 38, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                <input style={{ ...inp, fontFamily: "monospace" }}
                  value={config.sectionColors?.["navBg"] ?? (config.template === "auto-motor" ? "#1b3f6e" : config.template === "home-studio" ? "#faf8f4" : "#ffffff")}
                  onChange={e => update("sectionColors", { ...config.sectionColors, navBg: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                {config.sectionColors?.["navBg"] && (
                  <button onClick={() => { const next = { ...config.sectionColors }; delete next["navBg"]; update("sectionColors", next); }}
                    style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                    ↺ Reset
                  </button>
                )}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8" }}>El texto y los íconos del nav se adaptan automáticamente al color elegido.</p>
            </div>
          )}

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Contacto y comunicación</p>

          {/* WhatsApp */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              💬 WhatsApp
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Botón flotante</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>Visible en todas las páginas</p>
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
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Texto que se pre-carga cuando el cliente hace click en el botón</p>
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
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>Franja promocional en la parte superior</p>
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
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Los mensajes vacíos no se muestran. Se rotan automáticamente cada 3.5 seg.</p>
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

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Configuración de la tienda</p>

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
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>2s (rápido)</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>10s (lento)</span>
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
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>Muestra &quot;Consultá precio&quot; — clientes consultan antes de ver valores</p>
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
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94a3b8" }}>
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
                  style={{ marginTop: 8, width: "100%", padding: "6px", border: "1px solid #e2e8f0", borderRadius: 7, background: "white", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
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
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>Solo Premium</span>
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
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>Aparece al entrar a la tienda, en cada visita</p>
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
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", marginTop: 10, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                      📱 Si tus clientes tienen la tienda instalada como app (PWA), el flyer aparece justo después de la pantalla de carga.
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <p style={{ margin: "20px 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Marketing y descubribilidad</p>

          {/* SEO */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              🔍 SEO / Google
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Activar SEO</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>Mejora la visibilidad en Google</p>
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

          {/* Analytics y Pixel */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              📊 Analytics y publicidad
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Google Analytics — ID de medición</label>
                <input style={inp} value={config.analytics?.googleAnalyticsId ?? ""}
                  placeholder="G-XXXXXXXXXX"
                  onChange={e => update("analytics", { ...config.analytics, googleAnalyticsId: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                {config.analytics?.googleAnalyticsId?.trim() && !/^G-[A-Za-z0-9]+$/.test(config.analytics.googleAnalyticsId.trim()) ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>Tiene que empezar con &quot;G-&quot; (ej: G-AB12CD3EF4). Revisalo en tu cuenta de Google Analytics.</p>
                ) : (
                  <>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Gratis. Te muestra cuántas visitas tiene tu tienda y de dónde vienen.</p>
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, cursor: "pointer" }}>
                        ¿Cómo consigo el ID? Ver los pasos
                      </summary>
                      <ol style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                        <li>Entrá a analytics.google.com con tu cuenta de Google (o creá una, es gratis).</li>
                        <li>Creá una &quot;Propiedad&quot; para tu tienda (nombre, zona horaria, moneda).</li>
                        <li>Andá a Administrar (ícono de engranaje abajo a la izquierda) → Flujos de datos → elegí o creá un flujo &quot;Web&quot;.</li>
                        <li>Ahí arriba vas a ver el &quot;ID de medición&quot; (formato G-XXXXXXXXXX) — copialo y pegalo en el campo de arriba.</li>
                      </ol>
                      <a href="https://analytics.google.com" target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, color: "#6366f1" }}>
                        Ir a Google Analytics →
                      </a>
                    </details>
                  </>
                )}
              </div>
              <div>
                <label style={lbl}>Facebook Pixel — ID</label>
                <input style={inp} value={config.analytics?.facebookPixelId ?? ""}
                  placeholder="Solo números, ej: 1234567890123"
                  onChange={e => update("analytics", { ...config.analytics, facebookPixelId: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                {config.analytics?.facebookPixelId?.trim() && !/^\d+$/.test(config.analytics.facebookPixelId.trim()) ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>Tiene que ser solo números. Revisalo en Meta Business Suite → Administrador de eventos.</p>
                ) : (
                  <>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Gratis. Si hacés publicidad en Instagram/Facebook, esto hace que tus anuncios rindan más.</p>
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, cursor: "pointer" }}>
                        ¿Cómo consigo el ID? Ver los pasos
                      </summary>
                      <ol style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                        <li>Entrá a business.facebook.com con tu cuenta de Facebook o Instagram.</li>
                        <li>Andá al Administrador de eventos (lo encontrás en el menú, o en business.facebook.com/events_manager).</li>
                        <li>Si no tenés un Pixel creado, tocá &quot;Conectar fuente de datos&quot; → &quot;Web&quot; → &quot;Meta Pixel&quot; y seguí los pasos.</li>
                        <li>Una vez creado, vas a ver su ID (solo números) en la lista de fuentes de datos — copialo y pegalo en el campo de arriba.</li>
                      </ol>
                      <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, color: "#6366f1" }}>
                        Ir al Administrador de eventos →
                      </a>
                    </details>
                  </>
                )}
              </div>
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
                  style={{ flex: 1, padding: "9px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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
function ImageFieldEditor({
  field, ov, info, currentOverlay, hasChanges, base, setImageOverride, setActiveField,
}: {
  field: string;
  ov: ImageOverride;
  info: { label: string; tip: string } | undefined;
  currentOverlay: string;
  hasChanges: boolean;
  base: React.CSSProperties;
  setImageOverride: (field: string, partial: Partial<ImageOverride>) => void;
  setActiveField: (f: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [field, setImageOverride]);

  const dk = { color: "#f1f5f9" };
  const dkMuted = { color: "#94a3b8" };
  const dkBtn: React.CSSProperties = { padding: "5px 11px", borderRadius: 6, border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#f1f5f9", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const };
  const dkBtnActive: React.CSSProperties = { ...dkBtn, border: "1.5px solid #6366f1", background: "#6366f1", color: "white" };

  return (
    <div style={{ ...base, display: "flex", flexDirection: "column" }}>
      {/* Fila 1: label + upload + preview */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "10px 20px 9px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", background: "rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
          📷 {info?.label ?? field}
        </span>
        {info?.tip && (
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{info.tip}</span>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 7, border: "none", background: uploading ? "#4338ca" : "#6366f1", color: "white", fontSize: 12, fontWeight: 700, cursor: uploading ? "default" : "pointer", whiteSpace: "nowrap", opacity: uploading ? 0.7 : 1 }}>
          {uploading ? "Subiendo..." : ov.url ? "Cambiar imagen" : "Elegir imagen"}
        </button>
        {ov.url && <img src={ov.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />}
        {uploadError && <span style={{ fontSize: 11, color: "#f87171", whiteSpace: "nowrap" }}>⚠ {uploadError}</span>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setActiveField(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, ...dkMuted, flexShrink: 0, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* Fila 2: capa + opacidad + reset */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, ...dkMuted, whiteSpace: "nowrap" }}>Capa:</span>
        {(["none", "dark", "light"] as const).map(t => (
          <button key={t} onClick={() => setImageOverride(field, { overlayType: t })}
            style={currentOverlay === t ? dkBtnActive : dkBtn}>
            {t === "none" ? "Sin capa" : t === "dark" ? "🌑 Oscura" : "☀️ Clara"}
          </button>
        ))}
        {currentOverlay !== "none" && (
          <>
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
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
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
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
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
            <span title="El tiempo de rotación del carrusel se configura en ⚙ Configuración avanzada → Carrusel de banner (es el mismo para los 3 banners)."
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, ...dkMuted, whiteSpace: "nowrap", cursor: "help" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>?</span>
              Velocidad del carrusel: en ⚙ Configuración avanzada
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        {hasChanges && (
          <button onClick={() => setImageOverride(field, { url: undefined, overlayType: undefined, overlayOpacity: undefined, hideContent: undefined })}
            style={{ ...dkBtn, padding: "5px 12px" }} title="Restablecer">↺ Restablecer</button>
        )}
      </div>
    </div>
  );
}

/* ── Background + image editor for section bg fields ────────── */
function BgFieldEditor({ field, base, setActiveField }: {
  field: string;
  base: React.CSSProperties;
  setActiveField: (f: string | null) => void;
}) {
  const { sectionColors, setSectionColor, imageOverrides, setImageOverride } = useEditContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imgKey = `sectionbg_${field}`;
  const currentColor = sectionColors[field] ?? "#0a0a0a";
  const ov: ImageOverride = imageOverrides[imgKey] ?? {};
  const currentOverlay = ov.overlayType ?? "dark";
  const hasImage = !!ov.url;

  const contrast = hasImage
    ? (currentOverlay === "light" ? "dark" : "light")
    : getContrastColor(currentColor);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [imgKey, setImageOverride]);

  const dkBtn: React.CSSProperties = { padding: "5px 11px", borderRadius: 6, border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#f1f5f9", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const };
  const dkBtnActive: React.CSSProperties = { ...dkBtn, border: "1.5px solid #6366f1", background: "#6366f1", color: "white" };

  return (
    <div style={{ ...base, display: "flex", flexDirection: "column" }}>
      {/* Fila 1: label + color + foto de fondo + cerrar */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "10px 20px 9px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", background: "rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
          🎨 Fondo
        </span>

        {/* Color picker + hex */}
        <input type="color" value={currentColor} onChange={e => setSectionColor(field, e.target.value)}
          style={{ width: 32, height: 32, padding: 2, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
        <input value={currentColor} onChange={e => setSectionColor(field, e.target.value)} placeholder="#ffffff"
          style={{ width: 84, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, padding: "5px 9px", fontSize: 12, outline: "none", fontFamily: "monospace", background: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")} />

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Foto de fondo */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {ov.url && <img src={ov.url} alt="" style={{ width: 34, height: 30, objectFit: "cover", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ ...dkBtn, ...(ov.url ? dkBtnActive : {}), display: "flex", alignItems: "center", gap: 5 }}>
          📷 {uploading ? "Subiendo..." : ov.url ? "Cambiar foto" : "Foto de fondo"}
        </button>

        {/* Contraste */}
        <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
          Texto: <strong style={{ color: contrast === "light" ? "#a5b4fc" : "#f1f5f9" }}>
            {contrast === "light" ? "☀ claro" : "🌑 oscuro"}
          </strong>
        </span>

        <div style={{ flex: 1 }} />
        {uploadError && <span style={{ fontSize: 11, color: "#f87171" }}>⚠ {uploadError}</span>}
        <button onClick={() => setActiveField(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* Fila 2: capa (solo si hay imagen) + reset color */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 20px", flexWrap: "wrap" }}>
        {hasImage && (<>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>Capa:</span>
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
            <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", minWidth: 32 }}>
              {Math.round((ov.overlayOpacity ?? 0.45) * 100)}%
            </span>
          </>)}
          <button onClick={() => setImageOverride(imgKey, { url: undefined, overlayType: undefined, overlayOpacity: undefined })}
            style={{ ...dkBtn, border: "1.5px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
            ✕ Quitar foto
          </button>
        </>)}
        {sectionColors[field] && !hasImage && (
          <button onClick={() => setSectionColor(field, "")} style={dkBtn} title="Restablecer color">
            ↺ Restablecer color
          </button>
        )}
        {!hasImage && !sectionColors[field] && (
          <span style={{ fontSize: 11, color: "#64748b" }}>💡 El contraste del texto se ajusta automáticamente al color elegido.</span>
        )}
      </div>
    </div>
  );
}

/* ── Floating editor (text + image) ─────────────────────────── */
function FloatingEditor({ textFieldLabels }: { textFieldLabels: Record<string, string> }) {
  const { activeField, setActiveField, overrides, setOverride, resetOverride, imageOverrides, setImageOverride } = useEditContext();

  if (!activeField) return null;

  const isImageField = activeField.startsWith("img:");
  const isBgField = activeField.startsWith("bg:");
  const FONT_OPTIONS = [
    { label: "Predeterminada", value: "" },
    { label: "Sans-serif",     value: "system-ui, -apple-system, sans-serif" },
    { label: "Serif",          value: "Georgia, Cambria, serif" },
    { label: "Monoespaciada",  value: "ui-monospace, monospace" },
  ];
  const FONT_SIZES = [10, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64];

  const base: React.CSSProperties = {
    position: "fixed", bottom: 0, left: 72, right: 0, zIndex: 99999,
    background: "#1e293b", borderTop: "2px solid #6366f1",
    borderRadius: "12px 12px 0 0",
    boxShadow: "0 -6px 32px rgba(0,0,0,0.45)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  /* ── Background color + image editor ── */
  if (isBgField) {
    const field = activeField.slice(3);
    return <BgFieldEditor field={field} base={base} setActiveField={setActiveField} />;
  }

  /* ── Image editor ── */
  if (isImageField) {
    const field = activeField.slice(4);
    const ov = imageOverrides[field] ?? {};
    const info = IMAGE_FIELD_INFO[field];
    const currentOverlay = ov.overlayType ?? "dark";
    const hasChanges = ov.url !== undefined || ov.overlayType !== undefined || ov.overlayOpacity !== undefined || ov.hideContent !== undefined;

    return <ImageFieldEditor
      field={field}
      ov={ov}
      info={info}
      currentOverlay={currentOverlay}
      hasChanges={hasChanges}
      base={base}
      setImageOverride={setImageOverride}
      setActiveField={setActiveField}
    />;
  }

  /* ── Text editor ── */
  const label = textFieldLabels[activeField] ?? activeField;
  const ov = overrides[activeField] ?? {};
  const hasOverride = Object.entries(ov).some(([, v]) => v !== undefined);
  const isHidden = !!ov.hidden;

  const fmtBtn = (active: boolean): React.CSSProperties => ({
    width: 28, height: 28,
    border: `1.5px solid ${active ? "#6366f1" : "rgba(255,255,255,0.15)"}`,
    borderRadius: 6, background: active ? "#6366f1" : "rgba(255,255,255,0.07)",
    cursor: "pointer", color: active ? "white" : "#f1f5f9",
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12,
  });
  const divider = <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />;

  return (
    <div style={{ ...base, display: "flex", flexDirection: "column" }}>

      {/* ── Fila 1: label + campo de texto + cerrar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 9px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#818cf8",
          background: "rgba(99,102,241,0.2)", borderRadius: 20, padding: "3px 10px",
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          ✏ {label}
        </span>
        <input
          value={ov.text ?? ""}
          placeholder="Texto personalizado (vacío = usa el original del template)"
          onChange={e => setOverride(activeField, { text: e.target.value || undefined })}
          style={{
            flex: 1, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
            padding: "6px 12px", fontSize: 13, outline: "none",
            fontFamily: "inherit", color: "#f1f5f9", background: "rgba(255,255,255,0.07)",
          }}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
        />
        <button type="button" onClick={() => setActiveField(null)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b", flexShrink: 0, lineHeight: 1, padding: 0 }}>
          ×
        </button>
      </div>

      {/* ── Fila 2: formato ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", flexWrap: "wrap" }}>

        {/* Color */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <input type="color" value={ov.color ?? "#000000"}
            onChange={e => setOverride(activeField, { color: e.target.value })}
            title="Color del texto"
            style={{ width: 28, height: 28, padding: 2, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>Color</span>
        </div>

        {divider}

        {/* Fuente */}
        <select value={ov.fontFamily ?? ""}
          onChange={e => setOverride(activeField, { fontFamily: e.target.value || undefined })}
          style={{ fontSize: 11, padding: "4px 6px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer", color: "#f1f5f9", background: "rgba(255,255,255,0.07)", height: 28 }}>
          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value} style={{ color: "#111", background: "#fff" }}>{f.label}</option>)}
        </select>

        {/* Tamaño */}
        <select value={ov.fontSize ?? ""}
          onChange={e => setOverride(activeField, { fontSize: e.target.value ? Number(e.target.value) : undefined })}
          style={{ fontSize: 11, padding: "4px 6px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, cursor: "pointer", color: "#f1f5f9", background: "rgba(255,255,255,0.07)", width: 80, height: 28 }}>
          <option value="" style={{ color: "#111", background: "#fff" }}>Tamaño</option>
          {FONT_SIZES.map(s => <option key={s} value={s} style={{ color: "#111", background: "#fff" }}>{s}px</option>)}
        </select>

        {divider}

        {/* B I U */}
        {([
          ["bold",      "B", { fontWeight: 700 }],
          ["italic",    "I", { fontStyle: "italic" as const }],
          ["underline", "U", { textDecoration: "underline" as const }],
        ] as const).map(([key, lbl, st]) => (
          <button key={key} type="button"
            onClick={() => setOverride(activeField, { [key]: !ov[key as keyof TextOverride] })}
            style={{ ...fmtBtn(!!ov[key as keyof TextOverride]), ...st }}>
            {lbl}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* 👁 Visibilidad */}
        <button type="button"
          onClick={() => setOverride(activeField, { hidden: isHidden ? undefined : true })}
          title={isHidden ? "Mostrar en la tienda" : "Ocultar de la tienda"}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 11px", height: 28, borderRadius: 6,
            border: `1.5px solid ${isHidden ? "#f87171" : "rgba(255,255,255,0.15)"}`,
            background: isHidden ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)",
            color: isHidden ? "#f87171" : "#94a3b8",
            cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
          }}>
          {isHidden ? "👁 Oculto" : "👁 Visible"}
        </button>

        {/* ↺ Reset */}
        {hasOverride && (
          <button type="button" onClick={() => resetOverride(activeField)}
            title="Restablecer todo"
            style={{ ...fmtBtn(false), fontSize: 14 }}>↺</button>
        )}
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
  const [activeField, setActiveField] = useState<string | null>(null);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (!res.ok) throw new Error("Error al guardar");
      setSavedTemplateId(config.template);
      setSavedConfig(config);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("No se pudo guardar. Intentá de nuevo.");
      setTimeout(() => setSaveError(null), 3000);
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
          flexDirection: "column", gap: 16, color: "#64748b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: 1 }}>Paso 1 de 3</p>
                <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                  Elegí el diseño de tu tienda
                </h1>
                <p style={{ margin: "0 0 36px", fontSize: 13, color: "#64748b" }}>
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
                        background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0",
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
                color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer",
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
              <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
              color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer",
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
                  color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer",
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
                color: "#94a3b8", cursor: "pointer", transition: "background 0.12s, color 0.12s" }}
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
          setActiveField,
          overrides: config.textOverrides,
          setOverride,
          resetOverride,
          imageOverrides: config.imageOverrides,
          setImageOverride,
          sectionColors: config.sectionColors,
          setSectionColor,
          imageLoading: imageLoadingFields,
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
          <FloatingEditor textFieldLabels={TEXT_FIELD_LABELS} />
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
          <div style={{ position:"relative", background:"#0f172a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:24, maxWidth:360, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
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
                style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"white", borderRadius:10, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer" }}>
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
