"use client";
/**
 * "La agencia" de Auto Motor (13/10/26): la agencia presentada como la ficha
 * técnica de un vehículo. Arriba la foto del salón y la presentación; abajo
 * una ficha de renglones (dirección, horario, pagos, garantía) con su mapa, y
 * después el equipo y el salón. Industrial, recto, sin tarjetas redondeadas:
 * el lenguaje de Motor. Datos y editores compartidos (auto/agencia).
 */
import { EditableZone } from "@/contexts/EditContext";
import { NOMBRE_PAGO } from "@/lib/agencia";
import { fotoLiviana } from "@/lib/foto-liviana";
import { WaIcon } from "@/components/store/auto/AutoVehicleShared";
import {
  useAgencia, useEstadoAhora, MapaAgencia, urlComoLlegar, FaltaEnConfiguracion, waDeMiembro, useVisorFotos, VisorFotos,
  EditorPagos, EditorEquipo, EditorGarantia, EditorSalon, type PaletaAgencia,
} from "@/components/store/auto/agencia/piezasAgencia";

export const AGENCIA_MOTOR_CSS = `
  .agm-arriba { display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(24px,4vw,56px); align-items:center }
  @media(min-width:900px){ .agm-arriba { grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) } }
  .agm-fila { display:grid; grid-template-columns:minmax(0,1fr); gap:6px 24px; padding:18px 0; border-top:1px solid rgba(255,255,255,0.1) }
  @media(min-width:720px){ .agm-fila { grid-template-columns:200px minmax(0,1fr) } }
  .agm-equipo { display:grid; gap:10px; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)) }
  .agm-salon { display:grid; gap:6px; grid-template-columns:repeat(2,minmax(0,1fr)) }
  .agm-foto { display:block; padding:0; border:none; background:#141619; cursor:zoom-in; overflow:hidden; border-radius:2px }
  .agm-foto img { transition: transform .7s cubic-bezier(.2,.7,.2,1), filter .4s }
  .agm-foto:hover img { transform: scale(1.04); filter: brightness(1.08) }
  @media (prefers-reduced-motion: reduce) { .agm-foto img { transition:none } }
  @media(min-width:760px){ .agm-salon { grid-template-columns:repeat(3,minmax(0,1fr)) } }
`;

