"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * La tarjeta de Auto Drive (07/10/26): blanca, redondeada, la foto con marco,
 * los datos en pastillas grises y el precio con su flecha. Es de este template
 * (Auto Motor tiene la suya, oscura).
 *
 * Toda la tarjeta lleva a la página del vehículo con el truco del link estirado
 * (`.td-abrir::after`); el corazón queda encima, aparte.
 */
export const DRIVE_TARJETA_CSS = `
  .td-card { position:relative; transition: box-shadow .3s, transform .3s cubic-bezier(.2,.7,.2,1) }
  .td-card:hover { transform: translateY(-3px); box-shadow: 0 2px 4px rgba(15,23,42,.04), 0 18px 40px rgba(15,23,42,.12) !important }
  .td-card:hover .td-foto img { transform: scale(1.04) }
  .td-card:hover .td-flecha { background: var(--td-acento) !important; color: var(--td-sobre) !important }
  .td-foto img { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .td-flecha { transition: background .2s, color .2s }
  .td-abrir { color:inherit; text-decoration:none; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
  .td-abrir::after { content:""; position:absolute; inset:0; z-index:1; border-radius:20px }
  .td-abrir:focus-visible { outline:none }
  .td-card:has(.td-abrir:focus-visible) { outline:3px solid var(--td-acento); outline-offset:3px }
  .td-fav { z-index:2 }
  @media (prefers-reduced-motion: reduce) { .td-card, .td-foto img { transition:none } .td-card:hover { transform:none } }
`;

const FOTO_VACIA = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";

export function TarjetaDrive({ p, acento, moneda, href, favorito, onFavorito }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  href: string;
  favorito?: boolean;
  onFavorito?: () => void;
}) {
  const sobre = getContrastColor(acento) === "dark" ? "#111" : "#fff";
  const foto = p.images[0] ?? FOTO_VACIA;
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const datos = [attr(p, "Año"), usoDe(p), attr(p, "Transmisión"), attr(p, "Combustible")].filter(Boolean).slice(0, 3);
  const lugar = attr(p, "Localidad") || attr(p, "Provincia");
  const reservado = esReservado(p);
  const oferta = !!p.comparePrice && p.comparePrice > p.price;

  return (
    <article className="td-card" style={{ background: "#fff", borderRadius: 20, padding: 8, display: "flex", flexDirection: "column", height: "100%",
      boxSizing: "border-box", color: "#0f172a", boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 6px 20px rgba(15,23,42,.06)",
      ...({ "--td-acento": acento, "--td-sobre": sobre } as React.CSSProperties) }}>
      <div className="td-foto" style={{ position: "relative", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", background: "#eef0f3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda, ya optimizadas al subir */}
        <img src={foto} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: reservado ? "grayscale(.6)" : undefined }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
        <div style={{ position: "absolute", top: 10, left: 10, right: 56, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {reservado ? (
            <span style={{ background: "#f59e0b", color: "#111", fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999 }}>Reservado</span>
          ) : p.badge ? (
            <span style={{ background: acento, color: sobre, fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, textTransform: "capitalize" }}>{p.badge.toLowerCase()}</span>
          ) : null}
          {oferta && !reservado && (
            <span style={{ background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999 }}>Bajó de precio</span>
          )}
        </div>
        {onFavorito && (
          <button type="button" className="td-fav" onClick={onFavorito}
            aria-label={favorito ? `Sacar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`} aria-pressed={!!favorito}
            style={{ position: "absolute", top: 8, right: 8, width: 40, height: 40, borderRadius: "50%", border: "none", background: "#fff",
              boxShadow: "0 2px 8px rgba(15,23,42,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill={favorito ? "#ef4444" : "none"} stroke={favorito ? "#ef4444" : "#0f172a"}
              strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        )}
      </div>
      <div style={{ padding: "14px 10px 8px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {tipo && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{tipo}</span>}
        <h3 style={{ margin: tipo ? "-6px 0 0" : 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2 }}>
          <Link href={href} className="td-abrir">{p.name}</Link>
        </h3>
        {datos.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {datos.map((d, i) => (
              <li key={i} style={{ fontSize: 12, fontWeight: 600, color: "#334155", background: "#f1f5f9", borderRadius: 8, padding: "5px 9px" }}>{d}</li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "auto", paddingTop: 6, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            {oferta && (
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, monedaDe(p, moneda))}</p>
            )}
            <p style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: -0.6, color: p.price > 0 ? "#0f172a" : "#475569" }}>
              {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
            </p>
            {lugar && (
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lugar}</span>
              </p>
            )}
          </div>
          <span aria-hidden="true" className="td-flecha" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "#f1f5f9", color: "#0f172a",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </div>
      </div>
    </article>
  );
}
