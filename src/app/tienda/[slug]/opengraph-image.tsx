import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "Vista previa de la tienda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function safeColor(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
    ? value
    : fallback;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex: string, amount = 0.25) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      logo: true,
      logoColor: true,
      primaryColor: true,
      tagline: true,
      description: true,
    },
  });

  const storeName = store?.name ?? "Tienda";
  const bg = safeColor(store?.logoColor ?? store?.primaryColor, "#6366f1");
  const bgDark = darken(bg);
  const subtitle =
    store?.tagline ||
    store?.description ||
    `Comprá en ${storeName} — Envíos a todo el país`;

  const initials = storeName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: `linear-gradient(135deg, ${bg} 0%, ${bgDark} 100%)`,
          padding: "0 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle circle decoration */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: 300,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            display: "flex",
          }}
        />

        {/* Logo or initials */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 40,
            overflow: "hidden",
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            border: "3px solid rgba(255,255,255,0.25)",
          }}
        >
          {store?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo}
              width={200}
              height={200}
              alt={storeName}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                fontSize: 80,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 64,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Store name */}
          <div
            style={{
              fontSize: storeName.length > 18 ? 52 : 68,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            {storeName}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 64,
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.5)",
              marginTop: 24,
              marginBottom: 20,
              display: "flex",
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.4,
              maxWidth: 640,
            }}
          >
            {subtitle.length > 80 ? subtitle.slice(0, 80) + "…" : subtitle}
          </div>

          {/* URL badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 32,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 99,
              padding: "10px 24px",
              alignSelf: "flex-start",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
              tiendaapps.com
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
