"use client";

import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getStoreType } from "@/lib/storeTypes";

export type StorefrontVariant = {
  id: string;
  name: string;
  value: string;
  stock: number;
  price: number | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  precioMayorista: number | null;
  cantMinMayorista: number | null;
  category: string;
  subcategory?: string;
  gender: string;
  description: string | null;
  images: string[];
  imageItems: { url: string; variantValue?: string }[];
  reelUrls: string[];
  sizes: string[];
  colors: string[];
  variants: StorefrontVariant[];
  attributes: { key: string; value: string }[];
  badge?: string;
};

export type ValidatedCoupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  discount: number;
};

export type PlaceOrderParams = {
  cartItems: { productId: string; variantId: string | null; quantity: number }[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
  };
  shippingMethod: string;
  paymentProvider: string;
  couponId?: string | null;
  rewardCouponCode?: string | null;
};

// Claves que mapean a "talle" (dimensión principal no-color) según tipoTienda
const SIZE_ATTRS  = [
  "talle", "size", "talla", "talles", "sizes",          // ROPA / DEPORTE
  "tamaño", "tamano",                                    // HOGAR / MASCOTAS / GENERAL
  "almacenamiento",                                      // TECH
  "ram",                                                 // TECH
  "versión", "version",                                  // AUTOS
  "formato",                                             // LIBROS
  "variante",                                            // GENERAL
  "material",                                            // HOGAR
  "sabor",                                               // ALIMENTOS / MASCOTAS
  "peso/tamaño", "peso",                                 // ALIMENTOS
];
// Claves que mapean a "color"
const COLOR_ATTRS = ["color", "colour", "colores", "colors", "tono"];

