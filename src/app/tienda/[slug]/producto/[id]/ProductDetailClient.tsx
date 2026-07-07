"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, MessageCircle, Check } from "lucide-react";
import { useCartLogic } from "@/hooks/useCartLogic";
import { getDemoPool, isDemoProductId, type StorefrontProduct, type StorefrontVariant, type PlaceOrderParams } from "@/hooks/useStorefront";
import { promoModalText } from "@/lib/promoLabel";
import { resolveVariantPrice } from "@/lib/variantPrice";
import type { ProductDetailViewProps } from "@/components/store/templates/productDetail/shared";
import ElectroPrimeDetail from "@/components/store/templates/productDetail/ElectroPrimeDetail";
import TechNovaDetail from "@/components/store/templates/productDetail/TechNovaDetail";
import HomeStudioDetail from "@/components/store/templates/productDetail/HomeStudioDetail";
import CasaClaraDetail from "@/components/store/templates/productDetail/CasaClaraDetail";

const THEMED_DETAIL: Record<string, React.ComponentType<{ view: ProductDetailViewProps }>> = {
  "electro-prime": ElectroPrimeDetail,
  "tech-nova": TechNovaDetail,
  "home-studio": HomeStudioDetail,
  "casa-clara": CasaClaraDetail,
};

type RawProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  precioMayorista?: number | null;
  cantMinMayorista?: number | null;
  preciosEscalonados?: string;
  soloMayorista?: boolean;
  promoQtyMin?: number | null;
  promoQtyDiscount?: number | null;
  cuotas?: number;
  category?: string;
  subcategory?: string;
  gender?: string;
  description?: string | null;
  images?: string;
  reelUrls?: string;
  variants?: StorefrontVariant[];
  attributes?: string;
  promoType?: string | null;
  promoPayQty?: number | null;
  offerBadge?: string | null;
  offerNote?: string | null;
  offerEndsAt?: string | null;
};

const SIZE_ATTRS  = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];
const COLOR_ATTRS = ["color","colour","colores","colors","tono"];

function mapProduct(raw: RawProduct): StorefrontProduct {
  const variants = raw.variants ?? [];
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach((v) => {
    let attrs: Record<string, string> = {};
    try { const p = JSON.parse(v.name); if (p && typeof p === "object") attrs = p; } catch {}
    if (Object.keys(attrs).length > 0) {
      Object.entries(attrs).forEach(([k, val]) => {
        if (SIZE_ATTRS.includes(k.toLowerCase())  && val) sizesSet.add(val as string);
        if (COLOR_ATTRS.includes(k.toLowerCase()) && val) colorsSet.add(val as string);
      });
    } else {
      if (SIZE_ATTRS.includes(v.name?.toLowerCase())  && v.value) sizesSet.add(v.value);
      if (COLOR_ATTRS.includes(v.name?.toLowerCase()) && v.value) colorsSet.add(v.value);
    }
  });
  let images: string[] = [];
  let imageItems: { url: string; variantValue?: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed
      .map((img: string | { url?: string; variantValue?: string }) => typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue })
      .filter((x: { url: string }) => x.url);
    images = imageItems.map((x) => x.url);
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: unknown) => a && typeof a === "object") : [];
  } catch {}
  const offerActive = !raw.offerEndsAt || new Date(raw.offerEndsAt) > new Date();
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: offerActive ? (raw.comparePrice ?? null) : null,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    preciosEscalonados: (() => { try { const p = JSON.parse(raw.preciosEscalonados || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } })(),
    soloMayorista: raw.soloMayorista ?? false,
    promoQtyMin: raw.promoQtyMin ?? null,
    promoQtyDiscount: raw.promoQtyDiscount ?? null,
    promoType: raw.promoType ?? "PERCENT",
    promoPayQty: raw.promoPayQty ?? null,
    offerBadge: offerActive ? (raw.offerBadge ?? null) : null,
    offerNote: offerActive ? (raw.offerNote ?? null) : null,
    cuotas: raw.cuotas ?? 0,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images, imageItems, reelUrls,
    sizes: [...sizesSet], colors: [...colorsSet], variants,
    attributes,
  };
}

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

