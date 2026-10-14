"use client";
/**
 * "La agencia" de Auto Drive (13/10/26): claro y amable, como un recorrido
 * numerado. Una portada con la foto del salón y una tarjeta blanca encima; y
 * después los pasos: 01 Visitanos (mapa y horario lado a lado), 02 Pagá como
 * te quede cómodo, 03 Te atiende, 04 Comprás con garantía, y la galería. El
 * lenguaje de Drive: tarjetas blancas, bordes suaves, todo bien redondeado.
 * Datos y editores compartidos (auto/agencia).
 */
import { EditableZone } from "@/contexts/EditContext";
import { NOMBRE_PAGO, type Pago } from "@/lib/agencia";
import { fotoLiviana } from "@/lib/foto-liviana";
import { WaIcon } from "@/components/store/auto/AutoVehicleShared";
import {
  useAgencia, useEstadoAhora, MapaAgencia, urlComoLlegar, FaltaEnConfiguracion, waDeMiembro,
  EditorPagos, EditorEquipo, EditorGarantia, EditorSalon, type PaletaAgencia,
} from "@/components/store/auto/agencia/piezasAgencia";

export const AGENCIA_DRIVE_CSS = `
  .agd-visita { display:grid; grid-template-columns:minmax(0,1fr); gap:16px }
  @media(min-width:860px){ .agd-visita { grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) } }
  .agd-equipo { display:grid; gap:14px; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)) }
  .agd-salon { display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px }
  .agd-salon > * { flex:0 0 min(78%,360px); width:min(78%,360px); scroll-snap-align:start }
`;

const ICONO_PAGO: Record<Pago, string> = { contado: "💵", transferencia: "🏦", tarjeta: "💳", financiacion: "📄", permuta: "🔁", dolares: "💲" };

