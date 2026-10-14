"use client";
/**
 * "La agencia" de Auto Volt (13/10/26): todo a la vista, en tarjetas de
 * tablero. Dónde está con su mapa, el horario con lo que pasa AHORA, cómo se
 * paga, quién atiende, la garantía y el salón. Los datos y los editores son
 * compartidos (auto/agencia/piezasAgencia); el tablero es de Volt.
 *
 * En la tienda no se dibuja ninguna tarjeta vacía. En el editor se ven todas,
 * con su editor abajo, para que la dueña sepa qué puede completar.
 */
import { EditableZone } from "@/contexts/EditContext";
import { NOMBRE_PAGO, ahoraEnArgentina } from "@/lib/agencia";
import { fotoLiviana } from "@/lib/foto-liviana";
import { WaIcon } from "@/components/store/auto/AutoVehicleShared";
import {
  useAgencia, useEstadoAhora, MapaAgencia, urlComoLlegar, FaltaEnConfiguracion, waDeMiembro,
  EditorPagos, EditorEquipo, EditorGarantia, EditorSalon, type PaletaAgencia,
} from "@/components/store/auto/agencia/piezasAgencia";
import { conAlfa, MONO } from "./EscenaVolt";
import { useSyncExternalStore } from "react";

export const AGENCIA_VOLT_CSS = `
  .agv-grilla { display:grid; gap:14px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:860px){ .agv-grilla { grid-template-columns:repeat(2,minmax(0,1fr)) } .agv-ancha { grid-column:1 / -1 } }
  .agv-equipo { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)) }
  .agv-salon { display:grid; gap:8px; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)) }
`;

const sinSuscripcion = () => () => {};

