"use client";
/**
 * La vidriera de Ruta: "Unidad de la semana" como una ORDEN DE TRABAJO
 * (15/10/26). Flavio eligió esta forma entre tres (orden de trabajo, cartel de
 * ruta, oblea de parabrisas) porque sigue el idioma del resto de Ruta —todo es
 * planilla y hoja— y muestra lo que de verdad decide una compra de trabajo: para
 * qué sirve, la ficha técnica (potencia, carga útil, ejes) y los papeles.
 *
 * La unidad la elige la dueña en Diseño (`featuredVehicleId`, la misma que usan
 * Motor y Drive); si no eligió, `elegirFoco` toma la destacada.
 */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, WaIcon } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { NOMBRE_TIPO, usaHoras, tipoDeFicha, leerFicha, bloquesDeFicha, type CategoriaVehiculo } from "@/lib/fichaVehiculo";
import { trabajosDe, NOMBRE_TRABAJO } from "@/lib/trabajoVehiculo";
import { linkWhatsApp, mensajeDeVehiculo } from "@/lib/whatsappTienda";
import { fotoLiviana } from "@/lib/foto-liviana";
import { FOTO_VACIA } from "@/lib/foto-vacia";
import { getContrastColor } from "@/contexts/EditContext";
import { PAPEL, TINTA, TENUE, LINEA, TITULAR, CUERPO, alfa, rayaDeRuta } from "./estiloRuta";

const sinCambios = () => () => {};

export const ORDEN_RUTA_CSS = `
  .or-hoja { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); background: ${PAPEL}; border: 1px solid ${LINEA}; border-radius: 4px; overflow: hidden; }
  .or-numeros { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); }
  .or-numeros > div + div { border-left: 1px solid ${LINEA}; }
  .or-acciones { display: flex; gap: 10px; flex-wrap: wrap; }
  .or-foto img { transition: transform .6s cubic-bezier(.2,.7,.2,1); }
  .or-foto:hover img { transform: scale(1.03); }
  @media (max-width: 860px) {
    .or-hoja { grid-template-columns: minmax(0,1fr); }
  }
  @media (max-width: 520px) {
    .or-numeros { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .or-numeros > div:nth-child(3) { border-left: 0; }
    .or-numeros > div:nth-child(n+3) { border-top: 1px solid ${LINEA}; }
    .or-acciones > * { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .or-foto img { transition: none; } }
`;

