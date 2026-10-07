"use client";
import { useState } from "react";
import Link from "next/link";
import { parseReel, ReelPlayerModal } from "@/components/store/ProductReels";
import { fmtPrice } from "@/components/store/auto/AutoVehicleShared";
import type { VideoDeVehiculo } from "@/components/store/auto/videosDeVehiculos";
import { monedaDe } from "@/lib/monedaVehiculo";

/**
 * "Videos" de Auto Drive (07/10/26), como una lista de reproducción: uno grande
 * y al costado los demás; tocar uno de la lista lo pasa al grande. Son los
 * videos que la agencia ya subió en cada vehículo (components/store/auto/
 * videosDeVehiculos). YouTube y los subidos se ven en el reproductor de la
 * tienda; Instagram y TikTok abren su app.
 */
const tapaDe = ({ producto: p, url }: VideoDeVehiculo) => {
  const reel = parseReel(url)!;
  return p.images[0] ?? (reel.kind === "youtube" ? `https://img.youtube.com/vi/${reel.id}/hqdefault.jpg` : "");
};

const Play = ({ tam }: { tam: number }) => (
  <span aria-hidden="true" className="vd-play" style={{ width: tam, height: tam, borderRadius: "50%", background: "#fff", color: "#0f172a",
    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
    <svg width={tam * 0.36} height={tam * 0.36} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: tam * 0.05 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
  </span>
);

export function VideosDrive({ videos, acento, moneda, hrefDe, vacio }: {
  videos: VideoDeVehiculo[];
  acento: string;
  moneda: string;
  hrefDe: (id: string) => string;
  vacio?: React.ReactNode;
}) {
  const [elegido, setElegido] = useState(0);
  const [reproduciendo, setReproduciendo] = useState<string | null>(null);
  if (!videos.length) return vacio ? <>{vacio}</> : null;

  const actual = videos[Math.min(elegido, videos.length - 1)];
  const reel = parseReel(actual.url)!;
  const p = actual.producto;
  const enTienda = videos.map(v => v.url).filter(u => parseReel(u)?.kind !== "link");
  const tapaGrande = (
    <>
      {reel.kind === "video"
        ? <video key={actual.url} src={`${actual.url}#t=0.5`} preload="metadata" muted playsInline className="vd-foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        // eslint-disable-next-line @next/next/no-img-element -- foto del vehículo o miniatura de YouTube
        : <img src={tapaDe(actual)} alt="" className="vd-foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,.55), rgba(15,23,42,0) 50%)" }} />
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Play tam={72} /></span>
      {reel.kind === "link" && (
        <span style={{ position: "absolute", top: 14, left: 14, fontSize: 12, fontWeight: 800, background: "#fff", color: "#0f172a", padding: "5px 10px", borderRadius: 999 }}>
          Se abre en {reel.platform}
        </span>
      )}
    </>
  );
  const caja: React.CSSProperties = { position: "relative", display: "block", width: "100%", aspectRatio: "16/10", borderRadius: 20, overflow: "hidden",
    background: "#e2e8f0", border: "none", padding: 0, cursor: "pointer" };

  return (
    <div className="vd-grilla" style={{ display: "grid", gap: 16, alignItems: "start" }}>
      <div>
        {reel.kind === "link"
          ? <a href={actual.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver el video de ${p.name} en ${reel.platform}`} className="vd-grande" style={caja}>{tapaGrande}</a>
          : <button type="button" onClick={() => setReproduciendo(actual.url)} aria-label={`Ver el video de ${p.name}`} className="vd-grande" style={caja}>{tapaGrande}</button>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3, overflowWrap: "anywhere" }}>{p.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700, color: "#475569" }}>{p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar precio"}</p>
          </div>
          <Link href={hrefDe(p.id)} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 12,
            background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Ver el vehículo →
          </Link>
        </div>
      </div>

      {videos.length > 1 && (
        <ul aria-label="Más videos" className="vd-lista" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {videos.map((v, i) => {
            const activo = v === actual;
            return (
              <li key={`${v.producto.id}-${v.url}`}>
                <button type="button" onClick={() => setElegido(i)} aria-pressed={activo}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, cursor: "pointer", textAlign: "left",
                    fontFamily: "inherit", background: activo ? "#fff" : "transparent", border: `1px solid ${activo ? acento : "transparent"}`,
                    boxShadow: activo ? "0 6px 18px rgba(15,23,42,.08)" : "none", transition: "background .2s, border-color .2s" }}>
                  <span style={{ position: "relative", width: 96, aspectRatio: "16/10", borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#e2e8f0" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto del vehículo */}
                    {tapaDe(v) && <img src={tapaDe(v)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.2)" }}><Play tam={26} /></span>
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{v.producto.name}</span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                      {v.producto.price > 0 ? fmtPrice(v.producto.price, monedaDe(v.producto, moneda)) : "Consultar"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {reproduciendo && (
        <ReelPlayerModal reelUrls={enTienda} startIndex={Math.max(0, enTienda.indexOf(reproduciendo))} onClose={() => setReproduciendo(null)} />
      )}
    </div>
  );
}

export const VIDEOS_DRIVE_CSS = `
  @media(min-width:900px){ .vd-grilla { grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) } .vd-lista { max-height:520px; overflow-y:auto; padding-right:4px !important } }
  @media(max-width:899px){ .vd-lista { display:flex !important; overflow-x:auto; scroll-snap-type:x mandatory } .vd-lista li { flex:0 0 min(300px,82%); scroll-snap-align:start } }
  .vd-foto { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .vd-grande:hover .vd-foto { transform: scale(1.03) }
  .vd-play { transition: transform .25s }
  .vd-grande:hover .vd-play { transform: scale(1.08) }
  @media (prefers-reduced-motion: reduce) { .vd-foto, .vd-play { transition:none } }
`;
