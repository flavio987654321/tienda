"use client";
import { useState } from "react";
import type { TextOverride } from "@/types/store-config";
import type { ItemIndice } from "@/app/preview/celular/avisos";

/* ── La lista de textos, en la vista de celular ─────────────────────────────────
   Es lo que muestra el panel cuando no hay nada elegido: en esta vista el panel
   no se cierra nunca, como en el editor de la página de venta de digitales. Así
   se ve de un vistazo qué se puede acomodar, y se llega a un texto sin tener que
   encontrarlo en el teléfono — sirve para los que están abajo de todo, o los que
   ocultaste en el celular y quedaron chiquitos y apagados.

   La lista la arma el teléfono (ver /preview/celular), que es el que sabe qué
   textos dibuja cada template. Elegir uno lo abre acá y el teléfono lo busca.

   La primera versión era un listado parejo —todo gris, todo del mismo peso— y
   no se entendía: no se distinguía dónde empezaba un bloque ni qué era cada
   renglón. Por eso cada bloque es una tarjeta con su color y se pliega, y cada
   texto lleva un ícono según lo que es. */

const ANCHO = 340;

const C = {
  fondo: "#f5f6fb",
  tarjeta: "#ffffff",
  borde: "#e8ebf3",
  texto: "#0f172a",
  suave: "#64748b",
  tenue: "#94a3b8",
};

/** Un color por bloque, en orden. Se repiten si hay más bloques que colores. */
const COLORES_BLOQUE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];

/* Qué es cada texto, adivinado por su nombre. Es una ayuda para leer la lista
   de un vistazo, no un dato: si no se reconoce, queda como "Texto". */
type Tipo = { nombre: string; letra: string; color: string; fondo: string };
const TIPOS: { patron: RegExp; tipo: Tipo }[] = [
  { patron: /bot[oó]n|cta/i,                                   tipo: { nombre: "Botón",   letra: "▭", color: "#b45309", fondo: "#fef3c7" } },
  // `\b` para que "Subtítulo" no cuente como título: es un texto.
  { patron: /\bt[ií]tulo|nombre|encabezado/i,                  tipo: { nombre: "Título",  letra: "T", color: "#4338ca", fondo: "#e0e7ff" } },
  { patron: /barra|aviso|etiqueta|tagline|copyright|hecho|bajada|chapa|badge/i,
                                                               tipo: { nombre: "Detalle", letra: "✦", color: "#be185d", fondo: "#fce7f3" } },
];
const TIPO_TEXTO: Tipo = { nombre: "Texto", letra: "¶", color: "#0f766e", fondo: "#ccfbf1" };
const tipoDe = (label: string) => TIPOS.find(t => t.patron.test(label))?.tipo ?? TIPO_TEXTO;

