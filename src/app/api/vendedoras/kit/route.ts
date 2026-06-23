import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

// Genera el texto de la tarjeta de venta para un producto
function buildProductCard(opts: {
  productName: string;
  price: number;
  comparePrice: number | null;
  description: string | null;
  category: string;
  storeName: string;
  affiliateLink: string;
}) {
  const { productName, price, comparePrice, description, category, storeName, affiliateLink } = opts;

  const hashtags = [
    "#moda",
    "#compraonline",
    `#${storeName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    `#${category.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    "#tendencia",
    "#outfitdeldia",
    "#style",
  ].join(" ");

  const lines = [
    `✨ ${productName}`,
    "",
    comparePrice && comparePrice > price
      ? `💸 Precio: $${price.toLocaleString("es-AR")} (antes $${comparePrice.toLocaleString("es-AR")})`
      : `💰 Precio: $${price.toLocaleString("es-AR")}`,
    "",
    description ? `📝 ${description.slice(0, 200)}${description.length > 200 ? "..." : ""}` : null,
    "",
    `🛍 Comprá en ${storeName}:`,
    affiliateLink,
    "",
    hashtags,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return lines;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const affiliateId = searchParams.get("affiliateId");
  const productId = searchParams.get("productId");

  if (!affiliateId || !productId) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId, userId: user.id, isActive: true },
    include: { store: { select: { name: true, slug: true } } },
  });

  if (!affiliate) return NextResponse.json({ error: "Afiliación no encontrada" }, { status: 404 });

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: affiliate.storeId, isActive: true, deletedAt: null },
    select: { name: true, price: true, comparePrice: true, description: true, category: true, images: true },
  });

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mitienda.vercel.app";
  const affiliateLink = `${baseUrl}/tienda/${affiliate.store.slug}?ref=${affiliateId}`;

  let images: string[] = [];
  try {
    const parsed = JSON.parse(product.images);
    images = Array.isArray(parsed)
      ? parsed
          .map((i: unknown) => (typeof i === "string" ? i : (i as { url?: string })?.url ?? ""))
          .filter(Boolean)
      : [];
  } catch { /* empty */ }

  const cardText = buildProductCard({
    productName: product.name,
    price: product.price,
    comparePrice: product.comparePrice,
    description: product.description,
    category: product.category,
    storeName: affiliate.store.name,
    affiliateLink,
  });

  const hashtags = [
    "#moda",
    "#compraonline",
    `#${affiliate.store.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    `#${product.category.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    "#tendencia",
    "#outfitdeldia",
    "#style",
    "#lookdedia",
  ].join(" ");

  return NextResponse.json({
    productName: product.name,
    price: product.price,
    comparePrice: product.comparePrice,
    images,
    affiliateLink,
    cardText,
    hashtags,
    storeName: affiliate.store.name,
  });
}
