"use client";
import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Lo que pasa si un template se rompe al dibujarse (13/10/26).
 *
 * Antes no había nada entre un template y la pantalla. Un error en cualquier
 * bloque —un dato raro de un producto, un caso que nadie probó— subía hasta
 * arriba de todo:
 *   - en la tienda, el comprador veía la pantalla de error general de la
 *     aplicación, sin nombre de tienda ni forma de escribirle;
 *   - en Diseño, se caía el EDITOR entero (lo atajaba dashboard/error.tsx) y
 *     la dueña perdía lo que tenía sin guardar.
 *
 * Ahora el error queda encerrado acá: se avisa a Sentry con el template que
 * falló, y en su lugar se muestra algo útil. En el editor el resto del panel
 * sigue andando, y al cambiar cualquier cosa (`reintentarCon`) se vuelve a
 * probar solo: si el error lo provocó lo que la dueña acaba de editar,
 * deshacerlo alcanza.
 *
 * Es una clase porque React sólo ataja errores de dibujo con
 * `getDerivedStateFromError` / `componentDidCatch`; no hay hook para esto.
 */
type Props = {
  children: ReactNode;
  /** El id del template, para que Sentry diga cuál fue. */
  template: string;
  modo: "tienda" | "editor";
  nombreTienda?: string;
  /** Número de WhatsApp de la tienda: si la tienda no se puede ver, que igual se le pueda escribir. */
  whatsapp?: string | null;
  /** Cuando cambia, se vuelve a intentar dibujar (en el editor: la config de la previa). */
  reintentarCon?: unknown;
};

type Estado = { error: boolean; con: unknown };

export class TemplateSeguro extends Component<Props, Estado> {
  state: Estado = { error: false, con: this.props.reintentarCon };

  static getDerivedStateFromError(): Partial<Estado> {
    return { error: true };
  }

  static getDerivedStateFromProps(props: Props, state: Estado): Partial<Estado> | null {
    if (props.reintentarCon !== state.con) return { con: props.reintentarCon, error: false };
    return null;
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error, { tags: { template: this.props.template, donde: this.props.modo } });
    console.error(`[template ${this.props.template}]`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { modo, nombreTienda, whatsapp } = this.props;

    if (modo === "editor") {
      return (
        <div role="alert" style={{ minHeight: 360, display: "grid", placeItems: "center", padding: 24, background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #fecaca", borderRadius: 16, padding: "24px 22px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Este diseño tuvo un problema al dibujarse</p>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.6, color: "#475569" }}>
              Tus cambios no se perdieron y el resto del editor sigue andando. Si pasó justo después de cambiar algo,
              deshacelo y se vuelve a ver. Ya nos llegó el aviso.
            </p>
            <button type="button" onClick={() => this.setState({ error: false })}
              style={{ minHeight: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              Volver a intentar
            </button>
          </div>
        </div>
      );
    }

    const wa = whatsapp?.replace(/\D/g, "");
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px", background: "#0f172a", color: "#fff", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          {nombreTienda && <p style={{ margin: "0 0 10px", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, overflowWrap: "anywhere" }}>{nombreTienda}</p>}
          <p style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>No pudimos mostrar la tienda</p>
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6, opacity: 0.75 }}>Fue un problema nuestro, no de tu conexión. Probá de nuevo en un momento.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => window.location.reload()}
              style={{ minHeight: 46, padding: "0 20px", borderRadius: 12, border: "none", background: "#fff", color: "#0f172a", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Volver a cargar
            </button>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                style={{ minHeight: 46, padding: "0 20px", borderRadius: 12, background: "#25d366", color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Escribir por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
}
