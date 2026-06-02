import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

function darken(hex: string, amount = 50): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    // findFirst because isActive/isPublished are not unique fields
    const store = await prisma.store.findFirst({
      where: { slug, isActive: true, isPublished: true },
      select: {
        name: true,
        description: true,
        tagline: true,
        primaryColor: true,
        storeConfig: true,
        banner: true,
        _count: { select: { products: true } },
        products: {
          where: { isActive: true },
          select: { images: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!store) {
      return new Response("Not found", { status: 404 });
    }

    // Resolve hero image URL
    let heroImgUrl: string | null = null;
    try {
      const sc = JSON.parse(store.storeConfig);
      heroImgUrl =
        sc?.imageOverrides?.heroBackground?.url ??
        sc?.imageOverrides?.heroImage?.url ??
        sc?.imageOverrides?.heroImage1?.url ??
        sc?.imageOverrides?.heroBanner1?.url ??
        null;
    } catch {}

    if (!heroImgUrl && store.products[0]) {
      try {
        const imgs = JSON.parse(store.products[0].images);
        if (Array.isArray(imgs) && imgs[0]) {
          const first = imgs[0];
          heroImgUrl = typeof first === "string" ? first : (first?.url ?? null);
        }
      } catch {}
    }

    if (!heroImgUrl && store.banner) heroImgUrl = store.banner;

    // Fetch image and convert to base64 (Satori needs this for reliable embedding)
    let bgBase64: string | null = null;
    if (heroImgUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(heroImgUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const ct = res.headers.get("content-type") || "image/jpeg";
          const b64 = Buffer.from(buf).toString("base64");
          bgBase64 = `data:${ct};base64,${b64}`;
        }
      } catch {}
    }

    const color = /^#[0-9a-fA-F]{6}$/.test(store.primaryColor ?? "")
      ? store.primaryColor!
      : "#6366f1";
    const colorDark = darken(color);
    const displayText = store.description || store.tagline || null;
    const productCount = store._count.products;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            background: bgBase64
              ? "#111"
              : `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
          }}
        >
          {/* Background image */}
          {bgBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bgBase64}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}

          {/* Gradient overlay — bottom-heavy dark scrim */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: bgBase64
                ? "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.4) 100%)",
              display: "flex",
            }}
          />

          {/* TiendaApps badge — top right */}
          <div
            style={{
              position: "absolute",
              top: 36,
              right: 48,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 40,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: color,
                display: "flex",
              }}
            />
            <span style={{ color: "white", fontSize: 22, fontWeight: 600 }}>
              TiendaApps
            </span>
          </div>

          {/* Bottom content */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingLeft: 56,
              paddingRight: 56,
              paddingBottom: 48,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Store name */}
            <div
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.05,
              }}
            >
              {store.name}
            </div>

            {/* Description */}
            {displayText && (
              <div
                style={{
                  fontSize: 30,
                  color: "rgba(255,255,255,0.82)",
                  marginTop: 14,
                  lineHeight: 1.3,
                }}
              >
                {displayText.length > 80
                  ? displayText.slice(0, 80) + "…"
                  : displayText}
              </div>
            )}

            {/* Bottom row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: color,
                  borderRadius: 40,
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>
                  {productCount} {productCount === 1 ? "producto" : "productos"}
                </span>
              </div>

              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 22 }}>
                tiendaapps.com/{slug}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[og/store] error:", err);
    return new Response("Error generating image", { status: 500 });
  }
}
