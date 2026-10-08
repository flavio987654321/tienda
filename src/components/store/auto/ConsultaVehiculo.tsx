"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import { afiliadoDeEstaTienda } from "@/lib/atribucion-afiliado";
import { linkWhatsApp } from "@/lib/whatsappTienda";
import CampoTelefono from "@/components/CampoTelefono";
import CampoTrampa from "@/components/store/auto/CampoTrampa";
import { CAMPO_TRAMPA } from "@/lib/trampaBots";
import { errorDeTelefono } from "@/lib/caracteristicas";
import { getContrastColor } from "@/contexts/EditContext";
import { useTurnstile } from "@/components/Turnstile";
import { useSessionDraft } from "@/hooks/useSessionDraft";

/* ══════════════════════════════════════════════════════════════════════════
   CÓMO CONSULTA EL COMPRADOR POR UN VEHÍCULO (06/10/26)
   ══════════════════════════════════════════════════════════════════════════

   En autos no hay carrito: la consulta ES la venta. Antes había un solo
   camino, el botón de WhatsApp, que además registraba la consulta sin ningún
   dato —en el panel salían filas "Sin nombre" que no se podían contestar—, y
   si la tienda no tenía WhatsApp no había forma de consultar.

   Ahora (decisión del dueño, ver AUDITORIA-AUTOS-OCT26.md):
   - WhatsApp sigue siendo el botón principal. El mensaje lleva la unidad, el
     precio y el link, para que la concesionaria sepa de cuál le hablan.
   - Abajo, "Dejá tus datos y te contactamos": nombre y teléfono. Si la persona
     ya tocó WhatsApp, el formulario COMPLETA esa consulta (`leadId`) en vez de
     crear otra.
   - Sin WhatsApp (o con el número de muestra), queda sólo el formulario,
     abierto. */

const CLAVE = (id: string) => `consulta-vehiculo:${id}`;
const BORRADOR_VACIO = { nombre: "", telefono: "", mensaje: "" };
const hayDatos = (f: typeof BORRADOR_VACIO) => !!(f.nombre || f.telefono || f.mensaje);
const VIGENCIA_MS = 30 * 60_000;

/** La consulta que ya abrió este navegador para este vehículo (si es reciente). */
function consultaPrevia(productId: string): string | null {
  try {
    const raw = sessionStorage.getItem(CLAVE(productId));
    if (!raw) return null;
    const { id, t } = JSON.parse(raw) as { id: string; t: number };
    return Date.now() - t < VIGENCIA_MS ? id : null;
  } catch { return null; }
}
function recordarConsulta(productId: string, id: string) {
  try { sessionStorage.setItem(CLAVE(productId), JSON.stringify({ id, t: Date.now() })); } catch { /* sin storage */ }
}

type Estado = "idle" | "enviando" | "listo";

/** La dirección no cambia mientras se mira la página: nada que escuchar. */
const sinCambios = () => () => {};

