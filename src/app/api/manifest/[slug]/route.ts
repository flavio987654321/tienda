import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: { name: true, logo: true, logoColor: true, primaryColor: true, description: true, tagline: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shortName = store.name.length > 14 ? store.name.slice(0, 14).trimEnd() + "…" : store.name;

  const icons = store.logo
    ? [
        { src: store.logo, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: store.logo, sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: store.logo, sizes: "180x180", type: "image/png", purpose: "any" },
      ]
    : [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }];

  const splashColor = store.logoColor || store.primaryColor || "#6366f1";

  const manifest = {
    name: store.name,
    short_name: shortName,
    description:
      store.description || store.tagline || `Tienda online de ${store.name}`,
    start_url: `/tienda/${slug}?source=pwa`,
    scope: `/tienda/${slug}`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: splashColor,
    theme_color: splashColor,
    icons,
    categories: ["shopping"],
    lang: "es-AR",
    dir: "ltr",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
