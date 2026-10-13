"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import Link from "next/link";
import { attr, fmtPrice, esReservado } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa } from "./EscenaVolt";
import { getContrastColor } from "@/contexts/EditContext";

/**
 * La tarjeta de Auto Volt (12/10/26). Vidrio sobre la escena: borde que se
 * enciende con el acento al pasar, la foto con un brillo que la cruza, y los
 * datos en una fila de tablero (letra de ancho fijo, separados por puntos).
 *
 * Teclado: el nombre es el link y se estira sobre toda la tarjeta (`.tv-abrir`);
 * el corazón queda aparte, por encima. Nada de botón dentro de link.
 */
export const VOLT_TARJETA_CSS = `
  .tv-card { position:relative; border-radius:18px; transition: transform .4s cubic-bezier(.2,.7,.2,1), box-shadow .4s, border-color .3s }
  .tv-card:hover { transform: translateY(-6px); border-color: var(--tv-acento-borde) !important; box-shadow: 0 24px 60px -24px var(--tv-acento-sombra) }
  .tv-foto img { transition: transform .9s cubic-bezier(.2,.7,.2,1) }
  .tv-card:hover .tv-foto img { transform: scale(1.06) }
  .tv-foto::after { content:""; position:absolute; inset:0; pointer-events:none;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.22) 50%, transparent 65%);
    transform: translateX(-120%); transition: transform 1.1s cubic-bezier(.2,.7,.2,1) }
  .tv-card:hover .tv-foto::after { transform: translateX(120%) }
  .tv-abrir { all:unset; cursor:pointer; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
  .tv-abrir::after { content:""; position:absolute; inset:0; z-index:1; border-radius:18px }
  .tv-card:has(.tv-abrir:focus-visible) { outline:2px solid var(--tv-acento); outline-offset:3px }
  .tv-fav { z-index:2 }
  @media (prefers-reduced-motion: reduce) { .tv-card, .tv-foto img, .tv-foto::after { transition:none } .tv-card:hover { transform:none } .tv-foto::after { display:none } }
`;

const FOTO_VACIA = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75";
export const MONO = "ui-monospace,'SFMono-Regular','JetBrains Mono',Menlo,Consolas,monospace";

export function TarjetaVolt({ p, acento, moneda, href, favorito, onFavorito }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  href: string;
  favorito?: boolean;
  onFavorito?: () => void;
}) {
  const foto = p.images[0] ?? FOTO_VACIA;
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const reservado = esReservado(p);
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const datos = [attr(p, "Año"), usoDe(p), attr(p, "Combustible"), attr(p, "Transmisión")].filter(Boolean);
  const lugar = attr(p, "Localidad") || attr(p, "Provincia");
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";
  const precio = p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar";

  return (
    <article className="tv-card" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden", display: "flex", flexDirection: "column", color: "#e8ecf6",
      backdropFilter: "blur(10px)",
      ...({ "--tv-acento": acento, "--tv-acento-borde": conAlfa(acento, 0.55), "--tv-acento-sombra": conAlfa(acento, 0.55) } as React.CSSProperties) }}>
      <div className="tv-foto" style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#05070d", margin: 8, borderRadius: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda, ya optimizadas al subir */}
        <img src={fotoLiviana(foto, 640)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
          filter: reservado ? "grayscale(.7) brightness(.7)" : undefined }}
          onError={e => { (e.currentTarget as HTMLImageElement).src = FOTO_VACIA; }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: "calc(100% - 60px)" }}>
          {reservado ? (
            <span style={{ background: "#fbbf24", color: "#111", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, padding: "5px 10px", borderRadius: 999, textTransform: "uppercase" }}>Reservado</span>
          ) : oferta ? (
            <span style={{ background: acento, color: sobreAcento, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, padding: "5px 10px", borderRadius: 999, textTransform: "uppercase" }}>Bajó de precio</span>
          ) : p.badge ? (
            <span style={{ background: "rgba(5,7,13,0.7)", color: "#fff", border: `1px solid ${conAlfa(acento, 0.6)}`, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: "5px 10px", borderRadius: 999, textTransform: "uppercase", overflowWrap: "anywhere" }}>{p.badge}</span>
          ) : null}
        </div>
      </div>
      {onFavorito && (
        <button type="button" className="tv-fav" onClick={onFavorito} aria-pressed={!!favorito}
          aria-label={favorito ? `Quitar ${p.name} de favoritos` : `Guardar ${p.name} en favoritos`}
          style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(5,7,13,0.6)", backdropFilter: "blur(8px)", color: favorito ? acento : "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill={favorito ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      )}
      <div style={{ padding: "8px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {tipo && <p style={{ margin: 0, fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: acento }}>{tipo}</p>}
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.2, overflowWrap: "anywhere" }}>
          <Link href={href} className="tv-abrir">{p.name}</Link>
        </h3>
        {datos.length > 0 && (
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 11.5, color: "rgba(232,236,246,0.6)", letterSpacing: 0.3, overflowWrap: "anywhere" }}>
            {datos.join("  ·  ")}
          </p>
        )}
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            {oferta && <p style={{ margin: 0, fontSize: 12, color: "rgba(232,236,246,0.45)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, monedaDe(p, moneda))}</p>}
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: "#fff", textShadow: `0 0 18px ${conAlfa(acento, 0.45)}` }}>{precio}</p>
          </div>
          {lugar && <p style={{ margin: 0, fontSize: 11.5, color: "rgba(232,236,246,0.5)", overflowWrap: "anywhere", maxWidth: "100%" }}>{lugar}</p>}
        </div>
      </div>
    </article>
  );
}
