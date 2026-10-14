"use client";
/**
 * "La agencia" de Auto Ruta (15/10/26): la HOJA DE LA AGENCIA.
 *
 * Como el resto del template, ordenada como una planilla: una franja de asfalto
 * con el nombre, el estado (abierto/cerrado) y la dirección; después los datos
 * en renglones al lado del mapa (horario, formas de pago, garantía), el equipo
 * en fichas horizontales y el salón en mosaico que se abre en grande. Sin
 * íconos: letra de cartel, rayas y el acento. Datos, editores y visor
 * compartidos (auto/agencia).
 */
import { EditableZone, getContrastColor } from "@/contexts/EditContext";
import { NOMBRE_PAGO } from "@/lib/agencia";
import { fotoLiviana } from "@/lib/foto-liviana";
import {
  useAgencia, useEstadoAhora, MapaAgencia, urlComoLlegar, FaltaEnConfiguracion, waDeMiembro, useVisorFotos, VisorFotos,
  EditorPagos, EditorEquipo, EditorGarantia, EditorSalon, type PaletaAgencia,
} from "@/components/store/auto/agencia/piezasAgencia";
import { PAPEL, TINTA, TENUE, LINEA, ASFALTO, TITULAR, rayaDeRuta } from "./estiloRuta";

export const AGENCIA_RUTA_CSS = `
  .agr-datos { display:grid; gap:18px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:900px){ .agr-datos { grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); align-items:stretch } }
  .agr-equipo { display:grid; gap:12px; grid-template-columns:minmax(0,1fr) }
  @media(min-width:760px){ .agr-equipo { grid-template-columns:repeat(2,minmax(0,1fr)) } }
  .agr-persona { display:grid; grid-template-columns:96px minmax(0,1fr); gap:14px; align-items:start }
  @media(min-width:500px){ .agr-persona { grid-template-columns:120px minmax(0,1fr) } }
  .agr-mosaico { display:grid; gap:8px; grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-rows:clamp(120px,17vw,210px) }
  @media(min-width:860px){ .agr-mosaico { grid-template-columns:repeat(3,minmax(0,1fr)) } .agr-mosaico > :first-child { grid-column:span 2; grid-row:span 2 } }
  .agr-foto { position:relative; overflow:hidden; border-radius:4px; border:none; padding:0; cursor:zoom-in; background:#e7e5df }
  .agr-foto img { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .agr-foto:hover img { transform: scale(1.04) }
  .agr-foto:focus-visible, .agr-btn:focus-visible { outline:3px solid var(--agr-acento); outline-offset:3px }
  @media (prefers-reduced-motion: reduce) { .agr-foto img { transition:none } }
`;

