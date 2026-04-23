"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Package,
  Heart,
  Star,
  User,
  ChevronRight,
  MapPin,
  Phone,
  AtSign,
  Edit2,
  Check,
  X,
  Loader2,
  ExternalLink,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

type Tab = "pedidos" | "favoritos" | "resenas" | "perfil";

type Order = {
  id: string;
  status: string;
  total: number;
  shippingCost: number;
  createdAt: string;
  store: { name: string; slug: string; logo: string | null; primaryColor: string };
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { id: string; name: string; images: string };
    variant: { name: string; value: string } | null;
  }[];
  payment: { status: string; provider: string } | null;
  shipping: { trackingCode: string | null; status: string } | null;
};

type Favorite = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: string;
    store: { slug: string; name: string; primaryColor: string };
  };
};

type PendingReview = {
  productId: string;
  orderId: string;
  productName: string;
  productImages: string;
  orderDate: string;
  storeName: string;
  storeSlug: string;
};

type SubmittedReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  productImages: string;
};

type Profile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
};

function statusInfo(status: string) {
  switch (status) {
    case "CONFIRMED": return { label: "Confirmado", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" };
    case "SHIPPED": return { label: "En camino", icon: Truck, color: "text-blue-600", bg: "bg-blue-50" };
    case "DELIVERED": return { label: "Entregado", icon: CheckCircle, color: "text-indigo-600", bg: "bg-indigo-50" };
    case "CANCELLED": return { label: "Cancelado", icon: XCircle, color: "text-red-600", bg: "bg-red-50" };
    default: return { label: "Pendiente", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" };
  }
}

function money(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function Stars({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 transition-colors ${
            s <= (interactive ? hover || rating : rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(s)}
        />
      ))}
    </div>
  );
}

export default function MiCuentaPage() {
  const [tab, setTab] = useState<Tab>("pedidos");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [submittedReviews, setSubmittedReviews] = useState<SubmittedReview[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [resenasFetched, setResenasFetched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "", city: "", phone: "", instagramHandle: "" });
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/mi-cuenta/perfil")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data);
        setEditForm({
          name: data.name || "",
          bio: data.bio || "",
          city: data.city || "",
          phone: data.phone || "",
          instagramHandle: data.instagramHandle || "",
        });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (tab === "pedidos" && orders.length === 0) {
      fetch("/api/mi-cuenta/pedidos").then((r) => r.json()).then(setOrders);
    }
    if (tab === "favoritos" && favorites.length === 0) {
      fetch("/api/favoritos").then((r) => r.json()).then(setFavorites);
    }
    if (tab === "resenas" && !resenasFetched) {
      setResenasFetched(true);
      fetch("/api/mi-cuenta/resenas")
        .then((r) => r.json())
        .then((data) => {
          setPendingReviews(data.pending || []);
          setSubmittedReviews(data.submitted || []);
        });
    }
  }, [tab]);

  async function saveProfile() {
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/mi-cuenta/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error || "Error al guardar"); setSaving(false); return; }
    setProfile((p) => p ? { ...p, ...data } : data);
    setEditing(false);
    setSaving(false);
  }

  async function submitReview(productId: string, orderId: string) {
    const draft = reviewDrafts[productId];
    if (!draft?.rating) return;
    setSubmittingReview(productId);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, orderId, rating: draft.rating, comment: draft.comment || null }),
    });
    const data = await res.json();
    setSubmittingReview(null);
    if (res.ok) {
      const pending = pendingReviews.find((p) => p.productId === productId);
      if (pending) {
        setPendingReviews((prev) => prev.filter((x) => x.productId !== productId));
        setSubmittedReviews((prev) => [
          {
            id: data.id,
            rating: data.rating,
            comment: data.comment,
            createdAt: data.createdAt,
            productId: data.productId,
            productName: pending.productName,
            productImages: pending.productImages,
          },
          ...prev,
        ]);
      }
    }
  }

  async function removeFavorite(productId: string) {
    await fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    setFavorites((f) => f.filter((fav) => fav.productId !== productId));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "pedidos", label: "Mis pedidos", icon: Package },
    { key: "favoritos", label: "Favoritos", icon: Heart },
    { key: "resenas", label: "Reseñas", icon: Star },
    { key: "perfil", label: "Mi perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-950">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            MiTienda
          </Link>
          <Link href="/tiendas" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Explorar tiendas
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Perfil card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
              {profile?.image ? (
                <Image src={profile.image} alt={profile.name || ""} width={64} height={64} className="object-cover h-16 w-16" />
              ) : (
                <User className="h-8 w-8 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-gray-950 truncate">{profile?.name || profile?.email}</h1>
              <p className="text-sm text-gray-400">{profile?.email}</p>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                {profile?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.city}</span>}
                {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>}
                {profile?.instagramHandle && <span className="flex items-center gap-1"><AtSign className="h-3 w-3" />@{profile.instagramHandle.replace(/^@/, "")}</span>}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 border border-indigo-100 rounded-xl px-3 py-2 hover:bg-indigo-50 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Editar
            </button>
          </div>
          {profile?.bio && <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{profile.bio}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Pedidos */}
        {tab === "pedidos" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">Todavía no hiciste ninguna compra</h3>
                <p className="text-sm text-gray-400 mb-4">Cuando compres en una tienda, tus pedidos aparecen acá.</p>
                <Link href="/tiendas" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
                  Explorar tiendas <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const { label, icon: StatusIcon, color, bg } = statusInfo(order.status);
                const imgs = (() => { try { return JSON.parse(order.items[0]?.product.images); } catch { return []; } })();
                return (
                  <article key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-gray-950">{order.store.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${bg} ${color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {label}
                          </span>
                          <Link
                            href={`/tienda/${order.store.slug}`}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
                          >
                            Ver tienda <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="space-y-3">
                        {order.items.map((item) => {
                          const itemImgs = (() => { try { return JSON.parse(item.product.images); } catch { return []; } })();
                          return (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                                {itemImgs[0] && <img src={itemImgs[0]} alt={item.product.name} className="h-12 w-12 object-cover" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                                {item.variant && <p className="text-xs text-gray-400">{item.variant.name}: {item.variant.value}</p>}
                                <p className="text-xs text-gray-400">x{item.quantity}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 shrink-0">{money(item.price * item.quantity)}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {order.shipping?.trackingCode && (
                            <p>Tracking: <span className="font-mono font-semibold text-gray-700">{order.shipping.trackingCode}</span></p>
                          )}
                        </div>
                        <p className="text-base font-black text-gray-950">Total: {money(order.total)}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Favoritos */}
        {tab === "favoritos" && (
          <div>
            {favorites.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <Heart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">Todavía no tenés favoritos</h3>
                <p className="text-sm text-gray-400 mb-4">Guardá productos que te gustan desde cualquier tienda.</p>
                <Link href="/tiendas" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
                  Explorar tiendas <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {favorites.map((fav) => {
                  const imgs = (() => { try { return JSON.parse(fav.product.images); } catch { return []; } })();
                  return (
                    <div key={fav.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                      <div className="relative aspect-square bg-gray-100">
                        {imgs[0] ? (
                          <img src={imgs[0]} alt={fav.product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-gray-200" />
                          </div>
                        )}
                        <button
                          onClick={() => removeFavorite(fav.productId)}
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
                        >
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-bold text-gray-900 truncate">{fav.product.name}</p>
                        <p className="text-xs text-gray-400 mb-2">{fav.product.store.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black" style={{ color: fav.product.store.primaryColor }}>
                            {money(fav.product.price)}
                          </p>
                          <Link
                            href={`/tienda/${fav.product.store.slug}`}
                            className="text-xs text-indigo-600 font-semibold hover:underline"
                          >
                            Ver tienda
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reseñas */}
        {tab === "resenas" && (
          <div className="space-y-6">
            {pendingReviews.length === 0 && submittedReviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <Star className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">Todavía no tenés compras para reseñar</h3>
                <p className="text-sm text-gray-400 mb-4">Cuando hagas una compra confirmada, podrás dejar tu opinión.</p>
                <Link href="/tiendas" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
                  Explorar tiendas <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                {pendingReviews.length > 0 && (
                  <div>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      Pendientes de reseña
                    </h2>
                    <div className="space-y-4">
                      {pendingReviews.map((item) => {
                        const imgs = (() => { try { return JSON.parse(item.productImages); } catch { return []; } })();
                        const draft = reviewDrafts[item.productId] || { rating: 0, comment: "" };
                        return (
                          <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-12 w-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                                {imgs[0] && <img src={imgs[0]} alt={item.productName} className="h-12 w-12 object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                                <p className="text-xs text-gray-400">{item.storeName}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tu calificación</p>
                                <Stars
                                  rating={draft.rating}
                                  interactive
                                  onRate={(r) => setReviewDrafts((prev) => ({ ...prev, [item.productId]: { ...draft, rating: r } }))}
                                />
                              </div>
                              <textarea
                                value={draft.comment}
                                onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [item.productId]: { ...draft, comment: e.target.value } }))}
                                placeholder="¿Qué te pareció el producto? (opcional)"
                                rows={2}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              />
                              <button
                                onClick={() => submitReview(item.productId, item.orderId)}
                                disabled={!draft.rating || submittingReview === item.productId}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                              >
                                {submittingReview === item.productId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Publicar reseña
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {submittedReviews.length > 0 && (
                  <div>
                    <h2 className="font-bold text-gray-900 mb-4">Mis reseñas</h2>
                    <div className="space-y-3">
                      {submittedReviews.map((review) => {
                        const imgs = (() => { try { return JSON.parse(review.productImages); } catch { return []; } })();
                        return (
                          <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                              {imgs[0] && <img src={imgs[0]} alt={review.productName} className="h-12 w-12 object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm truncate">{review.productName}</p>
                              <Stars rating={review.rating} />
                              {review.comment && <p className="text-sm text-gray-600 mt-1">{review.comment}</p>}
                              <p className="text-xs text-gray-300 mt-1">
                                {new Date(review.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Perfil */}
        {tab === "perfil" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-6">Mis datos</h2>
            <div className="space-y-4">
              {[
                { label: "Nombre", field: "name" as const, placeholder: "Tu nombre" },
                { label: "Ciudad", field: "city" as const, placeholder: "Buenos Aires" },
                { label: "Teléfono", field: "phone" as const, placeholder: "+54 11 1234-5678" },
                { label: "Instagram", field: "instagramHandle" as const, placeholder: "@usuario" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={editForm[field]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-300"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-300 resize-none"
                />
              </div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal editar perfil */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Editar perfil</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Nombre", field: "name" as const, placeholder: "Tu nombre" },
                { label: "Ciudad", field: "city" as const, placeholder: "Buenos Aires" },
                { label: "Teléfono", field: "phone" as const, placeholder: "+54 11 1234-5678" },
                { label: "Instagram", field: "instagramHandle" as const, placeholder: "@usuario" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={editForm[field]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
