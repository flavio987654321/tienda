import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore, checkCupoDeProductos, checkRitmoDeCreacion } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  // Duplicar es la vía más barata de todas para el que quiere llenar la base:
  // un POST sin cuerpo que copia un producto entero con sus variantes.
  const ritmo = await checkRitmoDeCreacion(auth.ownerId, "duplicar", 60);
  if (ritmo) return ritmo;
  const cupo = await checkCupoDeProductos(auth.storeId, auth.ownerId, 1);
  if (cupo) return cupo;

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
      costPrice:        source.costPrice,
      images:           source.images,
      category:         source.category,
      subcategory:      source.subcategory,
      tags:             source.tags,
      attributes:       source.attributes,
      reelUrls:         source.reelUrls,
      precioMayorista:  source.precioMayorista,
      cantMinMayorista: source.cantMinMayorista,
      cuotas:           source.cuotas,
      // El título para Google NO se copia: es específico del producto original y
      // dos fichas con el mismo título compiten entre sí en los resultados. La
      // copia arranca con el automático, que ya sale del nombre nuevo ("Copia
      // de …") y obliga a repasarlo antes de publicar.
      // La descripción sí se copia: describe el producto, que es el mismo.
      seoDescription:   source.seoDescription,
      // El archivo SÍ se copia: sin esto la copia de un producto digital nacía
      // sin nada que entregar, y al publicarla se vendía algo que el comprador
      // nunca iba a recibir. Las dos apuntan al mismo objeto del bucket, que es
      // lo correcto — es el mismo archivo, vendido dos veces.
      archivoPath:      source.archivoPath,
      archivoNombre:    source.archivoNombre,
      archivoPeso:      source.archivoPeso,
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
