"use client";

import { useEffect, useRef, useState } from "react";
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
  Check,
  X,
  Loader2,
  ExternalLink,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  LogOut,
  Camera,
  Store,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Tab = "pedidos" | "favoritos" | "tiendas" | "resenas" | "perfil";

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

type FollowedStore = {
  id: string;
  storeId: string;
  createdAt: string;
  store: { id: string; name: string; slug: string; logo: string | null; primaryColor: string };
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
  bannerImage: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
};

function statusInfo(status: string) {
  switch (status) {
    case "CONFIRMED": return { label: "Confirmado", icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50", accent: "#10b981" };
    case "SHIPPED":   return { label: "En camino",  icon: Truck,       color: "text-blue-700",   bg: "bg-blue-50",   accent: "#3b82f6" };
    case "DELIVERED": return { label: "Entregado",  icon: CheckCircle, color: "text-violet-700", bg: "bg-violet-50", accent: "#7c3aed" };
    case "CANCELLED": return { label: "Cancelado",  icon: XCircle,     color: "text-red-700",    bg: "bg-red-50",    accent: "#ef4444" };
    default:          return { label: "Pendiente",  icon: Clock,       color: "text-amber-700",  bg: "bg-amber-50",  accent: "#f59e0b" };
  }
}

function money(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function parseImages(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (() => { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } })();
  return arr.map(String).filter((s) => s && s.trim() !== "");
}

function ProductImg({ src, alt, className }: { src: string | undefined; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex items-center justify-center bg-gray-50 w-full h-full">
        <Package className="h-8 w-8 text-gray-200" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

function Stars({
  rating,
  interactive = false,
  onRate,
  size = "md",
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} transition-all duration-100 ${
            s <= (interactive ? hover || rating : rating)
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200"
          } ${interactive ? "cursor-pointer hover:scale-125" : ""}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(s)}
        />
      ))}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex gap-3 items-center">
            <Skeleton className="h-12 w-12 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  href,
  cta,
  color = "indigo",
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
  color?: "indigo" | "rose" | "amber" | "violet" | "emerald";
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-400",
    rose:   "bg-rose-50 text-rose-400",
    amber:  "bg-amber-50 text-amber-400",
    violet: "bg-violet-50 text-violet-400",
    emerald:"bg-emerald-50 text-emerald-400",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl ${styles[color]} mb-4`}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">{desc}</p>
      {href && cta && (
        <Link
          href={href}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200"
        >
          {cta} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-red-100 p-14 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 text-red-400 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">No pudimos cargar esta sección</h3>
      <p className="text-sm text-gray-400 mb-4">Revisá tu conexión e intentá de nuevo.</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
      >
        <RefreshCw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}

export default function MiCuentaPage() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("pedidos");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [followedStores, setFollowedStores] = useState<FollowedStore[]>([]);
  const [unfollowConfirm, setUnfollowConfirm] = useState<string | null>(null);
  const unfollowPendingRef = useRef(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [submittedReviews, setSubmittedReviews] = useState<SubmittedReview[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const fetchedTabs = useRef<Set<Tab>>(new Set());
  const [tabLoading, setTabLoading] = useState<Partial<Record<Tab, boolean>>>({});
  const [tabError, setTabError] = useState<Partial<Record<Tab, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "", city: "", phone: "", instagramHandle: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof editForm, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadBannerError, setUploadBannerError] = useState("");
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/mi-cuenta/perfil")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile({ ...data, bannerImage: data.bannerImage ?? null });
        setEditForm({
          name: data.name || "",
          bio: data.bio || "",
          city: data.city || "",
          phone: data.phone || "",
          instagramHandle: data.instagramHandle || "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function fetchTabData(t: Tab) {
    if (fetchedTabs.current.has(t)) return;
    fetchedTabs.current.add(t);
    setTabLoading((prev) => ({ ...prev, [t]: true }));
    setTabError((prev) => ({ ...prev, [t]: false }));
    try {
      if (t === "pedidos") {
        const r = await fetch("/api/mi-cuenta/pedidos");
        if (!r.ok) throw new Error();
        setOrders(await r.json());
      } else if (t === "favoritos") {
        const r = await fetch("/api/favoritos");
        if (!r.ok) throw new Error();
        setFavorites(await r.json());
      } else if (t === "tiendas") {
        const r = await fetch("/api/mi-cuenta/tiendas-seguidas");
        if (!r.ok) throw new Error();
        setFollowedStores(await r.json());
      } else if (t === "resenas") {
        const r = await fetch("/api/mi-cuenta/resenas");
        if (!r.ok) throw new Error();
        const data = await r.json();
        setPendingReviews(data.pending || []);
        setSubmittedReviews(data.submitted || []);
      }
    } catch {
      fetchedTabs.current.delete(t);
      setTabError((prev) => ({ ...prev, [t]: true }));
    } finally {
      setTabLoading((prev) => ({ ...prev, [t]: false }));
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!loading) fetchTabData(tab); }, [tab, loading]);

  async function saveProfile() {
    const errors: Partial<Record<keyof typeof editForm, string>> = {};
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    if (name && name.length < 2) errors.name = "El nombre debe tener al menos 2 caracteres.";
    if (phone && !/^[+\d\s\-()]{6,20}$/.test(phone)) errors.phone = "Número de teléfono no válido.";
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    const payload = {
      ...editForm,
      instagramHandle: editForm.instagramHandle.replace(/^@/, "").trim() || null,
    };
    try {
      const res = await fetch("/api/mi-cuenta/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Error al guardar"); return; }
      setProfile((p) => p ? { ...p, ...data } : data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "Error al subir la foto"); return; }
      await fetch("/api/mi-cuenta/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data.url }),
      });
      setProfile((p) => p ? { ...p, image: data.url } : p);
    } catch {
      setUploadError("Error de conexión.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  }

  async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setUploadBannerError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadBannerError(data.error || "Error al subir la imagen"); return; }
      await fetch("/api/mi-cuenta/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerImage: data.url }),
      });
      setProfile((p) => p ? { ...p, bannerImage: data.url } : p);
    } catch {
      setUploadBannerError("Error de conexión.");
    } finally {
      setUploadingBanner(false);
      if (e.target) e.target.value = "";
    }
  }

  async function submitReview(productId: string, orderId: string) {
    const draft = reviewDrafts[productId];
    if (!draft?.rating) return;
    setSubmittingReview(productId);
    setReviewError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderId, rating: draft.rating, comment: draft.comment || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(res.status === 409 ? "Ya dejaste una reseña para este producto." : (data.error || "Error al publicar la reseña."));
        return;
      }
      const pending = pendingReviews.find((p) => p.productId === productId);
      if (pending) {
        setPendingReviews((prev) => prev.filter((x) => x.productId !== productId));
        setSubmittedReviews((prev) => [{
          id: data.id,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt,
          productId: data.productId,
          productName: pending.productName,
          productImages: pending.productImages,
        }, ...prev]);
      }
    } catch {
      setReviewError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSubmittingReview(null);
    }
  }

  async function unfollowStore(storeId: string) {
    if (unfollowPendingRef.current) return;
    unfollowPendingRef.current = true;
    setUnfollowConfirm(null);
    try {
      const res = await fetch("/api/store/follow", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      if (res.ok) setFollowedStores((prev) => prev.filter((f) => f.storeId !== storeId));
    } finally {
      unfollowPendingRef.current = false;
    }
  }

  async function removeFavorite(productId: string) {
    if (removingFavorite) return;
    setRemovingFavorite(productId);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      setFavorites((f) => f.filter((fav) => fav.productId !== productId));
    } catch {
      // silently ignored — user can retry
    } finally {
      setRemovingFavorite(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4ff] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-100 mb-4">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Cargando tu cuenta...</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "pedidos",   label: "Pedidos",   icon: Package, count: fetchedTabs.current.has("pedidos")   ? orders.length          : undefined },
    { key: "favoritos", label: "Favoritos", icon: Heart,   count: fetchedTabs.current.has("favoritos") ? favorites.length        : undefined },
    { key: "tiendas",   label: "Siguiendo", icon: Store,   count: fetchedTabs.current.has("tiendas")   ? followedStores.length   : undefined },
    { key: "resenas",   label: "Reseñas",   icon: Star,    count: fetchedTabs.current.has("resenas")   ? submittedReviews.length : undefined },
    { key: "perfil",    label: "Perfil",    icon: User },
  ];

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#f5f4ff] relative">
      {/* Blobs decorativos de fondo */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -128, left: -128, width: 384, height: 384, borderRadius: "50%", background: "rgba(129,140,248,0.25)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", top: "33%", right: -96, width: 320, height: 320, borderRadius: "50%", background: "rgba(167,139,250,0.22)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 96, left: -64, width: 256, height: 256, borderRadius: "50%", background: "rgba(196,181,253,0.28)", filter: "blur(64px)" }} />
        <div style={{ position: "absolute", bottom: -80, right: "25%", width: 288, height: 288, borderRadius: "50%", background: "rgba(129,140,248,0.18)", filter: "blur(72px)" }} />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-950">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            TiendaApps
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/tiendas"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200"
            >
              Explorar tiendas
            </Link>
            <button
              onClick={() => signOut("/")}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Banner */}
          <div className="relative h-28 group">
            {profile?.bannerImage ? (
              <img src={profile.bannerImage} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-400" />
            )}
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              title="Cambiar portada"
              className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploadingBanner
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Camera className="h-3 w-3" />}
              {uploadingBanner ? "Subiendo..." : "Cambiar portada"}
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-white p-1 shadow-lg">
                  <div className="h-full w-full rounded-xl bg-indigo-50 overflow-hidden flex items-center justify-center">
                    {profile?.image ? (
                      <Image
                        src={profile.image}
                        alt={profile.name || ""}
                        width={72}
                        height={72}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <User className="h-9 w-9 text-indigo-300" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Cambiar foto"
                >
                  {uploadingPhoto
                    ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                    : <Camera className="h-3.5 w-3.5 text-white" />}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
              </div>
              {memberSince && (
                <p className="text-xs text-gray-400 pb-1">Miembro desde {memberSince}</p>
              )}
            </div>

            {(uploadError || uploadBannerError) && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{uploadError || uploadBannerError}
              </p>
            )}

            <h1 className="text-xl font-black text-gray-950">{profile?.name || "Sin nombre"}</h1>
            <p className="text-sm text-gray-400">{profile?.email}</p>

            {(profile?.city || profile?.phone || profile?.instagramHandle) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile?.city && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 text-indigo-400" />{profile.city}
                  </span>
                )}
                {profile?.phone && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3 text-indigo-400" />{profile.phone}
                  </span>
                )}
                {profile?.instagramHandle && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">
                    <AtSign className="h-3 w-3 text-indigo-400" />@{profile.instagramHandle.replace(/^@/, "")}
                  </span>
                )}
              </div>
            )}

            {profile?.bio && (
              <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl p-3 border-l-4 border-indigo-200 leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pedidos */}
        {tab === "pedidos" && (
          tabLoading.pedidos ? <TabSkeleton /> :
          tabError.pedidos ? (
            <ErrorState onRetry={() => { fetchedTabs.current.delete("pedidos"); fetchTabData("pedidos"); }} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Todavía no hiciste ninguna compra"
              desc="Cuando compres en una tienda, tus pedidos aparecen acá."
              href="/tiendas"
              cta="Explorar tiendas"
              color="indigo"
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const { label, icon: StatusIcon, color, bg, accent } = statusInfo(order.status);
                return (
                  <article
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
                  >
                    <div className="p-5 border-b border-gray-50">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100 shrink-0">
                            {order.store.logo
                              ? <img src={order.store.logo} alt={order.store.name} className="h-9 w-9 object-cover" />
                              : <Store className="h-4 w-4 text-gray-300" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-950">{order.store.name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
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
                          const imgs = parseImages(item.product.images);
                          return (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                                <ProductImg src={imgs[0]} alt={item.product.name} className="h-12 w-12 object-cover" />
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
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                        {order.shipping?.trackingCode ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <Truck className="h-3.5 w-3.5 text-indigo-400" />
                            Tracking: <span className="font-mono font-semibold text-gray-700">{order.shipping.trackingCode}</span>
                          </div>
                        ) : <div />}
                        <p className="text-base font-black text-gray-950">Total: {money(order.total)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}

        {/* Favoritos */}
        {tab === "favoritos" && (
          tabLoading.favoritos ? <TabSkeleton /> :
          tabError.favoritos ? (
            <ErrorState onRetry={() => { fetchedTabs.current.delete("favoritos"); fetchTabData("favoritos"); }} />
          ) : favorites.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Todavía no tenés favoritos"
              desc="Guardá productos que te gustan desde cualquier tienda."
              href="/tiendas"
              cta="Explorar tiendas"
              color="rose"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favorites.filter((fav) => fav.product != null).map((fav) => {
                const imgs = parseImages(fav.product.images);
                return (
                  <div
                    key={fav.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square bg-gray-50">
                      <ProductImg
                        src={imgs[0]}
                        alt={fav.product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => removeFavorite(fav.productId)}
                        disabled={removingFavorite === fav.productId}
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Quitar de favoritos"
                      >
                        {removingFavorite === fav.productId
                          ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          : <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-gray-900 truncate">{fav.product.name}</p>
                      <p className="text-xs text-gray-400 mb-2 truncate">{fav.product.store.name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-black" style={{ color: fav.product.store.primaryColor }}>
                          {money(fav.product.price)}
                        </p>
                        <Link
                          href={`/tienda/${fav.product.store.slug}`}
                          className="text-xs text-indigo-600 font-semibold hover:underline whitespace-nowrap"
                        >
                          Ver tienda
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tiendas que sigo */}
        {tab === "tiendas" && (
          tabLoading.tiendas ? <TabSkeleton /> :
          tabError.tiendas ? (
            <ErrorState onRetry={() => { fetchedTabs.current.delete("tiendas"); fetchTabData("tiendas"); }} />
          ) : followedStores.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Todavía no seguís ninguna tienda"
              desc="Seguí tiendas para recibir sus novedades y no perderte nada."
              href="/tiendas"
              cta="Explorar tiendas"
              color="violet"
            />
          ) : (
            <div className="space-y-3">
              {followedStores.map((follow) => (
                <div
                  key={follow.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {unfollowConfirm === follow.storeId ? (
                    <div className="p-5">
                      <p className="font-bold text-gray-900 mb-1">¿Dejar de seguir a {follow.store.name}?</p>
                      <p className="text-sm text-gray-400 mb-4">
                        Ya no recibirás notificaciones. Podés volver a seguirla cuando quieras.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => unfollowStore(follow.storeId)}
                          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" /> Dejar de seguir
                        </button>
                        <button
                          onClick={() => setUnfollowConfirm(null)}
                          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4">
                      <div
                        className="h-12 w-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: follow.store.primaryColor + "20" }}
                      >
                        {follow.store.logo ? (
                          <img src={follow.store.logo} alt={follow.store.name} className="h-12 w-12 object-cover" />
                        ) : (
                          <Store className="h-6 w-6" style={{ color: follow.store.primaryColor }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{follow.store.name}</p>
                        <p className="text-xs text-gray-400">
                          Seguida desde {new Date(follow.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/tienda/${follow.store.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          Ver tienda <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => setUnfollowConfirm(follow.storeId)}
                          className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
                          title="Dejar de seguir"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Reseñas */}
        {tab === "resenas" && (
          tabLoading.resenas ? <TabSkeleton /> :
          tabError.resenas ? (
            <ErrorState onRetry={() => { fetchedTabs.current.delete("resenas"); fetchTabData("resenas"); }} />
          ) : pendingReviews.length === 0 && submittedReviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Todavía no tenés reseñas"
              desc="Cuando hagas una compra confirmada, podrás calificar los productos."
              href="/tiendas"
              cta="Explorar tiendas"
              color="amber"
            />
          ) : (
            <div className="space-y-6">
              {pendingReviews.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                    </div>
                    <h2 className="font-bold text-gray-900">Pendientes de reseña</h2>
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      {pendingReviews.length}
                    </span>
                  </div>
                  {reviewError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />{reviewError}
                    </div>
                  )}
                  <div className="space-y-4">
                    {pendingReviews.map((item) => {
                      const imgs = parseImages(item.productImages);
                      const draft = reviewDrafts[item.productId] || { rating: 0, comment: "" };
                      return (
                        <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-14 w-14 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                              <ProductImg src={imgs[0]} alt={item.productName} className="h-14 w-14 object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                              <p className="text-xs text-gray-400">{item.storeName}</p>
                              <p className="text-xs text-gray-300 mt-0.5">
                                Comprado el {new Date(item.orderDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tu calificación</p>
                              <Stars
                                rating={draft.rating}
                                interactive
                                size="lg"
                                onRate={(r) => setReviewDrafts((prev) => ({ ...prev, [item.productId]: { ...draft, rating: r } }))}
                              />
                            </div>
                            <textarea
                              value={draft.comment}
                              onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [item.productId]: { ...draft, comment: e.target.value } }))}
                              placeholder="¿Qué te pareció el producto? (opcional)"
                              rows={2}
                              maxLength={1000}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-300"
                            />
                            <button
                              onClick={() => submitReview(item.productId, item.orderId)}
                              disabled={!draft.rating || submittingReview === item.productId}
                              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm shadow-indigo-100"
                            >
                              {submittingReview === item.productId
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Check className="h-4 w-4" />}
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
                      const imgs = parseImages(review.productImages);
                      return (
                        <div
                          key={review.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3 hover:shadow-md transition-shadow"
                        >
                          <div className="h-14 w-14 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                            <ProductImg src={imgs[0]} alt={review.productName} className="h-14 w-14 object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 text-sm truncate">{review.productName}</p>
                            <Stars rating={review.rating} size="sm" />
                            {review.comment && (
                              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{review.comment}</p>
                            )}
                            <p className="text-xs text-gray-300 mt-1.5">
                              {new Date(review.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Perfil */}
        {tab === "perfil" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                Mis datos
              </h2>
              <div className="space-y-4">
                {([
                  { label: "Nombre",    field: "name"            as const, placeholder: "Tu nombre",          icon: User    },
                  { label: "Ciudad",    field: "city"            as const, placeholder: "Buenos Aires",       icon: MapPin  },
                  { label: "Teléfono",  field: "phone"           as const, placeholder: "+54 11 1234-5678",   icon: Phone   },
                  { label: "Instagram", field: "instagramHandle" as const, placeholder: "@usuario",           icon: AtSign  },
                ] as const).map(({ label, field, placeholder, icon: FieldIcon }) => (
                  <div key={field}>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      <FieldIcon className="h-3 w-3" />{label}
                    </label>
                    <input
                      type="text"
                      value={editForm[field]}
                      onChange={(e) => {
                        setEditForm((f) => ({ ...f, [field]: e.target.value }));
                        if (formErrors[field]) setFormErrors((fe) => ({ ...fe, [field]: undefined }));
                      }}
                      placeholder={placeholder}
                      className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 placeholder-gray-300 hover:border-gray-300 transition-colors ${
                        formErrors[field]
                          ? "border-red-300 focus:ring-red-400 bg-red-50"
                          : "border-gray-200 focus:ring-indigo-500"
                      }`}
                    />
                    {formErrors[field] && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />{formErrors[field]}
                      </p>
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Contá algo sobre vos..."
                    rows={3}
                    maxLength={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-300 resize-none hover:border-gray-300 transition-colors"
                  />
                  <p className="text-xs text-gray-300 text-right mt-1">{editForm.bio.length}/500</p>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-600 font-semibold">
                    <Check className="h-4 w-4" /> ¡Cambios guardados!
                  </div>
                )}

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-200"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center">
                  <LogOut className="h-3.5 w-3.5 text-red-400" />
                </div>
                Sesión
              </h2>
              <button
                onClick={() => signOut("/")}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