export default function ProductDetailClient({ slug, productId }: { slug: string; productId: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Tienda");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [currency, setCurrency] = useState("ARS");
  const [hasMercadoPago, setHasMercadoPago] = useState(false);
  const [isPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "editor");
  const [isOwner, setIsOwner] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string> | undefined>(undefined);
  const [accentOverride, setAccentOverride] = useState<string | undefined>(undefined);
  const [footerBg, setFooterBg] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFoundLocal, setNotFoundLocal] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const fromEditor = isPreview;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject("not_found"))
      .then(data => {
        if (!data?.store) { setNotFoundLocal(true); return; }
        if (data.store.id) setStoreId(data.store.id);
        setStoreName(data.store.name ?? "Tienda");
        setHasMercadoPago(!!data.hasMercadoPago);
        setIsOwner(!!data.isOwner);
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.whatsapp?.enabled && cfg.whatsapp?.number) setWhatsapp(cfg.whatsapp.number);
          if (cfg.template) setTemplate(cfg.template);
          if (cfg.currency) setCurrency(cfg.currency);
          if (cfg.colors?.accent) setAccentOverride(cfg.colors.accent);
          if (cfg.socialLinks) setSocialLinks(cfg.socialLinks);
          if (cfg.sectionColors?.bgFooter) setFooterBg(cfg.sectionColors.bgFooter);
        } catch {}
        const real = (data.store.products ?? []).map(mapProduct);
        // Productos demo del editor (ej. "hogar-2"): no existen en la base,
        // se completan con el mismo pool de muestra que usa el home del template.
        if (fromEditor && isDemoProductId(productId) && !real.some((p: StorefrontProduct) => p.id === productId)) {
          setProducts([...real, ...getDemoPool(data.store.tipoTienda)]);
        } else {
          setProducts(real);
        }
      })
      .catch(() => setNotFoundLocal(true))
      .finally(() => setLoading(false));
  }, [slug, productId, isPreview]);

  const product = useMemo(() => products.find(p => p.id === productId) ?? null, [products, productId]);
  const related = useMemo(
    () => products.filter(p => p.id !== productId && p.category === product?.category).slice(0, 6),
    [products, productId, product?.category]
  );

  const resolveVariantId = useCallback((p: StorefrontProduct, sizeValue: string, colorValue: string): string | null => {
    if (!p.variants.length) return null;
    const match = p.variants.find((v) => v.value === sizeValue || v.value === colorValue);
    if (!match && p.variants.length === 1) return p.variants[0].id;
    return match?.id ?? p.variants[0]?.id ?? null;
  }, []);

  const validateCoupon = useCallback(async (code: string, subtotal: number, email?: string) => {
    if (!storeId) return { error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), storeId, subtotal, email }),
      });
      return res.json();
    } catch { return { error: "Error de conexión" }; }
  }, [storeId]);

  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<{ ok: boolean; error?: string }> => {
    if (!storeId) return { ok: false, error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId, couponId: params.couponId ?? null, items: params.cartItems,
          customer: params.customer, shippingMethod: params.shippingMethod, paymentProvider: params.paymentProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Error al procesar el pedido" };
      return { ok: true };
    } catch { return { ok: false, error: "Error de conexión" }; }
  }, [storeId]);

  const cart = useCartLogic({ products, storeId, resolveVariantId, validateCoupon, placeOrder, lockScrollOnModal: false });
  const {
    selectedSize, setSelectedSize, selectedColor, setSelectedColor, qty, setQty,
    addToCart, cartCount, toastMsg, openModal,
  } = cart;

  // Pre-selecciona la primera opción disponible de cada dimensión cuando cambia el producto
  // (ajuste de estado durante el render en vez de un efecto, siguiendo el patrón de React
  // para "resetear estado cuando cambia un prop" sin un render extra innecesario)
  const [lastProductId, setLastProductId] = useState("");
  if (product && productId !== lastProductId) {
    setLastProductId(productId);
    setActiveImg(0);
    // openModal carga el producto en el estado interno del carrito (sin esto,
    // addToCart no tenía ningún producto seleccionado y no hacía nada)
    openModal(product);
    setSelectedSize(product.sizes.length === 1 ? product.sizes[0] : "");
    setSelectedColor(product.colors.length === 1 ? product.colors[0] : "");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Cargando...</div>;
  }
  if (notFoundLocal || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-lg font-semibold text-gray-900">Producto no disponible</p>
        <p className="text-sm text-gray-500">Puede haber sido eliminado o ya no está a la venta.</p>
        <Link href={`/tienda/${slug}/productos`} className="text-sm text-indigo-600 font-medium underline">Ver catálogo completo</Link>
      </div>
    );
  }

  const needsSize = product.sizes.length > 0;
  const needsColor = product.colors.length > 0;
  const canAdd = (!needsSize || !!selectedSize) && (!needsColor || !!selectedColor);
  const variantPrice = resolveVariantPrice(product.variants, selectedSize, selectedColor);
  const displayPrice = variantPrice ?? product.price;
  const discount = !variantPrice && product.comparePrice && product.comparePrice > product.price
    ? Math.round((1 - product.price / product.comparePrice) * 100) : null;
  const catalogHref = `/tienda/${slug}/productos${isPreview ? "?from=editor" : ""}`;

  const ThemedDetail = template ? THEMED_DETAIL[template] : undefined;
  if (ThemedDetail) {
    const view: ProductDetailViewProps = {
      slug, storeName, currency, whatsapp, product, related, hasMercadoPago,
      isPreview, isOwner, socialLinks, accentOverride, footerBg, cart,
      activeImg, setActiveImg, selectedSize, setSelectedSize, selectedColor, setSelectedColor,
      needsSize, needsColor, canAdd, qty, setQty, addToCart, cartCount, toastMsg, discount, catalogHref,
    };
    return <ThemedDetail view={view} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Galería */}
          <div>
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3 relative">
              {discount && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{discount}% OFF</div>
              )}
              {product.images[activeImg] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">Sin imagen</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((url, i) => (
                  <button key={url + i} onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeImg ? "border-indigo-500" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">{storeName}{product.subcategory ? ` · ${product.subcategory}` : ` · ${product.category}`}</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-gray-900">{fmt(displayPrice)}</span>
              {!variantPrice && product.comparePrice && product.comparePrice > product.price && (
                <span className="text-lg text-gray-400 line-through">{fmt(product.comparePrice)}</span>
              )}
            </div>
            {product.offerNote && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                📋 {product.offerNote}
              </p>
            )}
            {product.promoQtyMin && product.promoQtyDiscount && (
              <p className="text-xs font-semibold px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 mb-2">
                {promoModalText(product.promoType, product.promoQtyMin, product.promoQtyDiscount, product.promoPayQty, 0)}
              </p>
            )}
            <p className="text-xs text-gray-400 mb-6">Pagá en cuotas con tarjeta de crédito</p>

            {needsSize && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Opción</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium ${selectedSize === s ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {needsColor && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium ${selectedColor === c ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-500">−</button>
                <span className="px-3 text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-gray-500">+</button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={addToCart} disabled={!canAdd}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl">
                <ShoppingBag className="h-4 w-4" /> Agregar al carrito
              </button>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 border border-green-600 text-green-700 font-semibold py-3.5 rounded-xl">
                  <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                </a>
              )}
            </div>

            {cartCount > 0 && (
              <Link href={`/tienda/${slug}/productos`} className="text-sm text-indigo-600 underline mb-6 inline-block">
                Ver carrito ({cartCount})
              </Link>
            )}

            {product.description && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-1.5">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {product.attributes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Especificaciones</p>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                  {product.attributes.map((a, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">{a.key}</span>
                      <span className="text-gray-900 font-medium">{a.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <p className="text-lg font-bold text-gray-900 mb-4">También te puede interesar</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {related.map(p => (
                <Link key={p.id} href={`/tienda/${slug}/producto/${p.id}`} className="group">
                  <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-2">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2">{p.name}</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(p.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg z-50">
          <Check className="h-4 w-4 text-green-400" /> {toastMsg}
        </div>
      )}
    </div>
  );
}
