import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import sanitizeHtml from "sanitize-html";

const DESCRIPTION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "strong", "em", "u", "s", "ul", "ol", "li", "br"],
  allowedAttributes: {
    p: ["style"],
  },
  allowedStyles: {
    p: { "text-align": [/^(left|center|right|justify)$/] },
  },
};

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

// Estructura de un escalón de precio mayorista.
// "desde" = cantidad mínima para aplicar este precio; "precio" = precio por unidad.
export type PrecioEscalon = { desde: number; precio: number };

// Número máximo de escalones por producto (anti-abuso).
export const MAX_ESCALONES = 3;

type ProductBodyRaw = {
  name?: unknown;
  price?: unknown;
  comparePrice?: unknown;
  featured?: unknown;
  precioMayorista?: unknown;
  cantMinMayorista?: unknown;
  preciosEscalonados?: unknown;
  soloMayorista?: unknown;
  cuotas?: unknown;
  variants?: unknown;
  reelUrls?: unknown;
  weightKg?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  depthCm?: unknown;
  promoQtyMin?: unknown;
  promoQtyDiscount?: unknown;
  promoType?: unknown;
  promoPayQty?: unknown;
  offerBadge?: unknown;
  offerNote?: unknown;
  offerEndsAt?: unknown;
};

type ValidatedProductBody = {
  name: string;
  sanitizedDescription: string;
  parsedPrice: number;
  parsedComparePrice: number | null;
  parsedFeatured: boolean;
  parsedPrecioMayorista: number | null;
  parsedCantMinMayorista: number | null;
  parsedPreciosEscalonados: PrecioEscalon[];
  parsedSoloMayorista: boolean;
  parsedCuotas: number;
  normalizedVariants: NormalizedVariant[];
  parsedWeightKg: number | null;
  parsedWidthCm: number | null;
  parsedHeightCm: number | null;
  parsedDepthCm: number | null;
  parsedPromoQtyMin: number | null;
  parsedPromoQtyDiscount: number | null;
  parsedPromoType: string;
  parsedPromoPayQty: number | null;
  parsedOfferBadge: string | null;
  parsedOfferNote: string | null;
  parsedOfferEndsAt: Date | null;
};

const VALID_OFFER_BADGES = new Set(["OFERTA", "SALE", "PCT"]);

