"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2 } from "lucide-react";

type Props = {
  storeName: string;
  period: number;
  revenue: number;
  orders: number;
  visits: number;
  isAutos?: boolean;
  leads?: number;
  confirmedSales?: number;
};

export default function ShareStatsButton({
  storeName,
  period,
  revenue,
  orders,
  visits,
  isAutos = false,
  leads,
  confirmedSales,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const stats = isAutos
    ? [
        { label: "Consultas", value: String(leads ?? 0) },
        { label: "Ventas confirmadas", value: String(confirmedSales ?? 0) },
        { label: "Visitas", value: visits.toLocaleString("es-AR") },
      ]
    : [
        { label: "Ingresos", value: `$${Math.round(revenue).toLocaleString("es-AR")}` },
        { label: "Pedidos", value: String(orders) },
        { label: "Visitas", value: visits.toLocaleString("es-AR") },
      ];

  function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function handleShare() {
    if (loading || !cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, skipFonts: true });
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], "mis-estadisticas.png", { type: "image/png" });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ title: `${storeName} — últimos ${period} días`, files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "mis-estadisticas.png";
        a.click();
      }
    } catch (e) {
      console.error("[share-stats]", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Tarjeta off-screen capturada por html-to-image — sin imágenes externas */}
      <div
        ref={cardRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 360,
          padding: "28px 24px 22px",
          background: "#ffffff",
          borderRadius: 20,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          tiendaapps.com
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#111827", marginBottom: 3, lineHeight: 1.2 }}>
          {storeName}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
          Últimos {period} días
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "#eef2ff",
                borderRadius: 12,
                padding: "12px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 900, color: "#4f46e5" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 10, color: "#c4b5fd", textAlign: "center" }}>
          Creá tu tienda en tiendaapps.com
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50 print:hidden"
      >
        <Share2 className="h-3.5 w-3.5 shrink-0" />
        {loading ? "Generando…" : "Compartir"}
      </button>
    </>
  );
}
