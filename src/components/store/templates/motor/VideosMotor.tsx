"use client";
import { useState } from "react";
import Link from "next/link";
import { parseReel, ReelPlayerModal } from "@/components/store/ProductReels";
import { fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import type { VideoDeVehiculo } from "@/components/store/auto/videosDeVehiculos";
import { monedaDe } from "@/lib/monedaVehiculo";

/**
 * "Videos" de Auto Motor (07/10/26): una tira de videos verticales, como en las
 * redes, con los que la agencia subió en cada vehículo. Cada uno dice de qué
 * vehículo es y lleva a su página. Se reproducen en el reproductor de siempre
 * (ProductReels); Instagram y TikTok se abren en su app.
 */
export const VIDEOS_MOTOR_CSS = `
  .vm-tira { display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding:0 0 6px; scrollbar-width:thin }
  .vm-card { scroll-snap-align:start; flex:0 0 clamp(150px,22vw,220px); min-width:0 }
  .vm-foto { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .vm-card:hover .vm-foto { transform: scale(1.05) }
  .vm-play { transition: transform .25s }
  .vm-card:hover .vm-play { transform: scale(1.1) }
  @media (prefers-reduced-motion: reduce) { .vm-foto, .vm-play { transition:none } }
`;

export function VideosMotor({ videos, acento, moneda, hrefDe, vacio, tinta = "#f4f4f5" }: {
  videos: VideoDeVehiculo[];
  acento: string;
  moneda: string;
  hrefDe: (id: string) => string;
  /** Lo que se ve en el editor si todavía no hay videos (afuera, el bloque no se muestra). */
  vacio?: React.ReactNode;
  tinta?: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  if (!videos.length) return vacio ? <>{vacio}</> : null;

  return (
    <>
      <ul className="vm-tira" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {videos.map(({ producto: p, url }) => {
          const reel = parseReel(url)!;
          // De tapa, la foto del vehículo (la miniatura de YouTube trae franjas negras); si no hay, la de YouTube.
          const portada = p.images[0] ?? (reel.kind === "youtube" ? `https://img.youtube.com/vi/${reel.id}/hqdefault.jpg` : null);
          const tapa = (
            <>
              {reel.kind === "video"
                ? <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className="vm-foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                // eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube o foto del vehículo
                : <img src={portada ?? ""} alt="" className="vm-foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,12,14,0.92) 0%, rgba(11,12,14,0) 55%)" }} />
              <span aria-hidden="true" className="vm-play" style={{ position: "absolute", top: "42%", left: "50%", marginLeft: -28, marginTop: -28, width: 56, height: 56, borderRadius: "50%",
                background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </span>
              {reel.kind === "link" && (
                <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
                  background: "rgba(0,0,0,0.55)", color: "#fff", padding: "4px 8px", borderRadius: 2 }}>{reel.platform}</span>
              )}
            </>
          );
          const caja: React.CSSProperties = { position: "relative", display: "block", aspectRatio: "4/3", overflow: "hidden", borderRadius: 4,
            background: "#141619", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", padding: 0, width: "100%" };
          return (
            <li key={`${p.id}-${url}`} className="vm-card">
              {reel.kind === "link"
                ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ver el video de ${p.name} en ${reel.platform}`} style={caja}>{tapa}</a>
                : <button type="button" onClick={() => setAbierto(url)} aria-label={`Ver el video de ${p.name}`} style={caja}>{tapa}</button>}
              <Link href={hrefDe(p.id)} style={{ display: "block", marginTop: 10, color:tinta, textDecoration: "none" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 3, fontSize: 13 }}>
                  <span style={{ fontWeight: 800 }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}</span>
                  <span style={{ color: acento, fontWeight: 700 }}>Ver →</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {abierto && (
        <ReelPlayerModal reelUrls={videos.map(v => v.url).filter(u => parseReel(u)?.kind !== "link")}
          startIndex={Math.max(0, videos.map(v => v.url).filter(u => parseReel(u)?.kind !== "link").indexOf(abierto))}
          onClose={() => setAbierto(null)} />
      )}
    </>
  );
}