export function validateProductBody(
  body: ProductBodyRaw
): { error: NextResponse } | ValidatedProductBody {
  const { name, price, comparePrice, featured, precioMayorista, cantMinMayorista, preciosEscalonados, soloMayorista, cuotas, variants, reelUrls, weightKg, widthCm, heightCm, depthCm, promoQtyMin, promoQtyDiscount, promoType, promoPayQty, offerBadge, offerNote, offerEndsAt } = body;

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
  const sanitizedDescription = typeof description === "string"
    ? sanitizeHtml(description, DESCRIPTION_SANITIZE_OPTIONS)
    : "";
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

  // ── Escalones de precio mayorista ──────────────────────────────────────────
  // Formato esperado: array de objetos {desde: integer ≥ 2, precio: float > 0}
  // Reglas de seguridad: máximo MAX_ESCALONES, "desde" ascendente y único,
  // cada "desde" > cantMinMayorista, cada "precio" < precioMayorista y < price.
  let parsedPreciosEscalonados: PrecioEscalon[] = [];
  if (preciosEscalonados !== undefined && preciosEscalonados !== null && preciosEscalonados !== "") {
    let raw: unknown;
    if (typeof preciosEscalonados === "string") {
      try { raw = JSON.parse(preciosEscalonados); } catch {
        return { error: NextResponse.json({ error: "El formato de los escalones de precio no es válido" }, { status: 400 }) };
      }
    } else {
      raw = preciosEscalonados;
    }
    if (!Array.isArray(raw)) {
      return { error: NextResponse.json({ error: "Los escalones de precio deben ser un array" }, { status: 400 }) };
    }
    if (raw.length > MAX_ESCALONES) {
      return { error: NextResponse.json({ error: `Podés agregar hasta ${MAX_ESCALONES} escalones de precio por mayor` }, { status: 400 }) };
    }
    // Solo procesamos si hay precio base mayorista configurado
    if (raw.length > 0 && parsedPrecioMayorista === null) {
      return { error: NextResponse.json({ error: "Para agregar escalones de precio, primero configurá el precio por mayor base" }, { status: 400 }) };
    }
    const escalones: PrecioEscalon[] = [];
    const desdeVisto = new Set<number>();
    for (let i = 0; i < raw.length; i++) {
      const band = raw[i];
      if (!band || typeof band !== "object" || Array.isArray(band)) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: formato inválido` }, { status: 400 }) };
      }
      // Extraer solo los campos permitidos (strip extra keys)
      const { desde: desdeRaw, precio: precioRaw } = band as Record<string, unknown>;
      const desde = typeof desdeRaw === "string" ? parseInt(desdeRaw) : (typeof desdeRaw === "number" ? Math.trunc(desdeRaw) : NaN);
      const precio = typeof precioRaw === "string" ? parseFloat(precioRaw) : (typeof precioRaw === "number" ? precioRaw : NaN);
      if (!Number.isInteger(desde) || desde < 2) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: la cantidad mínima debe ser un número entero ≥ 2` }, { status: 400 }) };
      }
      if (isNaN(precio) || precio <= 0) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: el precio debe ser mayor a 0` }, { status: 400 }) };
      }
      if (parsedCantMinMayorista !== null && desde <= parsedCantMinMayorista) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: la cantidad mínima (${desde}) debe ser mayor a la cantidad base (${parsedCantMinMayorista})` }, { status: 400 }) };
      }
      if (desdeVisto.has(desde)) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: cantidad duplicada (${desde})` }, { status: 400 }) };
      }
      desdeVisto.add(desde);
      if (precio >= parsedPrecioMayorista!) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: el precio mayorista escalonado debe ser menor al precio mayorista base` }, { status: 400 }) };
      }
      if (precio >= parsedPrice) {
        return { error: NextResponse.json({ error: `Escalón ${i + 1}: el precio escalonado debe ser menor al precio de lista` }, { status: 400 }) };
      }
      escalones.push({ desde, precio });
    }
    // Verificar orden estrictamente ascendente por "desde"
    for (let i = 1; i < escalones.length; i++) {
      if (escalones[i].desde <= escalones[i - 1].desde) {
        return { error: NextResponse.json({ error: "Los escalones deben estar ordenados por cantidad mínima de forma ascendente" }, { status: 400 }) };
      }
    }
    parsedPreciosEscalonados = escalones;
  }

  // ── Producto solo mayorista ────────────────────────────────────────────────
  // Se acepta como booleano; el API route verifica adicionalmente que la tienda
  // tenga mayorista habilitado antes de persistir true.
  const parsedSoloMayorista = soloMayorista === true || soloMayorista === "true";

  const CUOTAS_OPTIONS = [0, 3, 6, 12];
  const parsedCuotas = typeof cuotas === "number" ? cuotas : parseInt((cuotas as string) ?? "0") || 0;
  if (!CUOTAS_OPTIONS.includes(parsedCuotas)) {
    return { error: NextResponse.json({ error: "Las cuotas deben ser 0 (sin cuotas), 3, 6 o 12" }, { status: 400 }) };
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

  // ── Promoción por cantidad (retail) ───────────────────────────────────────
  const parsedPromoType = (promoType === "N_PAY_M" ? "N_PAY_M" : "PERCENT") as string;
  const parsedPromoQtyMin = promoQtyMin ? parseInt(promoQtyMin as string) : null;
  if (promoQtyMin && (isNaN(parsedPromoQtyMin!) || parsedPromoQtyMin! < 2)) {
    return { error: NextResponse.json({ error: "La cantidad mínima de la promo debe ser 2 o más" }, { status: 400 }) };
  }
  const parsedPromoPayQty = promoPayQty ? parseInt(promoPayQty as string) : null;
  if (parsedPromoType === "N_PAY_M" && parsedPromoQtyMin !== null) {
    if (!parsedPromoPayQty || parsedPromoPayQty < 1 || parsedPromoPayQty >= parsedPromoQtyMin) {
      return { error: NextResponse.json({ error: "En la promo N pagá M, M debe ser menor que N y mayor a 0" }, { status: 400 }) };
    }
  }
  const parsedPromoQtyDiscount = parsedPromoType === "N_PAY_M" && parsedPromoQtyMin && parsedPromoPayQty
    ? Math.round((parsedPromoQtyMin - parsedPromoPayQty) / parsedPromoQtyMin * 100 * 100) / 100
    : promoQtyDiscount ? parseFloat(promoQtyDiscount as string) : null;
  if (parsedPromoType === "PERCENT" && promoQtyDiscount && (isNaN(parsedPromoQtyDiscount!) || parsedPromoQtyDiscount! <= 0 || parsedPromoQtyDiscount! > 80)) {
    return { error: NextResponse.json({ error: "El descuento de la promo debe ser entre 1 y 80%" }, { status: 400 }) };
  }
  if (parsedPromoQtyMin !== null && parsedPromoQtyDiscount === null) {
    return { error: NextResponse.json({ error: "Si configurás una promo, completá el descuento o el tipo N pagá M" }, { status: 400 }) };
  }

  const parsedOfferBadge = typeof offerBadge === "string" && VALID_OFFER_BADGES.has(offerBadge)
    ? offerBadge
    : null;

  if (offerNote && typeof offerNote === "string" && offerNote.trim().length > 200) {
    return { error: NextResponse.json({ error: "La nota de la oferta no puede superar 200 caracteres" }, { status: 400 }) };
  }
  const parsedOfferNote = typeof offerNote === "string" && offerNote.trim().length > 0
    ? offerNote.trim().replace(/<[^>]*>/g, "").slice(0, 200)
    : null;

  let parsedOfferEndsAt: Date | null = null;
  if (offerEndsAt && typeof offerEndsAt === "string" && offerEndsAt.trim()) {
    const d = new Date(offerEndsAt.trim());
    if (isNaN(d.getTime())) {
      return { error: NextResponse.json({ error: "La fecha de vencimiento de la oferta no es válida" }, { status: 400 }) };
    }
    parsedOfferEndsAt = d;
  }

  return {
    name: (name as string).trim(),
    sanitizedDescription,
    parsedPrice,
    parsedComparePrice,
    parsedFeatured: featured === true,
    parsedPrecioMayorista,
    parsedCantMinMayorista,
    parsedPreciosEscalonados,
    parsedSoloMayorista,
    parsedCuotas,
    normalizedVariants,
    parsedWeightKg: weightResult.value,
    parsedHeightCm: heightResult.value,
    parsedWidthCm: widthResult.value,
    parsedDepthCm: depthResult.value,
    parsedPromoQtyMin,
    parsedPromoQtyDiscount,
    parsedPromoType,
    parsedPromoPayQty,
    parsedOfferBadge,
    parsedOfferNote,
    parsedOfferEndsAt,
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
