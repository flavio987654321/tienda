import { NextRequest } from "next/server";
import { componerIconoDePanel, iconoDeRespaldo, type Color } from "@/lib/icono-panel";
import { medidaPermitida } from "@/lib/medidas-icono";

// `nodejs` y no `edge`: hay que leer el archivo del logo del disco, y el runtime
// edge no tiene sistema de archivos.
export const runtime = "nodejs";

/**
 * El ícono del panel de afiliados instalado.
 *
 * Es el MISMO logo que el panel de tiendas, sobre un fondo distinto. Las dos
 * decisiones tienen su motivo:
 *
 * ── Por qué el mismo logo ────────────────────────────────────────────────────
 * La primera versión dibujaba dos personitas, que es lo que representa a un
 * afiliado. Se ve bien y no dice nada: podría ser el ícono de cualquier app de
 * cualquiera. Este panel es TiendaApps igual que el otro, así que lleva la marca
 * de TiendaApps.
 *
 * ── Por qué el fondo cambia ──────────────────────────────────────────────────
 * Hay gente con las dos apps instaladas —quien tiene su tienda y además vende
 * para otras—, y dos cuadrados idénticos en la pantalla de inicio obligarían a
 * abrirlos para saber cuál es cuál. A ese tamaño lo primero que distingue el ojo
 * es el color.
 *
 * El grafito es el mismo tono oscuro que ya usa este panel por dentro. Se probó
 * antes con el índigo de su navegación y no funcionó a la vista: competía con el
 * naranja del logo en vez de acompañarlo. Sobre casi negro el naranja es lo más
 * fuerte que hay, y al ser un neutro tampoco pelea con el modo claro del panel.
 */

const GRAFITO: Color = { r: 13, g: 15, b: 26, alpha: 1 };

export async function GET(req: NextRequest) {
  const size = medidaPermitida(req.nextUrl.searchParams.get("size"));
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  try {
    const png = await componerIconoDePanel({ size, maskable, fondo: GRAFITO });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[icons/afiliados] no se pudo componer el ícono:", err);
    const liso = await iconoDeRespaldo(size, GRAFITO);
    return new Response(new Uint8Array(liso), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }
}