export default function ConsultaVehiculo({ product, accent, precioTexto, whatsappNumber, whatsappEnabled, storeId, isOwner, isPreview, año }: {
  product: StorefrontProduct;
  accent: string;
  /** El precio ya formateado (lo arma el modal con `fmtPrice`). */
  precioTexto: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  storeId?: string;
  isOwner?: boolean;
  isPreview?: boolean;
  año?: string;
}) {
  /* El link va a la página del vehículo (07/10/26), que es donde está esto: la
     dirección actual sin lo de después del "?". Se arma con la dirección real
     para que sirva también en un dominio propio. */
  const link = useSyncExternalStore(sinCambios, () => `${window.location.origin}${window.location.pathname}`, () => "");
  const texto = `Hola! Me interesa el ${product.name}${año ? ` (${año})` : ""} de ${precioTexto}. ¿Está disponible?${link ? `\n${link}` : ""}`;
  const waHref = whatsappEnabled ? linkWhatsApp(whatsappNumber, texto) : null;

  const [abierto, setAbierto] = useState(!waHref);
  const borrador = useSessionDraft(
    storeId && !isOwner && !isPreview ? `tienda:consulta-auto:${product.id}` : null,
    BORRADOR_VACIO,
    hayDatos,
  );
  const { nombre, telefono, mensaje } = borrador.value;
  const setNombre = (nombre: string) => borrador.setValue((f) => ({ ...f, nombre }));
  const setTelefono = (telefono: string) => borrador.setValue((f) => ({ ...f, telefono }));
  const setMensaje = (mensaje: string) => borrador.setValue((f) => ({ ...f, mensaje }));
  const [trampa, setTrampa] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const registrando = useRef(false);
  const captcha = useTurnstile("consulta-auto");
  const soloMirando = !storeId || isOwner || isPreview;

  const mostrarFormulario = abierto || (borrador.loaded && hayDatos(borrador.value));

  /* El toque de WhatsApp anota la consulta (sin datos: el chat sigue afuera).
     Una sola vez por vehículo cada 30 minutos: tocarlo dos veces no son dos
     interesados. */
  function registrarToqueWhatsApp() {
    /* Dos toques seguidos (antes de que vuelva la respuesta) no son dos consultas. */
    if (soloMirando || registrando.current || consultaPrevia(product.id)) return;
    registrando.current = true;
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, productId: product.id, affiliateId: afiliadoDeEstaTienda() ?? undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { leadId?: string } | null) => { if (d?.leadId) recordarConsulta(product.id, d.leadId); })
      .catch(() => {})
      .finally(() => { registrando.current = false; });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    setError("");
    if (!nombre.trim()) { setError("Escribí tu nombre."); return; }
    const errTel = errorDeTelefono(telefono);
    if (errTel) { setError(`Revisá el teléfono: ${errTel.charAt(0).toLowerCase()}${errTel.slice(1)}`); return; }
    if (soloMirando) { setError("Así lo ven tus clientes. Desde la vista previa no se envía."); return; }
    if (!captcha.ready) { setError("Completá la verificación para continuar."); return; }
    enviando.current = true;
    setEstado("enviando");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId, productId: product.id, affiliateId: afiliadoDeEstaTienda() ?? undefined,
          leadId: consultaPrevia(product.id) ?? undefined,
          customerName: nombre, customerPhone: telefono, customerMessage: mensaje, turnstileToken: captcha.token, [CAMPO_TRAMPA]: trampa,
        }),
      });
      const data = await res.json().catch(() => ({})) as { leadId?: string; error?: string };
      if (!res.ok) {
        setEstado("idle");
        setError(data.error ?? "No se pudo enviar. Probá de nuevo en un momento.");
        return;
      }
      if (data.leadId) recordarConsulta(product.id, data.leadId);
      borrador.clearDraft();
      setEstado("listo");
    } catch {
      setEstado("idle");
      setError("Sin conexión. Revisá internet y probá de nuevo.");
    } finally {
      enviando.current = false;
      captcha.reset();
    }
  }

  const campo: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: "1px solid #dcdcdc", borderRadius: 6,
    padding: "11px 12px", fontSize: 14, fontFamily: "inherit", color: "#1a2744", background: "#fff",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={registrarToqueWhatsApp}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "#25d366", color: "white", textDecoration: "none",
            padding: "14px 20px", borderRadius: 6, fontWeight: 700, fontSize: 14,
            boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 01-1.44-5.01c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 016.67 2.77 9.37 9.37 0 012.76 6.67c0 5.2-4.23 9.43-9.44 9.43M20.08 3.9A11.3 11.3 0 0012.05.58C5.8.58.7 5.67.7 11.93c0 2 .52 3.95 1.52 5.67L.6 23.42l5.95-1.56a11.3 11.3 0 005.42 1.38h.01c6.25 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02"/></svg>
          Consultar por WhatsApp
        </a>
      )}

      {estado === "listo" ? (
        <div role="status" style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "#166534", lineHeight: 1.5, overflowWrap: "anywhere" }}>
          <strong>¡Listo, {nombre.trim().split(/\s+/)[0]}!</strong> Recibimos tu consulta y te vamos a contactar al {telefono.trim()}.
        </div>
      ) : !mostrarFormulario ? (
        <button type="button" onClick={() => setAbierto(true)}
          style={{ background: "none", border: "1px solid #dcdcdc", borderRadius: 6, padding: "12px 16px", minHeight: 44,
            fontSize: 13, fontWeight: 600, color: "#1a2744", cursor: "pointer", fontFamily: "inherit" }}>
          ¿Preferís que te llamen? Dejá tus datos
        </button>
      ) : (
        <form onSubmit={enviar} noValidate style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, border: "1px solid #ececec", borderRadius: 8, padding: 14, background: "#fafafa" }}>
          <CampoTrampa value={trampa} onChange={setTrampa} />
          {captcha.widget}
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#1a2744" }}>
            {waHref ? "Dejá tus datos y te contactamos" : "Consultá por este vehículo"}
          </p>
          <label style={{ fontSize: 12, color: "#555" }}>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="name" required style={{ ...campo, marginTop: 4 }} />
          </label>
          <div style={{ fontSize: 12, color: "#555" }}>
            <label htmlFor={`cv-tel-${product.id}`}>Teléfono</label>
            <div style={{ marginTop: 4 }}>
              <CampoTelefono id={`cv-tel-${product.id}`} value={telefono} onChange={setTelefono} required estiloCampo={campo} acento={accent} />
            </div>
          </div>
          <label style={{ fontSize: 12, color: "#555" }}>
            Mensaje <span style={{ color: "#999" }}>(opcional)</span>
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={1000} rows={2} placeholder="Ej: ¿Aceptan permuta? ¿Tiene financiación?" style={{ ...campo, marginTop: 4, resize: "vertical" }} />
          </label>
          {error && <div role="alert" style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>
            <p style={{ margin: "0 0 5px" }}>{error} Tus datos se conservaron; podés reintentar.</p>
            <button type="button" onClick={() => { borrador.clearDraft(); borrador.setValue(BORRADOR_VACIO); setError(""); }}
              style={{ border: 0, padding: 0, background: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
              Borrar los datos guardados
            </button>
          </div>}
          <button type="submit" disabled={estado === "enviando" || !captcha.ready}
            style={{ background: accent, color: getContrastColor(accent) === "dark" ? "#111" : "#fff", border: "none", borderRadius: 6, padding: "12px 16px", minHeight: 44,
              fontSize: 14, fontWeight: 700, cursor: estado === "enviando" ? "default" : "pointer", opacity: estado === "enviando" ? 0.7 : 1, fontFamily: "inherit" }}>
            {estado === "enviando" ? "Enviando…" : error ? "Reintentar consulta" : "Enviar consulta"}
          </button>
        </form>
      )}
    </div>
  );
}

