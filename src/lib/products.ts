import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export const MAX_PRODUCT_REELS = 3;
const SINGLE_VARIANT_FALLBACK_VALUE = "Unico";

export type NormalizedVariant = {
  name: string;
  value: string;
  stock: string;
  price: string;
  sku: string;
  lowStockThreshold: string;
};

export function normalizeVariants(input: unknown): NormalizedVariant[] {
  if (!Array.isArray(input)) return [];

  const variants = input
    .map((variant) => ({
      name:  typeof variant?.name  === "string" ? variant.name.trim()  : "",
      value: typeof variant?.value === "string" ? variant.value.trim() : "",
      stock: typeof variant?.stock === "string" ? variant.stock.trim() : String(variant?.stock ?? ""),
      price: typeof variant?.price === "string" ? variant.price.trim() : String(variant?.price ?? ""),
      sku:   typeof variant?.sku   === "string" ? variant.sku.trim()   : "",
      lowStockThreshold:
        typeof variant?.lowStockThreshold === "string" ? variant.lowStockThreshold.trim() : "",
    }))
    .filter((v) => v.name || v.value || v.stock || v.price || v.sku);

  if (variants.length === 1 && !variants[0].value) {
    variants[0].value = SINGLE_VARIANT_FALLBACK_VALUE;
  }

  return variants;
}

type ProductBodyRaw = {
  name?: unknown;
  price?: unknown;
  comparePrice?: unknown;
  featured?: unknown;
  precioMayorista?: unknown;
  cantMinMayorista?: unknown;
  variants?: unknown;
  reelUrls?: unknown;
  weightKg?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  depthCm?: unknown;
};

type ValidatedProductBody = {
  name: string;
  parsedPrice: number;
  parsedComparePrice: number | null;
  parsedFeatured: boolean;
  parsedPrecioMayorista: number | null;
  parsedCantMinMayorista: number | null;
  normalizedVariants: NormalizedVariant[];
  parsedWeightKg: number | null;
  parsedWidthCm: number | null;
  parsedHeightCm: number | null;
  parsedDepthCm: number | null;
};

