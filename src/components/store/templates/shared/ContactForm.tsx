"use client";
import { useState } from "react";
import { Turnstile } from "@/components/Turnstile";

export function ContactForm({ storeId, accent, textColor, mutedColor, radius = 8, isPreview, variant = "boxed", buttonRadius }: {
  storeId?: string; accent: string; textColor: string; mutedColor: string; radius?: number; isPreview?: boolean;
  variant?: "boxed" | "underline"; buttonRadius?: number;
}) {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileConfigured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || isPreview) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...form, turnstileToken }),
      });
      if (res.ok) { setStatus("sent"); setForm({ nombre: "", email: "", mensaje: "" }); setTurnstileToken(""); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }

  if (status === "sent") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13.5, color: mutedColor, margin: "0 0 12px" }}>¡Gracias! Te vamos a responder a la brevedad.</p>
        <button type="button" onClick={() => setStatus("idle")}
          style={{ background: "none", color: accent, border: `1px solid ${accent}`, borderRadius: buttonRadius ?? radius, padding: "8px 20px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = variant === "underline"
    ? { width: "100%", border: "none", borderBottom: `1px solid ${mutedColor}66`, borderRadius: 0, padding: "8px 2px",
        fontSize: 13.5, color: textColor, background: "transparent", fontFamily: "inherit", boxSizing: "border-box" }
    : { width: "100%", border: `1px solid ${mutedColor}55`, borderRadius: radius, padding: "11px 14px",
        fontSize: 13.5, color: textColor, background: "transparent", fontFamily: "inherit", boxSizing: "border-box" };
  const disabled = status === "sending" || isPreview || (turnstileConfigured && !turnstileToken);
  const btnRadius = buttonRadius ?? (variant === "underline" ? 0 : radius);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: variant === "underline" ? 18 : 12, textAlign: "left", width: "100%" }}>
      <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" required readOnly={isPreview} style={inputStyle} />
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Tu email" type="email" required readOnly={isPreview} style={inputStyle} />
      <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} placeholder="¿En qué te podemos ayudar?" required rows={4} readOnly={isPreview} style={{ ...inputStyle, resize: "vertical" }} />
      {!isPreview && <Turnstile onVerify={setTurnstileToken} />}
      <button type="submit" disabled={disabled}
        style={variant === "underline"
          ? { background: "none", color: textColor, border: "none", borderBottom: `1.5px solid ${textColor}`, borderRadius: 0, padding: "8px 0", fontWeight: 600, fontSize: 13, textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1, width: "fit-content" }
          : { background: accent, color: "#fff", border: "none", borderRadius: btnRadius, padding: "12px 24px", fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
        {status === "sending" ? "Enviando..." : variant === "underline" ? "Enviar mensaje →" : "Enviar mensaje"}
      </button>
      {status === "error" && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>No se pudo enviar. Probá de nuevo.</p>}
      {isPreview && <p style={{ fontSize: 11, color: mutedColor, margin: 0 }}>Vista previa — el formulario no envía en modo edición.</p>}
    </form>
  );
}
