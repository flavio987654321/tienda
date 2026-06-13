import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "TiendaApps Panel",
    short_name: "Panel",
    description: "Administrá tu tienda online desde cualquier lugar",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#4f46e5",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/api/icons/dashboard?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/dashboard?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
    lang: "es-AR",
    dir: "ltr",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
