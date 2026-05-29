import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const source = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    include: { variants: true },
  });

  if (!source) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const copy = await prisma.product.create({
    data: {
      storeId:          auth.storeId,
      name:             `Copia de ${source.name}`,
      description:      source.description,
      price:            source.price,
      comparePrice:     source.comparePrice,
      images:           source.images,
      category:         source.category,
      subcategory:      source.subcategory,
      tags:             source.tags,
      attributes:       source.attributes,
      reelUrls:         source.reelUrls,
      precioMayorista:  source.precioMayorista,
      cantMinMayorista: source.cantMinMayorista,
      isActive:         false,
      variants: {
        create: source.variants.map(v => ({
          name:  v.name,
          value: v.value,
          stock: v.stock,
          price: v.price,
          sku:   v.sku ?? undefined,
        })),
      },
    },
    include: { variants: true },
  });

  return NextResponse.json({ product: copy }, { status: 201 });
}