export default function IndiceCelular({ items, overrides, onElegir }: {
  items: ItemIndice[];
  overrides: Record<string, TextOverride>;
  onElegir: (field: string, label: string) => void;
}) {
  /* Agrupados por bloque en el orden en que se ven. Por orden y no por nombre:
     si un bloque se repite más abajo, son dos grupos, como en la pantalla. */
  const grupos: { clave: string; bloque: string; items: ItemIndice[] }[] = [];
  for (const it of items) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.bloque === (it.bloque ?? "Arriba de todo")) ultimo.items.push(it);
    else grupos.push({ clave: `${grupos.length}-${it.bloque}`, bloque: it.bloque ?? "Arriba de todo", items: [it] });
  }

  /* Plegados, salvo el primero: con todo abierto eran 40 renglones seguidos. Se
     guardan los que se CERRARON y no los abiertos, para que un bloque que
     aparece después (al prender una sección) llegue abierto y se note. */
  const [cerrados, setCerrados] = useState<Set<string> | null>(null);
  const estaCerrado = (clave: string, i: number) => cerrados ? cerrados.has(clave) : i > 0;
  const alternar = (clave: string, i: number) => {
    const base = cerrados ?? new Set(grupos.slice(1).map(g => g.clave));
    const n = new Set(base);
    if (estaCerrado(clave, i)) n.delete(clave); else n.add(clave);
    setCerrados(n);
  };

  const estado = (field: string) => {
    const ov = overrides[field];
    return {
      oculto: ov?.hidden ? "Oculto en toda la tienda" : ov?.celular?.hidden ? "Oculto en el celular" : null,
      propio: !!(ov?.celular?.align || ov?.celular?.fontSize),
    };
  };
  const cuantosPropios = items.filter(it => estado(it.field).propio).length;
  const cuantosOcultos = items.filter(it => estado(it.field).oculto).length;

  return (
    <div data-editor-panel style={{
      position: "fixed", top: 44, right: 0, bottom: 0, width: ANCHO, zIndex: 99999,
      background: C.fondo, borderLeft: `1px solid ${C.borde}`,
      boxShadow: "-10px 0 30px rgba(15,23,42,0.10)",
      fontFamily: "system-ui, -apple-system, sans-serif", overflowY: "auto",
    }}>
      {/* ── Cabecera ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "16px 18px 14px",
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%)", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📱</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: -0.2 }}>Editando el celular</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.9, lineHeight: 1.4 }}>
              Elegí un texto o tocalo en el teléfono
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <Chapa>{items.length} textos</Chapa>
          <Chapa>{cuantosPropios === 1 ? "1 acomodado" : `${cuantosPropios} acomodados`}</Chapa>
          {cuantosOcultos > 0 && <Chapa>{cuantosOcultos === 1 ? "1 oculto" : `${cuantosOcultos} ocultos`}</Chapa>}
        </div>
      </div>

      {/* Para que no parezca que hay que editar todo dos veces: la pregunta
          apareció apenas se vio esta vista. */}
      <div style={{ margin: "12px 12px 0", padding: "10px 12px", borderRadius: 10,
        background: "#fffbeb", border: "1px solid #fde68a", display: "flex", gap: 9 }}>
        <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>💡</span>
        <p style={{ margin: 0, fontSize: 11.5, color: "#78350f", lineHeight: 1.5 }}>
          <strong>No hace falta editar todo de nuevo.</strong> Lo que cambiás en computadora
          ya se ve en el celular. Usá esta vista sólo para lo que acá quede grande, mal
          ubicado o sobre.
        </p>
      </div>

      {items.length === 0 ? (
        <p style={{ margin: 0, padding: 18, fontSize: 12, color: C.suave }}>Cargando los textos…</p>
      ) : (
        <div style={{ padding: "12px 12px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {grupos.map((g, i) => {
            const color = COLORES_BLOQUE[i % COLORES_BLOQUE.length];
            const cerrado = estaCerrado(g.clave, i);
            const propios = g.items.filter(it => estado(it.field).propio).length;
            return (
              <section key={g.clave} style={{ background: C.tarjeta, borderRadius: 12, overflow: "hidden",
                border: `1px solid ${C.borde}`, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                <button type="button" onClick={() => alternar(g.clave, i)} aria-expanded={!cerrado}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                    background: cerrado ? "white" : `${color}0f`, border: "none", cursor: "pointer", textAlign: "left",
                    borderLeft: `4px solid ${color}` }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, background: color, color: "white",
                    fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.texto,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.bloque}
                  </span>
                  {propios > 0 && (
                    <span title="Textos con acomodo propio en el celular"
                      style={{ fontSize: 10, fontWeight: 700, color, background: `${color}1a`, borderRadius: 20, padding: "2px 7px", flexShrink: 0 }}>
                      📱 {propios}
                    </span>
                  )}
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.suave, background: "#f1f5f9",
                    borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>
                    {g.items.length}
                  </span>
                  <span style={{ color: C.tenue, fontSize: 11, flexShrink: 0, transition: "transform 0.2s",
                    transform: cerrado ? "rotate(-90deg)" : "none" }}>▾</span>
                </button>

                {!cerrado && g.items.map(it => {
                  const tipo = tipoDe(it.label);
                  const { oculto, propio } = estado(it.field);
                  return (
                    <button key={it.field} type="button" onClick={() => onElegir(it.field, it.label)}
                      title={`${tipo.nombre}: ${it.label}`}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                        padding: "9px 12px", background: "white", border: "none", borderTop: `1px solid #f1f3f8`,
                        cursor: "pointer", opacity: oculto ? 0.6 : 1, transition: "background 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${color}0d`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: tipo.fondo, color: tipo.color,
                        fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontFamily: tipo.letra === "T" ? "Georgia, serif" : "inherit" }}>
                        {tipo.letra}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.tenue, textTransform: "uppercase",
                            letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {it.label}
                          </span>
                          {propio && <Marca color="#4338ca" fondo="#e0e7ff">📱 propio</Marca>}
                          {oculto && <Marca color="#b91c1c" fondo="#fee2e2">{oculto === "Oculto en el celular" ? "oculto 📱" : "oculto"}</Marca>}
                        </span>
                        <span style={{ display: "block", marginTop: 2, color: C.texto, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontSize: tipo.nombre === "Título" ? 13 : 12, fontWeight: tipo.nombre === "Título" ? 700 : 500,
                          fontStyle: it.texto ? "normal" : "italic" }}>
                          {it.texto || "(vacío)"}
                        </span>
                      </span>
                      <span style={{ color: C.tenue, fontSize: 14, flexShrink: 0 }}>›</span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chapa({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, background: "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "3px 9px" }}>
      {children}
    </span>
  );
}

function Marca({ color, fondo, children }: { color: string; fondo: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color, background: fondo, borderRadius: 20,
      padding: "1px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
