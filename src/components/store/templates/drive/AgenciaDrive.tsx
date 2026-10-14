"use client";
/**
 * "La agencia" de Auto Drive (13/10/26, rehecha el mismo día): clara, sobria
 * y ordenada, como la página de una concesionaria seria. Nada de íconos ni
 * emojis (Flavio: "tener íconos es de infantil"): la jerarquía la dan la
 * tipografía, las líneas finas y el acento.
 *
 * Orden: portada con la foto del salón y una ficha blanca encima; la visita
 * (mapa grande con la dirección y el horario en un panel); formas de pago en
 * lista; el equipo en retratos; la garantía; y el salón en mosaico que se abre
 * en grande. Datos, editores y visor compartidos (auto/agencia).
 */
import { EditableZone } from "@/contexts/EditContext";
import { NOMBRE_PAGO } from "@/lib/agencia";
import { fotoLiviana } from "@/lib/foto-liviana";
import {
  useAgencia, useEstadoAhora, MapaAgencia, urlComoLlegar, FaltaEnConfiguracion, waDeMiembro, useVisorFotos, VisorFotos,
  EditorPagos, EditorEquipo, EditorGarantia, EditorSalon, type PaletaAgencia,
} from "@/components/store/auto/agencia/piezasAgencia";

const TINTA = "#0f172a";
const SUAVE = "#64748b";
const LINEA = "#e5e9f0";

export const AGENCIA_DRIVE_CSS = `
  .agd-visita { position:relative; display:grid; grid-template-columns:minmax(0,1fr); border-radius:24px; overflow:hidden; border:1px solid ${LINEA}; background:#fff }
  .agd-panel { padding:clamp(22px,3vw,32px) }
  @media(min-width:900px){
    .agd-visita { min-height:440px }
    .agd-mapa { position:absolute; inset:0 }
    .agd-panel { position:relative; z-index:1; margin:24px; width:360px; background:rgba(255,255,255,0.97); border:1px solid ${LINEA}; border-radius:18px; box-shadow:0 20px 50px rgba(15,23,42,0.14) }
  }
  .agd-pagos { display:grid; grid-template-columns:minmax(0,1fr); }
  @media(min-width:640px){ .agd-pagos { grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:40px } }
  @media(min-width:1000px){ .agd-pagos { grid-template-columns:repeat(3,minmax(0,1fr)) } }
  .agd-equipo { display:grid; gap:20px 14px; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)) }
  @media(min-width:700px){ .agd-equipo { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:24px } }
  .agd-retrato { transition: transform .5s cubic-bezier(.2,.7,.2,1) }
  .agd-persona:hover .agd-retrato { transform: scale(1.03) }
  .agd-mosaico { display:grid; gap:12px; grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-rows:clamp(130px,18vw,220px) }
  @media(min-width:860px){ .agd-mosaico { grid-template-columns:repeat(4,minmax(0,1fr)) } .agd-mosaico > :first-child { grid-column:span 2; grid-row:span 2 } }
  .agd-foto { position:relative; overflow:hidden; border-radius:16px; border:none; padding:0; cursor:zoom-in; background:#e2e8f0 }
  .agd-foto img { transition: transform .7s cubic-bezier(.2,.7,.2,1) }
  .agd-foto:hover img { transform: scale(1.04) }
  .agd-foto:focus-visible { outline:3px solid var(--agd-acento); outline-offset:3px }
  .agd-link { transition: gap .2s }
  .agd-link:hover { gap:10px !important }
  @media (prefers-reduced-motion: reduce) { .agd-retrato, .agd-foto img { transition:none } }
`;

