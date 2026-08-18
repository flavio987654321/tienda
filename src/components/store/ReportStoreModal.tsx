"use client";

import { useState } from "react";
import { CAPAS } from "@/lib/capas-tienda";

const REASONS = [
  "Estafa o fraude",
  "Productos falsos o engañosos",
  "No entrega los pedidos",
  "Contenido inapropiado",
  "Otro",
];

interface Props {
  slug: string;
  onClose: () => void;
}

export default function ReportStoreModal({ slug, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stores/${slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description, reporterEmail }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: CAPAS.modal,
        background: "rgba(0,0,0,0.6)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: "16px", padding: "28px 24px",
          maxWidth: "420px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>
              Denuncia enviada
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
              Recibimos tu reporte. Nuestro equipo lo revisará a la brevedad.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "#6366f1", color: "#fff", border: "none",
                borderRadius: "10px", padding: "12px 28px", fontWeight: 600,
                fontSize: "15px", cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111", margin: 0 }}>
                  Reportar esta tienda
                </h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                  Tu reporte es anónimo y será revisado por nuestro equipo.
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#9ca3af", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Motivo *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    border: "1px solid #d1d5db", fontSize: "14px", color: "#111",
                    background: "#fff", outline: "none", boxSizing: "border-box",
                  }}
                >
                  <option value="">Seleccioná un motivo</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contanos más detalles sobre lo que pasó..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    border: "1px solid #d1d5db", fontSize: "14px", color: "#111",
                    resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Tu email (opcional, para seguimiento)
                </label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    border: "1px solid #d1d5db", fontSize: "14px", color: "#111",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !reason}
                style={{
                  width: "100%", padding: "12px", borderRadius: "10px",
                  background: reason ? "#dc2626" : "#d1d5db",
                  color: "#fff", border: "none", fontWeight: 700,
                  fontSize: "15px", cursor: reason ? "pointer" : "not-allowed",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "Enviando..." : "Enviar denuncia"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