export function AgenciaDrive({ acento, nombreTienda, waLink, todosHref, fotoDeRespaldo }: {
  acento: string;
  nombreTienda: string;
  waLink: string | null;
  todosHref: string;
  fotoDeRespaldo: string;
}) {
  const a = useAgencia();
  const estado = useEstadoAhora(a.ubicacion.horarios);
  const p: PaletaAgencia = { tinta: "#0f172a", tenue: "#64748b", linea: "#e2e8f0", campo: "#fff", acento, sobreAcento: "#fff" };
  const ver = (hay: boolean) => hay || a.enEdicion;
  const tarjeta: React.CSSProperties = { background: "#fff", border: "1px solid #e8ebf0", borderRadius: 22, padding: "clamp(18px,3vw,28px)", boxShadow: "0 10px 30px rgba(15,23,42,0.05)", minWidth: 0 };
  let n = 0;
  const paso = (titulo: string) => {
    n += 1;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 0 18px" }}>
        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `${acento}1a`, color: acento, fontWeight: 900, fontSize: 14 }}>{String(n).padStart(2, "0")}</span>
        <h2 style={{ margin: 0, fontSize: "clamp(22px,3vw,30px)", fontWeight: 900, color: "#0f172a", letterSpacing: -0.6 }}>{titulo}</h2>
      </div>
    );
  };
  const fotoPortada = a.agencia.salon[0] ?? fotoDeRespaldo;

  return (
    <div style={{ display: "grid", gap: "clamp(40px,6vw,72px)" }}>
      {/* ── Portada: la foto del salón y la tarjeta encima ── */}
      <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", minHeight: "clamp(360px,52vw,520px)", display: "flex", alignItems: "flex-end",
        backgroundImage: `url(${fotoLiviana(fotoPortada, 1600)})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.55), rgba(15,23,42,0) 60%)" }} />
        <div style={{ ...tarjeta, position: "relative", margin: "clamp(14px,3vw,28px)", maxWidth: 560, boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: acento }}>La agencia</p>
            {estado && (
              <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                background: estado.abierto ? "#dcfce7" : "#f1f5f9", color: estado.abierto ? "#15803d" : "#475569" }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />{estado.texto}
              </span>
            )}
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px,4.4vw,46px)", fontWeight: 900, color: "#0f172a", letterSpacing: -1.2, lineHeight: 1.04, overflowWrap: "anywhere" }}>{nombreTienda}</h1>
          {a.conDireccion && <p style={{ margin: "0 0 12px", fontSize: 15, color: "#334155", fontWeight: 600 }}>📍 {a.direccion}</p>}
          <p style={{ margin: "0 0 18px", fontSize: 15, color: p.tenue, lineHeight: 1.7 }}>
            <EditableZone field="nosotrosP1" label="Párrafo 1">Somos especialistas en compra y venta de vehículos. Cada unidad que publicamos tiene fotos reales, su ficha técnica y el precio a la vista.</EditableZone>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 20px", borderRadius: 14, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
                <WaIcon size={17} /> Escribinos
              </a>
            )}
            {a.conDireccion && (
              <a href={urlComoLlegar(a.ubicacion)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 20px", borderRadius: 14, background: acento, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
                Cómo llegar
              </a>
            )}
            <a href={todosHref} style={{ display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 20px", borderRadius: 14, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontWeight: 800, fontSize: 14.5 }}>
              Ver vehículos
            </a>
          </div>
        </div>
      </div>

      {/* ── 01 Visitanos ── */}
      {ver(a.conDireccion || a.horarios.length > 0) && (
        <div>
          {paso("Visitanos")}
          <div className="agd-visita">
            <div style={{ ...tarjeta, padding: a.conDireccion ? 8 : tarjeta.padding }}>
              {a.conDireccion ? <MapaAgencia ubicacion={a.ubicacion} alto={300} radio={16} /> : <FaltaEnConfiguracion que="la dirección" p={p} />}
            </div>
            <div style={tarjeta}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: p.tenue }}>Horarios</p>
              {a.horarios.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {a.horarios.map((h) => (
                    <div key={h.dias} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{h.dias}</span>
                      <span style={{ color: h.horas === "Cerrado" ? "#94a3b8" : "#334155", textAlign: "right" }}>{h.horas}</span>
                    </div>
                  ))}
                </div>
              ) : <FaltaEnConfiguracion que="los horarios" p={p} />}
            </div>
          </div>
        </div>
      )}

      {/* ── 02 Pagá como te quede cómodo ── */}
      {ver(a.agencia.pagos.length > 0 || !!a.agencia.pagosNota) && (
        <div>
          {paso("Pagá como te quede cómodo")}
          <div style={{ ...tarjeta, display: "grid", gap: 14 }}>
            {a.agencia.pagos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {a.agencia.pagos.map((x) => (
                  <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e8ebf0", fontWeight: 800, color: "#0f172a", fontSize: 14.5 }}>
                    <span aria-hidden="true">{ICONO_PAGO[x]}</span>{NOMBRE_PAGO[x]}
                  </span>
                ))}
              </div>
            )}
            {a.agencia.pagosNota && <p style={{ margin: 0, fontSize: 15, color: "#334155", lineHeight: 1.65 }}>{a.agencia.pagosNota}</p>}
            {a.enEdicion && <EditorPagos p={p} />}
          </div>
        </div>
      )}

      {/* ── 03 Te atiende ── */}
      {ver(a.agencia.equipo.length > 0) && (
        <div>
          {paso("Te atiende")}
          {a.agencia.equipo.length > 0 && (
            <div className="agd-equipo">
              {a.agencia.equipo.map((m, i) => {
                const wa = waDeMiembro(m, nombreTienda);
                return (
                  <div key={m.nombre + i} style={{ ...tarjeta, textAlign: "center", display: "grid", justifyItems: "center", gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña */}
                    {m.foto ? <img src={fotoLiviana(m.foto, 200)} alt="" style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover" }} />
                      : <span aria-hidden="true" style={{ width: 84, height: 84, borderRadius: "50%", display: "grid", placeItems: "center", background: `${acento}1a`, color: acento, fontWeight: 900, fontSize: 30 }}>{m.nombre.trim()[0]?.toUpperCase()}</span>}
                    <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: "#0f172a", overflowWrap: "anywhere" }}>{m.nombre}</p>
                    {m.rol && <p style={{ margin: 0, fontSize: 13.5, color: p.tenue, overflowWrap: "anywhere" }}>{m.rol}</p>}
                    {m.bio && <p style={{ margin: "4px 0 0", fontSize: 14, color: "#334155", lineHeight: 1.55, overflowWrap: "anywhere" }}>{m.bio}</p>}
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 16px", borderRadius: 12, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13.5 }}><WaIcon size={15} /> Escribile</a>}
                  </div>
                );
              })}
            </div>
          )}
          {a.enEdicion && <div style={{ ...tarjeta, marginTop: 14 }}><EditorEquipo p={p} /></div>}
        </div>
      )}

      {/* ── 04 Comprás con garantía ── */}
      {ver(!!a.agencia.garantia) && (
        <div>
          {paso("Comprás con garantía")}
          <div style={{ ...tarjeta, display: "grid", gap: 12, borderLeft: `4px solid ${acento}` }}>
            {a.agencia.garantia && <p style={{ margin: 0, fontSize: 16, color: "#334155", lineHeight: 1.75, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.agencia.garantia}</p>}
            {a.enEdicion && <EditorGarantia p={p} />}
          </div>
        </div>
      )}

      {/* ── La galería ── */}
      {ver(a.agencia.salon.length > 0) && (
        <div>
          {paso("Conocé el salón")}
          {a.agencia.salon.length > 0 && (
            <div className="agd-salon">
              {a.agencia.salon.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- foto subida por la dueña
                <img key={f + i} src={fotoLiviana(f, 800)} alt={`Salón de ${nombreTienda}, foto ${i + 1}`} loading="lazy"
                  style={{ aspectRatio: "4/3", objectFit: "cover", borderRadius: 20, display: "block" }} />
              ))}
            </div>
          )}
          {a.enEdicion && <div style={{ ...tarjeta, marginTop: 14 }}><EditorSalon p={p} /></div>}
        </div>
      )}
    </div>
  );
}
