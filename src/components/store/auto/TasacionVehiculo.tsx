"use client";
import { useEffect, useRef, useState } from "react";
import { getContrastColor } from "@/contexts/EditContext";
import { ESTADOS_DEL_USADO, COMBUSTIBLES, TRANSMISIONES, anioMaximo, ANIO_MINIMO, KM_MAXIMO, validarTasacion } from "@/lib/tasaciones";
import { conPuntos, sinPuntos } from "@/lib/monedaVehiculo";

/* "Tasá tu usado" (06/10/26), rehecha el 07/10/26 como paso a paso. El dueño:
   "siento que está hecho así nomás, le falta amor, efectos, más visual".
   Antes eran once campos de una; ahora son cuatro pasos cortos con lo que
   importa a la vista: qué querés hacer, tu vehículo, cómo está y tus datos.

   Lo que se manda y cómo se valida no cambió (ver `lib/tasaciones`): el
   servidor sigue siendo el que manda; acá se adelanta el error del paso. Va en
   la página del vehículo (ligada a ESE auto) y en la portada de los templates. */

type Estado = "idle" | "enviando" | "listo";
type Paso = 1 | 2 | 3 | 4;

const MARCAS_COMUNES = ["Volkswagen", "Toyota", "Ford", "Chevrolet", "Fiat", "Renault", "Peugeot"];

/** La escala del estado, del mejor al peor, con un color que se lee de un vistazo. */
const COLOR_ESTADO: Record<(typeof ESTADOS_DEL_USADO)[number], string> = {
  "Excelente": "#16a34a", "Muy bueno": "#65a30d", "Bueno": "#ca8a04", "Regular": "#ea580c", "Para reparar": "#dc2626",
};

const TINTA = "#141a26";
const SUAVE = "#6b7385";
const RAYA = "#e3e6ec";

const CSS = `
  @keyframes tv-entra { from { opacity:0; transform: translateX(18px) } to { opacity:1; transform:none } }
  @keyframes tv-vuelve { from { opacity:0; transform: translateX(-18px) } to { opacity:1; transform:none } }
  @keyframes tv-tilde { to { stroke-dashoffset: 0 } }
  @keyframes tv-pop { 0% { transform: scale(.6); opacity:0 } 60% { transform: scale(1.08); opacity:1 } 100% { transform: scale(1) } }
  .tv-paso { animation: tv-entra .35s cubic-bezier(.2,.7,.2,1) both }
  .tv-paso.atras { animation-name: tv-vuelve }
  .tv-opcion { transition: border-color .15s, background .15s, transform .15s, box-shadow .15s }
  .tv-opcion:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(20,26,38,.08) }
  .tv-opcion:focus-visible, .tv-campo:focus-visible { outline: 2px solid var(--tv-acento); outline-offset: 2px }
  .tv-campo:focus { border-color: var(--tv-acento) !important }
  .tv-cta { transition: transform .2s, box-shadow .2s }
  .tv-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(20,26,38,.12) }
  @media (prefers-reduced-motion: reduce) { .tv-paso, .tv-opcion, .tv-cta { animation: none !important; transition: none !important } }
`;

