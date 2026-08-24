import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";
import { PRO_MAX_PRODUCTS, MAX_PRODUCTS_POR_TIENDA } from "@/lib/planLimits";
import sanitizeHtml from "sanitize-html";
import { DESCRIPTION_TEXT_COLORS } from "@/lib/richTextColors";

// Solo se acepta exactamente uno de los hex de la paleta cerrada del editor
// (ver richTextColors.ts) — así un POST directo a la API (sin pasar por el
// editor) no puede colar un `style` arbitrario.
const ALLOWED_TEXT_COLOR = new RegExp(
  `^(${DESCRIPTION_TEXT_COLORS.map((c) => c.value).join("|")})$`,
  "i"
);

const DESCRIPTION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "strong", "em", "u", "s", "ul", "ol", "li", "br", "span", "a"],
  allowedAttributes: {
    p: ["style"],
    span: ["style"],
    // target/rel se permiten porque el transformTags de abajo los fuerza a
    // valores seguros — sin listarlos acá, sanitize-html los borraría después
    // de agregarlos y los links terminarían abriendo en el mismo tab.
    a: ["href", "target", "rel"],
  },
  allowedStyles: {
    p: { "text-align": [/^(left|center|right|justify)$/] },
    span: { color: [ALLOWED_TEXT_COLOR] },
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Fuerza target/rel seguros sin importar lo que haya guardado el editor —
  // así un link nunca puede abrir la tienda en el mismo tab ni pasar referrer.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }, true),
  },
};

/* ── El color de la descripción se perdía al guardar ───────────────────────────
   El editor (TipTap) guarda el color leyendo `element.style.color` del DOM, y el
   navegador normaliza CUALQUIER color a `rgb(r, g, b)`. O sea que una descripción
   que se abre y se vuelve a guardar no llega con el `#ef4444` que eligió el dueño
   sino con `rgb(239, 68, 68)` — y el allowlist de acá abajo es de hex, así que le
   borraba el `style` y dejaba un `<span>` pelado. El dueño elegía el color, lo
   veía bien mientras editaba, y al volver a la ficha no estaba más.

   Se normaliza a hex ANTES de sanear en vez de aceptar `rgb()` en el allowlist:
   así la lista sigue siendo los 8 colores exactos de la paleta y un POST directo
   a la API tampoco puede colar un color arbitrario en otro formato.

   Corre sobre todo el HTML, pero eso no afloja nada: después pasa igual por
   sanitize-html, que solo deja `color` y `text-align` en `<p>` y `<span>`.
──────────────────────────────────────────────────────────────────────────────── */
function normalizarColoresAHex(html: string): string {
  return html.replace(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)/gi,
    (_m, r: string, g: string, b: string) => {
      const dosDigitos = (n: string) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0");
      return `#${dosDigitos(r)}${dosDigitos(g)}${dosDigitos(b)}`;
    }
  );
}

// Sanitiza una descripción de producto con la misma allowlist que usa el
// formulario. Exportada para que el import CSV (u otros orígenes) no pueda
// guardar HTML sin filtrar — la descripción se renderiza con
// dangerouslySetInnerHTML en la tienda pública, así que TODO camino de escritura
// debe pasar por acá.
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(normalizarColoresAHex(html), DESCRIPTION_SANITIZE_OPTIONS);
}

export const MAX_PRODUCT_REELS = 3;