export function AgenciaRuta({ acento, nombreTienda, waLink, todosHref, onVerStock, enPrevia }: {
  acento: string;
  nombreTienda: string;
  waLink: string | null;
  todosHref: string;
  onVerStock: (e: React.MouseEvent) => void;
  enPrevia: boolean;
}) {
  const a = useAgencia();
  const estado = useEstadoAhora(a.ubicacion.horarios);
  const visor = useVisorFotos();
  const sobre = getContrastColor(acento) === "dark" ? TINTA : "#fff";
  const p: PaletaAgencia = { tinta: TINTA, tenue: TENUE, linea: LINEA, campo: PAPEL, acento, sobreAcento: sobre };
  const ver = (hay: boolean) => hay || a.enEdicion;
  const conPagos = ver(a.agencia.pagos.length > 0 || !!a.agencia.pagosNota);
  const conGarantia = ver(!!a.agencia.garantia);
  const conVisita = ver(a.conDireccion || a.horarios.length > 0);

  const titulo = (texto: string) => (
    <h2 data-ef="titulo" style={{ margin: "0 0 16px", paddingBottom: 10, borderBottom: `3px solid ${TINTA}`, fontFamily: TITULAR, fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, textTransform: "uppercase", color: TINTA, letterSpacing: 0.3 }}>{texto}</h2>
  );
  const rotulo = (texto: string) => (
    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: TENUE }}>{texto}</p>
  );
  const boton = (fondo: string, color: string, borde?: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48, padding: "0 20px", borderRadius: 4,
    background: fondo, color, border: borde ? `1.5px solid ${borde}` : "none", textDecoration: "none", fontWeight: 800, fontSize: 14.5,
  });

  return (
    <div style={{ display: "grid", gap: "clamp(44px,6vw,80px)", ...({ "--agr-acento": acento } as React.CSSProperties) }}>
      {/* ── La franja: nombre, estado y dirección ── */}
      <div data-ef="sube">
        <div style={{ background: ASFALTO, color: "#fff", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ padding: "clamp(24px,4vw,44px)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px", marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: acento }}>La agencia</p>
              {estado && (
                <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: estado.abierto ? "#86efac" : "rgba(255,255,255,0.65)" }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: estado.abierto ? "#22c55e" : "rgba(255,255,255,0.35)" }} />{estado.texto}
                </span>
              )}
            </div>
            <h1 style={{ margin: "0 0 10px", fontFamily: TITULAR, fontSize: "clamp(36px,6vw,72px)", fontWeight: 700, lineHeight: 0.95, textTransform: "uppercase", overflowWrap: "anywhere" }}>{nombreTienda}</h1>
            {a.conDireccion && <p style={{ margin: "0 0 16px", fontSize: 15, color: "rgba(255,255,255,0.75)" }}>{a.direccion}</p>}
            <p style={{ margin: "0 0 24px", maxWidth: 640, fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Unidades de trabajo revisadas y con los papeles al día. Te asesoramos según lo que tenés que mover.</EditableZone>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" className="agr-btn" style={boton("#25d366", "#fff")}>Escribinos por WhatsApp</a>}
              {a.conDireccion && <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" className="agr-btn" style={boton(acento, sobre)}>Cómo llegar</a>}
              <a href={todosHref} onClick={onVerStock} className="agr-btn" style={boton("transparent", "#fff", "rgba(255,255,255,0.4)")}>Ver el stock</a>
            </div>
          </div>
          <span aria-hidden="true" style={{ display: "block", height: 6, background: rayaDeRuta(acento) }} />
        </div>
      </div>

      {/* ── Los datos al lado del mapa ── */}
      {(conVisita || conPagos) && <section aria-label="Dónde y cuándo">
        {titulo("Dónde y cuándo")}
        <div data-ef="sube" className="agr-datos">
          <div style={{ background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, padding: "clamp(18px,2.6vw,26px)", display: "grid", gap: 22, alignContent: "start", gridColumn: a.conDireccion ? undefined : "1 / -1" }}>
            {ver(a.conDireccion) && <div>
              {rotulo("Dirección")}
              {a.conDireccion
                ? <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TINTA, lineHeight: 1.45 }}>{a.direccion}</p>
                : <FaltaEnConfiguracion que="la dirección" p={p} />}
            </div>}
            {ver(a.horarios.length > 0) && <div>
              {rotulo("Horario")}
              {a.horarios.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {a.horarios.map(h => (
                      <tr key={h.dias}>
                        <th scope="row" style={{ textAlign: "left", padding: "9px 12px 9px 0", borderBottom: "1px dotted #c9c6bd", fontSize: 14.5, fontWeight: 700, color: TINTA }}>{h.dias}</th>
                        <td style={{ textAlign: "right", padding: "9px 0", borderBottom: "1px dotted #c9c6bd", fontSize: 14.5, color: h.horas === "Cerrado" ? "#a3a6ab" : TINTA, fontVariantNumeric: "tabular-nums" }}>{h.horas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <FaltaEnConfiguracion que="los horarios" p={p} />}
            </div>}
            {conPagos && (
              <div>
                {rotulo("Formas de pago")}
                {a.agencia.pagos.length > 0 && (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {a.agencia.pagos.map(x => (
                      <li key={x} style={{ padding: "7px 12px", borderRadius: 3, border: `1.5px solid ${TINTA}`, fontSize: 14, fontWeight: 700, color: TINTA }}>{NOMBRE_PAGO[x]}</li>
                    ))}
                  </ul>
                )}
                {a.agencia.pagosNota && <p style={{ margin: "12px 0 0", fontSize: 14.5, color: "#3a3f46", lineHeight: 1.65 }}>{a.agencia.pagosNota}</p>}
                {a.enEdicion && <div style={{ marginTop: 14 }}><EditorPagos p={p} /></div>}
              </div>
            )}
          </div>
          {a.conDireccion && (
            <div style={{ minHeight: 300, borderRadius: 4, overflow: "hidden", border: `1px solid ${LINEA}`, background: PAPEL }}>
              <MapaAgencia ubicacion={a.ubicacion} alto={420} radio={0} />
            </div>
          )}
        </div>
      </section>}

      {/* ── La garantía ── */}
      {conGarantia && (
        <section aria-label="Garantía">
          {titulo("Garantía")}
          <div data-ef="sube" style={{ display: "grid", gap: 14, padding: "clamp(18px,2.6vw,26px)", background: PAPEL, border: `1px solid ${LINEA}`, borderLeft: `6px solid ${acento}`, borderRadius: 4, maxWidth: 900 }}>
            {a.agencia.garantia && <p style={{ margin: 0, fontSize: "clamp(16px,1.7vw,19px)", color: TINTA, lineHeight: 1.65, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.agencia.garantia}</p>}
            {a.enEdicion && <EditorGarantia p={p} />}
          </div>
        </section>
      )}

      {/* ── El equipo: fichas horizontales ── */}
      {ver(a.agencia.equipo.length > 0) && (
        <section aria-label="Quién te atiende">
          {titulo("Quién te atiende")}
          {a.agencia.equipo.length > 0 && (
            <div data-ef="grilla" className="agr-equipo">
              {a.agencia.equipo.map((m, i) => {
                const wa = waDeMiembro(m, nombreTienda);
                return (
                  <article key={m.nombre + i} className="agr-persona" style={{ background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, padding: 12, minWidth: 0 }}>
                    <div style={{ position: "relative", aspectRatio: "1/1", borderRadius: 3, overflow: "hidden", background: "#e7e5df" }}>
                      {m.foto
                        // eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña
                        ? <img src={fotoLiviana(m.foto, 320)} alt={m.nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: TITULAR, fontSize: 44, color: "#a3a6ab" }}>{m.nombre.trim()[0]?.toUpperCase()}</span>}
                    </div>
                    <div style={{ minWidth: 0, paddingTop: 2 }}>
                      <p style={{ margin: 0, fontFamily: TITULAR, fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: TINTA, lineHeight: 1.05, overflowWrap: "anywhere" }}>{m.nombre}</p>
                      {m.rol && <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: TENUE, overflowWrap: "anywhere" }}>{m.rol}</p>}
                      {m.bio && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#3a3f46", lineHeight: 1.55, overflowWrap: "anywhere" }}>{m.bio}</p>}
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="agr-btn"
                          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, color: TINTA, fontWeight: 800, fontSize: 14, textDecoration: "none", borderBottom: `3px solid ${acento}` }}>
                          Escribirle por WhatsApp <span aria-hidden="true">→</span>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 16, background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, padding: 18 }}><EditorEquipo p={p} /></div>}
        </section>
      )}

      {/* ── El salón ── */}
      {ver(a.agencia.salon.length > 0) && (
        <section aria-label="El predio">
          {titulo("El predio")}
          {a.agencia.salon.length > 0 && (
            <div data-ef="grilla" className="agr-mosaico">
              {a.agencia.salon.map((f, i) => (
                <button key={f + i} type="button" className="agr-foto" onClick={() => visor.abrir(i)} aria-label={`Ver la foto ${i + 1} del predio en grande`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                  <img src={fotoLiviana(f, i === 0 ? 1200 : 640)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 16, background: PAPEL, border: `1px solid ${LINEA}`, borderRadius: 4, padding: 18 }}><EditorSalon p={p} /></div>}
        </section>
      )}

      <VisorFotos fotos={a.agencia.salon} indice={visor.abierta} onCerrar={visor.cerrar} onMover={visor.mover} titulo={`Predio de ${nombreTienda}`} enPrevia={enPrevia} />
    </div>
  );
}
