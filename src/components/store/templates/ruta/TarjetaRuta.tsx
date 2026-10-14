"use client";
/**
 * La tarjeta de una unidad en Auto Ruta (15/10/26).
 *
 * Lo que un comprador de trabajo mira primero: para qué sirve, el año, cuánto
 * anduvo y la tracción. Foto arriba, "Sirve para" como rótulo de planilla y el
 * precio abajo, grande. Sin íconos de adorno.
 */
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { getContrastColor } from "@/contexts/EditContext";
import { fotoLiviana } from "@/lib/foto-liviana";
import { FOTO_VACIA } from "@/lib/foto-vacia";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { trabajosDe, NOMBRE_TRABAJO } from "@/lib/trabajoVehiculo";
import { PAPEL, TINTA, TENUE, LINEA, TITULAR } from "./estiloRuta";

export const TARJETA_RUTA_CSS = `
  .tr-card { transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s }
  .tr-card:hover { transform: translateY(-3px); box-shadow: 0 22px 40px -26px rgba(22,25,29,.45) }
  .tr-card:focus-within { box-shadow: 0 0 0 3px var(--tr-acento) }
  .tr-foto img { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .tr-card:hover .tr-foto img { transform: scale(1.04) }
  @media (prefers-reduced-motion: reduce) { .tr-card, .tr-foto img { transition:none } .tr-card:hover { transform:none } }
`;

export function TarjetaRuta({ p, acento, moneda, href, favorito, onFavorito }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  href: string;
  favorito?: boolean;
  onFavorito?: () => void;
}) {
  const anio = attr(p, "Año");
  const uso = usoDe(p);
  const traccion = attr(p, "Tracción");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const trabajos = trabajosDe(p);
  const reservado = esReservado(p);
  const datos = [anio, uso, traccion].filter(Boolean);

  return (
    <article className="tr-card" style={{ position: "relative", background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 6, overflow: "hidden",
      display: "flex", flexDirection: "column", ...({ "--tr-acento": acento } as React.CSSProperties) }}>
      <div className="tr-foto" style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "#e7e5df" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
        <img src={fotoLiviana(p.images[0] ?? FOTO_VACIA, 640)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: reservado ? "grayscale(.6)" : undefined }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
        {anio && (
          <span style={{ position: "absolute", left: 10, top: 10, background: TINTA, color: "#fff", fontFamily: TITULAR, fontSize: 15, fontWeight: 700, letterSpacing: 1, padding: "3px 9px", borderRadius: 3, fontVariantNumeric: "tabular-nums" }}>{anio}</span>
        )}
        {reservado && (
          <span style={{ position: "absolute", right: 10, top: 10, background: "#f59e0b", color: "#111", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, padding: "4px 9px", borderRadius: 3 }}>RESERVADO</span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {tipo && <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE }}>{tipo}</p>}
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.25, color: TINTA, overflowWrap: "anywhere" }}>
          {/* El link cubre la tarjeta entera (ver el `::after`), sin anidar el botón de favorito adentro. */}
          <Link href={href} style={{ color: "inherit", textDecoration: "none" }} className="tr-ir">
            <span style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
            {p.name}
          </Link>
        </h3>
        {/* Los km (u horas) van aparte para que cuenten como un odómetro al aparecer (ver AutoRuta, efecto 3). */}
        {datos.length > 0 && (
          <p style={{ margin: 0, fontSize: 13.5, color: TENUE, fontVariantNumeric: "tabular-nums" }}>
            {datos.map((d, i) => (
              <span key={i}>{i > 0 && "  ·  "}{d === uso ? <span data-ef-contar="" className="rt-odometro">{d}</span> : d}</span>
            ))}
          </p>
        )}
        {trabajos.length > 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: TINTA }}>
            <span style={{ fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 10.5, color: TENUE, marginRight: 6 }}>Sirve para</span>
            {trabajos.map(t => NOMBRE_TRABAJO[t].titulo).join(" · ")}
          </p>
        )}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${LINEA}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: TITULAR, fontSize: 22, fontWeight: 700, color: TINTA, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere" }}>
            {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
          </span>
          {onFavorito && (
            <button type="button" onClick={onFavorito} aria-pressed={!!favorito} aria-label={favorito ? `Sacar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`}
              style={{ position: "relative", zIndex: 1, width: 40, height: 40, flexShrink: 0, borderRadius: 4, border: `1px solid ${favorito ? acento : LINEA}`, background: favorito ? acento : "transparent",
                color: favorito ? (getContrastColor(acento) === "dark" ? TINTA : "#fff") : TENUE, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
              <svg width={17} height={17} viewBox="0 0 24 24" fill={favorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
