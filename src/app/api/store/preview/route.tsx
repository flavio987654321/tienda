import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function darken(hex: string, amount = 60): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

// `_req` no se usa: lo pide la firma del route handler de Next.
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { slug: true, name: true, description: true, tagline: true, primaryColor: true, storeConfig: true },
  });
  if (!store) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    // Extraer hero image y colores del storeConfig
    let heroImg: string | null = null;
    let accentColor = store.primaryColor || "#6366f1";

    try {
      const sc = JSON.parse(store.storeConfig || "{}");
      heroImg =
        sc?.imageOverrides?.heroBackground?.url ??
        sc?.imageOverrides?.heroImage?.url ??
        sc?.imageOverrides?.heroImage1?.url ??
        sc?.imageOverrides?.heroBanner1?.url ??
        sc?.imageOverrides?.bgHero?.url ??
        null;
      if (sc?.colors?.accent && /^#[0-9a-fA-F]{6}$/.test(sc.colors.accent)) {
        accentColor = sc.colors.accent;
      }
    } catch { /* storeConfig malformed */ }

    const color = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#6366f1";
    const colorDark = darken(color);
    const displayText = store.description || store.tagline || null;

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            background: heroImg ? "#111" : `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
          }}
        >
          {heroImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImg}
              alt=""
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div
            style={{
              position: "absolute", inset: 0, display: "flex",
              background: heroImg
                ? "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.78) 100%)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute", top: 32, right: 44, display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.18)", borderRadius: 40,
              paddingTop: 7, paddingBottom: 7, paddingLeft: 16, paddingRight: 16,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 5, background: color, marginRight: 7, display: "flex" }} />
            <span style={{ color: "white", fontSize: 18, fontWeight: 600 }}>TiendaApps</span>
          </div>
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              paddingLeft: 52, paddingRight: 52, paddingBottom: 40,
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 76, fontWeight: 800, color: "white", lineHeight: 1.0 }}>
              {store.name}
            </div>
            {displayText && (
              <div style={{ fontSize: 26, color: "rgba(255,255,255,0.80)", marginTop: 12 }}>
                {displayText.length > 90 ? displayText.slice(0, 90) + "…" : displayText}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
              <div style={{ display: "flex", background: color, borderRadius: 40, paddingTop: 9, paddingBottom: 9, paddingLeft: 20, paddingRight: 20 }}>
                <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>Ver tienda →</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 18 }}>
                tiendaapps.com/{store.slug}
              </span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const supabase = createSupabaseAdminClient();
    const path = `tienda-imagenes/previews/${store.slug}.png`;
    const { error: upErr } = await supabase.storage
      .from("tienda-imagenes")
      .upload(path, imageBuffer, { upsert: true, contentType: "image/png" });
    if (upErr) {
      console.error("[store/preview] upload error:", upErr);
      return NextResponse.json({ error: "Upload fallido" }, { status: 500 });
    }

    // Añadir timestamp para invalidar caché del CDN
    const { data } = supabase.storage.from("tienda-imagenes").getPublicUrl(path);
    const previewImage = `${data.publicUrl}?v=${Date.now()}`;

    await prisma.store.update({
      where: { ownerId: user.id },
      data: { previewImage },
    });

    return NextResponse.json({ ok: true, previewImage });
  } catch (err) {
    console.error("[store/preview]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
