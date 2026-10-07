"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, kmDe, fmtKm, fmtPrice, esReservado } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe } from "@/lib/monedaVehiculo";
import { entero } from "@/lib/filtroVehiculos";
import { usaHoras, NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * La tarjeta de Auto Motor (06/10/26). Propia de este template: oscura, la foto
 * manda, y abajo sólo lo que decide una consulta (año, uso, precio, dónde).
 *
 * Teclado: el nombre es el botón y se estira sobre toda la tarjeta (`.tm-abrir`
 * en MOTOR_CSS); el corazón queda aparte, por encima. Nada de botón dentro de
 * botón.
 */
export const MOTOR_TARJETA_CSS = `
  .tm-card { position:relative; transition: transform .35s cubic-bezier(.2,.7,.2,1), border-color .25s }
  .tm-card:hover { transform: translateY(-4px) }
  .tm-card:hover .tm-foto img { transform: scale(1.045) }
  .tm-foto img { transition: transform .8s cubic-bezier(.2,.7,.2,1) }
  .tm-abrir { all:unset; cursor:pointer; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
  .tm-abrir::after { content:""; position:absolute; inset:0; z-index:1 }
  .tm-card:has(.tm-abrir:focus-visible) { outline:2px solid var(--tm-acento); outline-offset:3px }
  .tm-fav { z-index:2 }
  @media (prefers-reduced-motion: reduce) { .tm-card, .tm-foto img { transition:none } .tm-card:hover { transform:none } }
`;

const FOTO_VACIA = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";

export function usoDe(p: StorefrontProduct): string {
  if (usaHoras(p.category)) {
    const h = entero(attr(p, "Horas de uso"));
    return h != null ? `${h.toLocaleString("es-AR")} h` : "";
  }
  const km = kmDe(p);
  return km == null ? "" : km === 0 ? "0 km" : fmtKm(km);
}

export function TarjetaMotor({ p, acento, moneda, onAbrir, favorito, onFavorito }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  onAbrir: () => void;
  favorito?: boolean;
  onFavorito?: () => void;
}) {
  const foto = p.images[0] ?? FOTO_VACIA;
  const anio = attr(p, "Año");
  const uso = usoDe(p);
  const trans = attr(p, "Transmisión");
  const comb = attr(p, "Combustible");
  const lugar = attr(p, "Localidad") || attr(p, "Provincia");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const reservado = esReservado(p);
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const datos = [anio, uso, trans, comb].filter(Boolean);

  return (
    <article className="tm-card" style={{ background: "#141619", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", color: "#f4f4f5",
      ...({ "--tm-acento": acento } as React.CSSProperties) }}>
      <div className="tm-foto" style={{ position: "relative", aspectRatio: "16/11", overflow: "hidden", background: "#0b0c0e" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda, ya optimizadas al subir */}
        <img src={foto} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
          opacity: reservado ? 0.55 : 1 }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,12,14,0.85) 0%, rgba(11,12,14,0) 45%)" }} />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {reservado ? (
            <span style={{ background: "#f59e0b", color: "#111", fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
              textTransform: "uppercase", padding: "4px 9px", borderRadius: 2 }}>Reservado</span>
          ) : p.badge ? (
            <span style={{ background: acento, color: getContrastColor(acento) === "dark" ? "#111" : "#fff", fontSize: 10, fontWeight: 800,
              letterSpacing: 1.2, textTransform: "uppercase", padding: "4px 9px", borderRadius: 2 }}>{p.badge}</span>
          ) : null}
          {oferta && !reservado && (
            <span style={{ background: "#fff", color: "#111", fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
              textTransform: "uppercase", padding: "4px 9px", borderRadius: 2 }}>Bajó de precio</span>
          )}
        </div>
        {tipo && (
          <span style={{ position: "absolute", left: 14, bottom: 12, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
            color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{tipo}</span>
        )}
        {onFavorito && (
          <button type="button" className="tm-fav" onClick={e => { e.stopPropagation(); onFavorito(); }}
            aria-label={favorito ? `Sacar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`} aria-pressed={!!favorito}
            style={{ position: "absolute", top: 8, right: 8, width: 40, height: 40, borderRadius: "50%", border: "none",
              background: "rgba(11,12,14,0.55)", backdropFilter: "blur(6px)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill={favorito ? acento : "none"} stroke={favorito ? acento : "#fff"}
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        )}
      </div>
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2 }}>
          <button type="button" className="tm-abrir" onClick={onAbrir}>{p.name}</button>
        </h3>
        {datos.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
            {datos.map((d, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                {i > 0 && <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />}
                {d}
              </span>
            ))}
          </p>
        )}
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            {oferta && (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>
                {fmtPrice(p.comparePrice!, monedaDe(p, moneda))}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: p.price > 0 ? "#fff" : "rgba(255,255,255,0.7)" }}>
              {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
            </p>
          </div>
          {lugar && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "right", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45%" }}>{lugar}</span>
          )}
        </div>
      </div>
    </article>
  );
}
