"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { linkAVehiculos, type OpcionesDeFiltro } from "@/lib/filtroVehiculos";
import TasacionVehiculo from "@/components/store/auto/TasacionVehiculo";
import BusquedaVehiculo from "@/components/store/auto/BusquedaVehiculo";
import { VentanaAuto } from "@/components/store/auto/VentanaAuto";
import { EditableZone, getContrastColor } from "@/contexts/EditContext";
import type { PreguntaDeAutos } from "@/lib/preguntasFrecuentes";
import { conAlfa } from "./EscenaVolt";
import { MONO } from "./TarjetaVolt";

/** Bloques chicos de Auto Volt (12/10/26). Propios: no se traen de Motor ni de Drive. */
export const BLOQUES_VOLT_CSS = `
  /* auto-fit: con dos o tres tipos las tarjetas se estiran y no queda media fila vacía. */
  .tpv-grilla { display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)) }
  @media(min-width:640px){ .tpv-grilla { grid-template-columns:repeat(auto-fit,minmax(220px,1fr)) } }
  .tpv-item { transition: border-color .25s, background .25s, transform .3s cubic-bezier(.2,.7,.2,1) }
  .tpv-item:hover { transform: translateY(-3px); border-color: var(--tpv-acento) !important; background: var(--tpv-fondo) !important }
  .tpv-item:focus-visible { outline:2px solid var(--tpv-acento); outline-offset:3px }
  .tpv-item:hover .tpv-flecha { transform: translateX(4px); color: var(--tpv-acento) }
  .tpv-flecha { transition: transform .25s, color .25s }
  .svv-grilla { display:grid; gap:14px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:780px){ .svv-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) } }
  @media (prefers-reduced-motion: reduce) { .tpv-item, .tpv-flecha { transition:none } .tpv-item:hover { transform:none } }
`;

/* ── Tipos (o marcas, si la tienda tiene un solo tipo) ─────────────────────── */
export function TiposVolt({ opciones, slug, enEditor, acento, tinta, tenue, titulo }: {
  opciones: OpcionesDeFiltro;
  slug: string;
  enEditor: boolean;
  acento: string;
  tinta: string;
  tenue: string;
  titulo: React.ReactNode;
}) {
  const [todas, setTodas] = useState(false);
  const porTipo = opciones.tipos.length > 1;
  const grupos = porTipo ? opciones.tipos : opciones.marcas;
  if (grupos.length < 2) return null;
  const visibles = todas ? grupos : grupos.slice(0, 10);
  const claro = tinta === "#0b1020";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.02, color: tinta }}>{titulo}</h2>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: tenue }}>
          {grupos.length} {porTipo ? "tipos" : "marcas"}
        </span>
      </div>
      <ul className="tpv-grilla" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {visibles.map(g => (
          <li key={g.valor} style={{ minWidth: 0 }}>
            <Link href={linkAVehiculos(slug, porTipo ? { tipo: g.valor } : { marca: g.valor }, enEditor)} className="tpv-item"
              aria-label={`${g.label}, ${g.cuantos} ${g.cuantos === 1 ? "vehículo" : "vehículos"}`}
              style={{ display: "flex", alignItems: "center", gap: 16, height: "100%", boxSizing: "border-box", padding: "16px 18px", borderRadius: 18,
                textDecoration: "none", color: tinta, background: claro ? "rgba(11,16,32,0.03)" : "rgba(255,255,255,0.035)",
                border: `1px solid ${claro ? "rgba(11,16,32,0.1)" : "rgba(255,255,255,0.08)"}`,
                ...({ "--tpv-acento": acento, "--tpv-fondo": conAlfa(acento, 0.1) } as React.CSSProperties) }}>
              <span style={{ fontFamily: MONO, fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 700, lineHeight: 1, color: acento,
                textShadow: claro ? "none" : `0 0 22px ${conAlfa(acento, 0.45)}`, fontVariantNumeric: "tabular-nums" }}>
                {String(g.cuantos).padStart(2, "0")}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, overflowWrap: "anywhere", minWidth: 0 }}>{g.label}</span>
                <span aria-hidden="true" className="tpv-flecha" style={{ color: tenue, flexShrink: 0 }}>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {grupos.length > 10 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button type="button" aria-expanded={todas} onClick={() => setTodas(v => !v)}
            style={{ minHeight: 44, padding: "0 20px", borderRadius: 999, border: `1px solid ${conAlfa(acento, 0.5)}`, background: "transparent",
              color: acento, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {todas ? "Ver menos" : `Ver ${grupos.length - 10} más`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tasá tu usado / Avisame si entra ─────────────────────────────────────── */
export function ServiciosVolt({ storeId, acento, isOwner, isPreview, textos }: {
  storeId?: string;
  acento: string;
  isOwner: boolean;
  isPreview: boolean;
  textos: { tasarTitulo: React.ReactNode; tasarTexto: React.ReactNode; avisameTitulo: React.ReactNode; avisameTexto: React.ReactNode };
}) {
  const [abierto, setAbierto] = useState<null | "tasar" | "avisame">(null);
  const cerrar = useCallback(() => setAbierto(null), []);
  const sobreAcento = getContrastColor(acento) === "dark" ? "#05070d" : "#fff";

  const consola = (cual: "tasar" | "avisame", codigo: string, titulo: React.ReactNode, texto: React.ReactNode, boton: string, principal: boolean) => (
    <div style={{ position: "relative", padding: "clamp(22px,3.4vw,34px)", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column", gap: 14,
      // Fondo propio y oscuro: se lee igual si la dueña le pone un fondo claro al bloque.
      background: principal ? `linear-gradient(150deg, ${conAlfa(acento, 0.22)}, #0a0e19 62%)` : "#0a0e19",
      border: `1px solid ${principal ? conAlfa(acento, 0.4) : "rgba(255,255,255,0.09)"}` }}>
      <span aria-hidden="true" style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%",
        background: `radial-gradient(circle, ${conAlfa(acento, principal ? 0.35 : 0.15)}, transparent 70%)` }} />
      <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: acento }}>{codigo}</p>
      <h3 style={{ margin: 0, fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1, color: "#fff" }}>{titulo}</h3>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "rgba(232,236,246,0.68)", maxWidth: 460 }}>{texto}</p>
      <button type="button" onClick={() => setAbierto(cual)}
        style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 48, padding: "0 22px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
          fontWeight: 800, fontSize: 14, border: principal ? "none" : "1px solid rgba(255,255,255,0.22)",
          background: principal ? acento : "transparent", color: principal ? sobreAcento : "#fff",
          boxShadow: principal ? `0 10px 30px -10px ${conAlfa(acento, 0.8)}` : "none" }}>
        {boton}
      </button>
    </div>
  );

  return (
    <>
      <div className="svv-grilla">
        {consola("tasar", "// TASACIÓN", textos.tasarTitulo, textos.tasarTexto, "Tasar mi usado", true)}
        {consola("avisame", "// ALERTA DE INGRESO", textos.avisameTitulo, textos.avisameTexto, "Dejar mi búsqueda", false)}
      </div>
      <VentanaAuto abierta={abierto === "tasar"} titulo="Tasá tu usado" onClose={cerrar}>
        <TasacionVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} abiertoDeEntrada />
      </VentanaAuto>
      <VentanaAuto abierta={abierto === "avisame"} titulo="Avisame si entra" onClose={cerrar}>
        <BusquedaVehiculo storeId={storeId} accent={acento} isOwner={isOwner} isPreview={isPreview} />
      </VentanaAuto>
    </>
  );
}

