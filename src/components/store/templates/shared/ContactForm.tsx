"use client";
import { useContext, useState } from "react";
import { useTurnstile } from "@/components/Turnstile";
import { NOMBRE_MAX, EMAIL_MAX, MENSAJE_MAX } from "@/lib/contacto-limites";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";

export type ContactFormTheme = {
  showLabels?: boolean;
  labelStyle?: React.CSSProperties;
  twoColTop?: boolean; // nombre + email lado a lado en vez de apilados
  inputBg?: string;
  inputBorderColor?: string;
  focusBorderColor?: string; // si se define, el borde cambia de color al enfocar
  inputPadding?: string;
  fontSize?: number;
  gap?: number;
  intro?: React.ReactNode; // texto/kicker sobre los campos
  placeholders?: { nombre: string; email: string; mensaje: string };
  buttonLabel?: string;
  buttonStyle?: React.CSSProperties;
  buttonHoverStyle?: React.CSSProperties;
  buttonFullWidth?: boolean; // default true (por flexbox stretch)
  /**
   * Alineación del botón cuando NO ocupa el ancho completo.
   *
   * Sin esto la única opción era el borde izquierdo: `alignSelf` se escribía al
   * final del estilo del botón, así que ni pasándolo por `buttonStyle` se podía
   * cambiar. En celular un botón suelto contra la izquierda deja medio ancho
   * vacío al lado y se lee como desalineado.
   */
  buttonAlign?: React.CSSProperties["alignSelf"];
};

