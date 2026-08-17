"use client";

import { useState, useEffect, useRef } from "react";
import { CAPAS } from "@/lib/capas-tienda";

export type VerifiedInfo = {
  showName: boolean;
  name: string | null;
  showCity: boolean;
  city: string | null;
  showPhone: boolean;
  phone: string | null;
  showSince: boolean;
  memberSince: string | null;
};

export default function VerifiedIconButton({
  isVerified,
  info,
  color,
}: {
  isVerified?: boolean;
  info?: VerifiedInfo;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const hasData = info && (
    (info.showName && info.name) ||
    (info.showCity && info.city) ||
    (info.showPhone && info.phone) ||
    (info.showSince && info.memberSince)
  );

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (isVerified) setOpen((v) => !v); }}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: isVerified ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          lineHeight: 1,
        }}
        aria-label={isVerified ? "Ver datos verificados" : undefined}
        tabIndex={isVerified ? 0 : -1}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isVerified ? (color ?? "#2563eb") : (color ? `${color}55` : "#d1d5db")}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </button>

      {open && isVerified && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          padding: "14px 18px",
          minWidth: 210,
          zIndex: CAPAS.modal,
          whiteSpace: "nowrap",
          // reset herencia de estilos del template
          fontFamily: "'Inter', system-ui, sans-serif",
          textTransform: "none",
          letterSpacing: "normal",
          fontStyle: "normal",
          fontWeight: "normal",
        }}>
          {/* flecha */}
          <div style={{
            position: "absolute",
            top: -7,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 12,
            height: 12,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderBottom: "none",
            borderRight: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: hasData ? 10 : 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>Identidad verificada</span>
          </div>

          {hasData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {info!.showName && info!.name && (
                <Row icon="👤" text={info!.name} />
              )}
              {info!.showCity && info!.city && (
                <Row icon="📍" text={info!.city} />
              )}
              {info!.showPhone && info!.phone && (
                <a
                  href={`https://wa.me/${info!.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", textDecoration: "none" }}
                >
                  <span>💬</span>
                  <span>{info!.phone}</span>
                </a>
              )}
              {info!.showSince && info!.memberSince && (
                <Row icon="📅" text={`En TiendaApps desde ${info!.memberSince}`} />
              )}
            </div>
          )}

          {!hasData && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              Identidad verificada por TiendaApps.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