function Icono({ cual, color, tam = 22 }: { cual: "cambio" | "plata" | "auto" | "estrella" | "persona"; color: string; tam?: number }) {
  const p = { width: tam, height: tam, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (cual === "cambio") return <svg {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>;
  if (cual === "plata") return <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>;
  if (cual === "auto") return <svg {...p}><path d="M5 17h14M5 17a2 2 0 11-4 0v-5l2-5h16l2 5v5a2 2 0 11-4 0" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>;
  if (cual === "estrella") return <svg {...p}><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" /></svg>;
  return <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

export default function TasacionVehiculo({ storeId, accent, producto, isOwner, isPreview, abiertoDeEntrada = false }: {
  storeId?: string;
  accent: string;
  /** El vehículo de la tienda por el que lo entregaría (desde la página del vehículo). */
  producto?: { id: string; name: string } | null;
  isOwner?: boolean;
  isPreview?: boolean;
  abiertoDeEntrada?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoDeEntrada);
  const [paso, setPaso] = useState<Paso>(1);
  const [haciaAtras, setHaciaAtras] = useState(false);
  const [f, setF] = useState({ marca: "", modelo: "", version: "", anio: "", km: "", combustible: "", transmision: "", estado: "", comentario: "", nombre: "", telefono: "" });
  const [modalidad, setModalidad] = useState<"PERMUTA" | "VENTA" | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);
  const soloMirando = !storeId || isOwner || isPreview;
  const sobreAcento = getContrastColor(accent) === "dark" ? "#111" : "#fff";

  // Al cambiar de paso, el foco va al título: el lector de pantalla anuncia dónde está.
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    titulo.current?.focus();
  }, [paso, estado]);

  const poner = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    // Año: sólo dígitos. Km: con puntos de miles a la vista, se guardan los dígitos.
    poner(k, k === "anio" ? v.replace(/\D/g, "").slice(0, 4) : k === "km" ? sinPuntos(v).slice(0, 7) : v);
  };

  /** Lo que falta en ESTE paso, con las mismas palabras que el servidor. */
  function errorDelPaso(p: Paso): string {
    if (p === 1 && !modalidad) return "Elegí qué querés hacer.";
    if (p === 2) {
      if (!f.marca.trim()) return "Poné la marca de tu auto.";
      if (!f.modelo.trim()) return "Poné el modelo de tu auto.";
      const a = Number(f.anio);
      if (!f.anio || a < ANIO_MINIMO || a > anioMaximo()) return `El año tiene que estar entre ${ANIO_MINIMO} y ${anioMaximo()}.`;
      if (f.km === "" || Number(f.km) > KM_MAXIMO) return "Poné los kilómetros (sólo números).";
    }
    return "";
  }

  const irA = (p: Paso) => { setError(""); setHaciaAtras(p < paso); setPaso(p); };
  const siguiente = () => {
    const e = errorDelPaso(paso);
    if (e) { setError(e); return; }
    irA((paso + 1) as Paso);
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (paso < 4) { siguiente(); return; }
    if (enviando.current) return;
    setError("");
    const v = validarTasacion({ ...f, modalidad: modalidad ?? "PERMUTA" });
    if ("error" in v) { setError(v.error); return; }
    if (soloMirando) { setError("Así lo ven tus clientes. Desde la vista previa no se envía."); return; }
    enviando.current = true;
    setEstado("enviando");
    try {
      const res = await fetch("/api/tasaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...f, modalidad: modalidad ?? "PERMUTA", productoId: producto?.id }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setEstado("idle"); setError(data.error ?? "No se pudo enviar. Probá de nuevo en un momento."); return; }
      setEstado("listo");
    } catch {
      setEstado("idle");
      setError("Sin conexión. Revisá internet y probá de nuevo.");
    } finally {
      enviando.current = false;
    }
  }

  const raiz: React.CSSProperties = { color: TINTA, fontFamily: "inherit", ...({ "--tv-acento": accent } as React.CSSProperties) };
  const campo: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${RAYA}`, borderRadius: 10, minHeight: 48,
    padding: "11px 14px", fontSize: 15, fontFamily: "inherit", color: TINTA, background: "#fff", marginTop: 6,
  };
  const etiqueta: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#3d4556", minWidth: 0 };
  const opcional = <span style={{ color: "#9aa1b0", fontWeight: 400 }}>(opcional)</span>;
  const chip = (activo: boolean): React.CSSProperties => ({
    minHeight: 40, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
    border: `1.5px solid ${activo ? accent : RAYA}`, background: activo ? `${accent}18` : "#fff", color: TINTA,
  });

  /* ── Listo ── */
  if (estado === "listo") {
    return (
      <div style={{ ...raiz, textAlign: "center", padding: "28px 18px", borderRadius: 14, background: "#f6fbf7", border: "1px solid #c9ead3" }}>
        <style>{CSS}</style>
        <svg width={64} height={64} viewBox="0 0 52 52" aria-hidden="true" style={{ animation: "tv-pop .5s cubic-bezier(.2,.7,.2,1) both" }}>
          <circle cx="26" cy="26" r="24" fill="#16a34a" />
          <path d="M15 27l7 7 15-15" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: "tv-tilde .45s .25s ease-out forwards" }} />
        </svg>
        <h3 ref={titulo} tabIndex={-1} role="status" style={{ margin: "14px 0 6px", fontSize: 20, fontWeight: 800, outline: "none" }}>
          ¡Listo, {f.nombre.trim().split(/\s+/)[0]}!
        </h3>
        <p style={{ margin: "0 auto", maxWidth: 380, fontSize: 14, lineHeight: 1.6, color: "#3d4556", overflowWrap: "anywhere" }}>
          Recibimos los datos de tu <strong>{f.marca} {f.modelo}</strong>. Te vamos a contactar al <strong>{f.telefono.trim()}</strong> con una oferta.
          Tené a mano unas fotos: te las vamos a pedir por WhatsApp.
        </p>
      </div>
    );
  }

  /* ── Cerrada: una invitación, no un botón perdido ── */
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="tv-cta"
        style={{ ...raiz, display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", cursor: "pointer",
          background: `linear-gradient(135deg, ${accent}14, ${accent}05), #fff`, border: `1.5px solid ${accent}55`, borderRadius: 14,
          padding: "16px 18px", fontFamily: "inherit" }}>
        <style>{CSS}</style>
        <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: accent, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icono cual="cambio" color={sobreAcento} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>
            {producto ? "¿Tenés un usado? Te lo tomamos" : "Tasá tu usado en 1 minuto"}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: SUAVE, marginTop: 2 }}>Cuatro preguntas cortas y te pasamos una oferta.</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 22, color: accent, fontWeight: 700 }}>→</span>
      </button>
    );
  }

  const NOMBRES: Record<Paso, string> = { 1: "Qué querés hacer", 2: "Tu vehículo", 3: "Cómo está", 4: "Tus datos" };

  return (
    <form onSubmit={enviar} noValidate aria-label="Tasá tu usado"
      style={{ ...raiz, display: "flex", flexDirection: "column", gap: 14, borderRadius: 14, padding: "clamp(16px,3vw,22px)",
        background: "#fff", border: `1px solid ${RAYA}`, boxShadow: "0 1px 2px rgba(20,26,38,.04), 0 12px 32px rgba(20,26,38,.06)" }}>
      <style>{CSS}</style>

      {/* ── Avance ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: accent }}>Tasá tu usado</span>
          <span style={{ fontSize: 12, color: SUAVE }}>Paso {paso} de 4</span>
        </div>
        <ol aria-label="Pasos" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {([1, 2, 3, 4] as Paso[]).map((n) => (
            <li key={n} aria-current={n === paso ? "step" : undefined}>
              <span style={{ display: "block", height: 5, borderRadius: 99, background: n <= paso ? accent : RAYA, transition: "background .3s" }} />
              <span style={{ display: "block", marginTop: 6, fontSize: 11, fontWeight: n === paso ? 700 : 500, color: n === paso ? TINTA : "#9aa1b0",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{NOMBRES[n]}</span>
            </li>
          ))}
        </ol>
      </div>

      <div key={paso} className={`tv-paso${haciaAtras ? " atras" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ── 1. Qué querés hacer ── */}
        {paso === 1 && (
          <>
            <h3 ref={titulo} tabIndex={-1} style={{ margin: 0, fontSize: 19, fontWeight: 800, outline: "none" }}>¿Qué querés hacer con tu usado?</h3>
            {producto && <p style={{ margin: 0, fontSize: 13, color: SUAVE }}>Para el <strong style={{ color: TINTA }}>{producto.name}</strong>.</p>}
            <div role="radiogroup" aria-label="Qué querés hacer" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              {([["PERMUTA", "Entregarlo en parte de pago", "Lo tomamos y pagás la diferencia.", "cambio"], ["VENTA", "Venderlo", "Te lo compramos.", "plata"]] as const).map(([m, t, d, ic]) => {
                const activo = modalidad === m;
                return (
                  <button key={m} type="button" role="radio" aria-checked={activo} className="tv-opcion"
                    onClick={() => { setModalidad(m); setError(""); setHaciaAtras(false); setPaso(2); }}
                    style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: 16, borderRadius: 12, minHeight: 104,
                      border: `1.5px solid ${activo ? accent : RAYA}`, background: activo ? `${accent}12` : "#fff", color: TINTA,
                      display: "flex", flexDirection: "column", gap: 8 }}>
                    <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}1c`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icono cual={ic} color={accent} />
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{t}</span>
                    <span style={{ fontSize: 12.5, color: SUAVE }}>{d}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── 2. Tu vehículo ── */}
        {paso === 2 && (
          <>
            <h3 ref={titulo} tabIndex={-1} style={{ margin: 0, fontSize: 19, fontWeight: 800, outline: "none" }}>Contanos de tu vehículo</h3>
            <div>
              <label htmlFor="tv-marca" style={etiqueta}>Marca</label>
              <div role="group" aria-label="Marcas comunes" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {MARCAS_COMUNES.map((m) => (
                  <button key={m} type="button" className="tv-opcion" aria-pressed={f.marca === m} onClick={() => poner("marca", m)} style={chip(f.marca === m)}>{m}</button>
                ))}
              </div>
              <input id="tv-marca" className="tv-campo" value={f.marca} onChange={cambiar("marca")} maxLength={40} placeholder="U otra: Nissan, Jeep…" style={campo} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <label style={etiqueta}>Modelo<input className="tv-campo" value={f.modelo} onChange={cambiar("modelo")} maxLength={60} placeholder="Ej: Gol Trend" style={campo} /></label>
              <label style={etiqueta}>Versión {opcional}<input className="tv-campo" value={f.version} onChange={cambiar("version")} maxLength={60} placeholder="Ej: 1.6 Highline" style={campo} /></label>
              <label style={etiqueta}>Año<input className="tv-campo" value={f.anio} onChange={cambiar("anio")} inputMode="numeric" placeholder={String(anioMaximo() - 6)} style={campo} /></label>
              <label style={etiqueta}>Kilómetros<input className="tv-campo" value={conPuntos(f.km)} onChange={cambiar("km")} inputMode="numeric" placeholder="Ej: 85.000" style={campo} /></label>
            </div>
          </>
        )}

        {/* ── 3. Cómo está ── */}
        {paso === 3 && (
          <>
            <h3 ref={titulo} tabIndex={-1} style={{ margin: 0, fontSize: 19, fontWeight: 800, outline: "none" }}>¿Cómo está?</h3>
            <div>
              <p style={{ ...etiqueta, margin: 0 }}>Estado general {opcional}</p>
              <div role="radiogroup" aria-label="Estado general" style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                {ESTADOS_DEL_USADO.map((e) => {
                  const activo = f.estado === e;
                  const color = COLOR_ESTADO[e];
                  return (
                    <button key={e} type="button" role="radio" aria-checked={activo} className="tv-opcion" onClick={() => poner("estado", activo ? "" : e)}
                      style={{ cursor: "pointer", fontFamily: "inherit", padding: "10px 4px", borderRadius: 10, minHeight: 64,
                        border: `1.5px solid ${activo ? color : RAYA}`, background: activo ? `${color}14` : "#fff", color: TINTA,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", background: color, boxShadow: activo ? `0 0 0 4px ${color}33` : "none", transition: "box-shadow .2s" }} />
                      <span style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{e}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p style={{ ...etiqueta, margin: 0 }}>Combustible {opcional}</p>
              <div role="radiogroup" aria-label="Combustible" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {COMBUSTIBLES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={f.combustible === c} className="tv-opcion"
                    onClick={() => poner("combustible", f.combustible === c ? "" : c)} style={chip(f.combustible === c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ ...etiqueta, margin: 0 }}>Caja {opcional}</p>
              <div role="radiogroup" aria-label="Caja" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {TRANSMISIONES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={f.transmision === c} className="tv-opcion"
                    onClick={() => poner("transmision", f.transmision === c ? "" : c)} style={chip(f.transmision === c)}>{c}</button>
                ))}
              </div>
            </div>
            <label style={etiqueta}>Algo más que debamos saber {opcional}
              <textarea className="tv-campo" value={f.comentario} onChange={cambiar("comentario")} maxLength={600} rows={3}
                placeholder="Ej: único dueño, service al día, un detalle en el paragolpes" style={{ ...campo, resize: "vertical", minHeight: 84 }} />
            </label>
          </>
        )}

        {/* ── 4. Tus datos ── */}
        {paso === 4 && (
          <>
            <h3 ref={titulo} tabIndex={-1} style={{ margin: 0, fontSize: 19, fontWeight: 800, outline: "none" }}>¿A quién le pasamos la oferta?</h3>
            {/* Lo que va a recibir la agencia, para que lo revise antes de mandar. */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "#f6f7f9", border: `1px solid ${RAYA}` }}>
              <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}1c`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icono cual="auto" color={accent} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, overflowWrap: "anywhere" }}>{f.marca} {f.modelo}{f.version ? ` ${f.version}` : ""}</span>
                <span style={{ display: "block", fontSize: 12.5, color: SUAVE }}>
                  {[f.anio, f.km ? `${conPuntos(f.km)} km` : "", f.estado, modalidad === "VENTA" ? "Para vender" : "En parte de pago"].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button type="button" onClick={() => irA(2)} style={{ background: "none", border: "none", color: accent, fontWeight: 700, fontSize: 12.5, cursor: "pointer", minHeight: 40, fontFamily: "inherit" }}>
                Cambiar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <label style={etiqueta}>Tu nombre<input className="tv-campo" value={f.nombre} onChange={cambiar("nombre")} maxLength={80} autoComplete="name" style={campo} /></label>
              <label style={etiqueta}>Teléfono<input className="tv-campo" value={f.telefono} onChange={cambiar("telefono")} maxLength={30} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-1234" style={campo} /></label>
            </div>
          </>
        )}
      </div>

      {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{error}</p>}

      {/* ── Navegación ── El paso 1 avanza solo al elegir. */}
      {paso > 1 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" onClick={() => irA((paso - 1) as Paso)}
            style={{ minHeight: 48, padding: "0 16px", borderRadius: 10, border: `1.5px solid ${RAYA}`, background: "#fff", color: TINTA, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            ← Atrás
          </button>
          <button type="submit" disabled={estado === "enviando"}
            style={{ flex: 1, minHeight: 48, padding: "0 18px", borderRadius: 10, border: "none", background: accent, color: sobreAcento,
              fontWeight: 800, fontSize: 15, cursor: estado === "enviando" ? "default" : "pointer", opacity: estado === "enviando" ? 0.7 : 1, fontFamily: "inherit" }}>
            {paso < 4 ? "Seguir" : estado === "enviando" ? "Enviando…" : "Pedir tasación"}
          </button>
        </div>
      )}
    </form>
  );
}
