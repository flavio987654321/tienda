"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEditContext } from "@/contexts/EditContext";

const POLICY_INFO: Record<string, { title: string; defaultBlocks: string[] }> = {
  policyReturns: {
    title: "Política de devoluciones",
    defaultBlocks: [
      "Tenés 30 días corridos desde que recibís el producto para solicitar un cambio o devolución.",
      "El artículo debe estar en perfectas condiciones: sin uso, con etiquetas y en su embalaje original.",
      "Para iniciar una devolución, escribinos por WhatsApp o email con tu número de pedido y el motivo.",
      "Los gastos de envío de la devolución corren por cuenta del comprador, excepto cuando el producto llegue defectuoso o hayamos cometido un error en el envío.",
      "Una vez recibido y verificado el producto, procesamos el reembolso o cambio en 3 a 5 días hábiles.",
    ],
  },
  policyShipping: {
    title: "Política de envíos",
    defaultBlocks: [
      "Realizamos envíos a todo el país a través de correo oficial y empresas de transporte privadas.",
      "El tiempo estimado de entrega es de 3 a 7 días hábiles para el interior del país, y de 24 a 48 horas para CABA y GBA.",
      "Los pedidos se procesan de lunes a viernes en horario hábil. Los realizados el fin de semana se despachan el lunes siguiente.",
      "El costo de envío se calcula automáticamente al checkout según tu ubicación y el peso del pedido.",
      "Realizamos envíos internacionales a países seleccionados. Consultanos para más información.",
    ],
  },
  policyTerms: {
    title: "Términos y condiciones",
    defaultBlocks: [
      "Al realizar una compra en nuestra tienda, aceptás estos términos y condiciones en su totalidad.",
      "Los precios publicados son en pesos argentinos e incluyen IVA. Nos reservamos el derecho de modificar precios sin previo aviso.",
      "El usuario es responsable de mantener la confidencialidad de sus datos de acceso a la plataforma.",
      "En caso de cancelación de un pedido confirmado, podemos aplicar un cargo administrativo del 10% del valor de la compra.",
      "Cualquier disputa será resuelta de acuerdo a la legislación vigente en la República Argentina.",
    ],
  },
};

