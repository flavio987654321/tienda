"use client";
import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StoreConfig, TemplateId } from "@/types/store-config";
import { TEMPLATE_DEFAULTS, DEFAULT_CONFIG } from "@/types/store-config";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import FashionNoir from "@/components/store/templates/FashionNoir";
import BohoTerra from "@/components/store/templates/BohoTerra";
import UrbanPulse from "@/components/store/templates/UrbanPulse";

/* ── Template metadata ─────────────────────────────────── */
const TEMPLATES: { id: TemplateId; name: string; desc: string; palette: string[] }[] = [
  { id: "fashion-noir", name: "Fashion Noir", desc: "Lujo · Moda · Oscuro",        palette: ["#0a0a0a", "#c9a84c", "#f0ebe3"] },
  { id: "boho-terra",   name: "Boho Terra",   desc: "Orgánico · Natural · Cálido", palette: ["#faf7f2", "#b5652a", "#2c2218"] },
  { id: "urban-pulse",  name: "Urban Pulse",  desc: "Deportivo · Energético",      palette: ["#0f0f0f", "#d4ff00", "#f5f5f5"] },
];

const TEMPLATE_COMPONENTS: Record<TemplateId, React.ComponentType> = {
  "fashion-noir": FashionNoir,
  "boho-terra":   BohoTerra,
  "urban-pulse":  UrbanPulse,
};

/* ── Helpers ───────────────────────────────────────────── */
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
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [openSection, setOpenSection] = useState<string>("template");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = useCallback(<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  }, []);

  const toggleSection = (id: string) => setOpenSection(s => s === id ? "" : id);

  const selectTemplate = (id: TemplateId) => {
    const defaults = TEMPLATE_DEFAULTS[id];
    setConfig(c => ({ ...c, template: id, colors: { accent: defaults.accent } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const TemplateComponent = TEMPLATE_COMPONENTS[config.template];

  return (
    <DashboardLayout>
      <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#f8fafc" }}>

        {/* ── LEFT PANEL ──────────────────────────────────── */}
        <aside style={{
          width: 320, flexShrink: 0, height: "100%", display: "flex",
          flexDirection: "column", background: "white",
          borderRight: "1px solid #e2e8f0", boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Diseñá tu tienda</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>Preview en vivo mientras editás</p>
          </div>

          {/* Scrollable sections */}
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* Template selector */}
            <Section id="template" label="Template" icon="🎨" open={openSection === "template"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} type="button" onClick={() => selectTemplate(t.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      border: `2px solid ${config.template === t.id ? "#6366f1" : "#e2e8f0"}`,
                      borderRadius: 10, background: config.template === t.id ? "#f0f0ff" : "white",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }}>
                      {t.palette.map((c, i) => <div key={i} style={{ width: 16, height: 34, background: c }} />)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{t.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</p>
                    </div>
                    {config.template === t.id && <span style={{ color: "#6366f1", fontSize: 16, flexShrink: 0 }}>✓</span>}
                  </button>
                ))}
              </div>
            </Section>

            {/* Información */}
            <Section id="info" label="Información" icon="🏪" open={openSection === "info"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre de la tienda</label>
                  <input style={inputStyle} value={config.storeName} placeholder="Mi Tienda"
                    onChange={e => update("storeName", e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                <div>
                  <label style={labelStyle}>Tagline</label>
                  <input style={inputStyle} value={config.storeTagline} placeholder="Tu tienda online"
                    onChange={e => update("storeTagline", e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
              </div>
            </Section>

            {/* Colores */}
            <Section id="colores" label="Colores" icon="🎨" open={openSection === "colores"} onToggle={toggleSection}>
              <div>
                <label style={labelStyle}>Color de acento</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="color" value={config.colors.accent}
                    onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                    style={{ width: 40, height: 38, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                  <input style={{ ...inputStyle, fontFamily: "monospace", flex: 1 }}
                    value={config.colors.accent}
                    onChange={e => update("colors", { ...config.colors, accent: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = "#6366f1")}
                    onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  Afecta botones, precios y elementos destacados del template.
                </p>
              </div>
            </Section>

            {/* WhatsApp */}
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
                    <input style={inputStyle} value={config.whatsapp.number}
                      placeholder="+54 9 11 0000-0000"
                      onChange={e => update("whatsapp", { ...config.whatsapp, number: e.target.value })}
                      onFocus={e => (e.target.style.borderColor = "#6366f1")}
                      onBlur={e => (e.target.style.borderColor = "#e2e8f0")} />
                  </div>
                )}
              </div>
            </Section>

            {/* Moneda & Idioma */}
            <Section id="moneda" label="Moneda & Idioma" icon="💱" open={openSection === "moneda"} onToggle={toggleSection}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Moneda</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["ARS", "USD"] as const).map(c => (
                      <button key={c} type="button" onClick={() => update("currency", c)}
                        style={{
                          flex: 1, padding: "9px", border: `2px solid ${config.currency === c ? "#6366f1" : "#e2e8f0"}`,
                          borderRadius: 8, background: config.currency === c ? "#f0f0ff" : "white",
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                          color: config.currency === c ? "#6366f1" : "#64748b", transition: "all 0.15s",
                        }}>
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
                        style={{
                          flex: 1, padding: "9px 6px", border: `2px solid ${config.language === l ? "#6366f1" : "#e2e8f0"}`,
                          borderRadius: 8, background: config.language === l ? "#f0f0ff" : "white",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: config.language === l ? "#6366f1" : "#64748b", transition: "all 0.15s",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* SEO */}
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

          {/* Save button */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9" }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{
                width: "100%", padding: "12px", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700, transition: "background 0.25s",
                background: saved ? "#10b981" : "#6366f1", color: "white",
              }}>
              {saving ? "Guardando..." : saved ? "✓ Cambios guardados" : "Guardar cambios"}
            </button>
          </div>
        </aside>

        {/* ── RIGHT PANEL — Preview ────────────────────────── */}
        <main style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Browser chrome */}
          <div style={{ background: "#1e293b", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28ca41" }} />
            </div>
            <div style={{ flex: 1, background: "#0f172a", borderRadius: 6, padding: "5px 14px", fontSize: 12, color: "#64748b", textAlign: "center", userSelect: "none" }}>
              mitienda.com/tienda/{config.storeName.toLowerCase().replace(/\s+/g, "-")}
            </div>
          </div>

          {/* Template preview — rendered inline, no iframe */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            <StoreConfigContext.Provider value={config}>
              <TemplateComponent />
            </StoreConfigContext.Provider>
          </div>
        </main>

      </div>
    </DashboardLayout>
  );
}
