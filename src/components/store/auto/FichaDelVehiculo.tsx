"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { getContrastColor } from "@/contexts/EditContext";
import { leerFicha, bloquesDeFicha, tipoDeFicha, urlFichaPdf, type FilaDeFicha } from "@/lib/fichaVehiculo";

/* La ficha técnica en el modal del vehículo (06/10/26). Dos piezas:
   `DescargasDeFicha` va debajo del botón de consultar (se ve sin bajar) y
   `BloquesDeLaFicha` va debajo de "Características del vehículo".
   Los datos y el porqué de cómo se guardan están en `lib/fichaVehiculo`. */

function IconoDoc({ color }: { color: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 18 15 15" />
    </svg>
  );
}

const BOTON: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "8px 14px",
  borderRadius: 6, border: "1px solid #dfe3ea", background: "#fff", color: "#1a2744",
  fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer",
};

/**
 * "Descargar ficha (PDF)" y, si la concesionaria subió uno, su folleto.
 * En la previa del editor no va: los vehículos de muestra no existen en la
 * base y el PDF daría "no encontrado".
 */
export function DescargasDeFicha({ product, accent, isPreview }: { product: StorefrontProduct; accent: string; isPreview?: boolean }) {
  const tipo = tipoDeFicha(product.category);
  if (!tipo || isPreview) return null;
  const { folleto } = leerFicha(product.attributes);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={urlFichaPdf(product.id)} target="_blank" rel="noopener" style={BOTON}>
        <IconoDoc color={accent} /> Descargar ficha (PDF)
      </a>
      {folleto && (
        <a href={folleto.url} target="_blank" rel="noopener noreferrer" style={BOTON} title={folleto.nombre}>
          <IconoDoc color={accent} /> Folleto de la concesionaria
        </a>
      )}
    </div>
  );
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "18px 0 8px", fontSize: 11, fontWeight: 700, color: "#888",
      textTransform: "uppercase", letterSpacing: 1 }}>{children}</p>
  );
}

function Filas({ filas }: { filas: FilaDeFicha[] }) {
  return (
    <div className="am-specs-grid" style={{ display: "grid", gap: "0 32px" }}>
      {filas.map((f) => (
        <div key={f.label} style={{ display: "flex", justifyContent: "space-between", gap: 12,
          padding: "9px 0", borderBottom: "1px solid #f3f3f3", minWidth: 0 }}>
          <span style={{ fontSize: 13, color: "#777" }}>{f.label}</span>
          <strong style={{ fontSize: 13, color: "#222", fontWeight: 600, textAlign: "right" }}>{f.valor}</strong>
        </div>
      ))}
    </div>
  );
}

function Tildados({ items, accent }: { items: string[]; accent: string }) {
  // Con un acento claro (amarillo, por ejemplo) el tilde blanco no se lee.
  const tilde = getContrastColor(accent) === "light" ? "#fff" : "#111";
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((i) => (
        <li key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#333",
          background: "#f6f7f9", border: "1px solid #eceef2", borderRadius: 20, padding: "5px 12px 5px 6px" }}>
          <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", background: accent, flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={tilde} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
          {i}
        </li>
      ))}
    </ul>
  );
}

/** Motor, medidas, equipamiento y papeles. Nada si no se cargó nada. */
export function BloquesDeLaFicha({ product, accent }: { product: StorefrontProduct; accent: string }) {
  const tipo = tipoDeFicha(product.category);
  if (!tipo) return null;
  const b = bloquesDeFicha(leerFicha(product.attributes), tipo);
  if (!b.motor.length && !b.medidas.length && !b.equipamiento.length && !b.papeles.length) return null;
  return (
    <div style={{ padding: "6px 28px 24px", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 0" }}>
        <div style={{ width: 4, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a2744", textTransform: "uppercase", letterSpacing: 1 }}>
          Ficha técnica
        </h3>
      </div>
      {b.motor.length > 0 && (<><Subtitulo>Motor y prestaciones</Subtitulo><Filas filas={b.motor} /></>)}
      {b.medidas.length > 0 && (<><Subtitulo>Medidas</Subtitulo><Filas filas={b.medidas} /></>)}
      {b.equipamiento.length > 0 && (<><Subtitulo>Equipamiento</Subtitulo><Tildados items={b.equipamiento} accent={accent} /></>)}
      {b.papeles.length > 0 && (<><Subtitulo>Papeles y condiciones</Subtitulo><Tildados items={b.papeles} accent={accent} /></>)}
    </div>
  );
}
