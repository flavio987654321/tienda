"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { StorefrontProduct, ValidatedCoupon, PlaceOrderParams } from "./useStorefront";
import { getEnvioOptions, fmtEnvioPrice, getPagoOptions, fmt as fmtFn, type CartItem, type ContactStatus, type CheckoutStatus, type ShippingMethod } from "@/components/store/shared/cartTypes";
import { useAuth } from "@/components/AuthProvider";

type StorefrontDeps = {
  products: StorefrontProduct[];
  storeId?: string | null;
  resolveVariantId: (product: StorefrontProduct, size: string, color: string) => string | null;
  validateCoupon: (code: string, subtotal: number) => Promise<{ coupon: ValidatedCoupon; discount: number } | { error: string }>;
  placeOrder: (params: PlaceOrderParams) => Promise<{ ok: boolean; orderId?: string; donationId?: string; error?: string }>;
  checkoutMode?: "cart" | "inquiry";
  isWholesale?: boolean;
  hasMercadoPago?: boolean;
  shippingMethods?: ShippingMethod[] | null;
};

export function useCartLogic({ products, storeId, resolveVariantId, validateCoupon, placeOrder, checkoutMode = "cart", isWholesale = false, hasMercadoPago = false, shippingMethods }: StorefrontDeps) {
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

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Restaurar carrito y datos del comprador desde localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("storefront_cart");
      if (savedCart) setCartItems(JSON.parse(savedCart));
      const savedBuyer = localStorage.getItem("storefront_buyer");
      if (savedBuyer) { setBuyerForm(JSON.parse(savedBuyer)); setRememberData(true); }
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

  // Bloquear scroll del body cuando el modal está abierto (fix iOS Safari)
  useEffect(() => {
    if (modalProduct) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const top = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top) * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [modalProduct]);

  // Derived values
  const cartTotal      = cartItems.reduce((s, i) => {
    const useWholesale = isWholesale && i.product.precioMayorista && i.product.cantMinMayorista && i.qty >= i.product.cantMinMayorista;
    const price = useWholesale ? (i.product.precioMayorista as number) : i.product.price;
    return s + price * i.qty;
  }, 0);
  const wholesaleWarnings = isWholesale ? cartItems.filter(i =>
    i.product.cantMinMayorista && i.qty < i.product.cantMinMayorista
  ) : [];
  const cartCount      = cartItems.reduce((s, i) => s + i.qty, 0);
  const envioOptions   = getEnvioOptions(shippingMethods);
  const selectedEnvio  = envioOptions.find(o => o.id === envioId) ?? envioOptions[0];
  const envioPrice     = selectedEnvio?.coordinar ? 0 : (selectedEnvio?.price ?? 0);
  const envioCoordinar = selectedEnvio?.coordinar ?? false;
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
    setSelectedSize(p.sizes[0]);
    setSelectedColor(p.colors[0]);
    setQty(1);
    setSearchOpen(false);
  };

  const addToCart = () => {
    if (!modalProduct) return;
    const variantId = resolveVariantId(modalProduct, selectedSize, selectedColor);
    const name = modalProduct.name;
    setCartItems(prev => {
      const ex = prev.find(i => i.product.id === modalProduct.id && i.size === selectedSize && i.color === selectedColor);
      if (ex) return prev.map(i => i === ex ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { product: modalProduct, size: selectedSize, color: selectedColor, variantId, qty }];
    });
    setModalProduct(null);
    showToast(`${name} agregado al carrito`);
    setCartOpen(true);
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
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      // Revert on error
      setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
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
    donationEnabled, setDonationEnabled, donationAmount, setDonationAmount,
    // Derived
    cartTotal, cartCount, envioPrice, envioCoordinar, envioOptions, couponDiscount, orderTotal,
    searchResults, favoriteProducts,
    checkoutMode, isWholesale, wholesaleWarnings,
    pagoOptions: getPagoOptions(hasMercadoPago),
    fmtEnvioPrice,
    // Functions
    fmt, showToast, openModal, addToCart, removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, handleContact, toggleFavorite,
  };
}
