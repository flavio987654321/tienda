"use client";

import { useMemo, useState } from "react";
import { Package, ShoppingBag, Mail, Plus, Minus, X, Loader2 } from "lucide-react";

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
  primaryColor: string;
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

function parseImages(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

export default function StorefrontClient({ store, affiliateId }: { store: Store; affiliateId?: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openCart, setOpenCart] = useState(false);
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

  const categorias = useMemo(() => [...new Set(store.products.map((p) => p.category))], [store.products]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = SHIPPING_OPTIONS.find((option) => option.id === shippingMethod) ?? SHIPPING_OPTIONS[0];
  const total = subtotal + shipping.cost;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-white px-6 py-16 text-center" style={{ backgroundColor: store.primaryColor }}>
        <div className="max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <Package className="h-10 w-10 text-white" />
            )}
          </div>
          <h1 className="text-4xl font-extrabold mb-3">{store.name}</h1>
          {store.description && <p className="text-white/80 text-lg max-w-xl mx-auto">{store.description}</p>}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/70">
            <span>{store.products.length} productos</span>
            <span>-</span>
            <span>por {store.owner.name}</span>
          </div>
          {affiliateId && (
            <div className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white">
              Compra atribuida a una vendedora
            </div>
          )}
        </div>
      </div>

      {categorias.length > 1 && (
        <div className="sticky top-0 bg-white border-b border-gray-100 z-20">
          <div className="max-w-5xl mx-auto px-6 flex gap-2 py-3 overflow-x-auto">
            <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium shrink-0">Todo</button>
            {categorias.map((cat) => (
              <button key={cat} className="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium shrink-0 capitalize">
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpenCart(true)}
        className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        <ShoppingBag className="h-4 w-4" />
        Carrito ({cartCount})
      </button>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {store.products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Esta tienda aun no tiene productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {store.products.map((product) => {
              const images = parseImages(product.images);
              const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
              const hasDiscount = product.comparePrice && product.comparePrice > product.price;
              const available = product.variants.length === 0 || totalStock > 0;

              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {images[0] ? (
                      <img src={images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-gray-200" />
                      </div>
                    )}
                    {hasDiscount && <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">OFERTA</span>}
                    {!available && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">Sin stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{money(product.price)}</span>
                      {hasDiscount && <span className="text-xs text-gray-400 line-through">{money(product.comparePrice!)}</span>}
                    </div>
                    {product.variants.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{product.variants.map((v) => v.value).join(", ")}</p>
                    )}
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => addToCart(product)}
                      className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium transition-colors disabled:opacity-40"
                      style={{ backgroundColor: store.primaryColor, color: "white" }}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {!available ? "Sin stock" : "Agregar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <a href={`mailto:${store.owner.email}?subject=Consulta sobre ${store.name}`} className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            <Mail className="h-4 w-4" />
            Consultar a la tienda
          </a>
        </div>
      </div>

      {openCart && (
        <div className="fixed inset-0 z-40">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpenCart(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Checkout</p>
                <p className="text-xs text-gray-400">Pedido para {store.name}</p>
              </div>
              <button type="button" onClick={() => setOpenCart(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCheckout} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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
                      <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <Package className="m-4 h-6 w-6 text-gray-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                        <p className="text-sm font-bold text-gray-900">{money(item.price)}</p>
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
                        <span className="font-semibold">{option.cost ? money(option.cost) : "Gratis"}</span>
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

                  <textarea value={customer.notes} onChange={(e) => updateCustomer("notes", e.target.value)} placeholder="Notas para la tienda" rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                    <div className="flex justify-between mt-1"><span>Envio</span><strong>{shipping.cost ? money(shipping.cost) : "Gratis"}</strong></div>
                    <div className="flex justify-between mt-3 border-t border-gray-200 pt-3 text-base"><span>Total</span><strong>{money(total)}</strong></div>
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
