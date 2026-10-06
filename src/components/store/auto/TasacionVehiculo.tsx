"use client";
import { useRef, useState } from "react";
import { getContrastColor } from "@/contexts/EditContext";
import { ESTADOS_DEL_USADO, COMBUSTIBLES, TRANSMISIONES, anioMaximo, validarTasacion } from "@/lib/tasaciones";

/* "Tasá tu usado" (06/10/26). Va en el modal del vehículo —"¿tenés un usado
   para entregar?", ligado a ESE auto— y suelto en /vehiculos. Lo que llega y
   por qué no hay fotos, en `lib/tasaciones`. Mismo estilo que la consulta. */

type Estado = "idle" | "enviando" | "listo";

export default function TasacionVehiculo({ storeId, accent, producto, isOwner, isPreview, abiertoDeEntrada = false }: {
  storeId?: string;
  accent: string;
  /** El vehículo de la tienda por el que lo entregaría (desde el modal). */
  producto?: { id: string; name: string } | null;
  isOwner?: boolean;
  isPreview?: boolean;
  abiertoDeEntrada?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoDeEntrada);
  const [f, setF] = useState({ marca: "", modelo: "", version: "", anio: "", km: "", combustible: "", transmision: "", estado: "", comentario: "", nombre: "", telefono: "" });
  const [modalidad, setModalidad] = useState<"PERMUTA" | "VENTA">("PERMUTA");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const soloMirando = !storeId || isOwner || isPreview;
  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    /* Año y km: primero se limpia y DESPUÉS se recorta. Con `maxLength` en el
       campo, "20a15" (o "2015 " pegado) se cortaba antes de limpiar y quedaba "201". */
    setF((p) => ({ ...p, [k]: k === "anio" ? e.target.value.replace(/\D/g, "").slice(0, 4)
      : k === "km" ? e.target.value.replace(/\D/g, "").slice(0, 7) : e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    setError("");
    // La misma validación que el servidor: el error aparece antes de mandar.
    const v = validarTasacion({ ...f, modalidad });
    if ("error" in v) { setError(v.error); return; }
    if (soloMirando) { setError("Así lo ven tus clientes. Desde la vista previa no se envía."); return; }
    enviando.current = true;
    setEstado("enviando");
    try {
      const res = await fetch("/api/tasaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...f, modalidad, productoId: producto?.id }),
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

  const campo: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: "1px solid #dcdcdc", borderRadius: 6,
    padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: "#1a2744", background: "#fff", outline: "none", marginTop: 4,
  };
  const etiqueta: React.CSSProperties = { fontSize: 12, color: "#555", minWidth: 0 };
  const opcional = <span style={{ color: "#999" }}>(opcional)</span>;
  const dos: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };

  if (estado === "listo") {
    return (
      <div role="status" style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
        <strong>¡Listo, {f.nombre.trim().split(/\s+/)[0]}!</strong> Recibimos los datos de tu {f.marca} {f.modelo}. Te vamos a contactar al {f.telefono.trim()} con una oferta. Tené a mano unas fotos del auto: te las vamos a pedir por WhatsApp.
      </div>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "none",
          border: "1px dashed #c9ced8", borderRadius: 6, padding: "12px 16px", minHeight: 44,
          fontSize: 13, fontWeight: 600, color: "#1a2744", cursor: "pointer", fontFamily: "inherit" }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
        {producto ? "¿Tenés un usado para entregar? Tasalo" : "Tasá tu usado"}
      </button>
    );
  }

  return (
    <form onSubmit={enviar} noValidate style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #ececec", borderRadius: 8, padding: 14, background: "#fafafa" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a2744" }}>Tasá tu usado</p>
      <p style={{ margin: "0 0 2px", fontSize: 12, color: "#777", lineHeight: 1.45 }}>
        {producto ? <>Contanos cómo es tu auto y te pasamos cuánto te lo tomamos por el <strong>{producto.name}</strong>.</> : "Contanos cómo es tu auto y te pasamos una oferta."}
      </p>

      <div role="radiogroup" aria-label="Qué querés hacer" style={dos}>
        {(["PERMUTA", "VENTA"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={modalidad === m} onClick={() => setModalidad(m)}
            style={{ border: `1.5px solid ${modalidad === m ? "#1a2744" : "#dcdcdc"}`, background: modalidad === m ? "#1a2744" : "#fff",
              color: modalidad === m ? "#fff" : "#444", borderRadius: 6, padding: "9px 8px", minHeight: 40, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {m === "PERMUTA" ? "Entregarlo en parte de pago" : "Sólo venderlo"}
          </button>
        ))}
      </div>

      <div style={dos}>
        <label style={etiqueta}>Marca<input value={f.marca} onChange={cambiar("marca")} maxLength={40} placeholder="Ej: Volkswagen" style={campo} /></label>
        <label style={etiqueta}>Modelo<input value={f.modelo} onChange={cambiar("modelo")} maxLength={60} placeholder="Ej: Gol Trend" style={campo} /></label>
      </div>
      <label style={etiqueta}>Versión {opcional}<input value={f.version} onChange={cambiar("version")} maxLength={60} placeholder="Ej: 1.6 Highline" style={campo} /></label>
      <div style={dos}>
        <label style={etiqueta}>Año<input value={f.anio} onChange={cambiar("anio")} inputMode="numeric" placeholder={String(anioMaximo() - 6)} style={campo} /></label>
        <label style={etiqueta}>Kilómetros<input value={f.km} onChange={cambiar("km")} inputMode="numeric" placeholder="Ej: 85000" style={campo} /></label>
      </div>
      <div style={dos}>
        <label style={etiqueta}>Combustible {opcional}
          <select value={f.combustible} onChange={cambiar("combustible")} style={campo}>
            <option value="">—</option>{COMBUSTIBLES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={etiqueta}>Caja {opcional}
          <select value={f.transmision} onChange={cambiar("transmision")} style={campo}>
            <option value="">—</option>{TRANSMISIONES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <label style={etiqueta}>Estado general {opcional}
        <select value={f.estado} onChange={cambiar("estado")} style={campo}>
          <option value="">—</option>{ESTADOS_DEL_USADO.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label style={etiqueta}>Algo más que debamos saber {opcional}
        <textarea value={f.comentario} onChange={cambiar("comentario")} maxLength={600} rows={2} placeholder="Ej: único dueño, service al día, un detalle en el paragolpes" style={{ ...campo, resize: "vertical" }} />
      </label>
      <div style={dos}>
        <label style={etiqueta}>Tu nombre<input value={f.nombre} onChange={cambiar("nombre")} maxLength={80} autoComplete="name" style={campo} /></label>
        <label style={etiqueta}>Teléfono<input value={f.telefono} onChange={cambiar("telefono")} maxLength={30} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-1234" style={campo} /></label>
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>{error}</p>}
      <button type="submit" disabled={estado === "enviando"}
        style={{ background: accent, color: getContrastColor(accent) === "dark" ? "#111" : "#fff", border: "none", borderRadius: 6, padding: "12px 16px", minHeight: 44,
          fontSize: 14, fontWeight: 700, cursor: estado === "enviando" ? "default" : "pointer", opacity: estado === "enviando" ? 0.7 : 1, fontFamily: "inherit" }}>
        {estado === "enviando" ? "Enviando…" : "Pedir tasación"}
      </button>
    </form>
  );
}
