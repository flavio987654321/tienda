"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, vehicleLocation, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { urlFichaPdf, NOMBRE_TIPO, usaHoras, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { getContrastColor } from "@/contexts/EditContext";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa } from "./EscenaVolt";
import { MONO } from "./TarjetaVolt";

/**
 * "Vehículo en foco" de Auto Volt (12/10/26): el escáner. La foto con una
 * línea de luz que la recorre y esquinas de mira; al lado, los datos como
 * lecturas de un tablero. Lo que decide la consulta queda a la vista, con la
 * ficha en PDF y WhatsApp con el mensaje ya escrito sobre ESE vehículo.
 */
export const FOCO_VOLT_CSS = `
  .fv-grilla { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(16px,3vw,32px); align-items:stretch }
  @media(min-width:920px){ .fv-grilla { grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) } }
  .fv-scan { position:absolute; left:0; right:0; height:2px; top:0; pointer-events:none;
    background: linear-gradient(90deg, transparent, var(--fv-acento) 20%, #fff 50%, var(--fv-acento) 80%, transparent);
    box-shadow: 0 0 18px 3px var(--fv-acento-suave); animation: fv-barre 4.2s cubic-bezier(.6,0,.4,1) infinite }
  @keyframes fv-barre { 0% { top:4%; opacity:0 } 8% { opacity:1 } 50% { top:96%; opacity:1 } 58% { opacity:0 } 100% { top:4%; opacity:0 } }
  .fv-datos { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px }
  @media (prefers-reduced-motion: reduce) { .fv-scan { animation:none; display:none } }
`;

function Esquina({ lado, acento }: { lado: "ai" | "ad" | "bi" | "bd"; acento: string }) {
  const arriba = lado[0] === "a", izq = lado[1] === "i";
  return <span aria-hidden="true" style={{ position: "absolute", width: 26, height: 26, [arriba ? "top" : "bottom"]: 14, [izq ? "left" : "right"]: 14,
    borderTop: arriba ? `2px solid ${acento}` : undefined, borderBottom: arriba ? undefined : `2px solid ${acento}`,
    borderLeft: izq ? `2px solid ${acento}` : undefined, borderRight: izq ? undefined : `2px solid ${acento}` }} />;
}

export function FocoVolt({ p, acento, moneda, whatsapp, enPrevia, href, kicker }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  whatsapp: { enabled: boolean; number: string };
  /** En la previa del editor los vehículos son de muestra: no hay PDF que bajar. */
  enPrevia: boolean;
  href: string;
  kicker: React.ReactNode;
}) {
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const datos = ([
    ["Año", attr(p, "Año")],
    [usaHoras(p.category) ? "Horas" : "Kilómetros", usoDe(p)],
    ["Motor", attr(p, "Motor")],
    ["Transmisión", attr(p, "Transmisión")],
    ["Combustible", attr(p, "Combustible")],
    ["Ubicación", vehicleLocation(p)],
  ] as [string, string][]).filter(([, v]) => v);
  const wa = whatsapp.enabled ? linkWhatsApp(whatsapp.number, `Hola! Me interesa el ${p.name}. ¿Sigue disponible?`) : null;
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";
  const foto = p.images[0];

  return (
    <div className="fv-grilla" style={{ ...({ "--fv-acento": acento, "--fv-acento-suave": conAlfa(acento, 0.5) } as React.CSSProperties) }}>
      <Link href={href} aria-label={`Ver ${p.name}`} style={{ position: "relative", display: "block", minHeight: 260, width: "100%", aspectRatio: "16/11",
        borderRadius: 22, overflow: "hidden", background: "#05070d", border: `1px solid ${conAlfa(acento, 0.3)}`,
        boxShadow: `0 40px 100px -50px ${conAlfa(acento, 0.8)}` }}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- foto de la tienda
          <img src={fotoLiviana(foto, 1200)} alt="" onError={e => { e.currentTarget.style.display = "none"; }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,7,13,0.75), transparent 45%)" }} />
        <span className="fv-scan" aria-hidden="true" />
        <Esquina lado="ai" acento={acento} /><Esquina lado="ad" acento={acento} /><Esquina lado="bi" acento={acento} /><Esquina lado="bd" acento={acento} />
        {p.images.length > 1 && (
          <span style={{ position: "absolute", left: 22, bottom: 20, fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: "#fff",
            background: "rgba(5,7,13,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 12px" }}>
            {p.images.length} FOTOS
          </span>
        )}
      </Link>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: acento, display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: acento, boxShadow: `0 0 12px ${acento}` }} />
          {kicker}{tipo ? <span style={{ color: "rgba(232,236,246,0.5)" }}> / {tipo}</span> : null}
        </p>
        <h3 style={{ margin: 0, fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 800, letterSpacing: -1, lineHeight: 1.05, color: "#fff", overflowWrap: "anywhere" }}>{p.name}</h3>
        <div>
          {oferta && <p style={{ margin: 0, fontSize: 14, color: "rgba(232,236,246,0.45)", textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, monedaDe(p, moneda))}</p>}
          <p style={{ margin: 0, fontSize: "clamp(28px,3.4vw,38px)", fontWeight: 800, letterSpacing: -1, color: "#fff", textShadow: `0 0 28px ${conAlfa(acento, 0.5)}` }}>
            {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar"}
          </p>
        </div>
        {datos.length > 0 && (
          <dl className="fv-datos" style={{ margin: 0 }}>
            {datos.map(([k, v]) => (
              <div key={k} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minWidth: 0 }}>
                <dt style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(232,236,246,0.5)" }}>{k}</dt>
                <dd style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "#fff", overflowWrap: "anywhere" }}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
          <Link href={href} style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 22px", borderRadius: 12,
            background: acento, color: sobreAcento, textDecoration: "none", fontWeight: 800, fontSize: 14, boxShadow: `0 10px 30px -10px ${conAlfa(acento, 0.8)}` }}>
            Ver el vehículo
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48, padding: "0 18px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
              <WaIcon size={16} /> Consultar
            </a>
          )}
          {!enPrevia && (
            <a href={urlFichaPdf(p.id)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 14px",
              color: "rgba(232,236,246,0.75)", textDecoration: "underline", textUnderlineOffset: 4, fontSize: 13, fontWeight: 600 }}>
              Ficha en PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