/* ── Productos de muestra para el preview del dashboard ─────── */
const DEMO_PRODUCTS: StorefrontProduct[] = [
  { id: "demo-1", name: "Remera Oversize", price: 18500, comparePrice: null, category: "remeras", description: "Remera de algodón premium con corte oversized.", images: ["https://picsum.photos/seed/dp-rem/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-rem/600/800" }], sizes: ["XS","S","M","L","XL"], colors: ["Blanco","Negro","Gris"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "mujer", badge: "NUEVO", attributes: [] },
  { id: "demo-2", name: "Jeans Skinny", price: 35900, comparePrice: 48000, category: "pantalones", description: "Jeans de corte skinny con elastán.", images: ["https://picsum.photos/seed/dp-jean/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-jean/600/800" }], sizes: ["38","40","42","44"], colors: ["Azul","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "mujer", badge: "SALE", attributes: [] },
  { id: "demo-3", name: "Hoodie Premium", price: 29900, comparePrice: null, category: "buzos", description: "Hoodie de algodón french terry 380g.", images: ["https://picsum.photos/seed/dp-hood/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-hood/600/800" }], sizes: ["S","M","L","XL","XXL"], colors: ["Gris","Negro","Oliva"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "hombre", badge: "NUEVO", attributes: [] },
  { id: "demo-4", name: "Pantalón Cargo", price: 42000, comparePrice: null, category: "pantalones", description: "Pantalón cargo con múltiples bolsillos.", images: ["https://picsum.photos/seed/dp-carg/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-carg/600/800" }], sizes: ["28","30","32","34","36"], colors: ["Beige","Negro","Verde"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "hombre", attributes: [] },
  { id: "demo-5", name: "Vestido Midi", price: 38500, comparePrice: null, category: "vestidos", description: "Vestido midi floreado ideal para el verano.", images: ["https://picsum.photos/seed/dp-vest/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-vest/600/800" }], sizes: ["XS","S","M","L"], colors: ["Floral","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "mujer", badge: "NUEVO", attributes: [] },
  { id: "demo-6", name: "Cinturón de Cuero", price: 12000, comparePrice: 16000, category: "accesorios", description: "Cinturón de cuero genuino con hebilla dorada.", images: ["https://picsum.photos/seed/dp-belt/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-belt/600/800" }], sizes: ["Único"], colors: ["Marrón","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "SALE", attributes: [] },
  { id: "demo-7", name: "Campera de Jean", price: 55000, comparePrice: 68000, category: "camperas", description: "Campera de jean clásica con detalles lavados.", images: ["https://picsum.photos/seed/dp-camp/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-camp/600/800" }], sizes: ["S","M","L","XL"], colors: ["Azul","Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "hombre", badge: "SALE", attributes: [] },
  { id: "demo-8", name: "Cartera Tote", price: 24500, comparePrice: null, category: "accesorios", description: "Cartera tote de lona con interior forrado.", images: ["https://picsum.photos/seed/dp-tote/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-tote/600/800" }], sizes: ["Único"], colors: ["Beige","Negro","Bordo"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", attributes: [] },
];

const DEMO_PRODUCTS_AUTOS: StorefrontProduct[] = [
  { id: "auto-1", name: "Toyota Corolla XEI", price: 28500000, comparePrice: null, category: "Sedanes", description: "Excelente estado. Un dueño. Full equipo, cámara de retroceso, tapizado cuero.", images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "DESTACADO", attributes: [{ key: "Marca", value: "Toyota" }, { key: "Año", value: "2022" }, { key: "Km", value: "28.000" }, { key: "Motor", value: "2.0" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Nafta" }] },
  { id: "auto-2", name: "Volkswagen Amarok V6", price: 52000000, comparePrice: null, category: "Pickups", description: "La pickup más potente de su segmento. Motor V6 turbo diesel, tracción 4x4.", images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Gris"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "NUEVO", attributes: [{ key: "Marca", value: "Volkswagen" }, { key: "Año", value: "2023" }, { key: "Km", value: "5.000" }, { key: "Motor", value: "3.0 V6" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Diesel" }] },
  { id: "auto-3", name: "Ford Ranger XLT", price: 38000000, comparePrice: null, category: "Pickups", description: "Doble cabina, tracción 4x4 selectiva. Motor TDCi turbo diesel 170 HP.", images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", attributes: [{ key: "Marca", value: "Ford" }, { key: "Año", value: "2021" }, { key: "Km", value: "45.000" }, { key: "Motor", value: "2.2 TDCi" }, { key: "Transmisión", value: "Manual" }, { key: "Combustible", value: "Diesel" }] },
  { id: "auto-4", name: "Chevrolet S10 LTZ", price: 34500000, comparePrice: null, category: "Pickups", description: "Full equipo, techo panorámico, cámara 360°. Ideal para trabajo y familia.", images: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Plata"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", attributes: [{ key: "Marca", value: "Chevrolet" }, { key: "Año", value: "2022" }, { key: "Km", value: "33.000" }, { key: "Motor", value: "2.8 CTDi" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Diesel" }] },
  { id: "auto-5", name: "Honda CR-V EXL", price: 41000000, comparePrice: null, category: "SUVs", description: "SUV premium, 7 asientos, motor turbo. Sistema Honda Sensing de seguridad activa.", images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Rojo"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "FINANCIADO", attributes: [{ key: "Marca", value: "Honda" }, { key: "Año", value: "2023" }, { key: "Km", value: "12.000" }, { key: "Motor", value: "1.5 Turbo" }, { key: "Transmisión", value: "CVT" }, { key: "Combustible", value: "Nafta" }] },
  { id: "auto-6", name: "Renault Duster Oroch", price: 22000000, comparePrice: 25000000, category: "Pickups", description: "La pickup compacta más versátil. Motor 1.3 turbo, suspensión elevada.", images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Naranja"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "OPORTUNIDAD", attributes: [{ key: "Marca", value: "Renault" }, { key: "Año", value: "2021" }, { key: "Km", value: "58.000" }, { key: "Motor", value: "1.3 TCe" }, { key: "Transmisión", value: "Manual" }, { key: "Combustible", value: "Nafta" }] },
  { id: "auto-7", name: "Yamaha MT-07", price: 8500000, comparePrice: null, category: "Motos", description: "Naked deportiva 689cc. Motor CP2 de 73 HP. Ideal para city y ruta.", images: ["https://images.unsplash.com/photo-1558981852-426c372de4a0?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1558981852-426c372de4a0?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", badge: "NUEVO", attributes: [{ key: "Marca", value: "Yamaha" }, { key: "Año", value: "2023" }, { key: "Km", value: "2.000" }, { key: "Motor", value: "689cc" }, { key: "Transmisión", value: "Manual 6v" }, { key: "Combustible", value: "Nafta" }] },
  { id: "auto-8", name: "Honda CB 500F", price: 5800000, comparePrice: null, category: "Motos", description: "Moto naked media con motor bicilíndrico paralelo. Ideal para la ciudad.", images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: ["Rojo"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, gender: "unisex", attributes: [{ key: "Marca", value: "Honda" }, { key: "Año", value: "2022" }, { key: "Km", value: "15.000" }, { key: "Motor", value: "471cc" }, { key: "Transmisión", value: "Manual 6v" }, { key: "Combustible", value: "Nafta" }] },
];

function isSize (name: string) { return SIZE_ATTRS.includes(name.toLowerCase()); }
function isColor(name: string) { return COLOR_ATTRS.includes(name.toLowerCase()); }

function mapProduct(raw: any): StorefrontProduct {
  const variants: StorefrontVariant[] = (raw.variants ?? []);
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach(v => {
    let attrs: Record<string, string> = {};
    try { const p = JSON.parse(v.name); if (p && typeof p === "object") attrs = p; } catch {}
    if (Object.keys(attrs).length > 0) {
      Object.entries(attrs).forEach(([k, val]) => {
        if (isSize(k)  && val) sizesSet.add(val);
        if (isColor(k) && val) colorsSet.add(val);
      });
    } else {
      if (isSize(v.name)  && v.value) sizesSet.add(v.value);
      if (isColor(v.name) && v.value) colorsSet.add(v.value);
    }
  });
  const sizes  = [...sizesSet];
  const colors = [...colorsSet];
  let images: string[] = [];
  let imageItems: { url: string; variantValue?: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed
      .map((img: string | { url: string; variantValue?: string }) =>
        typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue }
      )
      .filter((x: { url: string }) => x.url);
    images = imageItems.map(x => x.url);
  } catch { images = []; imageItems = []; }

  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch { reelUrls = []; }

  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: unknown) => a && typeof a === "object") : [];
  } catch { attributes = []; }

  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images,
    imageItems,
    reelUrls,
    sizes,
    colors,
    variants,
    attributes,
  };
}

export function useStorefront() {
  const config = useStoreConfig();
  const storeId    = config?.storeId ?? null;
  const slug       = config?.slug ?? null;
  const previewFill = config?.previewFill ?? false;

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  // Lee ?ref= de la URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setAffiliateId(ref);
  }, []);

  // Carga productos reales; usa demo cuando no hay slug (preview del dashboard)
  useEffect(() => {
    if (!slug) {
      const tipoTienda = config?.tipoTienda ?? "ROPA";
      setProducts(tipoTienda === "AUTOS" ? DEMO_PRODUCTS_AUTOS : DEMO_PRODUCTS);
      setLoadingProducts(false);
      return;
    }
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const real: StorefrontProduct[] = data?.store?.products?.length
          ? data.store.products.map(mapProduct)
          : [];
        if (previewFill) {
          // En el editor: productos reales primero, demos para completar hasta 8
          const tipoTienda = config?.tipoTienda ?? "ROPA";
          const demoPool = tipoTienda === "AUTOS" ? DEMO_PRODUCTS_AUTOS : DEMO_PRODUCTS;
          const needed = Math.max(0, 8 - real.length);
          setProducts([...real, ...demoPool.slice(0, needed)]);
        } else {
          setProducts(real);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [slug, previewFill]);

  // Encuentra el variantId que coincide con el valor seleccionado
  function resolveVariantId(product: StorefrontProduct, sizeValue: string, colorValue: string): string | null {
    if (!product.variants.length) return null;
    // Busca variante que coincida con size o color seleccionado
    const match = product.variants.find(v =>
      v.value === sizeValue || v.value === colorValue
    );
    // Si solo hay una variante, siempre la usamos
    if (!match && product.variants.length === 1) return product.variants[0].id;
    return match?.id ?? product.variants[0]?.id ?? null;
  }

  async function validateCoupon(code: string, subtotal: number): Promise<{ coupon: ValidatedCoupon; discount: number } | { error: string }> {
    if (!storeId) return { error: "Tienda no disponible" };
    const res = await fetch("/api/cupones/validar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase(), storeId, subtotal }),
    });
    return res.json();
  }

  async function placeOrder(params: PlaceOrderParams): Promise<{ ok: boolean; error?: string }> {
    if (!storeId) return { ok: false, error: "Tienda no disponible" };
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        affiliateId: affiliateId ?? undefined,
        couponId:        params.couponId ?? null,
        rewardCouponCode: params.rewardCouponCode ?? null,
        items: params.cartItems,
        customer: params.customer,
        shippingMethod:  params.shippingMethod,
        paymentProvider: params.paymentProvider,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || "Error al procesar el pedido" };
    return { ok: true };
  }

  const storeTypeConfig    = getStoreType(config?.tipoTienda || "GENERAL");
  const checkoutMode       = storeTypeConfig.checkoutMode;
  const isWholesale        = config?.tieneVentaMayorista ?? false;
  const ocultarPrecios     = config?.ocultarPreciosPublico ?? false;
  const defaultCategories  = storeTypeConfig.categorias;
  const featuredCategories = config?.featuredCategories ?? [];

  return { products, loadingProducts, affiliateId, resolveVariantId, validateCoupon, placeOrder, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories };
}
