"use client";
import { useRef, useState } from "react";
import { getContrastColor } from "@/contexts/EditContext";
import { CATEGORIAS_BUSQUEDA, validarBusqueda } from "@/lib/busquedas";

/* "Avisame si entra" (06/10/26): la persona deja qué busca y su teléfono, y
   la concesionaria le avisa cuando entra. Va en /vehiculos (botón arriba y
   cuando la búsqueda no encuentra nada). Ver `lib/busquedas`. Mismo estilo que
   la consulta y la tasación. */

type Estado = "idle" | "enviando" | "listo";

export default function BusquedaVehiculo({ storeId, accent, isOwner, isPreview, marcaInicial = "" }: {
  storeId?: string;
  accent: string;
  isOwner?: boolean;
  isPreview?: boolean;
  /** Lo que estaba escrito en el buscador, para no hacérselo tipear de nuevo. */
  marcaInicial?: string;
}) {
  const [f, setF] = useState({ categoria: "", marca: marcaInicial.slice(0, 40), modelo: "", anioDesde: "", precioHasta: "", nombre: "", telefono: "" });
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const soloMirando = !storeId || isOwner || isPreview;
  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: k === "anioDesde" ? e.target.value.replace(/\D/g, "").slice(0, 4) : k === "precioHasta" ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    setError("");
    const v = validarBusqueda({ ...f, categoria: f.categoria || null });
    if ("error" in v) { setError(v.error); return; }
    if (soloMirando) { setError("Así lo ven tus clientes. Desde la vista previa no se envía."); return; }
    enviando.current = true;
    setEstado("enviando");
    try {
      const res = await fetch("/api/busquedas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...f, categoria: f.categoria || null }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setEstado("idle"); setError(data.error ?? "No se pudo guardar. Probá de nuevo en un momento."); return; }
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
    padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: "#1a2744", background: "#fff", marginTop: 4,
  };
  const etiqueta: React.CSSProperties = { fontSize: 12, color: "#555", minWidth: 0 };
  const opcional = <span style={{ color: "#999" }}>(opcional)</span>;
  const dos: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };

  if (estado === "listo") {
    return (
      <div role="status" style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "#166534", lineHeight: 1.5, overflowWrap: "anywhere" }}>
        <strong>¡Listo, {f.nombre.trim().split(/\s+/)[0]}!</strong> Cuando entre algo así te avisamos al {f.telefono.trim()}. La búsqueda queda guardada 90 días.
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #ececec", borderRadius: 8, padding: 14, background: "#fafafa" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a2744" }}>Avisame si entra</p>
      <p style={{ margin: "0 0 2px", fontSize: 12, color: "#777", lineHeight: 1.45 }}>Contanos qué buscás y te escribimos apenas entre uno. No hace falta completar todo.</p>
      <label style={etiqueta}>Tipo {opcional}
        <select value={f.categoria} onChange={cambiar("categoria")} style={campo}>
          <option value="">Cualquiera</option>{CATEGORIAS_BUSQUEDA.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <div style={dos}>
        <label style={etiqueta}>Marca<input value={f.marca} onChange={cambiar("marca")} maxLength={40} placeholder="Ej: Toyota" style={campo} /></label>
        <label style={etiqueta}>Modelo<input value={f.modelo} onChange={cambiar("modelo")} maxLength={60} placeholder="Ej: Hilux" style={campo} /></label>
      </div>
      <div style={dos}>
        <label style={etiqueta}>Año desde {opcional}<input value={f.anioDesde} onChange={cambiar("anioDesde")} inputMode="numeric" placeholder="Ej: 2018" style={campo} /></label>
        <label style={etiqueta}>Precio hasta {opcional}<input value={f.precioHasta} onChange={cambiar("precioHasta")} inputMode="numeric" placeholder="Ej: 25000000" style={campo} /></label>
      </div>
      <div style={dos}>
        <label style={etiqueta}>Tu nombre<input value={f.nombre} onChange={cambiar("nombre")} maxLength={80} autoComplete="name" style={campo} /></label>
        <label style={etiqueta}>Teléfono<input value={f.telefono} onChange={cambiar("telefono")} maxLength={30} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 5555-1234" style={campo} /></label>
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>{error}</p>}
      <button type="submit" disabled={estado === "enviando"}
        style={{ background: accent, color: getContrastColor(accent) === "dark" ? "#111" : "#fff", border: "none", borderRadius: 6, padding: "12px 16px", minHeight: 44,
          fontSize: 14, fontWeight: 700, cursor: estado === "enviando" ? "default" : "pointer", opacity: estado === "enviando" ? 0.7 : 1, fontFamily: "inherit" }}>
        {estado === "enviando" ? "Guardando…" : "Avisame"}
      </button>
    </form>
  );
}
