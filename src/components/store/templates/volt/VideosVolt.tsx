"use client";
import { useState } from "react";
import Link from "next/link";
import { parseReel, ReelPlayerModal } from "@/components/store/ProductReels";
import { fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import type { VideoDeVehiculo } from "@/components/store/auto/videosDeVehiculos";
import { monedaDe } from "@/lib/monedaVehiculo";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa } from "./EscenaVolt";
import { MONO } from "./TarjetaVolt";

/**
 * "Transmisiones" de Auto Volt (12/10/26): los videos que la agencia subió en
 * cada vehículo, en tarjetas chicas (en octubre los videos se veían enormes en
 * escritorio y se pidió achicarlos). Un video propio se reproduce mudo al pasar
 * el mouse, como vista previa; al tocarlo se abre el reproductor de siempre
 * (ProductReels). Instagram y TikTok se abren en su app.
 */
export const VIDEOS_VOLT_CSS = `
  .vv-grilla { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)) }
  @media(min-width:900px){ .vv-grilla { grid-template-columns:repeat(auto-fill,minmax(180px,220px)) } }
  .vv-caja { transition: border-color .25s, box-shadow .3s }
  .vv-caja:hover { border-color: var(--vv-acento) !important; box-shadow: 0 18px 40px -20px var(--vv-acento) }
  .vv-caja:focus-visible { outline:2px solid var(--vv-acento); outline-offset:3px }
  @media (prefers-reduced-motion: reduce) { .vv-caja { transition:none } }
`;

export function VideosVolt({ videos, acento, moneda, hrefDe, vacio, tinta }: {
  videos: VideoDeVehiculo[];
  acento: string;
  moneda: string;
  hrefDe: (id: string) => string;
  vacio?: React.ReactNode;
  tinta: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  if (!videos.length) return vacio ? <>{vacio}</> : null;
  const reproducibles = videos.map(v => v.url).filter(u => parseReel(u)?.kind !== "link");

  return (
    <>
      <ul className="vv-grilla" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {videos.map(({ producto: p, url }) => {
          const reel = parseReel(url)!;
          const portada = p.images[0] ?? (reel.kind === "youtube" ? `https://img.youtube.com/vi/${reel.id}/hqdefault.jpg` : null);
          const tapa = (
            <>
              {reel.kind === "video"
                ? <video src={`${url}#t=0.5`} preload="metadata" muted playsInline loop
                    onMouseEnter={e => { e.currentTarget.play().catch(() => {}); }} onMouseLeave={e => { e.currentTarget.pause(); }}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                // eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube o foto del vehículo
                : <img src={fotoLiviana(portada, 384)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(5,7,13,0.8), transparent 50%)" }} />
              <span aria-hidden="true" style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10,
                letterSpacing: 1.5, color: "#fff", background: "rgba(5,7,13,0.6)", borderRadius: 999, padding: "4px 9px", pointerEvents: "none" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 8px #f43f5e" }} />
                {reel.kind === "link" ? reel.platform.toUpperCase() : "VIDEO"}
              </span>
              <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
                background: conAlfa(acento, 0.25), border: `1px solid ${acento}`, boxShadow: `0 0 24px ${conAlfa(acento, 0.6)}` }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </span>
            </>
          );
          const caja: React.CSSProperties = { position: "relative", display: "block", width: "100%", aspectRatio: "4/5", overflow: "hidden", borderRadius: 16,
            background: "#05070d", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", padding: 0,
            ...({ "--vv-acento": acento } as React.CSSProperties) };
          return (
            <li key={`${p.id}-${url}`} style={{ minWidth: 0 }}>
              {reel.kind === "link"
                ? <a href={url} target="_blank" rel="noopener noreferrer" className="vv-caja" aria-label={`Ver el video de ${p.name} en ${reel.platform}`} style={caja}>{tapa}</a>
                : <button type="button" className="vv-caja" onClick={() => setAbierto(url)} aria-label={`Ver el video de ${p.name}`} style={caja}>{tapa}</button>}
              <Link href={hrefDe(p.id)} style={{ display: "block", marginTop: 8, color: tinta, textDecoration: "none" }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span style={{ display: "block", marginTop: 2, fontFamily: MONO, fontSize: 12, color: acento }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {abierto && (
        <ReelPlayerModal reelUrls={reproducibles} startIndex={Math.max(0, reproducibles.indexOf(abierto))} onClose={() => setAbierto(null)} />
      )}
    </>
  );
}
