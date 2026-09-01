import { NextResponse } from "next/server";

/**
 * El manifiesto del panel de Productos Digitales instalado.
 *
 * Mismo molde que los otros dos, con lo que cambia entre paneles:
 *
 *   - `scope` es `/digitales`, y define hasta dónde llega la app. Tiene que
 *     coincidir con el service worker que registra su layout: Android atribuye
 *     las notificaciones a la app instalada sólo si coinciden.
 *   - `id` propio. Sin él, el navegador identifica la app por su `start_url` y
 *     las tres se pisan: instalar una reemplaza a la otra, y abrir un ícono abre
 *     el panel equivocado.
 *   - El color es el petróleo del ícono, no el naranja del producto: es el fondo
 *     sobre el que se lee el logo, no la marca.
 *   - `background_color` blanco, igual que los otros dos: es el fondo de la
 *     pantalla de arranque y lo que viene después es blanco, así que no se ve
 *     ningún salto de color.
 */
export async function GET() {
  const manifest = {
    id: "/digitales",
    name: "TiendaApps Digitales",
    short_name: "Digitales",
    description: "Vendé ebooks, plantillas y guías con entrega automática",
    start_url: "/digitales?source=pwa",
    scope: "/digitales",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0c3b44",
    icons: [
      {
        src: "/api/icons/digitales?size=192&purpose=any",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/digitales?size=512&purpose=any",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/digitales?size=512&purpose=maskable",
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
