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
 * ── El freno ───────────────────────────────────────────────────────────────
 *
 * 60 búsquedas por hora y por cuenta. Buscar es barato para quien busca —se
 * escribe una palabra y se aprieta— y caro para nosotros, y encima hay un
 * guardarropas de 24 horas por delante que hace que las repetidas no lleguen
 * al banco. Sesenta alcanza de sobra para una tarde de buscar material.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`digital-videos:${user.id}`, 60, 60 * 60 * 1000))) {
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
