import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeXml, parseFirstImage } from "@/lib/metaFeed";
import { getClientIp } from "@/lib/request-ip";
// El feed lo lee Meta desde afuera: los links de producto tienen que apuntar al
// dominio público, nunca al localhost del que generó el feed.
import { PUBLIC_APP_URL as APP_URL } from "@/lib/site";

// GET /api/store/feed?store=<slug>
// Feed XML del catálogo completo de la tienda, para conectar en Meta Commerce Manager.
// Es el catálogo tal cual del titular: no lleva link de afiliado ni comisión.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  // Meta refresca feeds cada pocas horas — 30 req/hora por IP es suficiente
  if (!(await checkRateLimit(`store-feed:${ip}`, 30, 60 * 60_000))) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("store")?.trim() ?? "";

  if (!slug || !/^[a-z0-9-]{1,80}$/i.test(slug)) {
    return new NextResponse("store inválido", { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, isPublished: true },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      products: {
        where: { isActive: true, deletedAt: null, soloMayorista: false },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          comparePrice: true,
          images: true,
          category: true,
        },
        take: 500,
      },
    },
  });

  if (!store) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const items = store.products
    .map((p) => {
      const img = parseFirstImage(p.images);
      if (!img) return null; // Meta requiere imagen — saltear si no tiene

      const link = `${APP_URL}/tienda/${store.slug}/producto/${encodeURIComponent(p.id)}`;
      // Sin descripción propia, el nombre del producto informa más que el de la tienda.
      const description = p.description ? p.description.slice(0, 500) : p.name;

      // Si hay precio tachado, ese es el precio de lista y el actual es la
      // oferta. Meta espera g:price = lista y g:sale_price = promo, cada uno
      // una sola vez (antes se emitía g:price duplicado y el descuento se perdía).
      const hasSale = p.comparePrice != null && p.comparePrice > p.price;
      const priceTags = hasSale
        ? `<g:price>${p.comparePrice!.toFixed(2)} ${store.currency}</g:price>
      <g:sale_price>${p.price.toFixed(2)} ${store.currency}</g:sale_price>`
        : `<g:price>${p.price.toFixed(2)} ${store.currency}</g:price>`;

      return `    <item>
      <g:id><![CDATA[${p.id}]]></g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      ${priceTags}
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${store.name}]]></g:brand>
      ${p.category && p.category !== "general" ? `<g:product_type><![CDATA[${p.category}]]></g:product_type>` : ""}
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(store.name)} — Catálogo</title>
    <link>${escapeXml(`${APP_URL}/tienda/${store.slug}`)}</link>
    <description>Catálogo de productos de ${escapeXml(store.name)}</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Meta puede cachear hasta 1 hora antes de refrescar
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
