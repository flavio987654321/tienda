"use client";
import { useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { esOpcionDeColor } from "@/lib/opciones";
import { getContrastColor } from "@/contexts/EditContext";
import { monedaDe } from "@/lib/monedaVehiculo";

export function fmtPrice(n: number, currency: string) {
  return (currency === "USD" ? "USD " : "$") + n.toLocaleString("es-AR");
}


export function attr(p: StorefrontProduct, key: string): string {
  return p.attributes.find(a => a.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}

/* Los kilómetros como NÚMERO, se hayan escrito como se hayan escrito (06/10/26).
   Se mostraban con `Number(km)`: "28.000" daba 28 (el punto es de miles acá) y
   "1500 km" daba NaN. Pasaba con los datos de muestra del editor, con planillas
   importadas y con lo que se tipeara a mano. Además el formulario guarda la
   clave "Kilómetros" y algunas partes leían sólo "Km": se leen las dos. */
export function kmDe(p: StorefrontProduct): number | null {
  const crudo = (attr(p, "Kilómetros") || attr(p, "Km")).trim().replace(/,\d{1,2}$/, "");
  const d = crudo.replace(/\D/g, "");
  return d ? Number(d) : null;
}
export function fmtKm(km: number): string {
  return `${km.toLocaleString("es-AR")} km`;
}

// "Localidad, Provincia" (campos nuevos) con fallback a los campos viejos
// (Ubicación/Ciudad/"Ciudad / Zona") para vehículos publicados antes de que
// existieran los selectores de Provincia/Localidad/Código Postal.
export function vehicleLocation(p: StorefrontProduct): string {
  const combined = [attr(p, "Localidad"), attr(p, "Provincia")].filter(Boolean).join(", ");
  return combined || attr(p, "Ubicación") || attr(p, "Ciudad") || attr(p, "Ciudad / Zona") || "";
}

/* "Reservado" (06/10/26): el auto sigue a la vista —decisión del dueño— pero
   tiene que leerse a primera vista que no está libre. Ámbar con texto oscuro:
   se lee sobre cualquier foto y no se confunde con el acento de la tienda. */
export const esReservado = (p: StorefrontProduct) => p.vehicleStatus === "RESERVED";
const ESTILO_RESERVADO = { background: "#f59e0b", color: "#111", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 0.8 };

export function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export const AUTO_SERVICES = [
  { key: "aceite",       label: "Aceite y filtros" },
  { key: "frenos",       label: "Frenos" },
  { key: "distribucion", label: "Distribución" },
  { key: "cubiertas",    label: "Cubiertas" },
  { key: "suspension",   label: "Suspensión" },
  { key: "electrico",    label: "Sist. eléctrico" },
  { key: "ac",           label: "Aire acond." },
  { key: "caja",         label: "Caja de cambios" },
];


/* Todas las columnas con `minmax(0, …)` y los hijos con `min-width: 0` (06/10/26).
   Un `1fr` a secas no baja del ancho de su contenido: la tira de miniaturas en
   fila (68 px cada una) ensanchaba la columna, y a 360 px con diez fotos el
   modal medía 733 px — el botón de WhatsApp quedaba fuera de la pantalla. */
export const AM_MODAL_CSS = `
  /* La tarjeta del vehículo (5.7): el nombre es el botón y se estira sobre toda
     la tarjeta, así se abre con el teclado y el corazón queda como botón aparte
     (antes era un div con click y un botón adentro). */
  .vc-card { position: relative }
  .vc-abrir { all: unset; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden }
  .vc-abrir::after { content: ""; position: absolute; inset: 0; z-index: 1 }
  .vc-card:has(.vc-abrir:focus-visible) { outline: 2px solid currentColor; outline-offset: 3px }
  .vc-fav { z-index: 2 }
  .am-modal-body { grid-template-columns: minmax(0,1fr) !important }
  .am-modal-body > * { min-width: 0 }
  @media(min-width:700px){ .am-modal-body { grid-template-columns: minmax(0,3fr) minmax(0,2fr) !important } }
  .am-specs-grid { grid-template-columns: minmax(0,1fr) !important }
  @media(min-width:560px){ .am-specs-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important } }
  .am-similar-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important }
  @media(min-width:560px){ .am-similar-grid { grid-template-columns: repeat(4,minmax(0,1fr)) !important } }
  .am-img-wrap { flex-direction: column !important }
  .am-img-thumbs { flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; width: 100% !important; max-height: 64px !important; padding: 6px 8px !important }
  @media(min-width:700px){
    .am-img-wrap { flex-direction: row !important }
    .am-img-thumbs { flex-direction: column !important; overflow-x: hidden !important; overflow-y: auto !important; width: 80px !important; max-height: none !important; padding: 8px 6px !important }
  }
`;

/** Los datos principales de un vehículo (marca, modelo, año, km u horas…), los
    que tiene cargados. Los usan la ventana y la página del vehículo. */
export function datosDelVehiculo(product: StorefrontProduct): { label: string; value: string }[] {
  const año = attr(product, "Año");
  const km = kmDe(product);
  return [
    { label: "Marca",       value: attr(product, "Marca") },
    { label: "Modelo",      value: attr(product, "Modelo") },
    { label: "Versión",     value: attr(product, "Versión") },
    { label: "Año",         value: año },
    { label: "Kilómetros",  value: km != null ? fmtKm(km) : "" },
    // Maquinaria agrícola: horas de uso en vez de kilómetros (ver lib/fichaVehiculo).
    { label: "Horas de uso", value: attr(product, "Horas de uso") ? `${Number(attr(product, "Horas de uso").replace(/\D/g, "")).toLocaleString("es-AR")} h` : "" },
    { label: "Motor",       value: attr(product, "Motor") },
    { label: "Transmisión", value: attr(product, "Transmisión") },
    { label: "Combustible", value: attr(product, "Combustible") },
    { label: "Tracción",    value: attr(product, "Tracción") },
    { label: "Carrocería",  value: attr(product, "Carrocería") },
    { label: "Color",       value: attr(product, "Color") || (product.opciones.find(o => esOpcionDeColor(o.nombre))?.valores[0] ?? "") },
    { label: "Puertas",     value: attr(product, "Puertas") ? `${attr(product, "Puertas")} puertas` : "" },
  ].filter(s => s.value);
}

export function VehicleCard({ product, accent, currency, theme = "light", href, onClick, isFavorite, onToggleFavorite }: {
  product: StorefrontProduct; accent: string; currency: string;
  /** La página del vehículo. Sin `href`, abre con `onClick`. */
  href?: string;
  theme?: "dark" | "light"; onClick?: () => void;
  isFavorite?: boolean; onToggleFavorite?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const img = product.images[0]
    ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
  const año = attr(product, "Año");
  const km = kmDe(product);
  const trans = attr(product, "Transmisión");
  const comb = attr(product, "Combustible");
  const condicion = attr(product, "Condición");
  const ubicacion = vehicleLocation(product);

  const D = theme === "dark";
  const cardBg    = D ? "#1e1e1e" : "#ffffff";
  const titleCol  = D ? "#f0f0f0" : "#333333";
  const priceCol  = D ? "#ffffff" : "#333333";
  const subCol    = D ? "#888"    : "#999";
  const borderCol = D ? (hov ? "#444" : "#2a2a2a") : (hov ? "#c8c8c8" : "#e0e0e0");

  const metaLine = [año, km != null ? fmtKm(km) : null, trans, comb]
    .filter(Boolean).join(" · ");

  return (
    <div className="vc-card"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: cardBg, borderRadius: 6, overflow: "hidden", cursor: "pointer", color: titleCol,
        border: `1px solid ${borderCol}`,
        boxShadow: hov ? `0 4px 20px rgba(0,0,0,${D ? 0.4 : 0.1})` : `0 1px 4px rgba(0,0,0,${D ? 0.3 : 0.06})`,
        transition: "box-shadow 0.2s, border-color 0.2s", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden",
        background: D ? "#111" : "#f5f5f5" }}>
        {/* El nombre ya lo dice el botón de abajo: la foto no lo repite al lector de pantalla. */}
        <img src={img} alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: D ? "#111" : "#ffffff",
            opacity: esReservado(product) ? 0.7 : 1 }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75"; }} />
        {esReservado(product) ? (
          <div style={{ position: "absolute", top: 10, left: 10, fontSize: 10, padding: "3px 10px", borderRadius: 4, ...ESTILO_RESERVADO }}>
            Reservado
          </div>
        ) : product.badge && (
          <div style={{ position: "absolute", top: 10, left: 10,
            background: accent, color: getContrastColor(accent) === "light" ? "#fff" : "#111",
            fontSize: 10, fontWeight: 700, padding: "3px 10px",
            borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {product.badge}
          </div>
        )}
        {condicion && (
          <div style={{ position: "absolute", bottom: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
            {condicion}
          </div>
        )}
        {onToggleFavorite && (
          <button type="button" className="vc-fav" onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={isFavorite ? `Sacar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`} aria-pressed={!!isFavorite}
            style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,255,255,0.9)",
              border: "none", cursor: "pointer", width: 40, height: 40, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill={isFavorite ? accent : "none"} stroke={isFavorite ? accent : "#666"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: titleCol, lineHeight: 1.35 }}>
          {href
            ? <Link href={href} className="vc-abrir">{product.name}</Link>
            : <button type="button" className="vc-abrir" onClick={onClick}>{product.name}</button>}
        </p>
        <p style={{ margin: 0, fontSize: "clamp(18px,2.2vw,22px)", fontWeight: 700, color: priceCol, letterSpacing: -0.5 }}>
          {fmtPrice(product.price, monedaDe(product, currency))}
        </p>
        {metaLine && <p style={{ margin: 0, fontSize: 12, color: subCol, lineHeight: 1.4 }}>{metaLine}</p>}
        {ubicacion && <p style={{ margin: 0, fontSize: 11, color: subCol }}>{ubicacion}</p>}
      </div>
    </div>
  );
}
