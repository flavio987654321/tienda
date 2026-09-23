import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { mirandoAhora, productosDelPermiso } from "@/lib/mirando-ahora-servidor";

export const runtime = "nodejs";
/* El número es de AHORA: no se guarda en ningún lado del camino. */
export const dynamic = "force-dynamic";

/**
 * Cuántas preguntas por IP y por minuto.
 *
 * El panel pregunta cada 20 segundos, o sea 3 por minuto. El techo deja lugar
 * a varias pestañas del panel abiertas y a una oficina entera detrás de la
 * misma IP, sin darle a nadie una forma gratis de hacernos hablar con Redis
 * todo el día.
 */
const PREGUNTAS_POR_MINUTO = 30;

/**
 * GET /api/digitales/mirando — "¿cuántos están mirando ahora?".
 * El permiso viaja en la cabecera `x-mirando`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO TOCA LA BASE Y NO PIDE LA SESIÓN.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es la otra mitad del puntito verde: la ruta que hace que el número se mueva
 * solo en vez de quedar congelado en el momento en que se cargó el panel.
 *
 * ⚠️ No pregunta quién es, y no es un descuido. Averiguarlo cuesta un viaje a
 * Supabase y otro a la base CADA VEZ, para un cartelito, en una pantalla que
 * puede quedar abierta toda la tarde. En su lugar el panel se lleva un
 * permiso firmado con los ids que ya son suyos —están en el HTML de su propia
 * pantalla— y acá sólo se verifica la firma: nadie puede preguntar por un
 * producto ajeno, porque no puede firmarlo. Ver `mirando-ahora-servidor`.
 *
 * El permiso vence. Cuando vence contesta 401 y el panel recarga la pantalla
 * para llevarse uno nuevo; un permiso para siempre no es un permiso.
 */
export async function GET(req: NextRequest) {
  const sinSaber = (status: number) =>
    NextResponse.json({ mirando: null }, { status, headers: { "Cache-Control": "no-store" } });
  const noGuardar = { headers: { "Cache-Control": "no-store" } };

  /* En una cabecera y no en la dirección: una llave escrita en la dirección
     queda en los registros del servidor, y una cabecera inventada obliga al
     navegador a pedir permiso antes de mandarla desde otro sitio. */
  const ids = productosDelPermiso(req.headers.get("x-mirando"));
  if (!ids) return sinSaber(401);

  const ip = getClientIp(req);
  try {
    if (!(await checkRateLimit(`mirando-panel:${ip}`, PREGUNTAS_POR_MINUTO, 60_000))) return sinSaber(429);
  } catch {
    /* Sin Redis tampoco hay contador que leer. */
    return sinSaber(503);
  }

  /* `null` es "no se pudo averiguar" y viaja como `null`: el panel no dibuja
     un cero inventado, que diría "no hay nadie". Ver `lib/mirando-ahora`. */
  const mirando = await mirandoAhora(ids);
  if (!mirando) return sinSaber(200);

  /* Sólo los números. Los nombres de los productos ya los tiene el panel —son
     suyos y están en su HTML—, así que esta ruta no tiene por qué saberlos ni
     mandarlos de vuelta. */
  return NextResponse.json({ mirando: mirando.total, porProducto: mirando.porProducto }, noGuardar);
}
