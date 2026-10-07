"use client";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { getContrastColor } from "@/contexts/EditContext";
import { leerFicha, bloquesDeFicha, tipoDeFicha, urlFichaPdf, controlDeFicha, type FilaDeFicha } from "@/lib/fichaVehiculo";

/* La ficha técnica del vehículo (06/10/26). Dos piezas:
   `DescargasDeFicha` va debajo del botón de consultar (se ve sin bajar) y
   `HojaDeFicha` es la ficha como hoja, en la página del vehículo.
   Los datos y el porqué de cómo se guardan están en `lib/fichaVehiculo`. */

function IconoDoc({ color }: { color: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 18 15 15" />
    </svg>
  );
}

const BOTON: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "8px 14px",
  borderRadius: 6, border: "1px solid #dfe3ea", background: "#fff", color: "#1a2744",
  fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer",
};

/**
 * "Descargar ficha (PDF)" y, si la concesionaria subió uno, su folleto. Descarga
 * de verdad (el servidor la manda como archivo): antes abría otra pestaña y
 * en el celular no quedaba guardada.
 * En la previa del editor no va: los vehículos de muestra no existen en la
 * base y el PDF daría "no encontrado".
 */
export function DescargasDeFicha({ product, accent, isPreview }: { product: StorefrontProduct; accent: string; isPreview?: boolean }) {
  const tipo = tipoDeFicha(product.category);
  if (!tipo || isPreview) return null;
  const { folleto } = leerFicha(product.attributes);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={urlFichaPdf(product.id, true)} download style={BOTON}>
        <IconoDoc color={accent} /> Descargar ficha (PDF)
      </a>
      {folleto && (
        <a href={folleto.url} target="_blank" rel="noopener noreferrer" style={BOTON} title={folleto.nombre}>
          <IconoDoc color={accent} /> Folleto de la concesionaria
        </a>
      )}
    </div>
  );
}

/* ── La hoja (07/10/26) ─────────────────────────────────────────────────────
   El dueño: "tiene que aparecer como un formulario de ficha técnica real, no
   como pastillas". Es la misma hoja que el PDF: encabezado con la agencia,
   casilleros con su rótulo arriba (como un formulario impreso) y el
   equipamiento como lista de control COMPLETA del tipo de vehículo: ✓ lo que
   tiene, "—" lo que no se informó (no "no tiene": puede que no se haya
   cargado). Reemplaza a "Características del vehículo" + las pastillas, que
   repetían los mismos datos dos veces. */

const TINTA = "#1a2744";
const RAYA = "#d5dae2";

function Seccion({ titulo, accent, children }: { titulo: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h4 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800,
        color: TINTA, textTransform: "uppercase", letterSpacing: 1.4 }}>
        <span aria-hidden="true" style={{ width: 3, height: 13, background: accent }} />
        {titulo}
      </h4>
      {children}
    </section>
  );
}

