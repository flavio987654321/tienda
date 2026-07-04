"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { StorefrontProduct, ValidatedCoupon, PlaceOrderParams } from "./useStorefront";
import { getEnvioOptions, fmtEnvioPrice, getPagoOptions, fmt as fmtFn, type CartItem, type ContactStatus, type CheckoutStatus, type ShippingMethod } from "@/components/store/shared/cartTypes";
import { useAuth } from "@/components/AuthProvider";
import { LIVE_QUOTE_DOMICILIO_ID } from "@/types/store-config";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { parseVariantAttrs } from "@/lib/variantAttrs";

// Misma lógica de matching de variante por talle/color que usan los templates
// para mostrar "Sin stock"/"Últimas unidades" — se centraliza acá (y se expone
// como `selectedVariantStock`) para que addToCart pueda topar la cantidad al
// stock real, y los templates no necesiten reimplementarla cada uno.
function resolveVariantStock(product: StorefrontProduct, selectedSize: string, selectedColor: string): number | null {
  if (!product.variants.length) return null;
  const v = product.variants.find(v => {
    const a = parseVariantAttrs(v.name);
    if (a) {
      const vals = Object.values(a).map((x) => String(x).toLowerCase());
      const sizeOk = !selectedSize || vals.includes(selectedSize.toLowerCase());
      const colorOk = !selectedColor || vals.includes(selectedColor.toLowerCase());
      return sizeOk && colorOk;
    }
    return v.value.includes(selectedSize) && v.value.includes(selectedColor);
  }) ?? (product.variants.length === 1 ? product.variants[0] : null);
  return v?.stock ?? null;
}

type StorefrontDeps = {
  products: StorefrontProduct[];
  storeId?: string | null;
  affiliateId?: string | null;
  slug?: string | null;
  isOwner?: boolean;
  resolveVariantId: (product: StorefrontProduct, size: string, color: string) => string | null;
  validateCoupon: (code: string, subtotal: number) => Promise<{ coupon: ValidatedCoupon; discount: number } | { error: string }>;
  placeOrder: (params: PlaceOrderParams) => Promise<{ ok: boolean; orderId?: string; donationId?: string; error?: string }>;
  checkoutMode?: "cart" | "inquiry";
  isWholesale?: boolean;
  hasMercadoPago?: boolean;
  shippingMethods?: ShippingMethod[] | null;
  // Las páginas de detalle de producto reusan `openModal` solo para cargar el producto
  // en el estado del carrito (addToCart/selectedSize/etc.), sin mostrar ningún modal
  // flotante encima — por eso no deben heredar el bloqueo de scroll del body pensado
  // para el quick-view modal del catálogo.
  lockScrollOnModal?: boolean;
};

