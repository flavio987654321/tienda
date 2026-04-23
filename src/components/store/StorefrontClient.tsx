"use client";

import { useEffect, useMemo, useState } from "react";

const SOCIAL_ICONS: Record<string, { path: string; color: string; gradient?: string }> = {
  instagram: { path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", color: "#E1306C", gradient: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
  facebook:  { path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", color: "#1877F2" },
  tiktok:    { path: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z", color: "#010101" },
  whatsapp:  { path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z", color: "#25D366" },
  email:     { path: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", color: "#6366f1" },
};

function SocialIconCircle({ network, size = 40, forButton = false }: { network: string; size?: number; forButton?: boolean }) {
  const meta = SOCIAL_ICONS[network.toLowerCase()] ?? SOCIAL_ICONS.email;
  const bg = meta.gradient ?? meta.color;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:`${size}px`, height:`${size}px`, borderRadius:"999px", background: forButton ? "rgba(255,255,255,0.2)" : bg, flexShrink:0 }}>
      <svg viewBox="0 0 24 24" fill="white" width={size * 0.45} height={size * 0.45}><path d={meta.path}/></svg>
    </span>
  );
}
import {
  Heart,
  Loader2,
  Mail,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";

type Variant = {
  id: string;
  name: string;
  value: string;
  stock: number;
  price: number | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string;
  category: string;
  subcategory: string | null;
  variants: Variant[];
};

type Store = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  templateId: string;
  productLayout: string;
  heroStyle: string;
  showPrices: boolean;
  showStock: boolean;
  showRatings: boolean;
  announcementBar: string | null;
  announcementBarColor: string;
  navbarStyle: string;
  buttonStyle: string;
  cardRadius: string;
  cardShadow: string;
  backgroundStyle: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappNumber: string | null;
  showWhatsappButton: boolean;
  footerText: string | null;
  currency: string;
  pageBlocks: string;
  owner: { name: string | null; email: string };
  products: Product[];
};

type CartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  price: number;
  quantity: number;
  maxStock: number | null;
  image: string | null;
};

type Customer = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
};

const SHIPPING_OPTIONS = [
  { id: "pickup", label: "Retiro en local / acordar", cost: 0 },
  { id: "standard", label: "Envio estandar", cost: 3500 },
  { id: "national", label: "Envio nacional", cost: 6500 },
];

const PAYMENT_OPTIONS = [
  { id: "transfer", label: "Transferencia bancaria" },
  { id: "cash", label: "Pago al retirar / acordar" },
];

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-[28px]",
};

const SHADOW: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-xl",
};

const GRID: Record<string, string> = {
  grid2: "grid-cols-1 sm:grid-cols-2",
  grid3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  grid4: "grid-cols-2 lg:grid-cols-4",
  list: "grid-cols-1",
};

function parseImages(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function money(value: number, currency = "ARS") {
  if (currency === "USD") return `U$D ${value.toLocaleString("es-AR")}`;
  return `$${value.toLocaleString("es-AR")}`;
}

function formatCategoryLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function socialUrl(kind: "instagram" | "facebook" | "tiktok" | "whatsapp" | "email", value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (kind === "email") return `mailto:${clean}`;
  if (kind === "whatsapp") return `https://wa.me/${onlyDigits(clean)}`;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  const handle = clean.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "facebook") return `https://facebook.com/${handle}`;
  return `https://tiktok.com/@${handle}`;
}

function buttonClass(style: string) {
  if (style === "pill") return "rounded-full";
  if (style === "square") return "rounded-none";
  if (style === "outline") return "rounded-xl border-2 bg-transparent";
  return "rounded-xl";
}

function readableText(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 170 ? "#111827" : "#ffffff";
}

function ProductImage({ image, name, className = "" }: { image: string | null; name: string; className?: string }) {
  return image ? (
    <img src={image} alt={name} className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <Package className="h-10 w-10 text-gray-300" />
    </div>
  );
}

type PageBlock = { id: string; type: string; props: Record<string, string | number | boolean> };

function parseBlocks(pageBlocks: string): PageBlock[] {
  try {
    const blocks = JSON.parse(pageBlocks || "[]");
    return Array.isArray(blocks) ? blocks : [];
  } catch {
    return [];
  }
}

function isStarterBlocks(blocks: PageBlock[]) {
  if (blocks.length !== 3) return false;
  const [hero, text, products] = blocks;
  return (
    hero?.type === "hero" &&
    text?.type === "text" &&
    products?.type === "products" &&
    hero.props.title === "¡Bienvenidos a mi tienda!" &&
    text.props.heading === "Sobre nosotros" &&
    products.props.heading === "Nuestros productos"
  );
}

