export default function ComingSoonPage({
  name,
  logo,
  color,
  tagline,
}: {
  name: string;
  logo: string | null;
  color: string;
  tagline: string | null;
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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at center, ${color}1a 0%, #f8fafc 70%)`,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "2rem",
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          overflow: "hidden",
          marginBottom: 28,
          boxShadow: `0 8px 40px ${color}50`,
          background: logo ? undefined : `linear-gradient(135deg, ${color}, ${color}bb)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 44, fontWeight: 900, color: "#fff" }}>{initials}</span>
        )}
      </div>

      {/* Badge */}
      <span
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: color,
          background: `${color}1a`,
          border: `1px solid ${color}40`,
          borderRadius: 99,
          padding: "5px 16px",
          marginBottom: 18,
        }}
      >
        Próximamente
      </span>

      {/* Store name */}
      <h1
        style={{
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          fontWeight: 900,
          color: "#0f172a",
          margin: "0 0 14px",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {name}
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 16,
          color: "#64748b",
          maxWidth: 380,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {tagline || "Estamos preparando algo especial para vos. ¡Volvé pronto!"}
      </p>

      {/* Powered by */}
      <p
        style={{
          position: "absolute",
          bottom: 24,
          fontSize: 12,
          color: "#94a3b8",
          margin: 0,
        }}
      >
        Powered by{" "}
        <strong style={{ color: "#6366f1" }}>TiendaApps</strong>
      </p>
    </div>
  );
}
