"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StoreConfig, TemplateId } from "@/types/store-config";
import { TEMPLATE_DEFAULTS, DEFAULT_CONFIG } from "@/types/store-config";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext } from "@/contexts/EditContext";
import FashionNoir from "@/components/store/templates/FashionNoir";
import BohoTerra from "@/components/store/templates/BohoTerra";
import UrbanPulse from "@/components/store/templates/UrbanPulse";

/* ── Types ─────────────────────────────────────────────── */
type Mode = "gallery" | "preview" | "editing";

type TemplateInfo = {
  id: TemplateId;
  name: string;
  desc: string;
  palette: string[];
  component: React.ComponentType;
};

type Category = { id: string; name: string; templates: TemplateInfo[] };

/* ── Template registry ─────────────────────────────────── */
const CATEGORIES: Category[] = [
  {
    id: "moda",
    name: "Moda & Ropa",
    templates: [
      { id: "fashion-noir", name: "Fashion Noir", desc: "Lujo · Oscuro · Editorial",   palette: ["#0a0a0a", "#c9a84c", "#f0ebe3"], component: FashionNoir },
      { id: "boho-terra",   name: "Boho Terra",   desc: "Orgánico · Natural · Cálido", palette: ["#faf7f2", "#b5652a", "#2c2218"], component: BohoTerra  },
      { id: "urban-pulse",  name: "Urban Pulse",  desc: "Deportivo · Energético",       palette: ["#0f0f0f", "#d4ff00", "#f5f5f5"], component: UrbanPulse },
    ],
  },
];

/* ── Thumbnail (real template scaled) ─────────────────── */
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

/* ── Template card ──────────────────────────────────────── */
function TemplateCard({ t, onSelect }: { t: TemplateInfo; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      style={{
        flexShrink: 0, width: THUMB_W, borderRadius: 12, overflow: "hidden", cursor: "pointer",
        border: "2px solid", borderColor: hovered ? "#6366f1" : "#e2e8f0",
        background: "white", transition: "all 0.2s",
        boxShadow: hovered ? "0 8px 24px rgba(99,102,241,0.18)" : "0 2px 8px rgba(0,0,0,0.07)",
        transform: hovered ? "translateY(-3px)" : "none",
      }}>
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
          background: hovered ? "#6366f1" : "#f1f5f9",
          color: hovered ? "white" : "#64748b", transition: "all 0.2s",
        }}>
          {hovered ? "Ver diseño →" : "Ver diseño"}
        </div>
      </div>
    </div>
  );
}

