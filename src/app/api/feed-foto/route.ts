import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Una foto de la tienda en JPG, para los catálogos de Meta (13/10/26).
 *
 * Meta acepta JPG y PNG en el catálogo y rechaza WebP, y las fotos se guardan
 * en WebP (las de producto desde hace meses; todo, desde `achicar-imagen`).
 * Acá se convierte una vez y queda en el caché de Vercel una semana: Meta
 * vuelve a pedir las fotos en cada lectura del feed y no tiene que llegar a
 * Supabase cada vez.
 *
 * Sólo fotos públicas de NUESTRO depósito: si no, cualquiera podría usar esto
 * para que el servidor baje lo que quiera.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !u.startsWith(`${base}/storage/v1/object/public/`) || u.includes("..")) {
    return new Response("No permitido", { status: 400 });
  }
  try {
    const res = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return new Response("No encontrado", { status: 404 });
    // 1600: de sobra para los 1080 que usa Meta; y por debajo de sus 8 MB.
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
