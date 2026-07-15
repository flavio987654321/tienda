/**
 * Lo que ve un visitante cuando entra al link de una tienda cerrada.
 *
 * Deliberadamente NO se reusa ComingSoonPage: esa dice "Próximamente / algo
 * extraordinario está en camino", que es para una tienda en construcción. Usarla
 * acá sería mentirle al comprador — lo dejaría esperando una apertura que no va a
 * pasar. Tampoco un 404 (que es lo que pasaba hasta ahora, porque la query filtra
 * `isActive`): si tenía el link guardado o un pedido viejo, un error crudo no le
 * explica nada.
 *
 * Tiendanube muestra exactamente esto: "vas a ver un mensaje de error por tienda
 * cancelada". Honesto y sin dramatismo.
 */
export default function ClosedStorePage({
  name,
  logo,
  color,
}: {
  name: string;
  logo: string | null;
  color: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#050505",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        padding: "3rem 2rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Logo — en escala de grises: la tienda no está activa */}
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: 36,
          flexShrink: 0,
          border: logo ? "1px solid #1a1a1a" : "none",
          background: logo ? "#0a0a0a" : `linear-gradient(135deg, ${color}66, ${color}33)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "grayscale(1)",
          opacity: 0.5,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            {initials}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#4a4a4a",
          margin: "0 0 20px",
        }}
      >
        Tienda cerrada
      </p>

      <div
        style={{
          width: 40,
          height: 1,
          background: "linear-gradient(90deg, transparent, #2a2a2a, transparent)",
          marginBottom: 24,
        }}
      />

      <h1
        style={{
          fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
          fontWeight: 800,
          color: "#9a9a9a",
          margin: "0 0 20px",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
        }}
      >
        {name}
      </h1>

      <p style={{ fontSize: 15, color: "#555", maxWidth: 360, lineHeight: 1.7, margin: "0 0 32px", fontWeight: 400 }}>
        Esta tienda ya no está disponible. Si tenías un pedido en curso, seguí usando el mismo link de
        seguimiento que te llegó por email.
      </p>

      <a
        href="/tiendas"
        style={{
          display: "inline-block",
          padding: "12px 26px",
          borderRadius: 12,
          border: "1px solid #262626",
          color: "#8a8a8a",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
          transition: "all 0.2s",
        }}
      >
        Ver otras tiendas
      </a>

      <p
        style={{
          position: "absolute",
          bottom: 28,
          fontSize: 11,
          color: "#2a2a2a",
          margin: 0,
          letterSpacing: "0.05em",
        }}
      >
        powered by <span style={{ color: "#3a3a3a", fontWeight: 600 }}>TiendaApps</span>
      </p>
    </div>
  );
}
