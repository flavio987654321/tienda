import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { buscarVideos } from "@/lib/videos-pexels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Los videos de stock para los reels.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ ESTO PIDE SESIÓN SI LOS VIDEOS SON PÚBLICOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lo que se protege no es el video: es **nuestra clave de Pexels**. Sin sesión,
 * esta ruta es un buscador gratis de videos que cualquiera puede pegarle desde
 * afuera con nuestra llave, y el tope de pedidos por hora lo compartimos con
 * las fotos de los ebooks. Alguien raspando esto deja sin fotos a un ebook que
 * se está armando y que ya está pagado.
 *
 * Por eso: sesión, rol DIGITAL como el resto del panel, y freno por cuenta.
 *
 * ── El freno, y por qué son 20 y no 60 ─────────────────────────────────────
 *
 * 20 búsquedas por hora y por cuenta.
 *
 * ⚠️ Estuvo en 60 y estaba mal calculado. El tope de Pexels es **200 pedidos
 * por hora para toda la plataforma** (y 20.000 por mes), así que con 60 por
 * cuenta alcanzaban TRES personas buscando fuerte en la misma hora para dejar
 * seca la cuota de todos. Y el que se queda sin nada no es el que estaba
 * mirando videos: es alguien que está armando su ebook y necesita las fotos,
 * que ya pagó por eso.
 *
 * Veinte búsquedas DISTINTAS en una hora ya es muchísimo para elegir material
 * —las repetidas no cuentan, las ataja el guardarropas de 24 horas— y deja el
 * grueso de la cuota para lo que no puede fallar.
 *
 * Esto se puede subir el día que Pexels nos amplíe el límite: lo dan gratis a
 * quien cumple sus condiciones de atribución, que es justo lo que ya hacemos
 * —cada tarjeta muestra quién filmó y enlaza a Pexels—. Hasta que eso esté
 * confirmado, el número tiene que ser conservador.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`digital-videos:${user.id}`, 20, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Demasiadas búsquedas seguidas. Probá de nuevo en un rato." },
        { status: 429 },
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /digitales/marketing/videos");
  }

  const consulta = req.nextUrl.searchParams.get("q") ?? "";
  /* Vertical de fábrica: un reel es vertical. Lo apaisado se pide a propósito. */
  const vertical = req.nextUrl.searchParams.get("formato") !== "ancho";

  const r = await buscarVideos(consulta, { vertical });

  /* ⚠️ Los tres casos van separados y no como una lista vacía. "No hay videos
     de eso", "nos pasamos del tope" y "esta instalación no tiene clave" se
     arreglan de tres formas distintas, y la pantalla tiene que poder decir
     cuál es. Es la misma decisión que está anotada en `fotos-pexels`. */
  return NextResponse.json({
    videos: r.videos,
    total: r.total,
    sinCupo: r.sinCupo,
    sinClave: r.sinClave,
  });
}
