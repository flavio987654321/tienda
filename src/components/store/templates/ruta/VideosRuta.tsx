"use client";
/**
 * Los videos de Auto Ruta (15/10/26): una grilla de cuadros con la unidad y su
 * precio, como fichas. Son los videos que la agencia subió en cada unidad
 * (auto/videosDeVehiculos). YouTube y los subidos se ven en el reproductor de
 * la tienda; Instagram y TikTok abren su app.
 */
import { useState } from "react";
import Link from "next/link";
import { parseReel, ReelPlayerModal } from "@/components/store/ProductReels";
import { fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import type { VideoDeVehiculo } from "@/components/store/auto/videosDeVehiculos";
import { monedaDe } from "@/lib/monedaVehiculo";
import { fotoLiviana } from "@/lib/foto-liviana";
import { getContrastColor } from "@/contexts/EditContext";
import { PAPEL, TINTA, TENUE, LINEA, TITULAR } from "./estiloRuta";

export const VIDEOS_RUTA_CSS = `
  .vr-grilla { display:grid; gap:14px; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)) }
  .vr-cuadro img { transition: transform .6s cubic-bezier(.2,.7,.2,1) }
  .vr-cuadro:hover img { transform: scale(1.04) }
  .vr-cuadro:focus-visible { outline:3px solid var(--vr-acento); outline-offset:2px }
  @media (prefers-reduced-motion: reduce) { .vr-cuadro img { transition:none } }
`;

const tapaDe = ({ producto: p, url }: VideoDeVehiculo) => {
  const reel = parseReel(url)!;
  return p.images[0] ?? (reel.kind === "youtube" ? `https://img.youtube.com/vi/${reel.id}/hqdefault.jpg` : "");
};

export function VideosRuta({ videos, acento, moneda, hrefDe, vacio }: {
  videos: VideoDeVehiculo[];
  acento: string;
  moneda: string;
  hrefDe: (id: string) => string;
  vacio?: React.ReactNode;
}) {
  const [reproduciendo, setReproduciendo] = useState<string | null>(null);
  if (!videos.length) return vacio ? <>{vacio}</> : null;
  const enTienda = videos.map(v => v.url).filter(u => parseReel(u)?.kind !== "link");

  return (
    <>
      <div className="vr-grilla" data-ef="grilla" style={{ ...({ "--vr-acento": acento } as React.CSSProperties) }}>
        {videos.map(v => {
          const reel = parseReel(v.url)!;
          const p = v.producto;
          const tapa = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto del vehículo o miniatura de YouTube */}
              <img src={fotoLiviana(tapaDe(v), 640)} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <span aria-hidden="true" style={{ position: "absolute", left: 12, bottom: 12, width: 46, height: 46, borderRadius: 3, background: acento, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill={getContrastColor(acento) === "dark" ? TINTA : "#fff"}><polygon points="6 4 20 12 6 20 6 4" /></svg>
              </span>
              {reel.kind === "link" && (
                <span style={{ position: "absolute", top: 10, left: 10, fontSize: 11.5, fontWeight: 800, background: PAPEL, color: TINTA, padding: "4px 8px", borderRadius: 3 }}>Se abre en {reel.platform}</span>
              )}
            </>
          );
          const caja: React.CSSProperties = { position: "relative", display: "block", width: "100%", aspectRatio: "16/10", overflow: "hidden", background: "#e7e5df", border: "none", padding: 0, cursor: "pointer" };
          return (
            <article key={v.url} style={{ background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, overflow: "hidden" }}>
              {reel.kind === "link"
                ? <a href={v.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver el video de ${p.name} en ${reel.platform}`} className="vr-cuadro" style={caja}>{tapa}</a>
                : <button type="button" onClick={() => setReproduciendo(v.url)} aria-label={`Ver el video de ${p.name}`} className="vr-cuadro" style={caja}>{tapa}</button>}
              <div style={{ padding: "12px 14px 14px" }}>
                <Link href={hrefDe(p.id)} style={{ display: "block", color: TINTA, fontWeight: 800, fontSize: 15, textDecoration: "none", overflowWrap: "anywhere" }}>{p.name}</Link>
                <p style={{ margin: "4px 0 0", fontFamily: TITULAR, fontSize: 19, fontWeight: 700, color: p.price > 0 ? TINTA : TENUE, fontVariantNumeric: "tabular-nums" }}>
                  {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      {reproduciendo && (
        <ReelPlayerModal reelUrls={enTienda} startIndex={Math.max(0, enTienda.indexOf(reproduciendo))} onClose={() => setReproduciendo(null)} />
      )}
    </>
  );
}
