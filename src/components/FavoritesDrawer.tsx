"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Package, X } from "lucide-react";

type Favorite = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: string;
    store: { slug: string; name: string; primaryColor: string };
  } | null;
};

function money(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function firstImage(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    const item = parsed[0];
    return item && typeof item === "object" ? (item as { url?: string }).url : String(item);
  } catch {
    return undefined;
  }
}

export default function FavoritesDrawer({ buttonClassName }: { buttonClassName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function openDrawer() {
    setOpen(true);
    if (loaded) return;
    setLoading(true);
    fetch("/api/favoritos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Favorite[]) => { setFavorites(data); setLoaded(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function removeFavorite(productId: string) {
    if (removingId) return;
    setRemovingId(productId);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <button onClick={openDrawer} title="Mis favoritos" className={buttonClassName}>
        <Heart className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <h2 className="font-bold text-gray-900 text-sm">Mis favoritos</h2>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                </div>
              ) : favorites.filter((f) => f.product != null).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Heart className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-sm font-semibold text-gray-500">Todavía no tenés favoritos</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[220px]">Guardá productos que te gustan desde cualquier tienda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.filter((f) => f.product != null).map((fav) => {
                    const product = fav.product!;
                    const img = firstImage(product.images);
                    return (
                      <Link
                        key={fav.id}
                        href={`/tienda/${product.store.slug}?producto=${product.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors p-2.5"
                      >
                        <div className="w-14 h-14 rounded-lg bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 truncate">{product.store.name}</p>
                          <p className="text-sm font-black mt-0.5" style={{ color: product.store.primaryColor }}>
                            {money(product.price)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFavorite(product.id); }}
                          disabled={removingId === product.id}
                          title="Quitar de favoritos"
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          {removingId === product.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                          )}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
