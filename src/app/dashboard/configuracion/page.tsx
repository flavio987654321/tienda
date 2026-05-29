"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import type { StoreConfig, TemplateId, TextOverride, ImageOverride } from "@/types/store-config";
import { TEMPLATE_DEFAULTS, DEFAULT_CONFIG, TEMPLATES_WITH_CAROUSEL } from "@/types/store-config";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext, useEditContext, getContrastColor } from "@/contexts/EditContext";
import FashionNoir from "@/components/store/templates/FashionNoir";
import BohoTerra from "@/components/store/templates/BohoTerra";
import UrbanPulse from "@/components/store/templates/UrbanPulse";
import ChicParis from "@/components/store/templates/ChicParis";

/* ── Types ─────────────────────────────────────────────────── */
type Mode = "gallery" | "preview" | "editing";

type TemplateInfo = {
  id: TemplateId;
  name: string;
  desc: string;
  palette: string[];
  component: React.ComponentType;
};

type Category = { id: string; name: string; templates: TemplateInfo[] };

/* ── Template registry ─────────────────────────────────────── */
const CATEGORIES: Category[] = [
  {
    id: "moda",
    name: "Moda & Ropa",
    templates: [
      { id: "fashion-noir", name: "Fashion Noir", desc: "Lujo · Oscuro · Editorial",    palette: ["#0a0a0a", "#c9a84c", "#f0ebe3"], component: FashionNoir },
      { id: "boho-terra",   name: "Boho Terra",   desc: "Orgánico · Natural · Cálido",  palette: ["#faf7f2", "#b5652a", "#2c2218"], component: BohoTerra  },
      { id: "urban-pulse",  name: "Urban Pulse",  desc: "Deportivo · Energético",        palette: ["#0f0f0f", "#d4ff00", "#f5f5f5"], component: UrbanPulse },
      { id: "chic-paris",   name: "Chic Paris",   desc: "Editorial · Carousel · Limpio", palette: ["#ffffff", "#c0392b", "#111111"], component: ChicParis  },
    ],
  },
];

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
const THUMB_W = 200;
const VIRTUAL_W = 1080;
const SCALE = THUMB_W / VIRTUAL_W;
const THUMB_H = 140;
const VIRTUAL_H = THUMB_H / SCALE;

function TemplateThumbnail({ component: Component }: { component: React.ComponentType }) {
  return (
    <div style={{ width: THUMB_W, height: THUMB_H, overflow: "hidden", position: "relative",
      borderRadius: "8px 8px 0 0", background: "#f8fafc" }}>
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
function TemplateCard({ t, isSaved, onSelect, onGoToEditing }: {
  t: TemplateInfo;
  isSaved?: boolean;
  onSelect: () => void;
  onGoToEditing?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const handleClick = () => isSaved && onGoToEditing ? onGoToEditing() : onSelect();
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        flexShrink: 0, width: THUMB_W, borderRadius: 12, overflow: "hidden", cursor: "pointer",
        border: "2px solid", borderColor: isSaved ? "#059669" : hovered ? "#6366f1" : "#e2e8f0",
        background: "white", transition: "all 0.2s",
        boxShadow: isSaved
          ? "0 4px 16px rgba(5,150,105,0.2)"
          : hovered ? "0 8px 24px rgba(99,102,241,0.18)" : "0 2px 8px rgba(0,0,0,0.07)",
        transform: hovered ? "translateY(-3px)" : "none",
        position: "relative",
      }}>
      {isSaved && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 2,
          background: "#059669", color: "white", borderRadius: 20,
          fontSize: 9, fontWeight: 800, padding: "3px 7px", letterSpacing: 0.3,
          boxShadow: "0 2px 6px rgba(5,150,105,0.4)",
        }}>
          ✓ Tu diseño
        </div>
      )}
      <TemplateThumbnail component={t.component} />
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {t.palette.map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: c,
              border: "1.5px solid rgba(0,0,0,0.1)" }} />
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{t.name}</p>
        <p style={{ margin: "3px 0 8px", fontSize: 10, color: "#94a3b8", lineHeight: 1.3 }}>{t.desc}</p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "6px", borderRadius: 7, fontSize: 11, fontWeight: 700,
          background: isSaved ? (hovered ? "#059669" : "#dcfce7") : hovered ? "#6366f1" : "#f1f5f9",
          color: isSaved ? (hovered ? "white" : "#059669") : hovered ? "white" : "#64748b",
          transition: "all 0.2s",
        }}>
          {isSaved ? (hovered ? "Editar →" : "Editar diseño") : hovered ? "Ver diseño →" : "Ver diseño"}
        </div>
      </div>
    </div>
  );
}