export function AgenciaMotor({ acento, sobreAcento, nombreTienda, waLink, todosHref, fotoDeRespaldo, enPrevia }: {
  acento: string;
  sobreAcento: string;
  nombreTienda: string;
  waLink: string | null;
  todosHref: string;
  /** La foto de "Nosotros" de la portada, si todavía no hay fotos del salón. */
  fotoDeRespaldo: string;
  enPrevia: boolean;
}) {
  const a = useAgencia();
  const visor = useVisorFotos();
  const estado = useEstadoAhora(a.ubicacion.horarios);
  const p: PaletaAgencia = { tinta: "#f4f4f5", tenue: "rgba(255,255,255,0.55)", linea: "rgba(255,255,255,0.14)", campo: "#0b0c0e", acento, sobreAcento };
  const ver = (hay: boolean) => hay || a.enEdicion;
  const etiqueta: React.CSSProperties = { margin: 0, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: acento, fontWeight: 800 };
  const valor: React.CSSProperties = { margin: 0, fontSize: 16, color: "#f4f4f5", lineHeight: 1.6, overflowWrap: "anywhere" };
  const kicker = (texto: string) => (
    <p style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: acento, letterSpacing: 3.5, fontWeight: 800, textTransform: "uppercase" }}>
      <span aria-hidden="true" style={{ width: 28, height: 2, background: acento }} />{texto}
    </p>
  );
  const h2: React.CSSProperties = { margin: "0 0 24px", fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, color: "#fff", letterSpacing: -1.2, lineHeight: 1 };
  const fotoPrincipal = a.agencia.salon[0] ?? fotoDeRespaldo;
  const hayFicha = a.conDireccion || a.horarios.length > 0 || a.agencia.pagos.length > 0 || !!a.agencia.pagosNota || !!a.agencia.garantia;

  return (
    <div style={{ display: "grid", gap: "clamp(48px,7vw,88px)" }}>
      {/* ── Presentación ── */}
      <div className="agm-arriba" data-ef="sube">
        <div style={{ position: "relative", overflow: "hidden", aspectRatio: "5/4", borderRadius: 4, background: "#141619" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto de la agencia */}
          <img src={fotoLiviana(fotoPrincipal, 1200)} alt={`${nombreTienda}, la agencia`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {estado && (
            <span role="status" style={{ position: "absolute", left: 14, bottom: 14, padding: "8px 12px", borderRadius: 2, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
              background: estado.abierto ? "#16a34a" : "rgba(11,12,14,0.85)", color: "#fff", border: estado.abierto ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
              {estado.texto}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {kicker("La agencia")}
          <h1 style={{ margin: "0 0 20px", fontSize: "clamp(36px,6vw,76px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.045em", lineHeight: 0.92, overflowWrap: "anywhere" }}>
            {nombreTienda}
          </h1>
          <p style={{ margin: "0 0 28px", fontSize: 16, color: p.tenue, lineHeight: 1.8 }}>
            <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos usados y a estrenar. Trabajamos con transparencia y seriedad para que tu experiencia sea única.</EditableZone>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48, padding: "0 22px", borderRadius: 2, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
                <WaIcon size={16} /> Escribinos
              </a>
            )}
            {a.conDireccion && (
              <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 22px", borderRadius: 2, background: acento, color: sobreAcento, textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Cómo llegar
              </a>
            )}
            <a href={todosHref} style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 22px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.25)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Ver vehículos
            </a>
          </div>
        </div>
      </div>

      {/* ── La ficha ── */}
      {(hayFicha || a.enEdicion) && (
        <div data-ef="sube">
          {kicker("Ficha de la agencia")}
          <h2 style={h2}>Todo lo que necesitás saber</h2>
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {ver(a.conDireccion) && (
              <div className="agm-fila">
                <p style={etiqueta}>Dirección</p>
                <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
                  {a.conDireccion ? (
                    <>
                      <p style={valor}>{a.direccion}</p>
                      <div style={{ border: "1px solid rgba(255,255,255,0.12)" }}><MapaAgencia ubicacion={a.ubicacion} oscuro radio={0} alto={260} /></div>
                    </>
                  ) : <FaltaEnConfiguracion que="la dirección" p={p} />}
                </div>
              </div>
            )}
            {ver(a.horarios.length > 0) && (
              <div className="agm-fila">
                <p style={etiqueta}>Horario</p>
                {a.horarios.length > 0 ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {a.horarios.map((h) => (
                      <p key={h.dias} style={{ ...valor, display: "flex", justifyContent: "space-between", gap: 16, maxWidth: 460 }}>
                        <span style={{ color: p.tenue }}>{h.dias}</span><span style={{ textAlign: "right" }}>{h.horas}</span>
                      </p>
                    ))}
                  </div>
                ) : <FaltaEnConfiguracion que="los horarios" p={p} />}
              </div>
            )}
            {ver(a.agencia.pagos.length > 0 || !!a.agencia.pagosNota) && (
              <div className="agm-fila">
                <p style={etiqueta}>Formas de pago</p>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  {a.agencia.pagos.length > 0 && <p style={valor}>{a.agencia.pagos.map((x) => NOMBRE_PAGO[x]).join(" · ")}</p>}
                  {a.agencia.pagosNota && <p style={{ ...valor, color: p.tenue, fontSize: 15 }}>{a.agencia.pagosNota}</p>}
                  {a.enEdicion && <EditorPagos p={p} />}
                </div>
              </div>
            )}
            {ver(!!a.agencia.garantia) && (
              <div className="agm-fila">
                <p style={etiqueta}>Garantía</p>
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  {a.agencia.garantia && <p style={{ ...valor, whiteSpace: "pre-line" }}>{a.agencia.garantia}</p>}
                  {a.enEdicion && <EditorGarantia p={p} />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── El equipo ── */}
      {ver(a.agencia.equipo.length > 0) && (
        <div data-ef="sube">
          {kicker("El equipo")}
          <h2 style={h2}>Con quién hablás</h2>
          {a.agencia.equipo.length > 0 && (
            <div className="agm-equipo">
              {a.agencia.equipo.map((m, i) => {
                const wa = waDeMiembro(m, nombreTienda);
                return (
                  <div key={m.nombre + i} style={{ background: "#141619", border: "1px solid rgba(255,255,255,0.08)", padding: 18, display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                    {m.foto ? <img src={fotoLiviana(m.foto, 160)} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                      : <span aria-hidden="true" style={{ width: 60, height: 60, flexShrink: 0, display: "grid", placeItems: "center", background: acento, color: sobreAcento, fontWeight: 900, fontSize: 22 }}>{m.nombre.trim()[0]?.toUpperCase()}</span>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15, overflowWrap: "anywhere" }}>{m.nombre}</p>
                      {m.rol && <p style={{ margin: "3px 0 0", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: p.tenue, overflowWrap: "anywhere" }}>{m.rol}</p>}
                      {m.bio && <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, overflowWrap: "anywhere" }}>{m.bio}</p>}
                    </div>
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Escribirle a ${m.nombre} por WhatsApp`}
                      style={{ flexShrink: 0, width: 42, height: 42, display: "grid", placeItems: "center", background: "#25d366", color: "#fff", borderRadius: 2 }}><WaIcon size={18} /></a>}
                  </div>
                );
              })}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 16 }}><EditorEquipo p={p} /></div>}
        </div>
      )}

      {/* ── El salón ── */}
      {ver(a.agencia.salon.length > 0) && (
        <div data-ef="sube">
          {kicker("El salón")}
          <h2 style={h2}>Así es la agencia</h2>
          {a.agencia.salon.length > 0 && (
            <div className="agm-salon">
              {a.agencia.salon.map((f, i) => (
                <button key={f + i} type="button" className="agm-foto" onClick={() => visor.abrir(i)} aria-label={`Ver la foto ${i + 1} del salón en grande`}
                  style={{ gridRow: i === 0 && a.agencia.salon.length > 2 ? "span 2" : undefined, aspectRatio: i === 0 && a.agencia.salon.length > 2 ? undefined : "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                  <img src={fotoLiviana(f, 800)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 16 }}><EditorSalon p={p} /></div>}
        </div>
      )}
      <VisorFotos fotos={a.agencia.salon} indice={visor.abierta} onCerrar={visor.cerrar} onMover={visor.mover} titulo={`Salón de ${nombreTienda}`} enPrevia={enPrevia} />
    </div>
  );
}
