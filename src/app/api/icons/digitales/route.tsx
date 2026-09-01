import { NextRequest } from "next/server";
import { componerIconoDePanel, iconoDeRespaldo, type Color } from "@/lib/icono-panel";
import { medidaPermitida } from "@/lib/medidas-icono";

// `nodejs` y no `edge`: hay que leer el archivo del logo del disco, y el runtime
// edge no tiene sistema de archivos.
export const runtime = "nodejs";

/**
 * El ícono del panel de Productos Digitales instalado.
 *
 * Mismo logo que los otros dos paneles —esto es TiendaApps igual que ellos— y un
 * fondo distinto, que es lo único que los separa en la pantalla de inicio.
 *
 * ── Por qué petróleo ─────────────────────────────────────────────────────────
 * Los otros dos ya se llevaron los extremos: el panel de tiendas va en blanco y
 * el de afiliados en grafito casi negro. Un tercero en cualquier neutro sería el
 * del medio y a 48 píxeles no se distinguiría de ninguno.
 *
 * El petróleo es el mismo verde azulado que la plataforma ya usa para los
 * ahorros y los avisos de "listo", así que no es un color nuevo. Y el naranja del
 * logo encima de un frío oscuro es lo más fuerte que hay: se lee de lejos, que es
 * todo lo que un ícono tiene que hacer.
 *
 * NO se usó el naranja de Productos Digitales, que sería lo obvio: el logo YA es
 * naranja, así que quedaría naranja sobre naranja y no se vería nada.
 */

const PETROLEO: Color = { r: 12, g: 59, b: 68, alpha: 1 };

export async function GET(req: NextRequest) {
  const size = medidaPermitida(req.nextUrl.searchParams.get("size"));
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  try {
    const png = await componerIconoDePanel({ size, maskable, fondo: PETROLEO });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[icons/digitales] no se pudo componer el ícono:", err);
    const liso = await iconoDeRespaldo(size, PETROLEO);
    return new Response(new Uint8Array(liso), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }
}
