"use client";
import Link from "next/link";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { attr, fmtPrice, vehicleLocation, kmDe } from "@/components/store/auto/AutoVehicleShared";
import { usoDe } from "@/components/store/templates/motor/TarjetaMotor";
import { monedaDe } from "@/lib/monedaVehiculo";
import { entero } from "@/lib/filtroVehiculos";
import { usaHoras } from "@/lib/fichaVehiculo";
import { fotoLiviana } from "@/lib/foto-liviana";
import { conAlfa, MONO } from "./EscenaVolt";

/**
 * El comparador de Auto Volt (13/10/26): hasta tres vehículos lado a lado, con
 * lo que se compara de verdad antes de consultar (precio, año, uso, motor,
 * caja, combustible, tracción, dónde está). Marca el mejor de cada fila cuando
 * hay un "mejor" claro: el más barato (si están en la misma moneda), el más
 * nuevo y el de menos uso. Se agregan desde el escenario ("Comparar") o desde
 * acá mismo.
 *
 * En el celular la tabla se desliza de costado con la primera columna fija.
 */
export const COMPARADOR_VOLT_CSS = `
  .cmv-tabla { overflow-x:auto; scrollbar-width:thin; border-radius:22px }
  .cmv-grilla { display:grid }
  .cmv-etq { position:sticky; left:0; z-index:2 }
  .cmv-pista { display:none }
  @media (max-width: 600px) { .cmv-pista { display:block } }
`;

const MAX = 3;

export function ComparadorVolt({ productos, ids, onQuitar, onAgregar, acento, moneda, hrefDe }: {
  productos: StorefrontProduct[];
  ids: string[];
  onQuitar: (id: string) => void;
  onAgregar: (id: string) => void;
  acento: string;
  moneda: string;
  hrefDe: (p: StorefrontProduct) => string;
}) {
  const elegidos = ids.map(id => productos.find(p => p.id === id)).filter((p): p is StorefrontProduct => !!p);
  const libres = productos.filter(p => !ids.includes(p.id));
  const columnas = elegidos.length + (elegidos.length < MAX && libres.length ? 1 : 0);

  /* El mejor de cada fila. Sólo si hay al menos dos con dato, y en el precio,
     sólo si todos están en la misma moneda: un dólar y un peso no se comparan. */
  const mejor = (valores: (number | null)[], menor: boolean) => {
    const con = valores.filter((v): v is number => v != null);
    if (con.length < 2 || new Set(con).size < 2) return -1;
    const objetivo = menor ? Math.min(...con) : Math.max(...con);
    return valores.indexOf(objetivo);
  };
  const monedas = new Set(elegidos.map(p => monedaDe(p, moneda)));
  const iPrecio = monedas.size === 1 ? mejor(elegidos.map(p => p.price > 0 ? p.price : null), true) : -1;
  const iAnio = mejor(elegidos.map(p => entero(attr(p, "Año"))), false);
  const iUso = elegidos.every(p => usaHoras(p.category) === usaHoras(elegidos[0]?.category))
    ? mejor(elegidos.map(p => usaHoras(p.category) ? entero(attr(p, "Horas de uso")) : kmDe(p)), true) : -1;

  type Fila = { etiqueta: string; valor: (p: StorefrontProduct) => string; mejor?: number };
  const filas = ([
    { etiqueta: "Precio", valor: p => p.price > 0 ? fmtPrice(p.price, monedaDe(p, moneda)) : "Consultar", mejor: iPrecio },
    { etiqueta: "Año", valor: p => attr(p, "Año"), mejor: iAnio },
    { etiqueta: "Uso", valor: p => usoDe(p), mejor: iUso },
    { etiqueta: "Motor", valor: p => attr(p, "Motor") },
    { etiqueta: "Caja", valor: p => attr(p, "Transmisión") },
    { etiqueta: "Combustible", valor: p => attr(p, "Combustible") },
    { etiqueta: "Tracción", valor: p => attr(p, "Tracción") },
    { etiqueta: "Ubicación", valor: p => vehicleLocation(p) },
  ] as Fila[]).filter(f => elegidos.some(p => f.valor(p)));

  const celda: React.CSSProperties = { padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 0, fontSize: 15, color: "#fff", overflowWrap: "anywhere" };
  const etiqueta: React.CSSProperties = { ...celda, fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "rgba(232,236,246,0.5)", background: "#0a0e19" };
  const plantilla = `minmax(104px, 140px) repeat(${columnas}, minmax(0, 1fr))`;

  return (
    <>
    {columnas > 1 && <p className="cmv-pista" style={{ margin: "0 0 10px", fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: "rgba(232,236,246,0.55)" }}>DESLIZÁ PARA VER LOS DEMÁS →</p>}
    <div className="cmv-tabla" style={{ background: "#0a0e19", border: `1px solid ${conAlfa(acento, 0.25)}` }}>
      <div className="cmv-grilla" role="table" aria-label="Comparación de vehículos" style={{ gridTemplateColumns: plantilla, width: "100%",
        // Ancho del contenedor, salvo que no entren: recién ahí se desliza de costado (en el celular).
        minWidth: 120 + columnas * 190 }}>
        {/* Encabezado: foto y nombre de cada uno. */}
        <div role="row" style={{ display: "contents" }}>
          <div role="columnheader" className="cmv-etq" style={{ ...etiqueta, alignContent: "end" }}>Vehículo</div>
          {elegidos.map(p => (
            <div key={p.id} role="columnheader" style={{ ...celda, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative", aspectRatio: "16/10", borderRadius: 14, overflow: "hidden", background: "#03040a" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto de la tienda */}
                {p.images[0] && <img src={fotoLiviana(p.images[0], 384)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                <button type="button" onClick={() => onQuitar(p.id)} aria-label={`Sacar ${p.name} de la comparación`}
                  style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(5,7,13,0.7)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
              <Link href={hrefDe(p)} style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{p.name}</Link>
            </div>
          ))}
          {columnas > elegidos.length && (
            <div role="columnheader" style={{ ...celda, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8, aspectRatio: "16/10", justifyContent: "center", alignItems: "center", textAlign: "center",
                borderRadius: 14, border: `1px dashed ${conAlfa(acento, 0.5)}`, padding: 12, boxSizing: "border-box", color: "rgba(232,236,246,0.7)", fontSize: 13 }}>
                <span aria-hidden="true" style={{ fontSize: 26, color: acento, lineHeight: 1 }}>+</span>
                Sumar otro
                <select value="" onChange={e => e.target.value && onAgregar(e.target.value)}
                  style={{ width: "100%", maxWidth: 220, minHeight: 40, borderRadius: 10, background: "#05070d", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", padding: "0 8px", fontFamily: "inherit", fontSize: 13 }}>
                  <option value="">Elegí un vehículo</option>
                  {libres.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
        {filas.map(f => (
          <div key={f.etiqueta} role="row" style={{ display: "contents" }}>
            <div role="rowheader" className="cmv-etq" style={etiqueta}>{f.etiqueta}</div>
            {elegidos.map((p, i) => {
              const v = f.valor(p);
              const gana = f.mejor === i;
              return (
                <div key={p.id} role="cell" style={{ ...celda, color: v ? "#fff" : "rgba(232,236,246,0.35)", fontWeight: gana ? 800 : 500,
                  background: gana ? conAlfa(acento, 0.1) : undefined }}>
                  {v || "—"}
                  {gana && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.5, color: acento, whiteSpace: "nowrap" }}>● MEJOR</span>}
                </div>
              );
            })}
            {columnas > elegidos.length && <div role="cell" style={celda} />}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