export function OrdenRuta({ p, numero, acento, currency, href, whatsapp }: {
  p: StorefrontProduct;
  /** El número de la orden: la posición de la unidad en el stock. */
  numero: number;
  acento: string;
  currency: string;
  href: string;
  whatsapp?: string | null;
}) {
  const sobreAcento = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const moneda = monedaDe(p, currency);
  const precio = p.price > 0 ? fmtPrice(p.price, moneda) : "Consultar precio";
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const anio = attr(p, "Año");
  const tipo = NOMBRE_TIPO[(p.category ?? "").toLowerCase() as CategoriaVehiculo];
  const trabajos = trabajosDe(p);
  const tipoFicha = tipoDeFicha(p.category);
  const bloques = tipoFicha ? bloquesDeFicha(leerFicha(p.attributes), tipoFicha) : null;
  // De la ficha técnica, lo que más pesa en una unidad de trabajo, en este orden.
  const PRIMERO = ["Potencia", "Carga útil", "Ejes", "Peso bruto total", "Volumen de carga", "Capacidad de levante", "Largo de caja"];
  const datos = [...(bloques?.motor ?? []), ...(bloques?.medidas ?? [])]
    .filter((d) => PRIMERO.includes(d.label))
    .sort((a, b) => PRIMERO.indexOf(a.label) - PRIMERO.indexOf(b.label))
    .slice(0, 3);
  const papeles = (bloques?.papeles ?? []).slice(0, 4);
  const numeros: [string, string][] = ([
    ["Año", anio],
    [usaHoras(p.category) ? "Horas" : "Kilómetros", usoDe(p)],
    ["Tracción", attr(p, "Tracción")],
    ["Carrocería", attr(p, "Carrocería") || attr(p, "Cabina") || (tipo?.uno ?? "")],
  ] as [string, string][]).map(([l, v]) => [l, v || "—"]);
  const foto = p.images[0] ? fotoLiviana(p.images[0], 1200) : FOTO_VACIA;

  const link = useSyncExternalStore(sinCambios, () => `${window.location.origin}${href}`, () => "");
  const wa = whatsapp ? linkWhatsApp(whatsapp, mensajeDeVehiculo({ nombre: p.name, anio, precio: p.price > 0 ? precio : null, link })) : null;

  const etiqueta: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: TENUE };

  return (
    <article className="or-hoja" aria-label={`Unidad de la semana: ${p.name}`} style={{ fontFamily: CUERPO, color: TINTA }}>
      <style>{ORDEN_RUTA_CSS}</style>

      {/* La foto, con la raya de la ruta abajo */}
      <Link href={href} className="or-foto" aria-label={`Ver ${p.name}`} style={{ position: "relative", display: "block", minHeight: 280, overflow: "hidden", background: "#e9e7e1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto de la tienda ya achicada con fotoLiviana */}
        <img src={foto} alt="" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {anio && (
          <span style={{ position: "absolute", top: 14, left: 14, background: TINTA, color: "#fff", fontFamily: TITULAR, fontSize: 16, fontWeight: 700, padding: "5px 10px", borderRadius: 3 }}>{anio}</span>
        )}
        <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: rayaDeRuta(acento) }} />
      </Link>

      {/* La hoja */}
      <div style={{ padding: "clamp(18px,2.6vw,30px)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...etiqueta, margin: 0 }}>Orden de trabajo · N° {String(numero).padStart(3, "0")}</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: TITULAR, fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", overflowWrap: "anywhere" }}>{p.name}</h3>
          </div>
          {/* El sello: una línea gruesa del acento, inclinado como uno de goma */}
          <span aria-hidden="true" style={{ flexShrink: 0, border: `2px solid ${acento}`, color: TINTA, background: alfa(acento, 0.12), fontFamily: TITULAR, fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
            textTransform: "uppercase", lineHeight: 1.15, textAlign: "center", padding: "6px 9px", borderRadius: 3, transform: "rotate(-4deg)" }}>Unidad<br />de la semana</span>
        </div>

        {trabajos.length > 0 && (
          <p style={{ margin: 0, fontSize: 14 }}>
            <span style={{ ...etiqueta, marginRight: 8 }}>Sirve para</span>
            {trabajos.map((t) => NOMBRE_TRABAJO[t].titulo).join(" · ")}
          </p>
        )}

        <div className="or-numeros" style={{ border: `1px solid ${LINEA}`, borderRadius: 3 }}>
          {numeros.map(([l, v]) => (
            <div key={l} style={{ padding: "10px 12px", minWidth: 0 }}>
              <p style={{ ...etiqueta, fontSize: 10, margin: 0 }}>{l}</p>
              <p style={{ margin: "4px 0 0", fontFamily: TITULAR, fontSize: 19, fontWeight: 700, overflowWrap: "anywhere" }}>{v}</p>
            </div>
          ))}
        </div>

        {(datos.length > 0 || papeles.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
            {datos.length > 0 && (
              <dl style={{ margin: 0 }}>
                {datos.map((d) => (
                  <div key={d.label} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 14, padding: "3px 0" }}>
                    <dt style={{ color: TENUE }}>{d.label}</dt>
                    <span aria-hidden="true" style={{ flex: 1, borderBottom: `1px dotted ${LINEA}`, transform: "translateY(-3px)" }} />
                    <dd style={{ margin: 0, fontWeight: 700 }}>{d.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {papeles.length > 0 && (
              <ul aria-label="Papeles" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {papeles.map((x) => (
                  <li key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "3px 0" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `3px solid ${TINTA}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            {oferta && <p style={{ margin: 0, fontSize: 14, color: TENUE, textDecoration: "line-through" }}>{fmtPrice(p.comparePrice!, moneda)}</p>}
            <p style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(28px,3.2vw,36px)", fontWeight: 700, lineHeight: 1 }}>{precio}</p>
          </div>
          <div className="or-acciones">
            <Link href={href} style={{ background: acento, color: sobreAcento, borderRadius: 3, padding: "0 18px", minHeight: 46, fontWeight: 800, fontSize: 14, letterSpacing: 0.4,
              textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Ver la unidad</Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" style={{ border: `1.5px solid ${TINTA}`, color: TINTA, borderRadius: 3, padding: "0 16px", minHeight: 46, fontWeight: 800, fontSize: 14,
                textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <WaIcon size={18} /> Consultar
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
