"use client";

import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";

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
  category: string;
  description: string | null;
  images: string[];
  sizes: string[];
  colors: string[];
  variants: StorefrontVariant[];
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

const SIZE_ATTRS  = ["talle", "size", "talla", "talles", "sizes"];
const COLOR_ATTRS = ["color", "colour", "colores", "colors"];

function isSize (name: string) { return SIZE_ATTRS.includes(name.toLowerCase()); }
function isColor(name: string) { return COLOR_ATTRS.includes(name.toLowerCase()); }

function mapProduct(raw: any): StorefrontProduct {
  const variants: StorefrontVariant[] = (raw.variants ?? []);
  const sizes  = [...new Set(variants.filter(v => isSize(v.name)).map(v => v.value))];
  const colors = [...new Set(variants.filter(v => isColor(v.name)).map(v => v.value))];
  let images: string[] = [];
  try { images = JSON.parse(raw.images || "[]"); } catch { images = []; }

  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    category: raw.category ?? "general",
    description: raw.description ?? null,
    images,
    sizes,
    colors,
    variants,
  };
}

export function useStorefront() {
  const config = useStoreConfig();
  const storeId = config?.storeId ?? null;
  const slug    = config?.slug ?? null;

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  // Lee ?ref= de la URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setAffiliateId(ref);
  }, []);

  // Carga productos reales
  useEffect(() => {
    if (!slug) { setLoadingProducts(false); return; }
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.store?.products) {
          setProducts(data.store.products.map(mapProduct));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [slug]);

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

  return { products, loadingProducts, affiliateId, resolveVariantId, validateCoupon, placeOrder };
}
