import { NextRequest } from "next/server";
import { componerIconoDePanel, iconoDeRespaldo, type Color } from "@/lib/icono-panel";

// `nodejs` y no `edge`: hay que leer el archivo del logo del disco, y el runtime
// edge no tiene sistema de archivos.
export const runtime = "nodejs";

/**
 * El ícono del panel de tiendas instalado.
 *
 * Toda la composición vive en `lib/icono-panel`, compartida con el panel de
 * afiliados. Acá sólo queda lo que distingue a este panel: el fondo.
 *
 * Va BLANCO y no sobre el degradado de la marca. El logo es naranja y rojo:
 * naranja sobre naranja desaparece. Blanco además es el mismo de la pantalla de
 * arranque y del panel, así que abrir la app no tiene ningún salto de color.
 */

const BLANCO: Color = { r: 255, g: 255, b: 255, alpha: 1 };

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("size") ?? "512");
  const size = Math.min(Math.max(raw, 16), 1024);
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  try {
    const png = await componerIconoDePanel({ size, maskable, fondo: BLANCO });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[icons/dashboard] no se pudo componer el ícono:", err);
    const liso = await iconoDeRespaldo(size, BLANCO);
    return new Response(new Uint8Array(liso), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }
}