export function useCartLogic({ products, storeId, affiliateId = null, slug = null, isOwner = false, resolveVariantId, validateCoupon, placeOrder, checkoutMode = "cart", isWholesale = false, hasMercadoPago = false, shippingMethods, lockScrollOnModal = true }: StorefrontDeps) {
  const [cartItems,      setCartItems]      = useState<CartItem[]>([]);
  const [cartOpen,       setCartOpen]       = useState(false);
  const [modalProduct,   setModalProduct]   = useState<StorefrontProduct | null>(null);
  const [modalImg,       setModalImg]       = useState(0);
  const [selectedSize,   setSelectedSize]   = useState("");
  const [selectedColor,  setSelectedColor]  = useState("");
  const [qty,            setQty]            = useState(1);
  const [checkoutOpen,   setCheckoutOpen]   = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutError,  setCheckoutError]  = useState("");
  const [envioId,        setEnvioId]        = useState("retiro");
  const [pagoId,         setPagoId]         = useState("transferencia");
  const [coupon,         setCoupon]         = useState("");
  const [couponError,    setCouponError]    = useState("");
  const [appliedCoupon,  setAppliedCoupon]  = useState<{ id: string; code: string; discount: number } | null>(null);
  const [notas,          setNotas]          = useState("");
  const [rememberData,   setRememberData]   = useState(false);
  const [buyerForm,      setBuyerForm]      = useState({ nombre:"", email:"", telefono:"", direccion:"", ciudad:"", provincia:"", cp:"" });
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [favorites,      setFavorites]      = useState<string[]>([]);
  const [favoritesOpen,  setFavoritesOpen]  = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [toastMsg,       setToastMsg]       = useState<string | null>(null);
  const [contactStatus,  setContactStatus]  = useState<ContactStatus>("idle");
  const [contactForm,    setContactForm]    = useState({ nombre:"", email:"", mensaje:"" });
  const [acceptedTerms,  setAcceptedTerms]  = useState(false);
  const [donationEnabled, setDonationEnabled] = useState(false);
  const [donationAmount,  setDonationAmount]  = useState(1000);
  // El toggle de "¿Donar?" del checkout solo tiene sentido si hay una
  // canasta ACTIVE recibiendo donaciones — si no hay ninguna, o ya se
  // completó, el backend de /api/checkout ignora el aporte en silencio, así
  // que ocultamos el toggle entero para no dejar donar "al aire".
  const [canastaDisponible, setCanastaDisponible] = useState(false);
  const [liveQuote, setLiveQuote] = useState<{
    status: "idle" | "loading" | "unavailable" | "ready";
    domicilio: number | null;
    sucursal: number | null;
  }>({ status: "idle", domicilio: null, sucursal: null });

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const addingToCartRef = useRef(false);
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Si el comprador llegó por link de afiliado, forzar MP como único método de pago
  useEffect(() => {
    if (affiliateId) setPagoId("mercadopago");
  }, [affiliateId]);

  useEffect(() => {
    fetch("/api/canasta/campaign")
      .then((r) => r.json())
      .then((d) => setCanastaDisponible(d?.campaign?.status === "ACTIVE"))
      .catch(() => {});
  }, []);

  // Restaurar carrito y datos del comprador desde localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("storefront_cart");
      if (savedCart) setCartItems(JSON.parse(savedCart));
      const savedBuyer = localStorage.getItem("storefront_buyer");
      if (savedBuyer) {
        const parsed = JSON.parse(savedBuyer);
        // Compradores que guardaron sus datos antes de que "provincia" pasara
        // a ser un código ISO (ej: "B") tienen ahí texto libre (ej: "Buenos
        // Aires") que no matchea ninguna opción del <select> — se limpia para
        // que no quede un valor inválido sin que el comprador lo note.
        if (parsed?.provincia && !PROVINCIAS_ARGENTINA.some((p) => p.code === parsed.provincia)) {
          parsed.provincia = "";
        }
        setBuyerForm(parsed);
        setRememberData(true);
      }
    } catch {}
  }, []);

  // Cargar favoritos: desde API si está logueado, desde localStorage si no
  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      fetch("/api/favoritos")
        .then(r => r.ok ? r.json() : [])
        .then((data: { productId: string }[]) => setFavorites(data.map(f => f.productId)))
        .catch(() => {});
    } else {
      try {
        const savedFavs = localStorage.getItem("storefront_favorites");
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
      } catch {}
    }
  }, [status]);

  useEffect(() => {
    try { localStorage.setItem("storefront_cart", JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  // Solo persistir en localStorage cuando no está logueado
  useEffect(() => {
    if (status === "authenticated") return;
    try { localStorage.setItem("storefront_favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites, status]);

  useEffect(() => {
    try {
      if (rememberData) localStorage.setItem("storefront_buyer", JSON.stringify(buyerForm));
      else localStorage.removeItem("storefront_buyer");
    } catch {}
  }, [buyerForm, rememberData]);

  // Carrito abandonado: si ya escribió un email válido en el checkout pero
  // todavía no completó la compra, guardamos un snapshot para poder mandarle
  // un recordatorio más tarde. No aplica a "inquiry" (tiendas sin carrito real).
  useEffect(() => {
    if (checkoutMode !== "cart" || !storeId || cartItems.length === 0) return;
    const email = buyerForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const timeout = setTimeout(() => {
      const total = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      fetch("/api/cart/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          email,
          name: buyerForm.nombre,
          phone: buyerForm.telefono,
          total,
          items: cartItems.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            name: i.product.name,
            image: i.product.images[0] ?? null,
            price: i.product.price,
            qty: i.qty,
            size: i.size,
            color: i.color,
          })),
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerForm.email, buyerForm.nombre, buyerForm.telefono, storeId, checkoutMode, JSON.stringify(cartItems.map((i) => [i.product.id, i.qty]))]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userDropdownOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setModalProduct(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const savedScrollY = useRef(0);
  // true solo mientras el modal estuvo abierto en esta instancia — evita
  // que el scrollTo(0,0) se dispare en el montaje inicial o en previews
  const modalWasOpen = useRef(false);

  // Bloquear scroll del body cuando el modal está abierto (fix iOS Safari)
  useEffect(() => {
    if (!lockScrollOnModal) return;
    if (modalProduct) {
      modalWasOpen.current = true;
      savedScrollY.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY.current}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      // solo restaura si el modal realmente estuvo abierto en esta instancia
      if (modalWasOpen.current) {
        window.scrollTo(0, savedScrollY.current);
        modalWasOpen.current = false;
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [modalProduct, lockScrollOnModal]);

  // Cotización en vivo (Envíopack): se dispara cuando hay un método liveQuote
  // habilitado y el comprador ya escribió un CP con pinta de válido. Debounced
  // para no spamear el endpoint en cada tecla.
  const liveQuoteMethods = (shippingMethods ?? []).filter((m) => m.liveQuote && m.enabled);
  useEffect(() => {
    if (liveQuoteMethods.length === 0 || !storeId) return;
    const cp = buyerForm.cp.trim();
    const provincia = buyerForm.provincia.trim();
    if (cp.length < 4 || !provincia || cartItems.length === 0) {
      // El destino dejó de ser válido (ej: el comprador borró el CP después
      // de tener una cotización) — no dejar el precio viejo mostrándose.
      setLiveQuote({ status: "idle", domicilio: null, sucursal: null });
      return;
    }

    setLiveQuote((q) => ({ ...q, status: "loading" }));
    const timeout = setTimeout(() => {
      fetch("/api/envios/cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          destinationPostalCode: cp,
          destinationProvince: provincia,
          items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.qty })),
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.available) {
            setLiveQuote({ status: "ready", domicilio: data.domicilio ?? null, sucursal: data.sucursal ?? null });
          } else {
            setLiveQuote({ status: "unavailable", domicilio: null, sucursal: null });
          }
        })
        .catch(() => setLiveQuote({ status: "unavailable", domicilio: null, sucursal: null }));
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerForm.cp, buyerForm.provincia, storeId, JSON.stringify(cartItems.map((i) => [i.product.id, i.qty]))]);

  function getLiveQuotePrice(methodId: string): number | null {
    if (liveQuote.status !== "ready") return null;
    if (methodId === LIVE_QUOTE_DOMICILIO_ID) return liveQuote.domicilio;
    return null;
  }

  function fmtLiveQuote(methodId: string): string {
    if (liveQuote.status === "loading") return "Calculando...";
    const price = getLiveQuotePrice(methodId);
    if (price != null) return fmtFn(price);
    return "A coordinar"; // unavailable (Fase A) o sin CP todavía
  }

  // Stock de la variante (talle/color) actualmente seleccionada en el modal de
  // producto — calculado una sola vez acá para que los templates no necesiten
  // reimplementar el mismo parseo de `variant.name` para mostrar "Sin stock"
  // o "Últimas unidades" en el modal.
  const selectedVariantStock = useMemo(() => {
    if (!modalProduct) return null;
    return resolveVariantStock(modalProduct, selectedSize, selectedColor);
  }, [modalProduct, selectedSize, selectedColor]);

  // Talles sin stock para el color ya elegido (o para cualquier color si
  // todavía no eligió uno) — se usa para tachar/atenuar el talle en el
  // selector antes de que el comprador lo seleccione y recién ahí se
  // entere de que no hay stock.
  const outOfStockSizes = useMemo(() => {
    const set = new Set<string>();
    if (!modalProduct?.variants.length) return set;
    for (const size of modalProduct.sizes) {
      const matching = modalProduct.variants.filter(v => {
        const a = parseVariantAttrs(v.name);
        if (a) {
          const vals = Object.values(a).map((x) => String(x).toLowerCase());
          const sizeOk = vals.includes(size.toLowerCase());
          const colorOk = !selectedColor || vals.includes(selectedColor.toLowerCase());
          return sizeOk && colorOk;
        }
        return v.value.includes(size) && (!selectedColor || v.value.includes(selectedColor));
      });
      if (matching.length > 0 && matching.every(v => v.stock === 0)) set.add(size);
    }
    return set;
  }, [modalProduct, selectedColor]);

  // Devuelve el precio unitario efectivo para un producto en modo mayorista,
  // aplicando el mejor escalón disponible según la cantidad.
  // Prioridad: escalón más alto aplicable > precio base > precio retail.
  function getEffectiveWholesalePrice(product: typeof cartItems[number]["product"], qty: number): number {
    if (!product.cantMinMayorista || qty < product.cantMinMayorista) return product.price;
    // Buscar el mejor escalón (desde ≤ qty, precio más bajo = mayor descuento)
    const escalones = product.preciosEscalonados ?? [];
    let bestEscalonPrice: number | null = null;
    for (const band of escalones) {
      if (qty >= band.desde) {
        if (bestEscalonPrice === null || band.precio < bestEscalonPrice) {
          bestEscalonPrice = band.precio;
        }
      }
    }
    if (bestEscalonPrice !== null) return bestEscalonPrice;
    // Sin escalón aplicable: usar precio base mayorista
    return product.precioMayorista ?? product.price;
  }

  // Derived values
  const cartTotal      = cartItems.reduce((s, i) => {
    const price = isWholesale ? getEffectiveWholesalePrice(i.product, i.qty) : i.product.price;
    return s + price * i.qty;
  }, 0);
  const wholesaleWarnings = isWholesale ? cartItems.filter(i =>
    i.product.cantMinMayorista && i.qty < i.product.cantMinMayorista
  ) : [];
  const cartCount      = cartItems.reduce((s, i) => s + i.qty, 0);
  const envioOptions   = getEnvioOptions(shippingMethods);
  const selectedEnvio  = envioOptions.find(o => o.id === envioId) ?? envioOptions[0];
  const selectedLiveQuotePrice = selectedEnvio?.liveQuote ? getLiveQuotePrice(selectedEnvio.id) : null;
  const envioPrice     = selectedEnvio?.liveQuote ? (selectedLiveQuotePrice ?? 0) : (selectedEnvio?.coordinar ? 0 : (selectedEnvio?.price ?? 0));
  const envioCoordinar = selectedEnvio?.liveQuote ? selectedLiveQuotePrice == null : (selectedEnvio?.coordinar ?? false);
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const orderTotal     = cartTotal + envioPrice - couponDiscount;

  const searchResults = searchQuery.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  // Functions
  const fmt = fmtFn;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const openModal = (p: StorefrontProduct) => {
    setModalProduct(p);
    setModalImg(0);
    setSelectedSize(p.sizes[0] ?? "");
    setSelectedColor(p.colors[0] ?? "");
    setQty(isWholesale && p.cantMinMayorista ? p.cantMinMayorista : 1);
    setSearchOpen(false);
    // Registrar vista real del comprador: una vez por producto por sesión.
    // Se omite si es el dueño, si está en preview, o si no hay slug real.
    if (!isOwner && slug && typeof sessionStorage !== "undefined") {
      const key = `pview_${p.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        fetch(`/api/public/${slug}/product-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: p.id }),
        }).catch(() => {});
      }
    }
  };

  // Deep link a un producto puntual (ej: ?producto=ID desde favoritos en otro panel)
  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    if (id) {
      const p = products.find((pr) => pr.id === id);
      if (p) openModal(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Recuperar un carrito abandonado desde el link del email (?recuperar=ID)
  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("recuperar");
    if (!id) return;

    fetch(`/api/cart/track/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { storeId: string; items: { productId: string; variantId: string | null; qty: number; size?: string; color?: string }[] } | null) => {
        if (!data || data.storeId !== storeId) return;
        const restored: CartItem[] = [];
        for (const item of data.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) continue;
          restored.push({ product, size: item.size ?? "", color: item.color ?? "", variantId: item.variantId ?? null, qty: item.qty });
        }
        if (restored.length === 0) return;
        setCartItems((prev) => {
          const existingKeys = new Set(prev.map((i) => `${i.product.id}|${i.size}|${i.color}`));
          const toAdd = restored.filter((i) => !existingKeys.has(`${i.product.id}|${i.size}|${i.color}`));
          return [...prev, ...toAdd];
        });
        setCartOpen(true);
        showToast("Recuperamos tu carrito");
      })
      .catch(() => {})
      .finally(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete("recuperar");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, storeId]);

  const addToCart = () => {
    if (!modalProduct || addingToCartRef.current) return;
    addingToCartRef.current = true;
    const variantId = resolveVariantId(modalProduct, selectedSize, selectedColor);
    const name = modalProduct.name;
    const stock = resolveVariantStock(modalProduct, selectedSize, selectedColor);
    setCartItems(prev => {
      const ex = prev.find(i => i.product.id === modalProduct.id && i.size === selectedSize && i.color === selectedColor);
      if (ex) {
        const total = stock !== null ? Math.min(ex.qty + qty, stock) : ex.qty + qty;
        return prev.map(i => i === ex ? { ...i, qty: total } : i);
      }
      const initialQty = stock !== null ? Math.min(qty, stock) : qty;
      return [...prev, { product: modalProduct, size: selectedSize, color: selectedColor, variantId, qty: initialQty }];
    });
    setModalProduct(null);
    showToast(`${name} agregado al carrito`);
    setCartOpen(true);
    addingToCartRef.current = false;
  };

  const removeFromCart = (idx: number) =>
    setCartItems(prev => prev.filter((_, i) => i !== idx));

  const updateQty = (idx: number, delta: number) =>
    setCartItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item));

  const openCheckout = () => {
    setCartOpen(false);
    setCheckoutStatus("idle");
    setCheckoutError("");
    setCheckoutOpen(true);
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!coupon.trim()) return;
    const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
    const res = await validateCoupon(coupon, subtotal);
    if ("error" in res) { setCouponError(res.error); return; }
    setAppliedCoupon({ id: res.coupon.id, code: res.coupon.code, discount: res.discount });
    setCoupon("");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setCheckoutError("Debés aceptar los términos y condiciones para continuar."); return; }
    setCheckoutStatus("placing");
    setCheckoutError("");
    const res = await placeOrder({
      cartItems: cartItems.map(item => ({
        productId: item.product.id,
        variantId: item.variantId,
        quantity:  item.qty,
      })),
      customer: {
        name:       buyerForm.nombre,
        email:      buyerForm.email,
        phone:      buyerForm.telefono,
        street:     buyerForm.direccion,
        city:       buyerForm.ciudad,
        province:   buyerForm.provincia,
        postalCode: buyerForm.cp,
        notes:      notas,
      },
      shippingMethod:  envioId,
      paymentProvider: pagoId,
      couponId:        appliedCoupon?.id ?? null,
      donationAmount:  donationEnabled ? donationAmount : undefined,
    });
    if (!res.ok) { setCheckoutStatus("idle"); setCheckoutError(res.error ?? "Error al procesar"); return; }

    // Si eligió MercadoPago, crear preferencia y redirigir
    if (pagoId === "mercadopago" && res.orderId) {
      const mpRes = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: res.orderId, donationId: res.donationId }),
      });
      const mpData = await mpRes.json().catch(() => ({}));
      if (!mpRes.ok || !mpData.initPoint) {
        setCheckoutStatus("idle");
        setCheckoutError(mpData.error ?? "No se pudo iniciar el pago. Intentá de nuevo.");
        return;
      }
      setCartItems([]);
      setAppliedCoupon(null);
      try { localStorage.removeItem("storefront_cart"); } catch {}
      window.location.href = mpData.initPoint;
      return;
    }

    setCartItems([]);
    setAppliedCoupon(null);
    try { localStorage.removeItem("storefront_cart"); } catch {}

    // Pago por transferencia: no hay redirección a MP para la compra. Si
    // pidió donar, ese segundo pago (siempre vía MercadoPago) se ofrece en
    // el mismo modal de "compra confirmada" que usa el camino de MP, en vez
    // de mostrarlo metido dentro del panel de checkout.
    if (res.donationId && res.orderId) {
      setCheckoutOpen(false);
      router.replace(`${pathname}?pago=ok&orden=${res.orderId}&donacionId=${res.donationId}`, { scroll: false });
      return;
    }

    setCheckoutStatus("done");
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setContactStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          nombre: contactForm.nombre,
          email: contactForm.email,
          mensaje: contactForm.mensaje,
        }),
      });
      if (res.ok) {
        setContactStatus("sent");
        setContactForm({ nombre: "", email: "", mensaje: "" });
      } else {
        setContactStatus("idle");
      }
    } catch {
      setContactStatus("idle");
    }
  };

  const toggleFavorite = async (id: string) => {
    if (status !== "authenticated") {
      showToast("Iniciá sesión para guardar favoritos");
      return;
    }
    // Optimistic update
    const wasFavorite = favorites.includes(id);
    setFavorites(prev => wasFavorite ? prev.filter(f => f !== id) : [...prev, id]);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      // Revert on error
      setFavorites(prev => wasFavorite ? [...prev, id] : prev.filter(f => f !== id));
    }
  };

  return {
    // State
    cartItems, cartOpen, setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    qty, setQty,
    checkoutOpen, setCheckoutOpen, checkoutStatus, setCheckoutStatus, checkoutError,
    envioId, setEnvioId, pagoId, setPagoId,
    coupon, setCoupon, couponError, appliedCoupon, setAppliedCoupon,
    notas, setNotas, rememberData, setRememberData,
    buyerForm, setBuyerForm,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    contactStatus, setContactStatus, contactForm, setContactForm,
    acceptedTerms, setAcceptedTerms,
    donationEnabled, setDonationEnabled, donationAmount, setDonationAmount, canastaDisponible,
    // Derived
    cartTotal, cartCount, envioPrice, envioCoordinar, envioOptions, couponDiscount, orderTotal,
    searchResults, favoriteProducts, selectedVariantStock, outOfStockSizes,
    checkoutMode, isWholesale, wholesaleWarnings,
    pagoOptions: getPagoOptions(hasMercadoPago, !!affiliateId),
    fmtEnvioPrice, fmtLiveQuote,
    // Functions
    fmt, showToast, openModal, addToCart, removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, handleContact, toggleFavorite,
  };
}
