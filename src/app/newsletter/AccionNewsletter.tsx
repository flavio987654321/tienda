"use client";
import { useRef, useState } from "react";

/**
 * El botón de las páginas de confirmar y de dar de baja.
 *
 * Existe porque ninguna de las dos acciones puede pasar por el solo hecho de
 * abrir una URL: Gmail y los antivirus abren los links de los mails por su
 * cuenta para revisarlos. Si abrir bastara, esos robots confirmarían
 * suscripciones que nadie pidió y darían de baja a gente que no quería irse.
 * Con un botón que hace POST, hace falta una persona.
 */
export function AccionNewsletter({
  token,
  endpoint,
  boton,
  botonCargando,
  exito,
  detalleExito,
  nota,
  children,
}: {
  token: string;
  endpoint: string;
  boton: string;
  botonCargando: string;
  exito: string;
  detalleExito: string;
  /** La línea chica de abajo del botón. */
  nota?: React.ReactNode;
  /**
   * El título y el texto que van ARRIBA del botón.
   *
   * Viven acá adentro y no en la página aunque sean estáticos, porque al
   * confirmar tienen que desaparecer junto con el botón. Cuando estaban afuera,
   * la pantalla terminaba diciendo "¡Listo!" con un "Confirmá tu suscripción"
   * arriba y un "sin confirmar no vas a recibir nada" abajo — las dos cosas
   * falsas en el momento exacto en que se leían.
   */
  children?: React.ReactNode;
}) {
  const [estado, setEstado] = useState<"listo" | "yendo" | "hecho" | "error">("listo");
  const [error, setError] = useState<string | null>(null);
  // Mismo candado que en reseñas: el estado de React no se actualiza a tiempo
  // para frenar el segundo click de un doble click.
  const enViaje = useRef(false);

  async function ejecutar() {
    if (enViaje.current) return;
    enViaje.current = true;
    setEstado("yendo");
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No pudimos completar la acción. Probá de nuevo.");
        setEstado("error");
        return;
      }
      setEstado("hecho");
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      setEstado("error");
    } finally {
      enViaje.current = false;
    }
  }

  if (estado === "hecho") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>✓</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>{exito}</h1>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>{detalleExito}</p>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={ejecutar}
        disabled={estado === "yendo"}
        style={{
          width: "100%", background: "#111827", color: "#fff", border: "none",
          borderRadius: 10, padding: "14px 24px", fontSize: 14, fontWeight: 700,
          cursor: estado === "yendo" ? "default" : "pointer",
          opacity: estado === "yendo" ? 0.6 : 1,
        }}
      >
        {estado === "yendo" ? botonCargando : boton}
      </button>
      {error && (
        <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 12, marginBottom: 0, textAlign: "center", lineHeight: 1.6 }}>
          {error}
        </p>
      )}
      {nota}
    </>
  );
}
