import { NextResponse } from "next/server";

/**
 * El manifiesto del panel instalado.
 *
 * ── Los colores ──────────────────────────────────────────────────────────────
 * Estaban en violeta (#4f46e5), que no es un color de la marca: no está en el
 * logo ni en el panel, donde todo lo que se toca es naranja. Al abrir la app se
 * veía un destello violeta antes del login.
 *
 * `theme_color` pinta la barra del sistema (el título de la ventana en
 * escritorio, la barra de estado en el celular): va el naranja del panel, el
 * mismo del botón "Ingresar".
 *
 * `background_color` es el fondo de la pantalla de arranque, esa que se ve
 * mientras la app carga. Va BLANCO a propósito, y no naranja: el login y el
 * panel son blancos, así que el arranque se funde con lo que viene después y no
 * se ve ningún salto de color. Con el fondo naranja se cambiaría un destello
 * violeta por uno naranja, que es más lindo pero sigue siendo un destello.
 *
 * ── Los íconos ───────────────────────────────────────────────────────────────
 * Declaraba 192 como `any` y 512 como `maskable`, y las dos apuntaban al mismo
 * dibujo. Dos problemas: no había ningún `any` de 512 —Android lo pide para el
 * ícono grande y para la pantalla de arranque, y sin él lo agranda del de 192,
 * que se ve borroso— y el maskable llegaba con las esquinas ya redondeadas, así
 * que la máscara del teléfono redondeaba encima. Es el mismo arreglo que se hizo
 * en el ícono de las tiendas.
 */
export async function GET() {
  const manifest = {
    name: "TiendaApps Panel",
    short_name: "Panel",
    description: "Administrá tu tienda online desde cualquier lugar",
    start_url: "/dashboard?source=pwa",
    scope: "/dashboard",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/api/icons/dashboard?size=192&purpose=any",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/dashboard?size=512&purpose=any",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/dashboard?size=512&purpose=maskable",
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