export function AgenciaVolt({ acento, sobreAcento, nombreTienda, waLink, onVerVehiculos, todosHref }: {
  acento: string;
  sobreAcento: string;
  nombreTienda: string;
  waLink: string | null;
  onVerVehiculos: (e: React.MouseEvent) => void;
  todosHref: string;
}) {
  const a = useAgencia();
  const estado = useEstadoAhora(a.ubicacion.horarios);
  // El día de hoy, para resaltarlo: también sólo en el navegador.
  const hoy = useSyncExternalStore(sinSuscripcion, () => ahoraEnArgentina().dia, () => null);
  const p: PaletaAgencia = { tinta: "#e8ecf6", tenue: "rgba(232,236,246,0.62)", linea: "rgba(255,255,255,0.12)", campo: "rgba(5,7,13,0.6)", acento, sobreAcento };
  const ver = (hay: boolean) => hay || a.enEdicion;

  const tarjeta = (codigo: string, titulo: React.ReactNode, cuerpo: React.ReactNode, clase = "") => (
    <div className={clase} data-ef="sube" style={{ position: "relative", minWidth: 0, padding: "clamp(18px,2.6vw,26px)", borderRadius: 20, background: "rgba(10,14,25,0.78)",
      border: `1px solid ${p.linea}`, backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <p style={{ margin: "0 0 6px", fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: acento }}>{codigo}</p>
        <h3 style={{ margin: 0, fontSize: "clamp(19px,2vw,23px)", fontWeight: 800, letterSpacing: -0.5, color: "#fff" }}>{titulo}</h3>
      </div>
      {cuerpo}
    </div>
  );

  const fila = (dia: string, horas: string, resaltada: boolean) => (
    <div key={dia} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderRadius: 10,
      background: resaltada ? conAlfa(acento, 0.12) : "transparent", border: `1px solid ${resaltada ? conAlfa(acento, 0.4) : "transparent"}` }}>
      <span style={{ fontFamily: MONO, fontSize: 13, color: resaltada ? "#fff" : p.tenue }}>{dia}{resaltada ? " · hoy" : ""}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, color: horas === "Cerrado" ? p.tenue : "#fff", textAlign: "right" }}>{horas}</span>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ── Presentación ── */}
      <div data-ef="sube" style={{ padding: "clamp(22px,4vw,40px)", borderRadius: 24, border: `1px solid ${conAlfa(acento, 0.35)}`,
        background: `radial-gradient(120% 120% at 0% 0%, ${conAlfa(acento, 0.18)}, rgba(10,14,25,0.85) 55%)` }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, color: acento }}>{"// LA AGENCIA"}</p>
          {estado && (
            <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 999, fontFamily: MONO, fontSize: 11.5,
              color: estado.abierto ? "#4ade80" : "#fda4af", border: `1px solid ${estado.abierto ? "rgba(74,222,128,0.4)" : "rgba(253,164,175,0.35)"}`, background: "rgba(5,7,13,0.5)" }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 8px currentColor" }} />
              {estado.texto}
            </span>
          )}
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(30px,5vw,56px)", fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.02, color: "#fff", overflowWrap: "anywhere" }}>
          {nombreTienda}{a.ubicacion.localidad ? <span style={{ color: p.tenue, fontWeight: 600 }}> · {a.ubicacion.localidad}</span> : null}
        </h1>
        <p style={{ margin: 0, maxWidth: 640, fontSize: 16, lineHeight: 1.7, color: p.tenue }}>
          <EditableZone field="nosotrosP1" label="Párrafo de la agencia">Somos especialistas en compra y venta de vehículos usados y a estrenar. Cada uno tiene fotos reales, su ficha técnica y el precio a la vista.</EditableZone>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, minHeight: 46, padding: "0 20px", borderRadius: 12, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
              <WaIcon size={17} /> Escribinos
            </a>
          )}
          {a.conDireccion && (
            <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 20px", borderRadius: 12, background: acento, color: sobreAcento, textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
              Cómo llegar
            </a>
          )}
          <a href={todosHref} onClick={onVerVehiculos} style={{ display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 20px", borderRadius: 12, border: `1px solid ${p.linea}`, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14.5 }}>
            Ver los vehículos
          </a>
        </div>
      </div>

      <div className="agv-grilla">
        {ver(a.conDireccion) && tarjeta("// DÓNDE ESTAMOS", "Vení a verlos", a.conDireccion ? (
          <>
            <MapaAgencia ubicacion={a.ubicacion} oscuro alto={230} />
            <p style={{ margin: 0, fontSize: 15, color: "#fff", lineHeight: 1.5 }}>{a.direccion}</p>
          </>
        ) : <FaltaEnConfiguracion que="la dirección" p={p} />)}

        {ver(a.horarios.length > 0) && tarjeta("// HORARIOS", "Cuándo atendemos", a.horarios.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            {a.horarios.map((h) => fila(h.dias, h.horas, !!hoy && h.incluye.includes(hoy)))}
          </div>
        ) : <FaltaEnConfiguracion que="los horarios" p={p} />)}

        {ver(a.agencia.pagos.length > 0 || !!a.agencia.pagosNota) && tarjeta("// CÓMO PAGAR", "Formas de pago", (
          <>
            {a.agencia.pagos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {a.agencia.pagos.map((x) => (
                  <span key={x} style={{ padding: "8px 13px", borderRadius: 10, border: `1px solid ${conAlfa(acento, 0.4)}`, background: conAlfa(acento, 0.08), color: "#fff", fontSize: 13.5, fontWeight: 700 }}>{NOMBRE_PAGO[x]}</span>
                ))}
              </div>
            )}
            {a.agencia.pagosNota && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: p.tenue }}>{a.agencia.pagosNota}</p>}
            {a.enEdicion && <EditorPagos p={p} />}
          </>
        ), "agv-ancha")}

        {ver(a.agencia.equipo.length > 0) && tarjeta("// EL EQUIPO", "Con quién hablás", (
          <>
            {a.agencia.equipo.length > 0 && (
              <div className="agv-equipo">
                {a.agencia.equipo.map((m, i) => {
                  const wa = waDeMiembro(m, nombreTienda);
                  return (
                    <div key={m.nombre + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${p.linea}`, minWidth: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                      {m.foto ? <img src={fotoLiviana(m.foto, 128)} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${conAlfa(acento, 0.5)}` }} />
                        : <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: conAlfa(acento, 0.15), color: acento, fontWeight: 800, fontSize: 20 }}>{m.nombre.trim()[0]?.toUpperCase()}</span>}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 800, color: "#fff", overflowWrap: "anywhere" }}>{m.nombre}</p>
                        {m.rol && <p style={{ margin: "2px 0 0", fontSize: 13, color: p.tenue, overflowWrap: "anywhere" }}>{m.rol}</p>}
                        {m.bio && <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(232,236,246,0.78)", lineHeight: 1.5, overflowWrap: "anywhere" }}>{m.bio}</p>}
                      </div>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Escribirle a ${m.nombre} por WhatsApp`}
                        style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#25d366", color: "#fff" }}><WaIcon size={18} /></a>}
                    </div>
                  );
                })}
              </div>
            )}
            {a.enEdicion && <EditorEquipo p={p} />}
          </>
        ), "agv-ancha")}

        {ver(!!a.agencia.garantia) && tarjeta("// GARANTÍA", "Comprás tranquilo", (
          <>
            {a.agencia.garantia && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: p.tenue, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.agencia.garantia}</p>}
            {a.enEdicion && <EditorGarantia p={p} />}
          </>
        ))}

        {ver(a.agencia.salon.length > 0) && tarjeta("// EL SALÓN", "Así es la agencia", (
          <>
            {a.agencia.salon.length > 0 && (
              <div className="agv-salon">
                {a.agencia.salon.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña
                  <img key={f + i} src={fotoLiviana(f, 640)} alt={`Salón de ${nombreTienda}, foto ${i + 1}`} loading="lazy"
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 12, display: "block" }} />
                ))}
              </div>
            )}
            {a.enEdicion && <EditorSalon p={p} />}
          </>
        ))}
      </div>
    </div>
  );
}
