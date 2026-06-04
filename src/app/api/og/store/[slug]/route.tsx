import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

type RouteContext = { params: Promise<{ slug: string }> };

function darken(hex: string, amount = 50): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const origin = new URL(req.url).origin;

    const apiRes = await fetch(`${origin}/api/stores?slug=${encodeURIComponent(slug)}&limit=1`, {
      headers: { "x-internal": "1" },
      cache: "no-store",
    });

    if (!apiRes.ok) return new Response("Not found", { status: 404 });

    const { stores } = await apiRes.json() as { stores: Array<{
      slug: string; name: string; description: string | null;
      primaryColor: string; heroImg: string | null; coverImg: string | null;
      banner: string | null; totalProducts: number;
    }> };

    const store = stores?.[0];
    if (!store) return new Response("Not found", { status: 404 });

    const bgUrl = store.heroImg || store.coverImg || store.banner || null;
    const color = /^#[0-9a-fA-F]{6}$/.test(store.primaryColor) ? store.primaryColor : "#6366f1";
    const colorDark = darken(color);
    const displayText = store.description || null;

    // Pre-fetch background image as base64 so Satori doesn't have to
    // resolve external URLs (which can fail silently in edge runtime).
    const bgDataUrl = bgUrl ? await urlToDataUrl(bgUrl) : null;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            background: bgDataUrl ? "#111" : `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
          }}
        >
          {bgDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bgDataUrl}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}

          {/* Scrim */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: bgDataUrl
                ? "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.78) 100%)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 100%)",
              display: "flex",
            }}
          />

          {/* TiendaApps badge */}
          <div
            style={{
              position: "absolute",
              top: 36,
              right: 48,
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.18)",
              borderRadius: 40,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 18,
              paddingRight: 18,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: color,
                marginRight: 8,
                display: "flex",
              }}
            />
            <span style={{ color: "white", fontSize: 20, fontWeight: 600 }}>
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
              paddingBottom: 44,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 84,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.0,
              }}
            >
              {store.name}
            </div>

            {displayText && (
              <div
                style={{
                  fontSize: 28,
                  color: "rgba(255,255,255,0.80)",
                  marginTop: 14,
                }}
              >
                {displayText.length > 90 ? displayText.slice(0, 90) + "…" : displayText}
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  background: color,
                  borderRadius: 40,
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 22,
                  paddingRight: 22,
                }}
              >
                <span style={{ color: "white", fontSize: 22, fontWeight: 700 }}>
                  {store.totalProducts} {store.totalProducts === 1 ? "producto" : "productos"}
                </span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 20 }}>
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
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[og/store]", err);
    return new Response("Error", { status: 500 });
  }
}
