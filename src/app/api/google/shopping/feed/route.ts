import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeXml, parseFirstImage } from "@/lib/metaFeed";
import { getClientIp } from "@/lib/request-ip";
import { SITE_URL } from "@/lib/site";
import { aTextoPlano } from "@/lib/structured-data";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;

// Tope por tienda para que el feed no crezca sin control si una tienda tiene
// un catálogo enorme. Google admite feeds grandes, pero conviene acotarlo.
const MAX_PRODUCTS_PER_STORE = 500;

// La descripción se guarda como HTML sanitizado (editor de texto enriquecido),
// pero Google la quiere en texto plano.
//
// La función se mudó a `lib/structured-data` y ahora es compartida: acá era el
// único lugar que se acordaba de aplanarla, así que la ficha de producto —que le
// manda la MISMA descripción a Google, por <meta> y por datos estructurados— la
// publicaba con las etiquetas puestas. Dos copias del mismo criterio terminan
// siempre igual: una se arregla y la otra no.
const toPlainText = aTextoPlano;

// GET /api/google/shopping/feed
// Feed XML central de Google Shopping: junta los productos de TODAS las tiendas
// que instalaron la app (opt-in explícito vía Store.gsEnabledAt). Se carga una
// sola vez como fuente de datos en el Merchant Center de la plataforma — cuando
// una tienda instala o desinstala, entra o sale sola en la próxima lectura.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  // Google refresca el feed ~1 vez por día; 30 req/hora por IP sobra.
  if (!(await checkRateLimit(`google-shopping-feed:${ip}`, 30, 60 * 60_000))) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const stores = await prisma.store.findMany({
    where: {
      gsEnabledAt: { not: null },
      isActive: true,
      isPublished: true,
    },
    select: {
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
          variants: { select: { stock: true } },
        },
        take: MAX_PRODUCTS_PER_STORE,
      },
    },
  });

  const items = stores
    .flatMap((store) =>
      store.products.map((p) => {
        const img = parseFirstImage(p.images);
        if (!img) return null; // Google exige imagen — saltear si no tiene

        const link = `${APP_URL}/tienda/${store.slug}/producto/${encodeURIComponent(p.id)}`;
        const description = p.description ? toPlainText(p.description).slice(0, 5000) : store.name;

        // Sin variantes no hay forma de saber el stock, así que se asume
        // disponible; con variantes, alcanza con que una tenga stock.
        const inStock = p.variants.length === 0 || p.variants.some((v) => v.stock > 0);

        // Si hay precio tachado, ese es el precio de lista y el actual es la
        // oferta. Google espera g:price = lista y g:sale_price = promo.
        const hasSale = p.comparePrice != null && p.comparePrice > p.price;
        const priceTag = hasSale
          ? `<g:price>${p.comparePrice!.toFixed(2)} ${store.currency}</g:price>
      <g:sale_price>${p.price.toFixed(2)} ${store.currency}</g:sale_price>`
          : `<g:price>${p.price.toFixed(2)} ${store.currency}</g:price>`;

        return `    <item>
      <g:id><![CDATA[${p.id}]]></g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      ${priceTag}
      <g:availability>${inStock ? "in stock" : "out of stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${store.name}]]></g:brand>${
        p.category && p.category !== "general"
          ? `\n      <g:product_type><![CDATA[${p.category}]]></g:product_type>`
          : ""
      }
    </item>`;
      })
    )
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>TiendaApps — Catálogo</title>
    <link>${escapeXml(APP_URL)}</link>
    <description>Productos de las tiendas de TiendaApps publicados en Google Shopping</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