/* ── Carousel row ───────────────────────────────────────────── */
function CarouselRow({ templates, savedTemplateId, onSelect, onGoToEditing }: {
  templates: TemplateInfo[];
  savedTemplateId?: string | null;
  onSelect: (t: TemplateInfo) => void;
  onGoToEditing?: (t: TemplateInfo) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") =>
    scrollRef.current?.scrollBy({ left: dir === "l" ? -240 : 240, behavior: "smooth" });

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => scroll("l")} style={{
        position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)",
        width: 34, height: 34, borderRadius: "50%", border: "1px solid #e2e8f0",
        background: "white", cursor: "pointer", zIndex: 2, fontSize: 16, color: "#64748b",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>‹</button>
      <div ref={scrollRef} style={{
        display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8,
        scrollSnapType: "x mandatory", scrollbarWidth: "none",
      }}>
        {templates.map(t => (
          <div key={t.id} style={{ scrollSnapAlign: "start" }}>
            <TemplateCard
              t={t}
              isSaved={savedTemplateId === t.id}
              onSelect={() => onSelect(t)}
              onGoToEditing={onGoToEditing ? () => onGoToEditing(t) : undefined}
            />
          </div>
        ))}
      </div>
      <button onClick={() => scroll("r")} style={{
        position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)",
        width: 34, height: 34, borderRadius: "50%", border: "1px solid #e2e8f0",
        background: "white", cursor: "pointer", zIndex: 2, fontSize: 16, color: "#64748b",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>›</button>
    </div>
  );
}

/* ── Browser frame wrapper ──────────────────────────────────── */
function BrowserFrame({ storeName, children }: { storeName: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", transform: "translate(0, 0)" }}>
        {children}
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
function ConfigModal({ config, update, onClose, onDelete }: {
  config: StoreConfig;
  update: <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
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
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Los cambios se reflejan en el preview al instante</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>

          {/* Información */}
          <div style={sec}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              🏪 Información
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={lbl}>Nombre de la tienda</label>
                <input style={inp} value={config.storeName} placeholder="Mi Tienda"
                  onChange={e => update("storeName", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
              </div>
              <div>
                <label style={lbl}>Tagline</label>
                <input style={inp} value={config.storeTagline} placeholder="Tu tienda online"
                  onChange={e => update("storeTagline", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
              </div>
            </div>
          </div>

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
                <div>
                  <label style={lbl}>Número</label>
                  <input style={inp} value={config.whatsapp.number}
                    placeholder="+54 9 11 0000-0000"
                    onChange={e => update("whatsapp", { ...config.whatsapp, number: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
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
                <div>
                  <label style={lbl}>Texto de la barra</label>
                  <textarea style={{ ...inp, resize: "none", lineHeight: 1.5 }}
                    rows={2}
                    maxLength={120}
                    value={config.textOverrides?.["announcementText"]?.text ?? ""}
                    placeholder="🚚 Envío gratis · 🔄 Cambios sin cargo · 💳 6 cuotas sin interés"
                    onChange={e => update("textOverrides", {
                      ...config.textOverrides,
                      announcementText: { ...(config.textOverrides?.["announcementText"] ?? {}), text: e.target.value }
                    })}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>También podés hacer clic en la barra del preview para editar el texto.</p>
                    <span style={{ fontSize: 11, color: (config.textOverrides?.["announcementText"]?.text?.length ?? 0) > 100 ? "#f59e0b" : "#94a3b8", flexShrink: 0, marginLeft: 8 }}>
                      {config.textOverrides?.["announcementText"]?.text?.length ?? 0}/120
                    </span>
                  </div>
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

        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 16px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onClose}
            style={{ width: "100%", padding: "11px", border: "none", borderRadius: 10, background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Listo
          </button>
          <button onClick={onDelete}
            style={{ width: "100%", padding: "9px", border: "1px solid #fecaca", borderRadius: 10,
              background: "white", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
            Eliminar diseño y volver a la galería
          </button>
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

  return (
    <div style={{ ...base, padding: "10px 16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Label */}
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}>
          📷 {info?.label ?? field}
        </span>

        {/* Preview de imagen actual */}
        {ov.url && (
          <img src={ov.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 }} />
        )}

        {/* Selector de archivo */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 7, border: "1.5px solid #6366f1",
            background: uploading ? "#e0e7ff" : "#6366f1", color: "white",
            fontSize: 12, fontWeight: 700, cursor: uploading ? "default" : "pointer",
            whiteSpace: "nowrap", opacity: uploading ? 0.7 : 1,
          }}>
          {uploading ? "Subiendo..." : ov.url ? "Cambiar imagen" : "Elegir imagen"}
        </button>

        {uploadError && (
          <span style={{ fontSize: 11, color: "#ef4444", whiteSpace: "nowrap" }}>⚠ {uploadError}</span>
        )}

        {/* Capa / overlay */}
        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>Capa:</span>
        {(["none", "dark", "light"] as const).map(t => (
          <button key={t} onClick={() => setImageOverride(field, { overlayType: t })}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "1.5px solid",
              borderColor: currentOverlay === t ? "#6366f1" : "#e2e8f0",
              background: currentOverlay === t ? "#e0e7ff" : "white",
              color: currentOverlay === t ? "#6366f1" : "#374151",
              cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
            {t === "none" ? "Sin capa" : t === "dark" ? "🌑 Oscura" : "☀️ Clara"}
          </button>
        ))}

        {/* Opacity slider */}
        {currentOverlay !== "none" && (
          <>
            <input type="range" min={10} max={90} step={5}
              value={Math.round((ov.overlayOpacity ?? 0.6) * 100)}
              onChange={e => setImageOverride(field, { overlayOpacity: Number(e.target.value) / 100 })}
              style={{ width: 70, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 11, color: "#374151", minWidth: 28 }}>
              {Math.round((ov.overlayOpacity ?? 0.6) * 100)}%
            </span>
          </>
        )}

        {/* Reset */}
        {hasChanges && (
          <button onClick={() => setImageOverride(field, { url: undefined, overlayType: undefined, overlayOpacity: undefined })}
            style={{ width: 30, height: 30, border: "1px solid #e2e8f0", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 14, color: "#94a3b8" }}
            title="Restablecer">↺</button>
        )}

        {/* Close */}
        <button onClick={() => setActiveField(null)}
          style={{ width: 30, height: 30, border: "none", background: "white", cursor: "pointer", fontSize: 18, color: "#94a3b8" }}>×</button>
      </div>

      {/* Tip */}
      {info?.tip && (
        <p style={{ margin: "6px 0 0", fontSize: 10, color: "#94a3b8" }}>
          💡 {info.tip}
        </p>
      )}
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

  return (
    <div style={{ ...base, padding: "10px 16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}>🎨 Fondo de sección</span>

        {/* Color */}
        <input type="color" value={currentColor}
          onChange={e => setSectionColor(field, e.target.value)}
          style={{ width: 34, height: 28, padding: 2, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
        <input value={currentColor}
          onChange={e => setSectionColor(field, e.target.value)}
          placeholder="#ffffff"
          style={{ width: 88, border: "1px solid #d1d5db", borderRadius: 7, padding: "5px 10px", fontSize: 12, outline: "none", fontFamily: "monospace" }}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
          onBlur={e => (e.target.style.borderColor = "#d1d5db")} />

        <span style={{ color: "#e2e8f0", fontSize: 18, lineHeight: 1 }}>|</span>

        {/* Image upload */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {ov.url && (
          <img src={ov.url} alt="" style={{ width: 36, height: 28, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 }} />
        )}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7,
            border: `1.5px solid ${ov.url ? "#6366f1" : "#d1d5db"}`,
            background: ov.url ? "#e0e7ff" : "white", color: ov.url ? "#6366f1" : "#374151",
            fontSize: 11, fontWeight: 700, cursor: uploading ? "default" : "pointer", whiteSpace: "nowrap" }}>
          📷 {uploading ? "Subiendo..." : ov.url ? "Cambiar foto" : "Foto de fondo"}
        </button>

        {/* Overlay controls (only when image set) */}
        {hasImage && (<>
          <span style={{ fontSize: 11, color: "#64748b" }}>Capa:</span>
          {(["dark", "light", "none"] as const).map(t => (
            <button key={t} onClick={() => setImageOverride(imgKey, { overlayType: t })}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid",
                borderColor: currentOverlay === t ? "#6366f1" : "#e2e8f0",
                background: currentOverlay === t ? "#e0e7ff" : "white",
                color: currentOverlay === t ? "#6366f1" : "#374151",
                cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              {t === "none" ? "Sin capa" : t === "dark" ? "🌑 Oscura" : "☀️ Clara"}
            </button>
          ))}
          {currentOverlay !== "none" && (<>
            <input type="range" min={10} max={80} step={5}
              value={Math.round((ov.overlayOpacity ?? 0.45) * 100)}
              onChange={e => setImageOverride(imgKey, { overlayOpacity: Number(e.target.value) / 100 })}
              style={{ width: 60, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 10, color: "#374151", minWidth: 28 }}>
              {Math.round((ov.overlayOpacity ?? 0.45) * 100)}%
            </span>
          </>)}
          <button onClick={() => setImageOverride(imgKey, { url: undefined, overlayType: undefined, overlayOpacity: undefined })}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff7f7", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            ✕ Quitar foto
          </button>
        </>)}

        {/* Contrast indicator */}
        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
          Texto: <strong style={{ color: contrast === "light" ? "#6366f1" : "#374151" }}>
            {contrast === "light" ? "☀ claro" : "🌑 oscuro"}
          </strong>
        </span>

        {sectionColors[field] && !hasImage && (
          <button onClick={() => setSectionColor(field, "")}
            style={{ width: 28, height: 28, border: "1px solid #e2e8f0", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 13, color: "#94a3b8" }}
            title="Restablecer color">↺</button>
        )}

        <button onClick={() => setActiveField(null)}
          style={{ width: 28, height: 28, border: "none", background: "white", cursor: "pointer", fontSize: 18, color: "#94a3b8" }}>×</button>

        {uploadError && <span style={{ fontSize: 11, color: "#ef4444" }}>⚠ {uploadError}</span>}
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 10, color: "#94a3b8" }}>
        💡 El contraste de texto se ajusta automáticamente.{hasImage && " La capa oscura/clara garantiza que el texto sea siempre legible."}
      </p>
    </div>
  );
}

/* ── Floating editor (text + image) ─────────────────────────── */
function FloatingEditor({ textFieldLabels }: { textFieldLabels: Record<string, string> }) {
  const { activeField, setActiveField, overrides, setOverride, resetOverride, imageOverrides, setImageOverride, sectionColors, setSectionColor } = useEditContext();

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
    position: "fixed", bottom: 0, left: 72, right: 16, zIndex: 99999,
    background: "white", borderTop: "2px solid #6366f1",
    borderRadius: "12px 12px 0 0",
    boxShadow: "0 -4px 24px rgba(99,102,241,0.18)",
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
    const hasChanges = ov.url !== undefined || ov.overlayType !== undefined || ov.overlayOpacity !== undefined;

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
  const isLongTextField = activeField.startsWith("policy");

  const btnBase: React.CSSProperties = {
    width: 30, height: 30, border: "1.5px solid #e2e8f0", borderRadius: 6,
    background: "white", cursor: "pointer", fontSize: 13, color: "#374151",
    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  };
  const btnActive: React.CSSProperties = { borderColor: "#6366f1", background: "#e0e7ff", color: "#6366f1" };

  if (isLongTextField) {
    return (
      <div style={{ ...base, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>✏ {label}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {hasOverride && (
              <button type="button" onClick={() => resetOverride(activeField)}
                style={{ ...btnBase, fontSize: 14 }} title="Restablecer texto original">↺</button>
            )}
            <button type="button" onClick={() => setActiveField(null)}
              style={{ ...btnBase, border: "none", fontSize: 18, color: "#94a3b8" }}>×</button>
          </div>
        </div>
        <textarea
          value={ov.text ?? ""}
          placeholder="Escribí el texto de esta política. Usá guiones (-) al inicio de línea para listas."
          rows={6}
          onChange={e => setOverride(activeField, { text: e.target.value || undefined })}
          style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 7, padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
          onBlur={e => (e.target.style.borderColor = "#d1d5db")}
        />
        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>
          💡 Usá <strong>-</strong> al inicio de cada línea para crear una lista con bullets. El cambio se guarda con el botón Guardar del template.
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...base, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}>
        ✏ {label}
      </span>

      <input
        value={ov.text ?? ""}
        placeholder="Texto (vacío = original del template)"
        onChange={e => setOverride(activeField, { text: e.target.value || undefined })}
        style={{ flex: 1, minWidth: 160, border: "1px solid #d1d5db", borderRadius: 7, padding: "5px 10px", fontSize: 12, outline: "none", fontFamily: "inherit" }}
        onFocus={e => (e.target.style.borderColor = "#6366f1")}
        onBlur={e => (e.target.style.borderColor = "#d1d5db")}
      />

      <input type="color" value={ov.color ?? "#000000"}
        onChange={e => setOverride(activeField, { color: e.target.value })}
        title="Color del texto"
        style={{ width: 32, height: 30, padding: 2, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />

      <select value={ov.fontFamily ?? ""}
        onChange={e => setOverride(activeField, { fontFamily: e.target.value || undefined })}
        style={{ fontSize: 11, padding: "5px 6px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#374151", height: 30 }}>
        {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select value={ov.fontSize ?? ""}
        onChange={e => setOverride(activeField, { fontSize: e.target.value ? Number(e.target.value) : undefined })}
        style={{ fontSize: 11, padding: "5px 6px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#374151", width: 68, height: 30 }}>
        <option value="">Tam.</option>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
      </select>

      {([["bold","B",{ fontWeight: 700 }],["italic","I",{ fontStyle: "italic" as const }],["underline","U",{ textDecoration: "underline" as const }]] as const).map(([key, lbl, st]) => (
        <button key={key} type="button"
          onClick={() => setOverride(activeField, { [key]: !ov[key as keyof TextOverride] })}
          style={{ ...btnBase, ...(ov[key as keyof TextOverride] ? btnActive : {}), ...st }}>
          {lbl}
        </button>
      ))}

      {hasOverride && (
        <button type="button" onClick={() => resetOverride(activeField)}
          title="Restablecer" style={{ ...btnBase, fontSize: 14 }}>↺</button>
      )}

      <button type="button" onClick={() => setActiveField(null)}
        style={{ ...btnBase, border: "none", fontSize: 18, color: "#94a3b8" }}>×</button>
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
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Cargar config guardada al montar */
  const allTemplates = CATEGORIES.flatMap(c => c.templates);
  useEffect(() => {
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(({ store }) => {
        if (!store) return;
        if (store.slug) setStoreSlug(store.slug);
        // Campos de la tienda que siempre deben estar en el config del preview
        const storeFields: Partial<StoreConfig> = {
          ...(store.id   && { storeId: store.id }),
          ...(store.slug && { slug:    store.slug }),
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
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Text override helpers */
  const setOverride = useCallback((field: string, partial: Partial<TextOverride>) => {
    setConfig(c => ({
      ...c,
      textOverrides: { ...c.textOverrides, [field]: { ...(c.textOverrides[field] ?? {}), ...partial } },
    }));
  }, []);

  const resetOverride = useCallback((field: string) => {
    setConfig(c => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: _, ...rest } = c.textOverrides;
      return { ...c, textOverrides: rest };
    });
  }, []);

  /* Image override helpers */
  const setImageOverride = useCallback((field: string, partial: Partial<ImageOverride>) => {
    setConfig(c => ({
      ...c,
      imageOverrides: { ...c.imageOverrides, [field]: { ...(c.imageOverrides[field] ?? {}), ...partial } },
    }));
  }, []);

  /* Section color helpers */
  const setSectionColor = useCallback((field: string, color: string) => {
    setConfig(c => {
      const next = { ...c.sectionColors };
      if (color) next[field] = color;
      else delete next[field];
      return { ...c, sectionColors: next };
    });
  }, []);

  const update = useCallback(<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  }, []);

  /* Step 1 → 2 */
  const handlePreview = (t: TemplateInfo) => {
    const defaults = TEMPLATE_DEFAULTS[t.id];
    setSelected(t);
    setConfig(c => ({
      // Mantener datos globales de la tienda, resetear overrides del template anterior
      ...c,
      template: t.id,
      colors: { accent: defaults.accent },
      storeName: defaults.storeName,
      textOverrides: {},
      imageOverrides: {},
      sectionColors: {},
      bannerInterval: undefined,
      promoBanner: { enabled: true },
    }));
    setMode("preview");
  };

  /* Step 2 → 3 */
  const handleUseTemplate = () => setMode("editing");

  /* Any → 1 */
  const handleBackToGallery = () => { setMode("gallery"); };

  /* Gallery → editing (click on saved template) — restaura config guardado */
  const handleGoToEditing = (t: TemplateInfo) => {
    setSelected(t);
    if (savedConfig && savedConfig.template === t.id) setConfig(savedConfig);
    setMode("editing");
  };

  /* Step 3 → 2 */
  const handleBackToPreview = () => { setMode("preview"); setActiveField(null); };

  const handleSave = async () => {
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

  /* ── Loading ── */
  if (loadingConfig) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16, color: "#64748b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#6366f1",
            borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ margin: 0, fontSize: 14 }}>Cargando tu tienda...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                  <div key={cat.id} style={{ marginBottom: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a",
                        textTransform: "uppercase", letterSpacing: 0.5 }}>{cat.name}</span>
                      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{cat.templates.length} diseños</span>
                    </div>
                    <CarouselRow
                      templates={cat.templates}
                      savedTemplateId={savedTemplateId}
                      onSelect={handlePreview}
                      onGoToEditing={handleGoToEditing}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#cbd5e1",
                      textTransform: "uppercase", letterSpacing: 0.5 }}>Más rubros próximamente</span>
                    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {["Gastronomía", "Accesorios", "Belleza", "Tecnología"].map(label => (
                      <div key={label} style={{
                        width: 180, height: 160, borderRadius: 12, border: "2px dashed #e2e8f0",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", color: "#cbd5e1", gap: 8,
                      }}>
                        <span style={{ fontSize: 28 }}>+</span>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
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
      <DashboardLayout>
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
              Personalizar diseño
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "stretch", padding: "12px 20px 20px", minHeight: 0 }}>
            <div style={{ flex: 1, borderRadius: 10, overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
              <StoreConfigContext.Provider value={config}>
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
    <DashboardLayout fullHeight>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f1f5f9" }}>

        {/* Barra paso 3 */}
        <div style={{
          background: "white", borderBottom: "1px solid #e2e8f0",
          padding: "10px 20px", display: "flex", alignItems: "center",
          gap: 12, flexShrink: 0, position: "relative", zIndex: 50,
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        }}>
          {/* Izquierda: volver */}
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
            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
              background: "#ede9fe", borderRadius: 20, fontSize: 10, fontWeight: 700,
              color: "#7c3aed", letterSpacing: 0.3, whiteSpace: "nowrap", flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8b5cf6",
                display: "inline-block" }} />
              Editando
            </span>
          </div>

          {/* Derecha: acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Ver tienda */}
            {savedTemplateId && (
              <a
                href={`/tienda/${storeSlug ?? config.storeName.toLowerCase().replace(/\s+/g, "-")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                  border: "1px solid #e2e8f0", borderRadius: 8, background: "white",
                  color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap", textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#374151"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
                Ver tienda
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}

            {/* Config avanzada */}
            <button onClick={() => setConfigModalOpen(true)}
              title="Configuración avanzada"
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36,
                border: "1px solid #e2e8f0", borderRadius: 8, background: "white",
                color: "#64748b", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#374151"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* Guardar */}
            {saveError ? (
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap",
                background: "#fef2f2", border: "1px solid #fecaca", padding: "7px 12px", borderRadius: 8 }}>
                ✕ {saveError}
              </span>
            ) : (
              <button onClick={handleSave} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                  border: "none", borderRadius: 8,
                  background: saved ? "#059669" : "#6366f1",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.25s", whiteSpace: "nowrap",
                  opacity: saving ? 0.7 : 1,
                  boxShadow: saved ? "0 2px 8px rgba(5,150,105,0.35)" : "0 2px 8px rgba(99,102,241,0.3)" }}>
                {saving ? (
                  <>
                    <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)",
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
        }}>
          <div style={{ flex: 1, overflow: "hidden", position: "relative", padding: "12px 16px 0" }}>
            <div style={{ height: "100%", borderRadius: "12px 12px 0 0", overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
              transform: "translate(0,0)" }}>
              <StoreConfigContext.Provider value={config}>
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
        <ConfigModal config={config} update={update} onClose={() => setConfigModalOpen(false)} onDelete={() => { setConfigModalOpen(false); handleDelete(); }} />
      )}
    </DashboardLayout>
  );
}