/* ── Carousel row ───────────────────────────────────────── */
function CarouselRow({ templates, onSelect }: { templates: TemplateInfo[]; onSelect: (t: TemplateInfo) => void }) {
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
            <TemplateCard t={t} onSelect={() => onSelect(t)} />
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

/* ── Browser frame wrapper (shared by preview + editing) ── */
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

/* ── Config form helpers ────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#555",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", color: "#111", background: "white",
  transition: "border-color 0.15s",
};

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

function Section({ id, label, icon, open, onToggle, children }: {
  id: string; label: string; icon: string;
  open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <button type="button" onClick={() => onToggle(id)}
        style={{ width: "100%", padding: "13px 20px", display: "flex", alignItems: "center",
          gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8", display: "inline-block",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>
      {open && <div style={{ padding: "4px 20px 20px" }}>{children}</div>}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const [mode, setMode] = useState<Mode>("gallery");
  const [selected, setSelected] = useState<TemplateInfo | null>(null);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [openSection, setOpenSection] = useState<string>("info");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const storeNameRef = useRef<HTMLInputElement>(null);
  const storeTaglineRef = useRef<HTMLInputElement>(null);
  const accentRef = useRef<HTMLInputElement>(null);
  const whatsappNumberRef = useRef<HTMLInputElement>(null);

  const FIELD_MAP: Record<string, { section: string; ref: React.RefObject<HTMLInputElement | null> }> = {
    storeName:    { section: "info",      ref: storeNameRef },
    storeTagline: { section: "info",      ref: storeTaglineRef },
    "colors.accent": { section: "colores", ref: accentRef },
    whatsapp:     { section: "whatsapp", ref: whatsappNumberRef },
  };

  useEffect(() => {
    if (!activeField) return;
    const mapping = FIELD_MAP[activeField];
    if (!mapping) return;
    setOpenSection(mapping.section);
    setTimeout(() => {
      mapping.ref.current?.focus();
      mapping.ref.current?.select();
    }, 180);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField]);

  const update = useCallback(<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  }, []);

  const toggleSection = (id: string) => setOpenSection(s => s === id ? "" : id);

  /* Step 1 → 2 */
  const handlePreview = (t: TemplateInfo) => {
    const defaults = TEMPLATE_DEFAULTS[t.id];
    setSelected(t);
    setConfig(c => ({ ...c, template: t.id, colors: { accent: defaults.accent }, storeName: defaults.storeName }));
    setMode("preview");
  };

  /* Step 2 → 3 */
  const handleUseTemplate = () => setMode("editing");

  /* Any → 1 */
  const handleBackToGallery = () => { setMode("gallery"); setSelected(null); };

  /* Step 3 → 2 */
  const handleBackToPreview = () => setMode("preview");

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  /* ── STEP 1: Gallery ── */
  if (mode === "gallery") {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "#f1f5f9", padding: "24px 40px 0" }}>

            {/* Monitor frame */}
            <div style={{
              width: "100%", maxWidth: 860, flex: 1,
              borderRadius: "14px 14px 0 0", background: "#1e293b",
              boxShadow: "0 0 0 2px #334155, 0 20px 60px rgba(0,0,0,0.35)",
              display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0,
            }}>
              {/* Bezel */}
              <div style={{ height: 36, background: "#1e293b", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155" }} />
              </div>
              {/* Screen */}
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
                    <CarouselRow templates={cat.templates} onSelect={handlePreview} />
                  </div>
                ))}

                {/* Coming soon */}
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

            {/* Monitor stand */}
            <div style={{ width: "100%", maxWidth: 860, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 120, height: 18, background: "#1e293b", borderRadius: "0 0 4px 4px",
                boxShadow: "0 4px 0 #334155" }} />
            </div>
            <div style={{ width: "100%", maxWidth: 860, display: "flex", justifyContent: "center",
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
          flexDirection: "column", background: "#f1f5f9" }}>

          {/* Top bar */}
          <div style={{ background: "#1e293b", padding: "12px 24px", display: "flex",
            alignItems: "center", gap: 16, flexShrink: 0 }}>
            <button onClick={handleBackToGallery}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                border: "1px solid #334155", borderRadius: 8, background: "transparent",
                color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ← Volver
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {selected!.palette.map((c, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c,
                    border: "1px solid rgba(255,255,255,0.15)" }} />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{selected!.name}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>— {selected!.desc}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11,
              color: "#64748b", marginRight: 8 }}>
              <span>Paso 2 de 3</span>
            </div>
            <button onClick={handleUseTemplate}
              style={{ padding: "8px 20px", border: "none", borderRadius: 8,
                background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700,
                cursor: "pointer" }}>
              Usar este diseño →
            </button>
          </div>

          {/* Browser window */}
          <div style={{ flex: 1, display: "flex", alignItems: "stretch", padding: "16px 24px 24px",
            minHeight: 0 }}>
            <div style={{ flex: 1, borderRadius: 12, overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
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
    <DashboardLayout>
      <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#f8fafc" }}>

        {/* Left panel */}
        <aside style={{ width: 320, flexShrink: 0, height: "100%", display: "flex",
          flexDirection: "column", background: "white",
          borderRight: "1px solid #e2e8f0", boxShadow: "2px 0 12px rgba(0,0,0,0.04)" }}>

          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {selected!.palette.map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c,
                    border: "1px solid rgba(0,0,0,0.1)" }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Paso 3 de 3</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{selected!.name}</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Personalizá tu tienda</p>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>

            <Section id="info" label="Información" icon="🏪" open={openSection === "info"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre de la tienda</label>
                  <input ref={storeNameRef} style={{ ...inputStyle, boxShadow: activeField === "storeName" ? "0 0 0 3px rgba(99,102,241,0.25)" : "none" }}
                    value={config.storeName} placeholder="Mi Tienda"
                    onChange={e => update("storeName", e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setActiveField(null); }} />
                </div>
                <div>
                  <label style={labelStyle}>Tagline</label>
                  <input ref={storeTaglineRef} style={{ ...inputStyle, boxShadow: activeField === "storeTagline" ? "0 0 0 3px rgba(99,102,241,0.25)" : "none" }}
                    value={config.storeTagline} placeholder="Tu tienda online"
                    onChange={e => update("storeTagline", e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setActiveField(null); }} />
                </div>
              </div>
            </Section>

            <Section id="colores" label="Colores" icon="🎨" open={openSection === "colores"} onToggle={toggleSection}>
              <div>
                <label style={labelStyle}>Color de acento</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="color" value={config.colors.accent}
                    onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                    style={{ width: 40, height: 38, padding: 2, border: "1px solid #e2e8f0",
                      borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                  <input ref={accentRef} style={{ ...inputStyle, fontFamily: "monospace", flex: 1, boxShadow: activeField === "colors.accent" ? "0 0 0 3px rgba(99,102,241,0.25)" : "none" }}
                    value={config.colors.accent}
                    onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setActiveField(null); }} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  Afecta botones, precios y elementos destacados.
                </p>
              </div>
            </Section>

            <Section id="whatsapp" label="WhatsApp" icon="💬" open={openSection === "whatsapp"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                    <label style={labelStyle}>Número</label>
                    <input ref={whatsappNumberRef} style={{ ...inputStyle, boxShadow: activeField === "whatsapp" ? "0 0 0 3px rgba(99,102,241,0.25)" : "none" }}
                      value={config.whatsapp.number}
                      placeholder="+54 9 11 0000-0000"
                      onChange={e => update("whatsapp", { ...config.whatsapp, number: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setActiveField(null); }} />
                  </div>
                )}
              </div>
            </Section>

            <Section id="moneda" label="Moneda & Idioma" icon="💱" open={openSection === "moneda"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Moneda</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["ARS", "USD"] as const).map(c => (
                      <button key={c} type="button" onClick={() => update("currency", c)}
                        style={{ flex: 1, padding: "9px",
                          border: `2px solid ${config.currency === c ? "#6366f1" : "#e2e8f0"}`,
                          borderRadius: 8, background: config.currency === c ? "#f0f0ff" : "white",
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                          color: config.currency === c ? "#6366f1" : "#64748b", transition: "all 0.15s" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Idioma</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["ES", "🇦🇷 Español"], ["EN", "🇺🇸 English"]] as const).map(([l, label]) => (
                      <button key={l} type="button" onClick={() => update("language", l)}
                        style={{ flex: 1, padding: "9px 6px",
                          border: `2px solid ${config.language === l ? "#6366f1" : "#e2e8f0"}`,
                          borderRadius: 8, background: config.language === l ? "#f0f0ff" : "white",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: config.language === l ? "#6366f1" : "#64748b", transition: "all 0.15s" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section id="seo" label="SEO / Google" icon="🔍" open={openSection === "seo"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                      <label style={labelStyle}>Título SEO</label>
                      <input style={inputStyle} value={config.seo.title}
                        placeholder="Mi Tienda - Ropa y Accesorios"
                        onChange={e => update("seo", { ...config.seo, title: e.target.value })}
                        onFocus={e => (e.target.style.borderColor = "#6366f1")}
                        onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                    </div>
                    <div>
                      <label style={labelStyle}>Descripción</label>
                      <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
                        value={config.seo.description}
                        placeholder="Encontrá los mejores productos en nuestra tienda..."
                        onChange={e => update("seo", { ...config.seo, description: e.target.value })}
                        onFocus={e => (e.target.style.borderColor = "#6366f1")}
                        onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                    </div>
                  </>
                )}
              </div>
            </Section>

          </div>

          <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9",
            display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10,
                cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
                transition: "background 0.25s",
                background: saved ? "#10b981" : "#6366f1", color: "white" }}>
              {saving ? "Guardando..." : saved ? "✓ Cambios guardados" : "Guardar cambios"}
            </button>
            <button type="button" onClick={handleBackToPreview}
              style={{ width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: 10,
                cursor: "pointer", fontSize: 12, fontWeight: 600, background: "white",
                color: "#64748b", transition: "all 0.15s" }}>
              ← Cambiar diseño
            </button>
          </div>
        </aside>

        {/* Right: template preview */}
        <main style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          <EditContext.Provider value={{ editMode: true, activeField, setActiveField }}>
            <StoreConfigContext.Provider value={config}>
              <BrowserFrame storeName={config.storeName}>
                <TemplateComponent />
              </BrowserFrame>
            </StoreConfigContext.Provider>
          </EditContext.Provider>
        </main>

      </div>
    </DashboardLayout>
  );
}