export function AgenciaDrive({ acento, nombreTienda, waLink, todosHref, fotoDeRespaldo, enPrevia }: {
  acento: string;
  nombreTienda: string;
  waLink: string | null;
  todosHref: string;
  fotoDeRespaldo: string;
  enPrevia: boolean;
}) {
  const a = useAgencia();
  const estado = useEstadoAhora(a.ubicacion.horarios);
  const visor = useVisorFotos();
  const p: PaletaAgencia = { tinta: TINTA, tenue: SUAVE, linea: "#e2e8f0", campo: "#fff", acento, sobreAcento: "#fff" };
  const ver = (hay: boolean) => hay || a.enEdicion;
  const fotoPortada = a.agencia.salon[0] ?? fotoDeRespaldo;

  // El encabezado de cada parte: número fino, raya y título. Sin cajas de colores.
  const titulo = (num: number, texto: string, bajada?: string) => (
    <div data-ef="titulo" style={{ margin: "0 0 clamp(20px,3vw,28px)" }}>
      <p style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: acento, fontVariantNumeric: "tabular-nums" }}>
        {String(num).padStart(2, "0")}<span aria-hidden="true" className="ef-raya" style={{ width: 32, height: 1, background: acento }} />
      </p>
      <h2 style={{ margin: 0, fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, color: TINTA, letterSpacing: -0.9, lineHeight: 1.08 }}>{texto}</h2>
      {bajada && <p style={{ margin: "10px 0 0", maxWidth: 560, fontSize: 15.5, color: SUAVE, lineHeight: 1.65 }}>{bajada}</p>}
    </div>
  );
  // Los números siguen el orden de lo que se ve: si falta una parte, no queda un "02" salteado.
  const partes = [
    ver(a.conDireccion || a.horarios.length > 0) && "visita",
    ver(a.agencia.pagos.length > 0 || !!a.agencia.pagosNota) && "pagos",
    ver(a.agencia.equipo.length > 0) && "equipo",
    ver(!!a.agencia.garantia) && "garantia",
    ver(a.agencia.salon.length > 0) && "salon",
  ].filter((x): x is string => !!x);
  const num = (parte: string) => partes.indexOf(parte) + 1;
  const boton = (fondo: string, color: string, borde?: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48, padding: "0 22px", borderRadius: 12,
    background: fondo, color, border: borde ? `1px solid ${borde}` : "none", textDecoration: "none", fontWeight: 700, fontSize: 14.5, letterSpacing: 0.1,
  });

  return (
    <div style={{ display: "grid", gap: "clamp(56px,8vw,104px)", ...({ "--agd-acento": acento } as React.CSSProperties) }}>
      {/* ── Portada ── */}
      <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", minHeight: "clamp(420px,56vw,560px)", display: "flex", alignItems: "flex-end", background: TINTA }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto de la agencia */}
        <img src={fotoLiviana(fotoPortada, 1920)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.1) 55%, rgba(15,23,42,0) 100%)" }} />
        <div data-ef="sube" style={{ position: "relative", margin: "clamp(14px,3vw,32px)", width: "min(100%, 540px)", boxSizing: "border-box" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "clamp(22px,3.4vw,34px)", boxShadow: "0 30px 70px rgba(15,23,42,0.28)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px", marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: acento }}>La agencia</p>
              {estado && (
                <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: estado.abierto ? "#15803d" : SUAVE }}>
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: estado.abierto ? "#22c55e" : "#cbd5e1" }} />{estado.texto}
                </span>
              )}
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px,4.6vw,48px)", fontWeight: 800, color: TINTA, letterSpacing: -1.3, lineHeight: 1.02, overflowWrap: "anywhere" }}>{nombreTienda}</h1>
            {a.conDireccion && <p style={{ margin: "0 0 14px", fontSize: 13.5, color: SUAVE, letterSpacing: 0.2 }}>{a.direccion}</p>}
            <p style={{ margin: "0 0 22px", fontSize: 15.5, color: "#334155", lineHeight: 1.7 }}>
              <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos. Cada unidad que publicamos tiene fotos reales, su ficha técnica y el precio a la vista.</EditableZone>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" style={boton(TINTA, "#fff")}>Escribinos por WhatsApp</a>}
              {a.conDireccion && <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" style={boton("#fff", TINTA, "#cbd5e1")}>Cómo llegar</a>}
            </div>
          </div>
        </div>
      </div>

      {/* ── La visita: el mapa grande, y encima la dirección y el horario ── */}
      {partes.includes("visita") && (
        <section aria-label="Dónde estamos">
          {titulo(num("visita"), "Visitanos", "Vení a ver los vehículos en persona. Coordinamos la prueba por WhatsApp.")}
          <div data-ef="sube">
            <div className="agd-visita">
              <div className="agd-mapa" style={{ minHeight: 280 }}>
                {a.conDireccion ? <MapaAgencia ubicacion={a.ubicacion} alto={440} radio={0} />
                  : <div style={{ padding: 24 }}><FaltaEnConfiguracion que="la dirección" p={p} /></div>}
              </div>
              <div className="agd-panel">
                {a.conDireccion && (
                  <>
                    <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: SUAVE }}>Dirección</p>
                    <p style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: TINTA, lineHeight: 1.5 }}>{a.direccion}</p>
                  </>
                )}
                <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase", color: SUAVE }}>Horario</p>
                {a.horarios.length > 0 ? (
                  <div style={{ display: "grid", marginBottom: a.conDireccion ? 20 : 0 }}>
                    {a.horarios.map((h, i) => (
                      <div key={h.dias} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderTop: i ? `1px solid ${LINEA}` : "none" }}>
                        <span style={{ fontSize: 14.5, color: TINTA, fontWeight: 600 }}>{h.dias}</span>
                        <span style={{ fontSize: 14.5, color: h.horas === "Cerrado" ? "#94a3b8" : "#334155", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{h.horas}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ marginBottom: 16 }}><FaltaEnConfiguracion que="los horarios" p={p} /></div>}
                {a.conDireccion && (
                  <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" style={{ ...boton(acento, "#fff"), width: "100%", boxSizing: "border-box" }}>
                    Cómo llegar
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Formas de pago: lista, sin íconos ── */}
      {partes.includes("pagos") && (
        <section aria-label="Formas de pago">
          {titulo(num("pagos"), "Formas de pago")}
          <div data-ef="sube">
            <div style={{ borderTop: `1px solid ${TINTA}` }}>
              {a.agencia.pagos.length > 0 && (
                <div className="agd-pagos">
                  {a.agencia.pagos.map((x) => (
                    <p key={x} style={{ margin: 0, padding: "18px 0", borderBottom: `1px solid ${LINEA}`, fontSize: 17, fontWeight: 700, color: TINTA, display: "flex", alignItems: "center", gap: 14 }}>
                      <span aria-hidden="true" style={{ width: 18, height: 2, background: acento, flexShrink: 0 }} />{NOMBRE_PAGO[x]}
                    </p>
                  ))}
                </div>
              )}
              {a.agencia.pagosNota && <p style={{ margin: "18px 0 0", fontSize: 15.5, color: "#334155", lineHeight: 1.7, maxWidth: 720 }}>{a.agencia.pagosNota}</p>}
              {a.enEdicion && <div style={{ marginTop: 18 }}><EditorPagos p={p} /></div>}
            </div>
          </div>
        </section>
      )}

      {/* ── El equipo: retratos ── */}
      {partes.includes("equipo") && (
        <section aria-label="El equipo">
          {titulo(num("equipo"), "Quién te atiende", "Personas, no un call center. Escribile directo a quien corresponda.")}
          {a.agencia.equipo.length > 0 && (
            <div data-ef="grilla" className="agd-equipo">
              {a.agencia.equipo.map((m, i) => {
                const wa = waDeMiembro(m, nombreTienda);
                return (
                  <article key={m.nombre + i} className="agd-persona" style={{ minWidth: 0 }}>
                    <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 18, overflow: "hidden", background: "#e2e8f0", marginBottom: 16 }}>
                      {m.foto
                        // eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña
                        ? <img className="agd-retrato" src={fotoLiviana(m.foto, 600)} alt={m.nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 64, fontWeight: 300, color: "#94a3b8", letterSpacing: -2 }}>{m.nombre.trim()[0]?.toUpperCase()}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: TINTA, letterSpacing: -0.3, overflowWrap: "anywhere" }}>{m.nombre}</p>
                    {m.rol && <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: acento, overflowWrap: "anywhere" }}>{m.rol}</p>}
                    {m.bio && <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>{m.bio}</p>}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="agd-link"
                        style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, color: TINTA, fontWeight: 800, fontSize: 14, textDecoration: "none", borderBottom: `2px solid ${acento}` }}>
                        Escribirle por WhatsApp <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 18, padding: 20 }}><EditorEquipo p={p} /></div>}
        </section>
      )}

      {/* ── La garantía ── */}
      {partes.includes("garantia") && (
        <section aria-label="Garantía">
          {titulo(num("garantia"), "Garantía")}
          <div data-ef="sube">
            <div style={{ display: "grid", gap: 16, paddingLeft: "clamp(18px,3vw,28px)", borderLeft: `3px solid ${acento}`, maxWidth: 860 }}>
              {a.agencia.garantia && <p style={{ margin: 0, fontSize: "clamp(17px,1.8vw,20px)", color: TINTA, lineHeight: 1.65, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.agencia.garantia}</p>}
              {a.enEdicion && <EditorGarantia p={p} />}
            </div>
          </div>
        </section>
      )}

      {/* ── El salón: mosaico que se abre en grande ── */}
      {partes.includes("salon") && (
        <section aria-label="El salón">
          {titulo(num("salon"), "El salón")}
          {a.agencia.salon.length > 0 && (
            <div data-ef="grilla" className="agd-mosaico">
              {a.agencia.salon.map((f, i) => (
                <button key={f + i} type="button" className="agd-foto" onClick={() => visor.abrir(i)} aria-label={`Ver la foto ${i + 1} del salón en grande`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                  <img src={fotoLiviana(f, i === 0 ? 1200 : 640)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
          {a.enEdicion && <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 18, padding: 20 }}><EditorSalon p={p} /></div>}
        </section>
      )}

      {/* ── El cierre ── */}
      <div data-ef="sube">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "clamp(24px,4vw,40px)", borderRadius: 24, background: TINTA }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 6px", fontSize: "clamp(22px,2.8vw,30px)", fontWeight: 800, color: "#fff", letterSpacing: -0.6 }}>¿Ya viste algo que te guste?</p>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.7)" }}>Mirá todo el stock con fotos, ficha técnica y precio.</p>
          </div>
          <a href={todosHref} style={boton("#fff", TINTA)}>Ver los vehículos</a>
        </div>
      </div>

      <VisorFotos fotos={a.agencia.salon} indice={visor.abierta} onCerrar={visor.cerrar} onMover={visor.mover} titulo={`Salón de ${nombreTienda}`} enPrevia={enPrevia} />
    </div>
  );
}
