/**
 * La tarjeta centrada que comparten las páginas de confirmar y de baja.
 *
 * Estas dos páginas se ven fuera de contexto —se llega desde un mail, sin haber
 * pasado por la tienda— así que no heredan nada del template. Se visten solas y
 * en neutro a propósito: lo que tiene que quedar claro es de qué tienda se está
 * hablando y qué botón hay que tocar.
 */
export function Marco({ tienda, children }: { tienda?: string | null; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "#f9fafb",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111827",
    }}>
      <div style={{
        width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16,
        border: "1px solid #e5e7eb", padding: "36px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        {tienda && (
          <p style={{
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#9ca3af", fontWeight: 700, margin: "0 0 18px", textAlign: "center",
          }}>
            {tienda}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