// Tope de fotos por producto — debe coincidir con MAX_PRODUCT_IMAGES del
// formulario (nuevo/page.tsx). Se aplica también en el servidor para que un POST
// directo a la API no pueda guardar cientos de imágenes.
export const MAX_PRODUCT_IMAGES = 8;
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

  // Un producto sin NINGUNA variante no tiene dónde guardar stock: el stock vive
  // en ProductVariant, `Product` no tiene columna. Ese producto quedaba con las
  // tres respuestas a la vez: "sin stock" en el panel (la suma de cero variantes
  // da 0), "disponible" en la tienda (el cartel exige variants.length > 0) y
  // vendible en el checkout (solo descuenta stock si hay variante).
  //
  // Se llega ahí vaciando los campos de la única fila de variante en el
  // formulario. En vez de arrastrar el caso hasta las diez plantillas, se cierra
  // acá: siempre queda una fila. Si el dueño no puso stock, es 0 — que es lo que
  // el panel ya le venía diciendo.
  if (variants.length === 0) {
    return [{ name: "Unidad", value: SINGLE_VARIANT_FALLBACK_VALUE, stock: "0", price: "", sku: "", lowStockThreshold: "" }];
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
  costPrice?: unknown;
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
  offerBadge?: unknown;
  offerNote?: unknown;
  offerEndsAt?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
};

type ValidatedProductBody = {
  name: string;
  sanitizedDescription: string;
  parsedPrice: number;
  parsedComparePrice: number | null;
  parsedCostPrice: number | null;
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
  parsedOfferBadge: string | null;
  parsedOfferNote: string | null;
  parsedOfferEndsAt: Date | null;
  parsedSeoTitle: string | null;
  parsedSeoDescription: string | null;
};

const VALID_OFFER_BADGES = new Set(["OFERTA", "SALE", "PCT"]);

/* ── Título y descripción para Google ────────────────────────────────────────
   Los topes de acá NO son los 60/160 que recomienda Google: esos son cuánto
   MUESTRA en el resultado, y pasarse no invalida nada —se corta y listo—. El
   aviso de que se va a cortar va en el formulario, que es donde se puede
   explicar; rebotar el guardado por eso sería frenar a la dueña por una
   recomendación de estilo.

   Lo que sí se corta acá es lo absurdo, para que nadie use estos campos como
   depósito de texto: son etiquetas, no descripciones.                          */
const MAX_SEO_TITLE = 200;
const MAX_SEO_DESCRIPTION = 500;

/** Texto opcional que se guarda como null cuando queda vacío.
 *  null significa "armalo solo": es la diferencia entre no haberlo escrito nunca
 *  y haberlo borrado a propósito, y las dos cosas tienen que volver al
 *  automático. Guardar "" haría que la ficha saliera con el título en blanco. */
function textoSeoOpcional(valor: unknown, tope: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  return limpio.slice(0, tope);
}