/** Casilleros de formulario: rótulo chico arriba, el dato abajo, bordes finos. */
function Casilleros({ filas }: { filas: FilaDeFicha[] }) {
  return (
    <dl className="hf-casilleros" style={{ margin: 0, display: "grid", paddingRight: 1, paddingBottom: 1 }}>
      {filas.map((f) => (
        <div key={f.label} style={{ background: "#fff", padding: "8px 12px 9px", minWidth: 0,
          border: `1px solid ${RAYA}`, margin: "0 -1px -1px 0" }}>
          <dt style={{ fontSize: 9.5, fontWeight: 700, color: "#7a8494", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>{f.label}</dt>
          <dd style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1d2433", overflowWrap: "anywhere" }}>{f.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** La lista de control: todos los ítems, tildados los que tiene. */
function Control({ items, accent }: { items: { label: string; tiene: boolean }[]; accent: string }) {
  const tilde = getContrastColor(accent) === "light" ? "#fff" : "#111";
  return (
    <ul className="hf-control" style={{ listStyle: "none", margin: 0, padding: "0 1px 1px 0", display: "grid" }}>
      {items.map((i) => (
        <li key={i.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          border: `1px solid ${RAYA}`, margin: "0 -1px -1px 0", lineHeight: 1.3, hyphens: "auto",
          color: i.tiene ? "#1d2433" : "#9aa3b2", fontWeight: i.tiene ? 600 : 400, minWidth: 0, position: "relative" }}>
          <span aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 3,
            border: i.tiene ? "none" : `1.5px solid #c3c9d3`, background: i.tiene ? accent : "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {i.tiene && <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={tilde} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>{i.label}</span>
          <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {i.tiene ? "sí" : "no informado"}
          </span>
          {!i.tiene && <span aria-hidden="true" className="hf-guion" style={{ color: "#c3c9d3" }}>—</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * La ficha técnica como hoja. `datos` son los datos principales que arma la
 * página del vehículo (marca, modelo, año, km…), así no se pierde ningún atributo propio.
 */
export function HojaDeFicha({ product, accent, datos, nombreTienda, isPreview }: {
  product: StorefrontProduct;
  accent: string;
  datos: FilaDeFicha[];
  nombreTienda?: string;
  isPreview?: boolean;
}) {
  const tipo = tipoDeFicha(product.category);
  if (!tipo) return null;
  const ficha = leerFicha(product.attributes);
  const b = bloquesDeFicha(ficha, tipo);
  const { equipamiento, papeles } = controlDeFicha(ficha, tipo);
  const anio = datos.find((d) => d.label === "Año")?.valor;

  return (
    <div>
      <style>{`
        .hf-casilleros { grid-template-columns: repeat(2,minmax(0,1fr)) }
        @media (min-width: 640px) { .hf-casilleros { grid-template-columns: repeat(3,minmax(0,1fr)) } }
        /* Dos columnas ya en el celular (en una sola eran 25 renglones); tres en la compu. */
        .hf-control { grid-template-columns: repeat(2,minmax(0,1fr)); font-size: 12px }
        .hf-guion { display: none }
        @media (min-width: 560px) { .hf-control { font-size: 13px } .hf-guion { display: inline } }
        @media (min-width: 900px) { .hf-control { grid-template-columns: repeat(3,minmax(0,1fr)) } }
      `}</style>
      {/* La hoja: papel blanco con borde, como la impresa. */}
      <article aria-label="Ficha técnica" lang="es" style={{ background: "#fff", border: `1px solid ${RAYA}`, borderRadius: 4,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)", padding: "clamp(16px,3vw,28px)", color: TINTA }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", paddingBottom: 10,
          borderBottom: `2px solid ${accent}` }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#5b6576",
            overflowWrap: "anywhere", minWidth: 0 }}>{nombreTienda ?? ""}</span>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: TINTA, flexShrink: 0 }}>FICHA TÉCNICA</span>
        </header>
        <h3 style={{ margin: "16px 0 2px", fontSize: "clamp(18px,2.4vw,22px)", fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2, overflowWrap: "anywhere" }}>
          {product.name}
        </h3>
        {anio && <p style={{ margin: 0, fontSize: 13, color: "#5b6576" }}>Modelo {anio}</p>}

        {datos.length > 0 && <Seccion titulo="Datos principales" accent={accent}><Casilleros filas={datos} /></Seccion>}
        {b.motor.length > 0 && <Seccion titulo="Motor y prestaciones" accent={accent}><Casilleros filas={b.motor} /></Seccion>}
        {b.medidas.length > 0 && <Seccion titulo="Medidas y capacidades" accent={accent}><Casilleros filas={b.medidas} /></Seccion>}
        {b.equipamiento.length > 0 && <Seccion titulo="Equipamiento" accent={accent}><Control items={equipamiento} accent={accent} /></Seccion>}
        {b.papeles.length > 0 && <Seccion titulo="Papeles y condiciones" accent={accent}><Control items={papeles} accent={accent} /></Seccion>}

        <footer style={{ marginTop: 20, paddingTop: 10, borderTop: `1px solid ${RAYA}`, display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#7a8494" }}>
            Datos cargados por {nombreTienda || "la agencia"}. &ldquo;—&rdquo;: no informado.
          </span>
          {!isPreview && (
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={urlFichaPdf(product.id)} target="_blank" rel="noopener" style={BOTON}>
                <IconoDoc color={accent} /> Ver en PDF
              </a>
              <a href={urlFichaPdf(product.id, true)} download style={BOTON}>
                <IconoDoc color={accent} /> Descargar
              </a>
            </span>
          )}
        </footer>
      </article>
    </div>
  );
}