export function validateProductBody(
  body: ProductBodyRaw
): { error: NextResponse } | ValidatedProductBody {
  const { name, price, comparePrice, featured, precioMayorista, cantMinMayorista, variants, reelUrls, weightKg, widthCm, heightCm, depthCm } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { error: NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 }) };
  }
  if (name.trim().length > 200) {
    return { error: NextResponse.json({ error: "El nombre no puede superar 200 caracteres" }, { status: 400 }) };
  }

  const { description, category, subcategory, tags, attributes } = body as {
    description?: unknown; category?: unknown; subcategory?: unknown; tags?: unknown; attributes?: unknown;
  };
  if (description && typeof description === "string" && description.length > 8000) {
    return { error: NextResponse.json({ error: "La descripción no puede superar 8000 caracteres" }, { status: 400 }) };
  }
  if (category && typeof category === "string" && category.length > 100) {
    return { error: NextResponse.json({ error: "La categoría no puede superar 100 caracteres" }, { status: 400 }) };
  }
  if (subcategory && typeof subcategory === "string" && subcategory.length > 100) {
    return { error: NextResponse.json({ error: "La subcategoría no puede superar 100 caracteres" }, { status: 400 }) };
  }
  if (Array.isArray(tags)) {
    if (tags.length > 30) {
      return { error: NextResponse.json({ error: "Podés agregar hasta 30 tags" }, { status: 400 }) };
    }
    if (tags.some((t) => typeof t === "string" && t.length > 50)) {
      return { error: NextResponse.json({ error: "Cada tag no puede superar 50 caracteres" }, { status: 400 }) };
    }
  }
  if (Array.isArray(attributes)) {
    if (attributes.length > 50) {
      return { error: NextResponse.json({ error: "Podés agregar hasta 50 atributos" }, { status: 400 }) };
    }
    const tooLong = attributes.some((a) => {
      if (!a || typeof a !== "object") return false;
      const { key, value } = a as { key?: unknown; value?: unknown };
      return (typeof key === "string" && key.length > 200) || (typeof value === "string" && value.length > 500);
    });
    if (tooLong) {
      return { error: NextResponse.json({ error: "El nombre o valor de un atributo es demasiado largo" }, { status: 400 }) };
    }
  }

  const parsedPrice = parseFloat(price as string);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return { error: NextResponse.json({ error: "El precio debe ser un número mayor a 0" }, { status: 400 }) };
  }

  const parsedComparePrice = comparePrice ? parseFloat(comparePrice as string) : null;
  if (comparePrice && (isNaN(parsedComparePrice!) || parsedComparePrice! <= 0)) {
    return { error: NextResponse.json({ error: "El precio tachado debe ser un número mayor a 0" }, { status: 400 }) };
  }
  if (parsedComparePrice !== null && parsedComparePrice <= parsedPrice) {
    return { error: NextResponse.json({ error: "El precio tachado debe ser mayor al precio actual (para mostrar un descuento real)" }, { status: 400 }) };
  }

  const parsedPrecioMayorista = precioMayorista ? parseFloat(precioMayorista as string) : null;
  if (precioMayorista && (isNaN(parsedPrecioMayorista!) || parsedPrecioMayorista! <= 0)) {
    return { error: NextResponse.json({ error: "El precio mayorista debe ser un número mayor a 0" }, { status: 400 }) };
  }
  if (parsedPrecioMayorista !== null && parsedPrecioMayorista >= parsedPrice) {
    return { error: NextResponse.json({ error: "El precio mayorista debe ser menor al precio de lista" }, { status: 400 }) };
  }

  const parsedCantMinMayorista = cantMinMayorista ? parseInt(cantMinMayorista as string) : null;
  if (cantMinMayorista && (isNaN(parsedCantMinMayorista!) || parsedCantMinMayorista! <= 0)) {
    return { error: NextResponse.json({ error: "La cantidad mínima mayorista debe ser un número mayor a 0" }, { status: 400 }) };
  }
  if (parsedPrecioMayorista !== null && parsedCantMinMayorista === null) {
    return { error: NextResponse.json({ error: "Si completás el precio mayorista, también tenés que indicar la cantidad mínima" }, { status: 400 }) };
  }
  if (parsedCantMinMayorista !== null && parsedPrecioMayorista === null) {
    return { error: NextResponse.json({ error: "Si completás la cantidad mínima mayorista, también tenés que indicar el precio mayorista" }, { status: 400 }) };
  }

  function parsePositiveDimension(value: unknown, label: string): { error: NextResponse } | { value: number | null } {
    if (!value) return { value: null };
    const parsed = parseFloat(value as string);
    if (isNaN(parsed) || parsed <= 0) {
      return { error: NextResponse.json({ error: `${label} debe ser un número mayor a 0` }, { status: 400 }) };
    }
    return { value: parsed };
  }

  const weightResult = parsePositiveDimension(weightKg, "El peso");
  if ("error" in weightResult) return weightResult;
  const heightResult = parsePositiveDimension(heightCm, "El alto");
  if ("error" in heightResult) return heightResult;
  const widthResult = parsePositiveDimension(widthCm, "El ancho");
  if ("error" in widthResult) return widthResult;
  const depthResult = parsePositiveDimension(depthCm, "La profundidad");
  if ("error" in depthResult) return depthResult;

  const normalizedVariants = normalizeVariants(variants);
  if (normalizedVariants.length === 0) {
    return { error: NextResponse.json({ error: "El producto debe tener al menos una variante con stock" }, { status: 400 }) };
  }
  for (const v of normalizedVariants) {
    if (!v.name || !v.value) {
      return { error: NextResponse.json({ error: "Cada variante debe tener nombre y valor" }, { status: 400 }) };
    }
    const stock = parseInt(v.stock);
    if (isNaN(stock) || stock < 0) {
      return { error: NextResponse.json({ error: "El stock de variantes debe ser un número >= 0" }, { status: 400 }) };
    }
    if (v.lowStockThreshold) {
      const threshold = parseInt(v.lowStockThreshold);
      if (isNaN(threshold) || threshold < 0) {
        return { error: NextResponse.json({ error: "La alerta de stock bajo debe ser un número >= 0" }, { status: 400 }) };
      }
    }
  }

  if (Array.isArray(reelUrls) && reelUrls.length > MAX_PRODUCT_REELS) {
    return { error: NextResponse.json({ error: `Podes subir hasta ${MAX_PRODUCT_REELS} reels por producto` }, { status: 400 }) };
  }

  return {
    name: (name as string).trim(),
    parsedPrice,
    parsedComparePrice,
    parsedFeatured: featured === true,
    parsedPrecioMayorista,
    parsedCantMinMayorista,
    normalizedVariants,
    parsedWeightKg: weightResult.value,
    parsedHeightCm: heightResult.value,
    parsedWidthCm: widthResult.value,
    parsedDepthCm: depthResult.value,
  };
}

export async function getOwnerStore(): Promise<
  { error: NextResponse } | { storeId: string; ownerId: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, ownerId: true },
  });

  if (!store) return { error: NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 }) };
  return { storeId: store.id, ownerId: store.ownerId };
}
