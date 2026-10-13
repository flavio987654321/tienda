import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { urlDeDescargaPermitida } from "@/lib/url-utils";

export const runtime = "nodejs";

/**
 * El logo de la tienda para el mail de novedades, en PNG y chico (13/10/26).
 *
 * El mail apuntaba directo al archivo de Supabase. Dos problemas: cada persona
 * que abría el mail lo bajaba de Supabase —que cobra el tráfico—, y desde que lo
 * que se sube se guarda en WebP (ver `achicar-imagen`), Outlook de escritorio no
 * lo iba a mostrar. Acá se convierte una vez y queda en el caché de Vercel un
 * día: un envío a 500 suscriptores es UN pedido a Supabase, no 500.
 *
 * Si algo falla, 404: el mail lo muestra roto, igual que antes con un logo
 * borrado. No hay nada que reintentar desde un cliente de correo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug }, select: { logo: true } });
  const url = store?.logo ? urlDeDescargaPermitida(store.logo) : null;
  if (!url) return new Response("Not found", { status: 404 });
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return new Response("Not found", { status: 404 });
    // 440 = el doble de los 220 px que ocupa como mucho en el mail, para pantallas nítidas.
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: 440, height: 104, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