export function ContactForm({ storeId, accent, textColor, mutedColor, radius = 8, isPreview, variant = "boxed", buttonRadius, theme, renderSent, prefillMessage }: {
  storeId?: string; accent: string; textColor: string; mutedColor: string; radius?: number; isPreview?: boolean;
  variant?: "boxed" | "underline"; buttonRadius?: number;
  theme?: ContactFormTheme;
  // Permite a cada template renderizar su propia pantalla de "enviado" (icono/colores propios)
  // en vez de la genérica — la lógica de envío sigue centralizada acá.
  renderSent?: (reset: () => void) => React.ReactNode;
  // Permite precargar el campo mensaje desde afuera (ej: botón "Consultar disponibilidad" de un producto puntual).
  prefillMessage?: string;
}) {
  /* `website` es el honeypot: siempre vacio para una persona. Ver el campo. */
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "", website: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const captcha = useTurnstile("contact");
  const t = theme ?? {};
  // La demo pública de `/plantillas/[id]` también entra en `isPreview` —lo necesita
  // para que el formulario no mande nada—, pero ahí no hay ningún "modo edición"
  // del que hablar: el que mira todavía no tiene tienda. El formulario sigue sin
  // enviar; lo único que se calla es el cartel.
  const enDemoPublica = !!useContext(StoreConfigContext)?.demoPublica;

  // Sincroniza el mensaje precargado (ej: "Consultar disponibilidad" de un producto)
  // ajustando el estado durante el render en vez de en un efecto, siguiendo el patrón
  // recomendado por React para "adjusting state when a prop changes".
  const [prevPrefillMessage, setPrevPrefillMessage] = useState(prefillMessage);
  if (prefillMessage !== prevPrefillMessage) {
    setPrevPrefillMessage(prefillMessage);
    if (prefillMessage) setForm(f => ({ ...f, mensaje: prefillMessage }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || isPreview) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...form, turnstileToken: captcha.token }),
      });
      if (res.ok) { setStatus("sent"); setForm({ nombre: "", email: "", mensaje: "", website: "" }); }
      else setStatus("error");
    } catch { setStatus("error"); }
    captcha.reset();
  }

  if (status === "sent") {
    if (renderSent) return <>{renderSent(() => setStatus("idle"))}</>;
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13.5, color: mutedColor, margin: "0 0 12px" }}>¡Gracias! Te vamos a responder a la brevedad.</p>
        <button type="button" onClick={() => setStatus("idle")}
          style={{ background: "none", color: accent, border: `1px solid ${accent}`, borderRadius: buttonRadius ?? radius, padding: "8px 20px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  const gap = t.gap ?? (variant === "underline" ? 18 : 12);
  const borderColorDefault = t.inputBorderColor ?? `${mutedColor}55`;
  const ph = t.placeholders ?? { nombre: "Tu nombre", email: "Tu email", mensaje: "¿En qué te podemos ayudar?" };

  const baseInputStyle: React.CSSProperties = variant === "underline"
    ? { width: "100%", borderWidth: 0, borderBottomWidth: 1, borderStyle: "solid", borderColor: borderColorDefault, borderRadius: 0, padding: t.inputPadding ?? "8px 2px",
        fontSize: t.fontSize ?? 13.5, color: textColor, background: t.inputBg ?? "transparent", fontFamily: "inherit", boxSizing: "border-box" }
    : { width: "100%", borderWidth: 1, borderStyle: "solid", borderColor: borderColorDefault, borderRadius: radius, padding: t.inputPadding ?? "11px 14px",
        fontSize: t.fontSize ?? 13.5, color: textColor, background: t.inputBg ?? "transparent", fontFamily: "inherit", boxSizing: "border-box" };

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (t.focusBorderColor) e.currentTarget.style.borderColor = t.focusBorderColor;
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = borderColorDefault;
  }

  /* En la VISTA PREVIA el botón se ve NORMAL, no apagado.
 *
 * Acá el botón quedaba gris mientras que el de la suscripción, en la misma
 * pantalla, ya se veía normal. O sea que la dueña, en el lugar que existe
 * justamente para ver cómo le queda su tienda, tenía dos bloques parecidos
 * mostrando cosas distintas — y ninguno de los dos como lo van a ver sus
 * clientas.
 *
 * No se pierde nada apagándolo: `handleSubmit` sale en la primera línea cuando
 * es previa, así que tocarlo no manda nada. Y el cartel de abajo ya lo dice.
 *
 * `sending` y el captcha SIGUEN apagándolo en la tienda de verdad, que es donde
 * apagarlo significa algo. */
  const disabled = status === "sending" || (!isPreview && !captcha.ready);
  const btnRadius = buttonRadius ?? (variant === "underline" ? 0 : radius);

  const nameEmailFields = (
    <>
      <div>
        {t.showLabels && <label style={t.labelStyle}>Nombre</label>}
        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder={ph.nombre} required readOnly={isPreview} maxLength={NOMBRE_MAX} style={baseInputStyle}
          onFocus={handleFocus} onBlur={handleBlur} />
      </div>
      <div>
        {t.showLabels && <label style={t.labelStyle}>Email</label>}
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder={ph.email} type="email" required readOnly={isPreview} maxLength={EMAIL_MAX} style={baseInputStyle}
          onFocus={handleFocus} onBlur={handleBlur} />
      </div>
    </>
  );

  const defaultButtonStyle: React.CSSProperties = variant === "underline"
    ? { background: "none", color: textColor, border: "none", borderBottom: `1.5px solid ${textColor}`, borderRadius: 0, padding: "8px 0", fontWeight: 600, fontSize: 13, textAlign: "left" }
    : { background: accent, color: "#fff", border: "none", borderRadius: btnRadius, padding: "12px 24px", fontWeight: 700, fontSize: 13 };
  // Por defecto el botón boxed ocupa el ancho completo (stretch del flex column) y
  // el underline queda al ancho de su texto — como era antes de centralizar el form.
  // buttonFullWidth permite forzar cualquiera de los dos explícitamente.
  const fullWidth = t.buttonFullWidth ?? (variant !== "underline");
  const mergedButtonStyle: React.CSSProperties = {
    ...defaultButtonStyle, ...t.buttonStyle,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
    alignSelf: fullWidth ? t.buttonAlign : (t.buttonAlign ?? "flex-start"),
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap, textAlign: "left", width: "100%" }}>
      {t.intro}
      {t.twoColTop ? (
        <>
          <style>{`.cf-two-col{display:grid;grid-template-columns:1fr;gap:${gap}px}@media(min-width:640px){.cf-two-col{grid-template-columns:1fr 1fr}}`}</style>
          <div className="cf-two-col">{nameEmailFields}</div>
        </>
      ) : nameEmailFields}
      <div>
        {t.showLabels && <label style={t.labelStyle}>Mensaje</label>}
        <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
          placeholder={ph.mensaje} required rows={4} readOnly={isPreview} maxLength={MENSAJE_MAX}
          style={{ ...baseInputStyle, resize: "vertical" }} onFocus={handleFocus} onBlur={handleBlur} />
        {/* El contador aparece recien cerca del tope. Puesto desde el
            principio es ruido —nadie escribe 2000 letras sin querer— pero
            llegar al tope sin aviso se siente como que el teclado se rompio. */}
        {form.mensaje.length > MENSAJE_MAX - 200 && (
          <p style={{ fontSize: 11, color: form.mensaje.length >= MENSAJE_MAX ? "#dc2626" : mutedColor, margin: "4px 0 0" }}>
            {form.mensaje.length >= MENSAJE_MAX
              ? "Llegaste al máximo. Si te falta contar algo, escribinos de nuevo."
              : `Te quedan ${MENSAJE_MAX - form.mensaje.length} letras.`}
          </p>
        )}
      </div>
      {/* Honeypot: escondido para una persona, visible para un bot que llena
          todo lo que encuentra. Si viene con algo, el servidor contesta que
          salio bien y no manda nada. Es lo que frena al bot ANTES del captcha,
          sin molestar a nadie. Va con `aria-hidden` y fuera del orden de
          tabulacion para que un lector de pantalla tampoco lo ofrezca. */}
      <input type="text" name="website" value={form.website}
        onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
      {!isPreview && captcha.widget}
      <button type="submit" disabled={disabled} style={mergedButtonStyle}
        onMouseEnter={t.buttonHoverStyle ? e => Object.assign(e.currentTarget.style, t.buttonHoverStyle) : undefined}
        onMouseLeave={t.buttonHoverStyle ? e => Object.assign(e.currentTarget.style, defaultButtonStyle, t.buttonStyle ?? {}) : undefined}>
        {status === "sending" ? "Enviando..." : t.buttonLabel ?? (variant === "underline" ? "Enviar mensaje →" : "Enviar mensaje")}
      </button>
      {status === "error" && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>No se pudo enviar. Probá de nuevo.</p>}
      {isPreview && !enDemoPublica && <p style={{ fontSize: 11, color: mutedColor, margin: 0 }}>Vista previa — el formulario no envía en modo edición.</p>}
    </form>
  );
}