export default function StorefrontClient({
  store,
  affiliateId,
  initialProductId,
  userId,
  initialFavoriteIds = [],
}: {
  store: Store;
  affiliateId?: string;
  initialProductId?: string;
  userId?: string;
  initialFavoriteIds?: string[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openCart, setOpenCart] = useState(false);
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [shippingMethod, setShippingMethod] = useState(SHIPPING_OPTIONS[0].id);
  const [paymentProvider, setPaymentProvider] = useState(PAYMENT_OPTIONS[0].id);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds));
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(store.products.map((p) => p.category).filter(Boolean))], [store.products]);
  const subcategories = useMemo(
    () => [
      ...new Set(
        store.products
          .filter((product) => category === "all" || product.category === category)
          .map((product) => product.subcategory)
          .filter(Boolean)
      ),
    ] as string[],
    [category, store.products]
  );
  const products = store.products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (subcategory !== "all" && product.subcategory !== subcategory) return false;
    return true;
  });
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = SHIPPING_OPTIONS.find((option) => option.id === shippingMethod) ?? SHIPPING_OPTIONS[0];
  const total = subtotal + shipping.cost;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const firstProducts = store.products.slice(0, 3).map((product) => ({ product, image: parseImages(product.images)[0] ?? null }));
  const heroImage = store.banner || firstProducts[0]?.image || null;
  const textColor = readableText(store.primaryColor);
  const isDark = store.templateId === "tech";
  const isKids = store.templateId === "kids";
  const isSplit = ["fashion", "luxury", "boutique"].includes(store.templateId);
  const isMarket = store.templateId === "market";
  const isColorful = store.templateId === "colorful" || store.templateId === "kids";
  const pageBlocks = useMemo(() => parseBlocks(store.pageBlocks), [store.pageBlocks]);
  const contentBlocks = isStarterBlocks(pageBlocks) ? [] : pageBlocks;
  const hasCustomHeroBlock = contentBlocks.some((block) => block.type === "hero");
  const hasCustomProductBlock = contentBlocks.some((block) => block.type === "products");
  const cardRadius = RADIUS[store.cardRadius] ?? RADIUS.md;
  const cardShadow = SHADOW[store.cardShadow] ?? SHADOW.sm;
  const buttonRadius = buttonClass(store.buttonStyle);
  const productGrid = GRID[store.productLayout] ?? GRID.grid3;
  useEffect(() => {
    if (!initialProductId) return;
    const product = store.products.find((item) => item.id === initialProductId);
    if (!product) return;

    setCategory(product.category || "all");
    setSubcategory(product.subcategory || "all");
    setHighlightProductId(product.id);

    const timer = window.setTimeout(() => {
      document.getElementById(`producto-${product.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const clearHighlight = window.setTimeout(() => setHighlightProductId(null), 3800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearHighlight);
    };
  }, [initialProductId, store.products]);

  useEffect(() => {
    if (subcategory !== "all" && !subcategories.includes(subcategory)) {
      setSubcategory("all");
    }
  }, [subcategory, subcategories]);

  function updateCustomer(field: keyof Customer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function toggleFavorite(productId: string) {
    if (!userId) { window.location.href = `/login?redirect=/tienda/${store.slug}`; return; }
    if (togglingFav === productId) return;
    setTogglingFav(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      await fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.has(productId) ? next.delete(productId) : next.add(productId);
        return next;
      });
    } finally {
      setTogglingFav(null);
    }
  }

  function addToCart(product: Product) {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
    const images = parseImages(product.images);
    const price = variant?.price ?? product.price;
    const variantId = variant?.id ?? null;
    const maxStock = variant ? variant.stock : null;
    const key = `${product.id}:${variantId ?? "base"}`;

    setCart((prev) => {
      const existing = prev.find((item) => `${item.productId}:${item.variantId ?? "base"}` === key);
      if (existing) {
        return prev.map((item) =>
          `${item.productId}:${item.variantId ?? "base"}` === key
            ? { ...item, quantity: maxStock ? Math.min(item.quantity + 1, maxStock) : item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
          price,
          quantity: 1,
          maxStock,
          image: images[0] ?? null,
        },
      ];
    });
    setOpenCart(true);
  }

  function changeQty(productId: string, variantId: string | null, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return item;
          const next = item.maxStock ? Math.min(item.quantity + delta, item.maxStock) : item.quantity + delta;
          return { ...item, quantity: next };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  async function submitCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) return;

    setSubmitting(true);
    setCheckoutError("");
    setSuccessOrderId("");

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        affiliateId,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customer,
        shippingMethod,
        paymentProvider,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setCheckoutError(data.error || "No se pudo crear el pedido");
      return;
    }

    setSuccessOrderId(data.order.id);
    setCart([]);
  }

  function renderHero() {
    if (store.heroStyle === "minimal") {
      return (
        <section className={`border-b ${isDark ? "border-white/10 bg-gray-950 text-white" : "border-gray-100 bg-white text-gray-950"}`}>
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-12 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: store.accentColor }}>{store.tagline || "Nueva coleccion"}</p>
              <h1 className="mt-2 text-4xl font-black md:text-6xl">{store.name}</h1>
              {store.description && <p className={`mt-3 max-w-2xl text-base ${isDark ? "text-gray-300" : "text-gray-500"}`}>{store.description}</p>}
            </div>
            <a href="#productos" className={`inline-flex items-center justify-center px-5 py-3 text-sm font-bold ${buttonRadius}`} style={{ backgroundColor: store.primaryColor, color: textColor }}>
              Ver productos
            </a>
          </div>
        </section>
      );
    }

    if (isKids) {
      return (
        <section className="px-3 pt-3">
          <div
            className="relative mx-auto flex min-h-[260px] max-w-7xl flex-col items-center justify-center overflow-hidden rounded-[36px] px-6 py-12 text-center text-white shadow-sm md:min-h-[340px]"
            style={{
              background: heroImage
                ? `linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)), url(${heroImage}) center/cover`
                : `linear-gradient(135deg, ${store.primaryColor}, ${store.accentColor})`,
            }}
          >
            <span className="mb-2 text-5xl drop-shadow-lg">🎀</span>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] opacity-75">{store.tagline || "Para los mas peques"}</p>
            <h1 className="max-w-3xl text-4xl font-black drop-shadow md:text-6xl">{store.name}</h1>
            {store.description && <p className="mt-3 max-w-xl text-sm font-semibold text-white/80 md:text-base">{store.description}</p>}
            <a href="#productos" className="mt-6 rounded-full bg-white px-7 py-3 text-sm font-black shadow-lg" style={{ color: store.primaryColor }}>
              ¡Ver todo!
            </a>
            <div className="absolute left-6 top-6 text-3xl opacity-60">✨</div>
            <div className="absolute right-7 top-8 text-2xl opacity-60">🌈</div>
          </div>
        </section>
      );
    }

    if (isSplit) {
      return (
        <section className={`${isDark ? "bg-gray-950 text-white" : "bg-white text-gray-950"}`}>
          <div className="mx-auto grid min-h-[520px] max-w-7xl md:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-center px-6 py-14 md:px-12">
              <div className="mb-5 h-1.5 w-20" style={{ backgroundColor: store.accentColor }} />
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: store.primaryColor }}>
                {store.tagline || "Tienda online"}
              </p>
              <h1 className="text-5xl font-black leading-[0.95] md:text-7xl">{store.name}</h1>
              {store.description && <p className={`mt-6 max-w-xl text-lg leading-8 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{store.description}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#productos" className={`px-6 py-3 text-sm font-bold ${buttonRadius}`} style={{ backgroundColor: store.primaryColor, color: textColor }}>
                  Comprar ahora
                </a>
                <span className="text-sm font-semibold">{store.products.length} productos activos</span>
              </div>
            </div>
            <div className="grid min-h-[360px] grid-cols-2 gap-3 p-4 md:min-h-full">
              <div className="col-span-2 overflow-hidden rounded-[32px] md:col-span-1">
                <ProductImage image={heroImage} name={store.name} />
              </div>
              <div className="grid gap-3">
                <div className="overflow-hidden rounded-[24px]">
                  <ProductImage image={firstProducts[1]?.image ?? heroImage} name={firstProducts[1]?.product.name ?? store.name} />
                </div>
                <div className="overflow-hidden rounded-[24px]" style={{ backgroundColor: store.secondaryColor }}>
                  <ProductImage image={firstProducts[2]?.image ?? null} name={firstProducts[2]?.product.name ?? store.name} />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="relative overflow-hidden text-center" style={{ backgroundColor: store.primaryColor, color: textColor }}>
        {heroImage && <img src={heroImage} alt={store.name} className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative mx-auto flex min-h-[420px] max-w-4xl flex-col items-center justify-center px-6 py-16">
          {store.logo && <img src={store.logo} alt={store.name} className="mb-5 h-20 w-20 rounded-2xl object-cover ring-4 ring-white/30" />}
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] opacity-80">{store.tagline || "Tienda online"}</p>
          <h1 className="text-5xl font-black md:text-7xl">{store.name}</h1>
          {store.description && <p className="mt-5 max-w-2xl text-lg opacity-85">{store.description}</p>}
          <a href="#productos" className={`mt-8 bg-white px-6 py-3 text-sm font-bold ${buttonRadius}`} style={{ color: store.primaryColor }}>
            Ver coleccion
          </a>
        </div>
      </section>
    );
  }

  function renderProductCard(product: Product, index: number) {
    const images = parseImages(product.images);
    const image = images[0] ?? null;
    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
    const hasDiscount = product.comparePrice && product.comparePrice > product.price;
    const available = product.variants.length === 0 || totalStock > 0;
    const list = store.productLayout === "list";
    const featured = store.templateId === "boutique" && index === 0 && !list;

    if (isKids && !list) {
      const emoji = ["🦄", "⭐", "🎀", "🌈", "🎉", "🍭"][index % 6];
      const bg = [`${store.primaryColor}18`, `${store.accentColor}18`, "#fce7f3", "#ede9fe", "#dcfce7", "#fff7ed"][index % 6];

      return (
        <article
          id={`producto-${product.id}`}
          key={product.id}
          className={`relative overflow-hidden rounded-[28px] border-2 border-white bg-white text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
            highlightProductId === product.id ? "ring-4 ring-indigo-400 ring-offset-4" : ""
          }`}
        >
          <div className="relative aspect-square p-3" style={{ backgroundColor: bg }}>
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">{emoji}</div>
            <div className="relative h-full overflow-hidden rounded-[22px]">
              <ProductImage image={image} name={product.name} className="transition duration-500 hover:scale-105" />
            </div>
            {hasDiscount && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white" style={{ backgroundColor: store.accentColor }}>OFERTA ✨</span>}
            <button
              onClick={() => toggleFavorite(product.id)}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Heart className={`h-4 w-4 transition-colors ${favoriteIds.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
            </button>
            {!available && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-500">Sin stock</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-base font-black leading-tight text-gray-950">{product.name}</p>
            {product.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>}
            {store.showPrices && <p className="mt-2 text-lg font-black" style={{ color: store.primaryColor }}>{money(product.price, store.currency)}</p>}
            {store.showStock && product.variants.length > 0 && <p className={`mt-1 text-xs font-semibold ${available ? "text-emerald-600" : "text-red-500"}`}>{available ? `${totalStock} disponibles` : "Sin stock"}</p>}
            <button
              type="button"
              disabled={!available}
              onClick={() => addToCart(product)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white transition disabled:opacity-40"
              style={{ backgroundColor: store.primaryColor }}
            >
              <ShoppingBag className="h-4 w-4" />
              {!available ? "Sin stock" : "¡Lo quiero!"}
            </button>
          </div>
        </article>
      );
    }

    return (
      <article
        id={`producto-${product.id}`}
        key={product.id}
        className={`${featured ? "sm:col-span-2 sm:row-span-2" : ""} ${list ? "grid grid-cols-[150px_1fr] md:grid-cols-[220px_1fr]" : ""} overflow-hidden border transition duration-300 hover:-translate-y-0.5 ${cardRadius} ${cardShadow} ${
          isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-100 bg-white text-gray-950"
        } ${highlightProductId === product.id ? "ring-4 ring-indigo-400 ring-offset-4 ring-offset-white" : ""}`}
      >
        <div className={`${list ? "h-full min-h-40" : featured ? "aspect-[4/3]" : "aspect-square"} relative overflow-hidden ${isColorful ? "p-2" : ""}`} style={{ backgroundColor: store.secondaryColor }}>
          <div className={`h-full w-full overflow-hidden ${isColorful ? "rounded-2xl" : ""}`}>
            <ProductImage image={image} name={product.name} className="transition duration-500 hover:scale-105" />
          </div>
          {hasDiscount && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white" style={{ backgroundColor: store.accentColor }}>OFERTA</span>}
          <button
            onClick={() => toggleFavorite(product.id)}
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`h-4 w-4 transition-colors ${favoriteIds.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700">Sin stock</span>
            </div>
          )}
        </div>
        <div className={`${featured ? "p-6" : "p-4"}`}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className={`${featured ? "text-2xl" : "text-base"} font-black leading-tight`}>{product.name}</p>
              {product.description && <p className={`mt-1 line-clamp-2 text-sm ${isDark ? "text-gray-300" : "text-gray-500"}`}>{product.description}</p>}
            </div>
            {store.showRatings && (
              <div className="flex shrink-0 gap-0.5 pt-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-3 w-3 fill-current" />)}
              </div>
            )}
          </div>
          {store.showPrices && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">{money(product.price, store.currency)}</span>
              {hasDiscount && <span className={`text-sm line-through ${isDark ? "text-gray-500" : "text-gray-400"}`}>{money(product.comparePrice!, store.currency)}</span>}
            </div>
          )}
          {store.showStock && product.variants.length > 0 && (
            <p className={`mt-1 text-xs font-semibold ${available ? "text-emerald-600" : "text-red-500"}`}>{available ? `${totalStock} disponibles` : "Sin stock"}</p>
          )}
          {product.variants.length > 0 && <p className={`mt-1 text-xs ${isDark ? "text-gray-400" : "text-gray-400"}`}>{product.variants.map((v) => v.value).join(", ")}</p>}
          <button
            type="button"
            disabled={!available}
            onClick={() => addToCart(product)}
            className={`mt-4 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition disabled:opacity-40 ${buttonRadius}`}
            style={{
              backgroundColor: store.buttonStyle === "outline" ? "transparent" : store.primaryColor,
              borderColor: store.primaryColor,
              color: store.buttonStyle === "outline" ? store.primaryColor : textColor,
            }}
          >
            <ShoppingBag className="h-4 w-4" />
            {!available ? "Sin stock" : "Agregar"}
          </button>
        </div>
      </article>
    );
  }

  function renderBlocks() {
    const blocks = contentBlocks;
    if (!blocks.length) return null;

    return (
      <div className="space-y-0">
        {blocks.map((block) => {
          const p = block.props as Record<string, any>;
          if (block.type === "products") {
            const categoryFilter = String(p.categoryFilter || "all");
            const subcategoryFilter = String(p.subcategoryFilter || "all");
            const blockProducts =
              categoryFilter === "all"
                ? store.products.filter((product) => {
                    if (p.showCategoryTabs !== false) {
                      if (category !== "all" && product.category !== category) return false;
                      if (subcategory !== "all" && product.subcategory !== subcategory) return false;
                    }
                    return subcategoryFilter === "all" || product.subcategory === subcategoryFilter;
                  })
                : store.products.filter((product) => {
                    if (product.category !== categoryFilter) return false;
                    return subcategoryFilter === "all" || product.subcategory === subcategoryFilter;
                  });
            const columns = Number(p.columns || 3);
            const gridClass = columns >= 5
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              : columns === 4
                ? "grid-cols-2 lg:grid-cols-4"
                : columns === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

            return (
              <section key={block.id} id="productos" className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}>
                {p.showHeading !== false && (
                  <div className="mb-7 text-center">
                    <h2 className="text-3xl font-black" style={{ color: String(p.color || store.primaryColor) }}>{p.heading || "Nuestros productos"}</h2>
                    {categoryFilter !== "all" && <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatCategoryLabel(categoryFilter)}{subcategoryFilter !== "all" ? ` / ${formatCategoryLabel(subcategoryFilter)}` : ""}</p>}
                  </div>
                )}

                {categoryFilter === "all" && p.showCategoryTabs !== false && categories.length > 1 && (
                  <div className="mb-6 flex justify-center gap-2 overflow-x-auto pb-1">
                    <button onClick={() => { setCategory("all"); setSubcategory("all"); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === "all" ? { backgroundColor: String(p.color || store.primaryColor) } : undefined}>Todo</button>
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => { setCategory(cat); setSubcategory("all"); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${category === cat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === cat ? { backgroundColor: String(p.color || store.primaryColor) } : undefined}>{formatCategoryLabel(cat)}</button>
                    ))}
                  </div>
                )}

                {categoryFilter === "all" && p.showCategoryTabs !== false && subcategories.length > 1 && (
                  <div className="mb-6 flex justify-center gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setSubcategory("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${subcategory === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === "all" ? { backgroundColor: String(p.color || store.accentColor) } : undefined}>Todo {category === "all" ? "" : formatCategoryLabel(category)}</button>
                    {subcategories.map((subcat) => (
                      <button key={subcat} onClick={() => setSubcategory(subcat)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${subcategory === subcat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === subcat ? { backgroundColor: String(p.color || store.accentColor) } : undefined}>{formatCategoryLabel(subcat)}</button>
                    ))}
                  </div>
                )}

                {blockProducts.length ? (
                  <div className={`grid gap-5 ${gridClass}`}>{blockProducts.map(renderProductCard)}</div>
                ) : (
                  <div className={`py-16 text-center ${isDark ? "text-gray-400" : "text-gray-400"}`}>
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p>No hay productos en esta categoria</p>
                  </div>
                )}
              </section>
            );
          }
          if (block.type === "text") return (
            <div key={block.id} className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ textAlign: (p.align || "center") as "left" | "center" | "right", fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}>
              {p.heading && <h2 className="font-black text-3xl md:text-4xl mb-4" style={{ color: String(p.color || store.primaryColor) }}>{p.heading}</h2>}
              {p.body && <p className="max-w-2xl mx-auto text-base leading-relaxed" style={{ color: String(p.textColor || "#6b7280") }}>{p.body}</p>}
            </div>
          );
          if (block.type === "banner") return (
            <div key={block.id} className="py-3 px-6 text-center font-bold text-sm rounded-2xl" style={{ backgroundColor: p.bgColor || store.accentColor, color: p.textColor || "#fff" }}>
              {p.text || "📢 Anuncio"}
            </div>
          );
          if (block.type === "cta") return (
            <div key={block.id} className="mx-4 rounded-3xl p-8 text-center sm:mx-6 sm:p-12" style={{ backgroundColor: p.bgColor || store.primaryColor, color: p.textColor || "#fff", fontFamily: store.fontFamily }}>
              <h2 className="font-black text-3xl md:text-4xl mb-3">{p.heading || "¿Lista para comprar?"}</h2>
              {p.sub && <p className="opacity-75 mb-6 max-w-xl mx-auto">{p.sub}</p>}
              <a href="#productos" className="inline-block bg-white font-black px-8 py-3 rounded-full text-sm" style={{ color: p.bgColor || store.primaryColor }}>
                {p.buttonText || "Ver catálogo"}
              </a>
            </div>
          );
          if (block.type === "image-text") {
            const isRight = p.imagePosition === "right";
            const imageFit = String(p.imageFit || "cover") as "cover" | "contain";
            const imageFocus = String(p.imageFocus || "center");
            return (
              <div key={block.id} className={`mx-auto flex max-w-7xl flex-col ${isRight ? "md:flex-row-reverse" : "md:flex-row"} gap-8 items-center px-4 py-8 sm:px-6`} style={{ fontFamily: store.fontFamily, backgroundColor: String(p.bgColor || "transparent") }}>
                <div className="flex-1 rounded-3xl overflow-hidden min-h-64 flex items-center justify-center" style={{ backgroundColor: String(p.imageBgColor || "#f3f4f6") }}>
                  {p.image ? <img src={p.image} alt="" className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`} style={{ minHeight: "260px", objectPosition: imageFocus }} /> : <Package className="h-12 w-12 text-gray-300" />}
                </div>
                <div className="flex-1">
                  {p.heading && <h2 className="font-black text-3xl mb-4" style={{ color: String(p.color || store.primaryColor) }}>{p.heading}</h2>}
                  {p.body && <p className="leading-relaxed" style={{ color: String(p.textColor || "#6b7280") }}>{p.body}</p>}
                </div>
              </div>
            );
          }
          if (block.type === "socials") {
            const layout = String(p.layout || "icons");
            const heading = String(p.heading || "Seguinos y contactanos");
            const blockColor = String(p.color || store.primaryColor);
            const blockTextColor = readableText(blockColor);
            const blockBg = String(p.bgColor || (isDark ? "rgba(255,255,255,.03)" : "#ffffff"));
            // Build items from block-level URLs, fall back to store-level
            const blockItems = [
              { key:"showInstagram", label:"Instagram", network:"instagram", href: p.instagramUrl ? socialUrl("instagram", p.instagramUrl) : store.instagramUrl ? socialUrl("instagram", store.instagramUrl) : null },
              { key:"showFacebook",  label:"Facebook",  network:"facebook",  href: p.facebookUrl  ? socialUrl("facebook",  p.facebookUrl)  : store.facebookUrl  ? socialUrl("facebook",  store.facebookUrl)  : null },
              { key:"showTiktok",    label:"TikTok",    network:"tiktok",    href: p.tiktokUrl    ? socialUrl("tiktok",    p.tiktokUrl)    : store.tiktokUrl    ? socialUrl("tiktok",    store.tiktokUrl)    : null },
              { key:"showWhatsapp",  label:"WhatsApp",  network:"whatsapp",  href: p.whatsappNumber ? socialUrl("whatsapp", p.whatsappNumber) : store.whatsappNumber ? socialUrl("whatsapp", store.whatsappNumber) : null },
              { key:"showEmail",     label:"Email",     network:"email",     href: p.emailAddress ? `mailto:${p.emailAddress}` : store.owner.email ? `mailto:${store.owner.email}` : null },
            ].filter((item) => p[item.key] !== false && item.href) as { key:string; label:string; network:string; href:string }[];
            const visibleItems = blockItems;
            if (!visibleItems.length) return null;

            if (layout === "card") {
              return (
                <section key={block.id} className="px-4 py-8 sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: blockBg }}>
                  <div className={`mx-auto max-w-xl border p-6 text-center ${cardRadius} ${cardShadow}`} style={{ borderColor: `${blockColor}22`, backgroundColor: blockBg }}>
                    {p.showHeading !== false && <h2 className="mb-5 text-2xl font-black" style={{ color: blockColor }}>{heading}</h2>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {visibleItems.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          target={item.label === "Email" ? undefined : "_blank"}
                          rel={item.label === "Email" ? undefined : "noreferrer"}
                          className={`flex items-center justify-center gap-3 border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 ${buttonRadius}`}
                          style={{ borderColor: `${blockColor}44`, color: blockColor }}
                        >
                          <SocialIconCircle network={item.network} size={32} />
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            return (
              <section key={block.id} className="px-4 py-8 text-center sm:px-6" style={{ fontFamily: store.fontFamily, backgroundColor: blockBg }}>
                {p.showHeading !== false && <h2 className="mb-5 text-2xl font-black" style={{ color: blockColor }}>{heading}</h2>}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {visibleItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.label === "Email" ? undefined : "_blank"}
                      rel={item.label === "Email" ? undefined : "noreferrer"}
                      aria-label={item.label}
                      className={`inline-flex items-center justify-center gap-2 font-black transition hover:-translate-y-0.5 ${layout === "buttons" ? `px-5 py-3 text-sm ${buttonRadius}` : "h-12 min-w-12 rounded-full px-3 text-xs"}`}
                      style={{
                        backgroundColor: layout === "buttons" ? blockColor : isDark ? "rgba(255,255,255,.08)" : "#ffffff",
                        color: layout === "buttons" ? blockTextColor : blockColor,
                        border: layout === "buttons" ? "none" : `1px solid ${blockColor}33`,
                      }}
                    >
                      <SocialIconCircle network={item.network} size={28} forButton={layout === "buttons"} />
                      {layout === "buttons" ? item.label : <span className="sr-only">{item.label}</span>}
                    </a>
                  ))}
                </div>
              </section>
            );
          }
          if (block.type === "hero") return (
            <div key={block.id} className="overflow-hidden flex items-center justify-center text-center text-white px-6 py-14 sm:px-8 sm:py-16"
              style={{ background: p.bgColor || store.primaryColor, color: p.textColor || "#fff", fontFamily: store.fontFamily, minHeight: p.height === "xl" ? "480px" : p.height === "lg" ? "360px" : p.height === "sm" ? "180px" : "260px" }}>
              <div>
                <h2 className="font-black text-4xl mb-3 drop-shadow">{p.title || store.name}</h2>
                {p.subtitle && <p className="opacity-80 mb-6 max-w-xl mx-auto">{p.subtitle}</p>}
                {p.buttonText && <a href="#productos" className="inline-block bg-white font-black px-8 py-3 rounded-full text-sm" style={{ color: p.bgColor || store.primaryColor }}>{p.buttonText}</a>}
              </div>
            </div>
          );
          if (block.type === "spacer") {
            const heights: Record<string,string> = { xs:"20px",sm:"40px",md:"80px",lg:"120px",xl:"180px" };
            return <div key={block.id} style={{ height: heights[p.height||"md"] || "80px" }} />;
          }
          if (block.type === "divider") return (
            <div key={block.id} className="py-2">
              <hr style={{ border: "none", borderTop: `2px ${p.style || "solid"} ${p.color || "#e5e7eb"}` }} />
            </div>
          );
          return null;
        })}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "text-gray-950"}`}
      style={{
        fontFamily: store.fontFamily,
        background:
          isKids
            ? `linear-gradient(160deg, ${store.primaryColor}14, ${store.accentColor}14, #ffffff)`
            : store.backgroundStyle === "gradient"
            ? `linear-gradient(135deg, ${store.secondaryColor}, #ffffff 45%, ${store.primaryColor}22)`
            : store.backgroundStyle === "pattern"
              ? `radial-gradient(circle at 20px 20px, ${store.primaryColor}14 2px, transparent 3px), ${isDark ? "#030712" : store.secondaryColor}`
              : isDark
                ? "#030712"
                : store.secondaryColor,
      }}
    >
      {store.announcementBar && (
        <div className="px-4 py-2 text-center text-sm font-bold text-white" style={{ backgroundColor: store.announcementBarColor }}>
          {store.announcementBar}
        </div>
      )}

      <header className={`${store.navbarStyle === "transparent" ? "absolute left-0 right-0 z-20 bg-transparent" : isDark ? "border-b border-white/10 bg-gray-950/90" : "border-b border-gray-100 bg-white/95"} backdrop-blur`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href={`/tienda/${store.slug}`} className="flex items-center gap-3 font-black">
            {store.logo ? <img src={store.logo} alt={store.name} className="h-10 w-10 rounded-xl object-cover" /> : <ShoppingBag className="h-7 w-7" style={{ color: store.primaryColor }} />}
            <span>{store.name}</span>
          </a>
          <div className="flex items-center gap-3">
            <div className={`hidden items-center gap-3 text-sm md:flex ${isDark ? "text-gray-300" : "text-gray-500"}`}>
              {store.instagramUrl && <a href={socialUrl("instagram", store.instagramUrl)} target="_blank" rel="noreferrer" className="font-bold">Instagram</a>}
              {store.facebookUrl && <a href={socialUrl("facebook", store.facebookUrl)} target="_blank" rel="noreferrer" className="font-bold">Facebook</a>}
              {store.tiktokUrl && <a href={socialUrl("tiktok", store.tiktokUrl)} target="_blank" rel="noreferrer" className="font-bold">TikTok</a>}
            </div>
            <button
              type="button"
              onClick={() => setOpenCart(true)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${buttonRadius}`}
              style={{ backgroundColor: store.primaryColor, color: textColor }}
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount}
            </button>
          </div>
        </div>
      </header>

      {!hasCustomHeroBlock && renderHero()}

      {renderBlocks()}

      {!hasCustomProductBlock && <main id="productos" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: store.primaryColor }}>{isKids ? "Todo para jugar" : "Catalogo"}</p>
            <h2 className="mt-2 text-3xl font-black">{isKids ? "Nuestros favoritos" : "Productos destacados"}</h2>
          </div>
          {categories.length > 1 && !isMarket && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setCategory("all")} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"} ${isKids ? "border-2 border-white shadow-sm" : ""}`} style={category === "all" ? { backgroundColor: store.primaryColor } : undefined}>Todo{isKids ? " 🎁" : ""}</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${category === cat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"} ${isKids ? "border-2 border-white shadow-sm" : ""}`} style={category === cat ? { backgroundColor: store.primaryColor } : undefined}>{cat}</button>
              ))}
            </div>
          )}
          {subcategories.length > 1 && !isMarket && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSubcategory("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${subcategory === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === "all" ? { backgroundColor: store.accentColor } : undefined}>Todas</button>
              {subcategories.map((subcat) => (
                <button key={subcat} onClick={() => setSubcategory(subcat)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${subcategory === subcat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={subcategory === subcat ? { backgroundColor: store.accentColor } : undefined}>{formatCategoryLabel(subcat)}</button>
              ))}
            </div>
          )}
        </div>

        {store.products.length === 0 ? (
          <div className={`py-20 text-center ${isDark ? "text-gray-400" : "text-gray-400"}`}>
            <Package className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>Esta tienda aun no tiene productos</p>
          </div>
        ) : isMarket ? (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className={`h-fit rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-gray-100 bg-white"}`}>
              <div className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2 ${isDark ? "bg-white/10" : "bg-gray-50"}`}>
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Buscar productos</span>
              </div>
              <button onClick={() => setCategory("all")} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${category === "all" ? "text-white" : ""}`} style={category === "all" ? { backgroundColor: store.primaryColor } : undefined}>Todo</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-bold capitalize ${category === cat ? "text-white" : ""}`} style={category === cat ? { backgroundColor: store.primaryColor } : undefined}>{cat}</button>
              ))}
            </aside>
            <div className={`grid gap-5 ${productGrid}`}>{products.map(renderProductCard)}</div>
          </div>
        ) : (
          <div className={`grid gap-5 ${productGrid}`}>{products.map(renderProductCard)}</div>
        )}

        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isDark ? "bg-white/10 text-gray-200" : "bg-white text-gray-600"}`}>
            <Truck className="h-4 w-4" />
            Envios y pagos a coordinar con la tienda
          </div>
          <a href={`mailto:${store.owner.email}?subject=Consulta sobre ${store.name}`} className={`inline-flex items-center gap-2 px-6 py-3 font-bold ${buttonRadius}`} style={{ backgroundColor: store.primaryColor, color: textColor }}>
            <Mail className="h-4 w-4" />
            Consultar a la tienda
          </a>
        </div>
      </main>}

      <footer className={`${isDark ? "border-t border-white/10 bg-gray-950 text-gray-400" : "border-t border-gray-100 bg-white text-gray-500"} px-6 py-8 text-center text-sm`}>
        {store.footerText || `${store.name} - tienda online`}
      </footer>

      {store.showWhatsappButton && store.whatsappNumber && (
        <a
          href={socialUrl("whatsapp", store.whatsappNumber)}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

      <button
        type="button"
        onClick={() => setOpenCart(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        <ShoppingBag className="h-4 w-4" />
        Carrito ({cartCount})
      </button>

      {affiliateId && (
        <div className="fixed bottom-5 left-5 z-20 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm">
          Compra atribuida a un afiliado
        </div>
      )}

      {openCart && (
        <div className="fixed inset-0 z-40">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpenCart(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white text-gray-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Checkout</p>
                <p className="text-xs text-gray-400">Pedido para {store.name}</p>
              </div>
              <button type="button" onClick={() => setOpenCart(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCheckout} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {successOrderId && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  Pedido creado. La tienda va a confirmarlo cuando reciba el pago.
                </div>
              )}
              {checkoutError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{checkoutError}</div>}

              <div className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400">El carrito esta vacio.</p>
                ) : (
                  cart.map((item) => (
                    <div key={`${item.productId}:${item.variantId ?? "base"}`} className="flex gap-3 rounded-2xl border border-gray-100 p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <ProductImage image={item.image} name={item.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                        <p className="text-sm font-bold text-gray-900">{money(item.price, store.currency)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => changeQty(item.productId, item.variantId, -1)} className="rounded-lg border border-gray-200 p-1">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(item.productId, item.variantId, 1)} className="rounded-lg border border-gray-200 p-1">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-900">Datos del comprador</p>
                    <input required value={customer.name} onChange={(e) => updateCustomer("name", e.target.value)} placeholder="Nombre y apellido" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input required type="email" value={customer.email} onChange={(e) => updateCustomer("email", e.target.value)} placeholder="Email" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input value={customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} placeholder="Telefono" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input value={customer.street} onChange={(e) => updateCustomer("street", e.target.value)} placeholder="Direccion" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={customer.city} onChange={(e) => updateCustomer("city", e.target.value)} placeholder="Ciudad" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input value={customer.province} onChange={(e) => updateCustomer("province", e.target.value)} placeholder="Provincia" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <input value={customer.postalCode} onChange={(e) => updateCustomer("postalCode", e.target.value)} placeholder="Codigo postal" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">Envio</p>
                    {SHIPPING_OPTIONS.map((option) => (
                      <label key={option.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                        <span><input type="radio" name="shipping" checked={shippingMethod === option.id} onChange={() => setShippingMethod(option.id)} className="mr-2" />{option.label}</span>
                        <span className="font-semibold">{option.cost ? money(option.cost, store.currency) : "Gratis"}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">Pago</p>
                    {PAYMENT_OPTIONS.map((option) => (
                      <label key={option.id} className="block cursor-pointer rounded-xl border border-gray-200 px-3 py-2 text-sm">
                        <input type="radio" name="payment" checked={paymentProvider === option.id} onChange={() => setPaymentProvider(option.id)} className="mr-2" />
                        {option.label}
                      </label>
                    ))}
                  </div>

                  <textarea value={customer.notes} onChange={(e) => updateCustomer("notes", e.target.value)} placeholder="Notas para la tienda" rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal, store.currency)}</strong></div>
                    <div className="mt-1 flex justify-between"><span>Envio</span><strong>{shipping.cost ? money(shipping.cost, store.currency) : "Gratis"}</strong></div>
                    <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base"><span>Total</span><strong>{money(total, store.currency)}</strong></div>
                  </div>

                  <button type="submit" disabled={submitting} className="w-full rounded-xl bg-gray-950 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Crear pedido"}
                  </button>
                </>
              )}
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