/* ── Preguntas frecuentes ─────────────────────────────────────────────────── */
/** Tarjetas de vidrio que se despliegan. Los campos `faqP1`…`faqR6` son los
 *  mismos que en los otros templates de autos: lo que la dueña reescribió se
 *  conserva al cambiar de template. */
export function PreguntasVolt({ preguntas, acento, tinta }: { preguntas: PreguntaDeAutos[]; acento: string; tinta: string }) {
  const [abierta, setAbierta] = useState<number | null>(0);
  const claro = tinta === "#0b1020";
  const tenue = claro ? "rgba(11,16,32,0.65)" : "rgba(232,236,246,0.68)";
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {preguntas.map((it, i) => {
        const open = abierta === i;
        const id = `pv-faq-${i}`;
        return (
          <li key={i} style={{ borderRadius: 18, border: `1px solid ${open ? conAlfa(acento, 0.45) : claro ? "rgba(11,16,32,0.1)" : "rgba(255,255,255,0.08)"}`,
            background: open ? conAlfa(acento, claro ? 0.06 : 0.08) : claro ? "rgba(11,16,32,0.02)" : "rgba(255,255,255,0.03)", transition: "border-color .25s, background .25s" }}>
            <h3 style={{ margin: 0 }}>
              <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setAbierta(open ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", cursor: "pointer",
                  padding: "18px 18px", textAlign: "left", color: tinta, fontFamily: "inherit" }}>
                <span aria-hidden="true" style={{ fontFamily: MONO, fontSize: 11, color: acento, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "clamp(15px,1.6vw,18px)", fontWeight: 700, letterSpacing: -0.2, overflowWrap: "anywhere" }}>
                  <EditableZone field={`faqP${i + 1}`} label={`Pregunta ${i + 1}`}>{it.p}</EditableZone>
                </span>
                <span aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: open ? acento : "transparent", color: open ? (getContrastColor(acento) === "dark" ? "#05070d" : "#fff") : tinta,
                  border: open ? "none" : `1px solid ${claro ? "rgba(11,16,32,0.2)" : "rgba(255,255,255,0.2)"}`, fontSize: 16,
                  transform: open ? "rotate(45deg)" : "none", transition: "transform .25s" }}>+</span>
              </button>
            </h3>
            <div id={id} role="region" aria-label={it.p} hidden={!open}
              style={{ padding: "0 18px 18px 46px", fontSize: 15, lineHeight: 1.7, color: tenue, overflowWrap: "anywhere" }}>
              <EditableZone field={`faqR${i + 1}`} label={`Respuesta ${i + 1}`}>{it.r}</EditableZone>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
