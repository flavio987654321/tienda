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
  precioMayorista?: unknown;
  cantMinMayorista?: unknown;
  variants?: unknown;
  reelUrls?: unknown;
};

type ValidatedProductBody = {
  name: string;
  parsedPrice: number;
  parsedComparePrice: number | null;
  parsedPrecioMayorista: number | null;
  parsedCantMinMayorista: number | null;
  normalizedVariants: NormalizedVariant[];
};

export function validateProductBody(
  body: ProductBodyRaw
): { error: NextResponse } | ValidatedProductBody {
  const { name, price, comparePrice, precioMayorista, cantMinMayorista, variants, reelUrls } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { error: NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 }) };
  }
  if (name.trim().length > 200) {
    return { error: NextResponse.json({ error: "El nombre no puede superar 200 caracteres" }, { status: 400 }) };
  }

  const { description } = body as { description?: unknown };
  if (description && typeof description === "string" && description.length > 8000) {
    return { error: NextResponse.json({ error: "La descripción no puede superar 8000 caracteres" }, { status: 400 }) };
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
  if (parsedPrecioMayorista !== null && parsedPrecioMayorista >= parsedPrice) {
    return { error: NextResponse.json({ error: "El precio mayorista debe ser menor al precio de lista" }, { status: 400 }) };
  }

  const parsedCantMinMayorista = cantMinMayorista ? parseInt(cantMinMayorista as string) : null;

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

  return { name: (name as string).trim(), parsedPrice, parsedComparePrice, parsedPrecioMayorista, parsedCantMinMayorista, normalizedVariants };
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
