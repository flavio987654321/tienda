"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, esReservado, vehicleLocation, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { monedaDe } from "@/lib/monedaVehiculo";
import { urlFichaPdf, NOMBRE_TIPO, usaHoras, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import { getContrastColor } from "@/contexts/EditContext";
import { usoDe } from "./TarjetaMotor";

/** El que va en foco: el marcado "destacado", si no el primero con etiqueta, si no el más nuevo sin reservar. */
export function elegirFoco(productos: StorefrontProduct[]): StorefrontProduct | null {
  const libres = productos.filter(p => !esReservado(p));
  return libres.find(p => /destacad/i.test(p.badge ?? "")) ?? libres.find(p => p.badge) ?? libres[0] ?? productos[0] ?? null;
}

/**
 * "Vehículo en foco" de Auto Motor (06/10/26): uno solo, grande, con lo que
 * decide la consulta a la vista, la ficha en PDF y WhatsApp con el mensaje ya
 * escrito sobre ESE vehículo.
 */
export function FocoMotor({ p, acento, moneda, whatsapp, enPrevia, onAbrir, kicker }: {
  p: StorefrontProduct;
  acento: string;
  moneda: string;
  whatsapp: { enabled: boolean; number: string };
  /** En la previa del editor los vehículos son de muestra: no hay PDF que bajar. */
  enPrevia: boolean;
  onAbrir: () => void;
  kicker: React.ReactNode;
}) {
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo]?.uno;
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const datos: [string, string][] = ([
    ["Año", attr(p, "Año")],
    [usaHoras(p.category) ? "Horas de uso" : "Kilómetros", usoDe(p)],
    ["Motor", attr(p, "Motor")],
    ["Transmisión", attr(p, "Transmisión")],
    ["Combustible", attr(p, "Combustible")],
    ["Ubicación", vehicleLocation(p)],
  ] as [string, string][]).filter(([, v]) => v);
  const wa = whatsapp.enabled ? linkWhatsApp(whatsapp.number, `Hola! Me interesa el ${p.name}. ¿Sigue disponible?`) : null;
  const sobreAcento = getContrastColor(acento) === "dark" ? "#111" : "#fff";

  return (
    <div className="fm-grilla" style={{ display: "grid", gap: 0, background: "#141619", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
      <button type="button" onClick={onAbrir} aria-label={`Ver ${p.name}`}
        style={{ all: "unset", cursor: "pointer", position: "relative", display: "block", minHeight: 280, background: "#0b0c0e" }} className="fm-foto">
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos de la tienda */}
        <img src={p.images[0] ?? ""} alt="" onError={e => { e.currentTarget.style.display = "none"; }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {p.images.length > 1 && (
          <span style={{ position: "absolute", right: 14, bottom: 14, fontSize: 11, fontWeight: 700, color: "#fff",
            background: "rgba(11,12,14,0.6)", backdropFilter: "blur(6px)", padding: "6px 10px", borderRadius: 2 }}>
            {p.images.length} fotos
          </span>
        )}
      </button>
      <div style={{ padding: "clamp(22px,4vw,44px)", display: "flex", flexDirection: "column", gap: 18, color: "#f4f4f5", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: acento, fontWeight: 800 }}>
          {kicker}{tipo ? <span style={{ color: "rgba(255,255,255,0.45)" }}> · {tipo}</span> : null}
        </p>
        <h3 style={{ margin: 0, fontSize: "clamp(26px,3.6vw,42px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, overflowWrap: "anywhere" }}>
          {p.name}
        </h3>
        <div>
          {oferta && (
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>
              {fmtPrice(p.comparePrice!, monedaDe(p, moneda))}
            </p>
          )}
          <p style={{ margin: 0, fontSize: "clamp(26px,3vw,34px)", fontWeight: 800, letterSpacing: -0.8 }}>
            {p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar precio"}
          </p>
        </div>
        {datos.length > 0 && (
          <dl className="fm-datos" style={{ margin: 0, display: "grid", gap: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {datos.map(([k, v]) => (
              <div key={k} style={{ background: "#141619", padding: "12px 14px", minWidth: 0 }}>
                <dt style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>{k}</dt>
                <dd style={{ margin: 0, fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
          <button type="button" onClick={onAbrir}
            style={{ minHeight: 48, padding: "0 24px", border: "none", borderRadius: 2, background: acento, color: sobreAcento,
              fontWeight: 800, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
            Ver el vehículo
          </button>
          {!enPrevia && (
            <a href={urlFichaPdf(p.id)} target="_blank" rel="noopener noreferrer"
              style={{ minHeight: 48, padding: "0 20px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
              Ficha en PDF
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              style={{ minHeight: 48, padding: "0 20px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 2,
                background: "#25d366", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
              <WaIcon size={16} /> Consultar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
