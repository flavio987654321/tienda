"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  MessageCircle,
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

export default function StorefrontClient({ store, affiliateId }: { store: Store; affiliateId?: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openCart, setOpenCart] = useState(false);
  const [category, setCategory] = useState("all");
  const [shippingMethod, setShippingMethod] = useState(SHIPPING_OPTIONS[0].id);
  const [paymentProvider, setPaymentProvider] = useState(PAYMENT_OPTIONS[0].id);
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

  const categories = useMemo(() => [...new Set(store.products.map((p) => p.category).filter(Boolean))], [store.products]);
  const products = category === "all" ? store.products : store.products.filter((product) => product.category === category);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = SHIPPING_OPTIONS.find((option) => option.id === shippingMethod) ?? SHIPPING_OPTIONS[0];
  const total = subtotal + shipping.cost;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const firstProducts = store.products.slice(0, 3).map((product) => ({ product, image: parseImages(product.images)[0] ?? null }));
  const heroImage = store.banner || firstProducts[0]?.image || null;
  const textColor = readableText(store.primaryColor);
  const isDark = store.templateId === "tech";
  const isSplit = ["fashion", "luxury", "boutique"].includes(store.templateId);
  const isMarket = store.templateId === "market";
  const isColorful = store.templateId === "colorful" || store.templateId === "kids";
  const cardRadius = RADIUS[store.cardRadius] ?? RADIUS.md;
  const cardShadow = SHADOW[store.cardShadow] ?? SHADOW.sm;
  const buttonRadius = buttonClass(store.buttonStyle);
  const productGrid = GRID[store.productLayout] ?? GRID.grid3;

  function updateCustomer(field: keyof Customer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
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

    return (
      <article
        key={product.id}
        className={`${featured ? "sm:col-span-2 sm:row-span-2" : ""} ${list ? "grid grid-cols-[150px_1fr] md:grid-cols-[220px_1fr]" : ""} overflow-hidden border transition duration-300 hover:-translate-y-0.5 ${cardRadius} ${cardShadow} ${
          isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-100 bg-white text-gray-950"
        }`}
      >
        <div className={`${list ? "h-full min-h-40" : featured ? "aspect-[4/3]" : "aspect-square"} relative overflow-hidden ${isColorful ? "p-2" : ""}`} style={{ backgroundColor: store.secondaryColor }}>
          <div className={`h-full w-full overflow-hidden ${isColorful ? "rounded-2xl" : ""}`}>
            <ProductImage image={image} name={product.name} className="transition duration-500 hover:scale-105" />
          </div>
          {hasDiscount && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black text-white" style={{ backgroundColor: store.accentColor }}>OFERTA</span>}
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

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "text-gray-950"}`}
      style={{
        fontFamily: store.fontFamily,
        background:
          store.backgroundStyle === "gradient"
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
              {store.instagramUrl && <a href={store.instagramUrl} target="_blank" rel="noreferrer" className="font-bold">Instagram</a>}
              {store.facebookUrl && <a href={store.facebookUrl} target="_blank" rel="noreferrer" className="font-bold">Facebook</a>}
              {store.tiktokUrl && <span className="font-bold">TikTok</span>}
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

      {renderHero()}

      <main id="productos" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: store.primaryColor }}>Catalogo</p>
            <h2 className="mt-2 text-3xl font-black">Productos destacados</h2>
          </div>
          {categories.length > 1 && !isMarket && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setCategory("all")} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === "all" ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === "all" ? { backgroundColor: store.primaryColor } : undefined}>Todo</button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${category === cat ? "text-white" : isDark ? "bg-white/10 text-white" : "bg-white text-gray-600"}`} style={category === cat ? { backgroundColor: store.primaryColor } : undefined}>{cat}</button>
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
      </main>

      <footer className={`${isDark ? "border-t border-white/10 bg-gray-950 text-gray-400" : "border-t border-gray-100 bg-white text-gray-500"} px-6 py-8 text-center text-sm`}>
        {store.footerText || `${store.name} - tienda online`}
      </footer>

      {store.showWhatsappButton && store.whatsappNumber && (
        <a
          href={`https://wa.me/${store.whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl"
        >
          <MessageCircle className="h-6 w-6" />
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
          Compra atribuida a una vendedora
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
