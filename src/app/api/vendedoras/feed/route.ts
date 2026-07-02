import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tiendaapps.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : (arr[0] as { url?: string })?.url ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Meta refresca feeds cada pocas horas — 30 req/hora por IP es suficiente
  if (!(await checkRateLimit(`feed:${ip}`, 30, 60 * 60_000))) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const affiliateId = searchParams.get("affiliateId")?.trim() ?? "";

  // Validar formato básico — solo letras, números y guiones (formato cuid)
  if (!affiliateId || !/^[a-z0-9_-]{10,60}$/i.test(affiliateId)) {
    return new NextResponse("affiliateId inválido", { status: 400 });
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId, isActive: true, status: "APPROVED" },
    select: {
      id: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          commissionRate: true,
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
      },
    },
  });

  if (!affiliate) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const { store } = affiliate;

  // Productos más vendidos de esta tienda (últimas 200 órdenes confirmadas)
  const topItems = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        storeId: store.id,
        status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] },
      },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });
  const topIds = new Set(topItems.map((t) => t.productId));

  const items = store.products
    .map((p) => {
      const isBestSeller = topIds.has(p.id);
      const img = parseFirstImage(p.images);
      if (!img) return null; // Meta requiere imagen — saltear si no tiene

      const affiliateLink = `${APP_URL}/tienda/${store.slug}?ref=${affiliate.id}&p=${encodeURIComponent(p.id)}`;
      const title = isBestSeller ? `⭐ Más vendido - ${p.name}` : p.name;
      const description = p.description
        ? p.description.slice(0, 500)
        : `${store.name} — Ganás ${store.commissionRate}% de comisión`;

      return `    <item>
      <g:id><![CDATA[${p.id}]]></g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(affiliateLink)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      <g:price>${p.price.toFixed(2)} ARS</g:price>
      ${p.comparePrice && p.comparePrice > p.price ? `<g:sale_price>${p.price.toFixed(2)} ARS</g:sale_price>\n      <g:price>${p.comparePrice.toFixed(2)} ARS</g:price>` : ""}
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${store.name}]]></g:brand>
      ${p.category && p.category !== "general" ? `<g:product_type><![CDATA[${p.category}]]></g:product_type>` : ""}
      ${isBestSeller ? "<g:custom_label_0>mas_vendido</g:custom_label_0>" : ""}
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(store.name)} — Catálogo de afiliada</title>
    <link>${escapeXml(`${APP_URL}/tienda/${store.slug}`)}</link>
    <description>Productos de ${escapeXml(store.name)} con links de seguimiento de comisión</description>
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
