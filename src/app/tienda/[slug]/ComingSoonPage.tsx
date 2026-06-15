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
      {/* Halo de fondo en el color de la marca — muy sutil */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 40,
          flexShrink: 0,
          border: logo ? "1px solid #1a1a1a" : "none",
          background: logo ? "#0a0a0a" : `linear-gradient(135deg, ${color}cc, ${color}88)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${color}30`,
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
          <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            {initials}
          </span>
        )}
      </div>

      {/* Label próximamente */}
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: color,
          margin: "0 0 20px",
          opacity: 0.9,
        }}
      >
        Próximamente
      </p>

      {/* Línea fina */}
      <div
        style={{
          width: 40,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          marginBottom: 24,
        }}
      />

      {/* Nombre */}
      <h1
        style={{
          fontSize: "clamp(2rem, 6vw, 3.5rem)",
          fontWeight: 800,
          color: "#ffffff",
          margin: "0 0 20px",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
        }}
      >
        {name}
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 15,
          color: "#555",
          maxWidth: 340,
          lineHeight: 1.7,
          margin: 0,
          fontWeight: 400,
        }}
      >
        {tagline || "Algo extraordinario está en camino."}
      </p>

      {/* Powered by */}
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
        powered by{" "}
        <span style={{ color: "#3a3a3a", fontWeight: 600 }}>TiendaApps</span>
      </p>
    </div>
  );
}
