import { NextResponse } from "next/server";

/**
 * El manifiesto del panel de afiliados instalado.
 *
 * Mismo molde que el del panel de tiendas, con tres diferencias que importan:
 *
 *   - `scope` es `/afiliados`. Es lo que define hasta dónde llega la app, y tiene
 *     que coincidir con el service worker que registra su layout: Android
 *     atribuye las notificaciones a la app instalada solo si coinciden.
 *   - Los colores son los del panel de afiliados (índigo), no los de la marca.
 *     Alguien puede tener las dos apps instaladas —hay quien tiene su tienda y
 *     además vende para otras— y a ese tamaño el color es lo único que las
 *     distingue de un vistazo.
 *   - `background_color` va blanco, igual que en el panel de tiendas: es el fondo
 *     de la pantalla de arranque y lo que viene después es blanco, así que no se
 *     ve ningún salto de color.
 */
export async function GET() {
  const manifest = {
    /* La identidad de la app. Ver el comentario largo en el manifiesto del panel
       de tiendas: sin `id`, el navegador identifica la app por su `start_url` y
       las dos se pisaban — instalar ésta reemplazaba a la otra, y abrir el ícono
       del panel de tiendas abría éste. */
    id: "/afiliados",
    name: "TiendaApps Afiliados",
    short_name: "Afiliados",
    description: "Vendé para otras tiendas y seguí tus comisiones",
    start_url: "/afiliados?source=pwa",
    scope: "/afiliados",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d0f1a",
    icons: [
      {
        src: "/api/icons/afiliados?size=192&purpose=any",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/afiliados?size=512&purpose=any",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/afiliados?size=512&purpose=maskable",
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
