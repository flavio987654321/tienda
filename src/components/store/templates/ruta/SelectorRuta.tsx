"use client";
/**
 * La portada de Auto Ruta: "¿Para qué lo necesitás?" (15/10/26).
 *
 * Flavio eligió esta estructura entre tres: quien compra un camión piensa en
 * el trabajo, no en la marca. Tres pasos —trabajo, tamaño, presupuesto— y los
 * que sirven aparecen debajo a medida que elige, sin apretar "buscar". Ningún
 * otro template guía así: Motor y Drive tienen un buscador, Volt un showroom.
 *
 * El tamaño sólo se pregunta si hay más de uno entre lo que sirve para ese
 * trabajo (en el campo casi nunca hay). Sin nada elegido, se ve lo último que
 * entró. Sin resultados, "Avisame si entra" a mano.
 */
import { useMemo, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { conPuntos, sinPuntos, type Moneda } from "@/lib/monedaVehiculo";
import { filtrarVehiculos, filtroVacio } from "@/lib/filtroVehiculos";
import { getContrastColor } from "@/contexts/EditContext";
import { TRABAJOS, NOMBRE_TRABAJO, TAMANOS, NOMBRE_TAMANO, trabajosDe, tamanoDe, cuantosPorTrabajo, type Trabajo, type Tamano } from "@/lib/trabajoVehiculo";
import { TarjetaRuta } from "./TarjetaRuta";
import { PAPEL, TINTA, TENUE, LINEA, TITULAR, alfa } from "./estiloRuta";

export const SELECTOR_RUTA_CSS = `
  .sr-trabajos { display:grid; gap:10px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  @media(min-width:900px){ .sr-trabajos { grid-template-columns:repeat(4,minmax(0,1fr)) } }
  .sr-trabajo { transition: border-color .2s, background .2s, transform .25s cubic-bezier(.2,.7,.2,1) }
  .sr-trabajo:not(:disabled):hover { transform: translateY(-2px); border-color: var(--sr-acento) !important }
  .sr-trabajo:focus-visible, .sr-seg:focus-visible { outline:3px solid var(--sr-acento); outline-offset:2px }
  .sr-pasos { display:grid; gap:18px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:900px){ .sr-pasos { grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) } }
  .sr-res { display:grid; gap:14px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  /* De a tres: con seis resultados, en 1280 entraban cinco y quedaba uno solo abajo. */
  @media(min-width:900px){ .sr-res { grid-template-columns:repeat(3,minmax(0,1fr)) } }
  @media(max-width:520px){ .sr-res { grid-template-columns:minmax(0,1fr) } }
  .sr-bajada { display:block }
  @media(max-width:520px){ .sr-bajada { display:none } }
  @media (prefers-reduced-motion: reduce) { .sr-trabajo { transition:none } .sr-trabajo:not(:disabled):hover { transform:none } }
`;

export type SeleccionRuta = { trabajo: Trabajo | null; tamano: Tamano | null; precioHasta: number | null; moneda: Moneda };

export function SelectorRuta({ productos, acento, currency, principal, monedas, hrefDe, favoritos, onFavorito, onVerPlanilla, onAvisame, pregunta }: {
  productos: StorefrontProduct[];
  acento: string;
  currency: string;
  principal: Moneda;
  monedas: Moneda[];
  hrefDe: (p: StorefrontProduct) => string;
  favoritos: string[];
  onFavorito: (id: string) => void;
  onVerPlanilla: (s: SeleccionRuta) => void;
  onAvisame: () => void;
  /** "¿Para qué lo necesitás?", editable desde la portada. */
  pregunta: React.ReactNode;
}) {
  const sobre = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [tamano, setTamano] = useState<Tamano | null>(null);
  const [precio, setPrecio] = useState("");
  // Con una sola moneda no hay selector: tiene que ser ésa (ver BuscadorMotor).
  const [moneda, setMoneda] = useState<Moneda>(monedas.length === 1 ? monedas[0] : principal);

  const cuantos = useMemo(() => cuantosPorTrabajo(productos), [productos]);
  const delTrabajo = useMemo(() => trabajo ? productos.filter(p => trabajosDe(p).includes(trabajo)) : productos, [productos, trabajo]);
  const tamanos = useMemo(() => {
    const c: Partial<Record<Tamano, number>> = {};
    for (const p of delTrabajo) { const t = tamanoDe(p); if (t) c[t] = (c[t] ?? 0) + 1; }
    return TAMANOS.filter(t => c[t]).map(t => ({ t, n: c[t]! }));
  }, [delTrabajo]);
  const preguntarTamano = trabajo != null && tamanos.length > 1;
  const tope = Number(sinPuntos(precio)) || null;

  const resultado = useMemo(() => {
    let lista = delTrabajo;
    if (preguntarTamano && tamano) lista = lista.filter(p => tamanoDe(p) === tamano);
    if (tope) lista = filtrarVehiculos(lista, { ...filtroVacio(moneda), precioHasta: tope, moneda }, currency);
    return lista;
  }, [delTrabajo, preguntarTamano, tamano, tope, moneda, currency]);
  const algoElegido = trabajo != null || tope != null;
  // Sin nada elegido: lo último que entró.
  const aMostrar = algoElegido ? resultado : [...productos].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const elegirTrabajo = (t: Trabajo) => { setTrabajo(x => x === t ? null : t); setTamano(null); };
  const paso = (n: number, texto: string, listo: boolean) => (
    <p style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: TINTA }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: TITULAR, fontSize: 14,
        background: listo ? acento : "transparent", color: listo ? sobre : TINTA, border: `1.5px solid ${listo ? acento : TINTA}` }}>{n}</span>
      {texto}
    </p>
  );
  const seg = (activo: boolean): React.CSSProperties => ({
    minHeight: 44, padding: "0 14px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
    border: `1.5px solid ${activo ? TINTA : LINEA}`, background: activo ? TINTA : PAPEL, color: activo ? "#fff" : TINTA,
  });

  return (
    <div style={{ ...({ "--sr-acento": acento } as React.CSSProperties) }}>
      {/* ── Paso 1: el trabajo ── */}
      <div data-ef="sube">
        <h2 style={{ margin: "0 0 6px", fontFamily: TITULAR, fontSize: "clamp(30px,4.4vw,52px)", fontWeight: 700, letterSpacing: -0.5, lineHeight: 1, textTransform: "uppercase", color: TINTA }}>{pregunta}</h2>
        <p style={{ margin: "0 0 22px", fontSize: 15, color: TENUE }}>Elegí el trabajo y te mostramos las unidades que sirven.</p>
        {paso(1, "El trabajo", trabajo != null)}
        <div className="sr-trabajos" role="group" aria-label="Elegí el trabajo">
          {TRABAJOS.map((t, i) => {
            const activo = trabajo === t;
            const n = cuantos[t];
            return (
              <button key={t} type="button" className="sr-trabajo" onClick={() => elegirTrabajo(t)} disabled={n === 0} aria-pressed={activo}
                style={{ textAlign: "left", padding: "16px 16px 14px", borderRadius: 6, cursor: n === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", minWidth: 0,
                  border: `2px solid ${activo ? acento : LINEA}`, background: activo ? alfa(acento, 0.12) : PAPEL, opacity: n === 0 ? 0.5 : 1, color: TINTA }}>
                <span style={{ display: "block", fontFamily: TITULAR, fontSize: 13, letterSpacing: 1.5, color: TENUE, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ display: "block", margin: "6px 0 6px", fontFamily: TITULAR, fontSize: "clamp(20px,2.2vw,26px)", fontWeight: 700, lineHeight: 1.05, textTransform: "uppercase" }}>{NOMBRE_TRABAJO[t].titulo}</span>
                <span className="sr-bajada" style={{ fontSize: 13, color: TENUE, lineHeight: 1.45 }}>{NOMBRE_TRABAJO[t].bajada}</span>
                <span style={{ display: "block", marginTop: 10, fontSize: 12.5, fontWeight: 800, color: n ? TINTA : TENUE }}>
                  {n ? `${n} ${n === 1 ? "unidad" : "unidades"}` : "Sin unidades por ahora"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pasos 2 y 3: el tamaño y el presupuesto ── */}
      <div className="sr-pasos" style={{ marginTop: 22 }}>
        <div style={{ minWidth: 0 }}>
          {paso(2, "El tamaño", preguntarTamano && tamano != null)}
          {preguntarTamano ? (
            <div role="group" aria-label="Elegí el tamaño" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="sr-seg" onClick={() => setTamano(null)} aria-pressed={tamano == null} style={seg(tamano == null)}>Cualquiera</button>
              {tamanos.map(({ t, n }) => (
                <button key={t} type="button" className="sr-seg" onClick={() => setTamano(t)} aria-pressed={tamano === t} style={seg(tamano === t)}
                  title={NOMBRE_TAMANO[t].detalle}>
                  {NOMBRE_TAMANO[t].titulo} <span style={{ fontWeight: 500, opacity: 0.7 }}>({n})</span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: TENUE, lineHeight: 1.5, minHeight: 44, display: "flex", alignItems: "center" }}>
              {trabajo == null ? "Primero elegí el trabajo." : "Para este trabajo no hace falta elegir tamaño."}
            </p>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {paso(3, "Hasta cuánto", tope != null)}
          <div style={{ display: "flex", gap: 8 }}>
            {monedas.length > 1 ? (
              <select aria-label="Moneda" value={moneda} onChange={e => setMoneda(e.target.value === "USD" ? "USD" : "ARS")}
                style={{ minHeight: 44, borderRadius: 4, border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA, padding: "0 10px", fontSize: 14, fontFamily: "inherit", flexShrink: 0 }}>
                <option value="ARS">$</option>
                <option value="USD">USD</option>
              </select>
            ) : (
              <span aria-hidden="true" style={{ alignSelf: "center", fontWeight: 800, color: TENUE, flexShrink: 0 }}>{moneda === "USD" ? "USD" : "$"}</span>
            )}
            <input inputMode="numeric" autoComplete="off" aria-label="Precio máximo" placeholder="Sin tope" maxLength={16} value={precio}
              onChange={e => setPrecio(conPuntos(e.target.value).slice(0, 15))}
              style={{ flex: 1, minWidth: 0, minHeight: 44, boxSizing: "border-box", borderRadius: 4, border: `1.5px solid ${LINEA}`, background: PAPEL, color: TINTA, padding: "0 12px", fontSize: 15, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }} />
          </div>
        </div>
      </div>

      {/* ── Lo que sirve ── */}
      <div aria-live="polite" style={{ marginTop: 34 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16, paddingTop: 18, borderTop: `3px solid ${TINTA}` }}>
          <p style={{ margin: 0, fontFamily: TITULAR, fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 700, textTransform: "uppercase", color: TINTA }}>
            {algoElegido
              ? (resultado.length ? `Te ${resultado.length === 1 ? "sirve" : "sirven"} ${resultado.length}` : "Por ahora no hay")
              : "Lo último que entró"}
          </p>
          {(algoElegido ? resultado.length : productos.length) > 0 && (
            <button type="button" onClick={() => onVerPlanilla({ trabajo, tamano: preguntarTamano ? tamano : null, precioHasta: tope, moneda })}
              style={{ minHeight: 44, padding: "0 16px", borderRadius: 4, border: "none", background: acento, color: sobre, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              {algoElegido ? "Verlos en la planilla →" : "Ver todo el stock →"}
            </button>
          )}
        </div>
        {aMostrar.length > 0 ? (
          <div className="sr-res" data-ef="grilla">
            {aMostrar.slice(0, 6).map(p => (
              <TarjetaRuta key={p.id} p={p} acento={acento} moneda={currency} href={hrefDe(p)} favorito={favoritos.includes(p.id)} onFavorito={() => onFavorito(p.id)} />
            ))}
          </div>
        ) : (
          <div style={{ padding: "26px 22px", borderRadius: 6, border: `1.5px dashed ${LINEA}`, background: PAPEL, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 15, color: TENUE, lineHeight: 1.55, maxWidth: 520 }}>
              {algoElegido ? "Con eso no tenemos nada ahora. Dejanos lo que buscás y te avisamos cuando entre." : "Todavía no hay unidades publicadas."}
            </p>
            {algoElegido && (
              <button type="button" onClick={onAvisame}
                style={{ minHeight: 44, padding: "0 16px", borderRadius: 4, border: `1.5px solid ${TINTA}`, background: "transparent", color: TINTA, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Avisame si entra
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