export default function PolicyEditorModal({ field, onClose }: {
  field: string;
  onClose: () => void;
}) {
  const { overrides, setOverride } = useEditContext();
  const info = POLICY_INFO[field];

  const existingText = overrides[field]?.text;
  const initialBlocks = existingText
    ? existingText.split("\n\n").filter(b => b.trim())
    : (info?.defaultBlocks ?? []);

  const [blocks, setBlocks] = useState<string[]>(initialBlocks);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSave = () => {
    const text = blocks.filter(b => b.trim()).join("\n\n");
    setOverride(field, { text: text || undefined });
    onClose();
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingText(blocks[idx]);
  };

  const confirmEdit = () => {
    if (editingIdx === null) return;
    const next = [...blocks];
    next[editingIdx] = editingText;
    setBlocks(next);
    setEditingIdx(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    if (editingIdx !== null && !blocks[editingIdx]) {
      setBlocks(prev => prev.filter((_, i) => i !== editingIdx));
    }
    setEditingIdx(null);
    setEditingText("");
  };

  const deleteBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
    setEditingText("");
  };

  const addBlock = () => {
    const newIdx = blocks.length;
    setBlocks(prev => [...prev, ""]);
    setEditingIdx(newIdx);
    setEditingText("");
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999999,
        display: "flex", justifyContent: "center", alignItems: "stretch",
        background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 660, background: "#050a12",
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid rgba(99,102,241,0.16)",
        borderRight: "1px solid rgba(99,102,241,0.16)",
        boxShadow: "0 0 80px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{
          padding: "28px 32px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
          background: "linear-gradient(180deg, rgba(99,102,241,0.05) 0%, transparent 100%)",
        }}>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 3 }}>
              Editando política legal
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.3 }}>
              {info?.title ?? field}
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(248,250,252,0.35)", lineHeight: 1.6 }}>
              Pasá el mouse sobre un párrafo y hacé click en el lapicito para editarlo.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, background: "rgba(255,255,255,0.04)",
              color: "rgba(248,250,252,0.5)", cursor: "pointer", fontSize: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginLeft: 20,
            }}
          >×</button>
        </div>

        {/* Blocks */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 8px" }}>
          {blocks.map((block, idx) => (
            <div
              key={idx}
              onMouseEnter={() => editingIdx === null && setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                marginBottom: 10,
                position: "relative",
                borderRadius: 10,
                border: editingIdx === idx
                  ? "1px solid rgba(99,102,241,0.45)"
                  : hoveredIdx === idx
                  ? "1px solid rgba(99,102,241,0.2)"
                  : "1px solid rgba(255,255,255,0.04)",
                background: editingIdx === idx
                  ? "rgba(99,102,241,0.07)"
                  : hoveredIdx === idx
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(255,255,255,0.02)",
                transition: "all 0.15s",
                padding: editingIdx === idx ? "14px 16px 10px" : "12px 52px 12px 16px",
              }}
            >
              {editingIdx === idx ? (
                <>
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      color: "#e2e8f0", fontSize: 14, lineHeight: 1.8,
                      outline: "none", resize: "vertical", fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button
                      onClick={confirmEdit}
                      style={{
                        padding: "6px 16px", borderRadius: 7, border: "none",
                        background: "#6366f1", color: "white", fontSize: 12,
                        fontWeight: 700, cursor: "pointer",
                      }}
                    >✓ Confirmar</button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "6px 12px", borderRadius: 7,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "rgba(248,250,252,0.45)",
                        fontSize: 12, cursor: "pointer",
                      }}
                    >Cancelar</button>
                    <button
                      onClick={() => deleteBlock(idx)}
                      style={{
                        padding: "6px 12px", borderRadius: 7, marginLeft: "auto",
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.07)", color: "#f87171",
                        fontSize: 12, cursor: "pointer",
                      }}
                    >Eliminar</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: "rgba(248,250,252,0.68)", lineHeight: 1.8 }}>
                    {block || <em style={{ opacity: 0.35, fontSize: 13 }}>Párrafo vacío</em>}
                  </p>
                  {hoveredIdx === idx && (
                    <button
                      onClick={() => startEdit(idx)}
                      style={{
                        position: "absolute", top: 10, right: 10,
                        width: 28, height: 28,
                        border: "1px solid rgba(99,102,241,0.4)",
                        borderRadius: 7, background: "rgba(99,102,241,0.15)",
                        color: "#818cf8", cursor: "pointer", fontSize: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Editar párrafo"
                    >✏</button>
                  )}
                </>
              )}
            </div>
          ))}

          <button
            onClick={addBlock}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, marginBottom: 8,
              border: "1.5px dashed rgba(99,102,241,0.28)",
              background: "transparent", color: "rgba(129,140,248,0.7)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.55)"; e.currentTarget.style.color = "#818cf8"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.28)"; e.currentTarget.style.color = "rgba(129,140,248,0.7)"; }}
          >
            + Agregar párrafo
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 32px 28px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(248,250,252,0.26)", lineHeight: 1.5 }}>
            Los cambios se guardan al presionar &quot;Guardar cambios&quot; en el editor de diseño.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 10, background: "transparent",
                color: "rgba(248,250,252,0.45)", fontSize: 13, cursor: "pointer",
              }}
            >Cerrar sin guardar</button>
            <button
              onClick={handleSave}
              style={{
                flex: 2, padding: "12px", border: "none", borderRadius: 10,
                background: "#6366f1", color: "white", fontSize: 14, fontWeight: 700,
                cursor: "pointer",
              }}
            >Listo</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