export function validateProductBody(
  body: ProductBodyRaw
): { error: NextResponse } | ValidatedProductBody {
  const { name, price, comparePrice, costPrice, precioMayorista, cantMinMayorista, preciosEscalonados, soloMayorista, cuotas, variants, reelUrls, weightKg, widthCm, heightCm, depthCm, offerBadge, offerNote, offerEndsAt, seoTitle, seoDescription } = body;

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
  // Por `sanitizeDescription`, que ademas normaliza los colores a hex — este era
  // el camino del formulario y se le escapaba.
  const sanitizedDescription = typeof description === "string"
    ? sanitizeDescription(description)
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

  // Costo interno (opcional) — nunca se muestra en la tienda, solo se usa para
  // calcular el margen de ganancia del dueño. Sin tope respecto al precio de
  // venta: si el costo supera el precio, el margen se muestra negativo (venta
  // a pérdida) en vez de bloquear el guardado.
  const parsedCostPrice = costPrice ? parseFloat(costPrice as string) : null;
  if (costPrice && (isNaN(parsedCostPrice!) || parsedCostPrice! <= 0)) {
    return { error: NextResponse.json({ error: "El costo debe ser un número mayor a 0" }, { status: 400 }) };
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

  if (Array.isArray(reelUrls)) {
    if (reelUrls.length > MAX_PRODUCT_REELS) {
      return { error: NextResponse.json({ error: `Podes subir hasta ${MAX_PRODUCT_REELS} reels por producto` }, { status: 400 }) };
    }
    // El storefront renderiza estas URLs en un <a href> y en un <iframe>. Sin
    // validar el esquema, un "javascript:..." guardado por un POST directo o por
    // una cuenta comprometida le ejecuta codigo al comprador en el origen de la
    // tienda. El cliente valida lo mismo; esta es la cerradura que importa.
    if (!reelUrls.every((u) => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim()))) {
      return { error: NextResponse.json({ error: "Los videos deben ser links que empiecen con http:// o https://" }, { status: 400 }) };
    }
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
    parsedCostPrice,
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
    parsedOfferBadge,
    parsedOfferNote,
    parsedOfferEndsAt,
    parsedSeoTitle: textoSeoOpcional(seoTitle, MAX_SEO_TITLE),
    parsedSeoDescription: textoSeoOpcional(seoDescription, MAX_SEO_DESCRIPTION),
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

/* ── Freno anti-abuso de todo lo que crea productos ─────────────────────────
   Las tres rutas que crean productos —alta suelta, importación de CSV y
   duplicar— no tenían ni tope de cantidad ni límite de ritmo. Autenticadas sí
   estaban, y siempre escriben en la tienda del que tiene la sesión, así que
   nunca se le pudo meter un producto a la tienda de otro. El agujero era otro:
   anotarse (la prueba es gratis y no pide tarjeta) y disparar el import en un
   bucle, 500 productos por llamada, hasta llenar la base.

   Son dos frenos distintos porque atajan dos cosas distintas: el TECHO acota el
   total que puede llegar a existir, y el RITMO acota cuánto se puede escribir
   por minuto — que es lo que protege a la base mientras el techo todavía no se
   alcanzó. Los dos avisan con un texto que sirve también cuando el que lo choca
   es alguien de verdad con un CSV mal armado. */

/**
 * ¿Entra una tanda de `cuantos` productos en lo que le queda a esta tienda?
 * Devuelve la respuesta de error si no entra, o `null` si puede seguir.
 *
 * Los borrados lógicos (`deletedAt`) no se cuentan: liberan lugar al toque, con
 * el mismo criterio que los cupones y las promociones —se cuenta lo que está
 * vivo, no lo que se creó alguna vez—.
 */
export async function checkCupoDeProductos(
  storeId: string, ownerId: string, cuantos: number
): Promise<NextResponse | null> {
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: SUB_STATUS_SELECT,
  });
  // Premium no tiene el tope comercial, pero sí el absoluto: ver el comentario
  // de MAX_PRODUCTS_POR_TIENDA — el tier se elige solo al registrarse.
  const techo = hasActivePremium(sub) ? MAX_PRODUCTS_POR_TIENDA : PRO_MAX_PRODUCTS;

  const actuales = await prisma.product.count({ where: { storeId, deletedAt: null } });
  if (actuales + cuantos <= techo) return null;

  const libres = Math.max(0, techo - actuales);
  return NextResponse.json({
    error: libres === 0
      ? `Llegaste al máximo de ${techo.toLocaleString("es-AR")} productos. Borrá alguno para hacer lugar.`
      : `Te quedan ${libres.toLocaleString("es-AR")} lugares de ${techo.toLocaleString("es-AR")} productos y estás intentando cargar ${cuantos.toLocaleString("es-AR")}.`,
  }, { status: 403 });
}

/**
 * ¿Va a un ritmo de persona o de script? Cuenta LLAMADAS por minuto, no
 * productos, así que cada ruta pasa su propio límite: dar de alta de a uno
 * tolera muchas más llamadas que importar de a 500.
 *
 * Usa la versión con respaldo: si Upstash no contesta —y se cae justo bajo
 * carga, que es cuando alguien está abusando— el techo pasa a ser local en vez
 * de desaparecer.
 */
export async function checkRitmoDeCreacion(
  ownerId: string, clave: string, porMinuto: number
): Promise<NextResponse | null> {
  const { permitido } = await checkRateLimitConRespaldo(
    `productos:${clave}:${ownerId}`, porMinuto, 60_000,
    { limiteFallback: porMinuto, limiteFallbackGlobal: porMinuto * 20 }
  );
  if (permitido) return null;
  return NextResponse.json(
    { error: "Estás cargando productos muy rápido. Esperá un minuto y seguí." },
    { status: 429 }
  );
}
