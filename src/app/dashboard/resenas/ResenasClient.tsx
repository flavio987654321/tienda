"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Trash2, Package, ShieldCheck, ShieldOff } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  verified: boolean;
  verifiedBy: string | null;
  createdAt: string;
  product: { name: string; image: string | null };
};

export default function ResenasClient({
  initialReviews,
  slug,
}: {
  initialReviews: Review[];
  slug: string;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "verified" | 1 | 2 | 3 | 4 | 5>("all");

  async function handleDelete(reviewId: string) {
    if (deleting || verifying) return;
    if (!confirm("¿Eliminar esta reseña? Esta acción no se puede deshacer.")) return;
    setDeleting(reviewId);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (res.ok) {
        setReviews(r => r.filter(x => x.id !== reviewId));
      } else {
        alert("No se pudo eliminar la reseña. Intentá de nuevo.");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleVerify(reviewId: string, currentVerified: boolean) {
    if (deleting || verifying) return;
    setVerifying(reviewId);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, verified: !currentVerified }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(r =>
          r.map(x =>
            x.id === reviewId
              ? { ...x, verified: data.review.verified, verifiedBy: data.review.verifiedBy }
              : x
          )
        );
      } else {
        alert("No se pudo actualizar la verificación. Intentá de nuevo.");
      }
    } catch {
      alert("Error de conexión. Intentá de nuevo.");
    } finally {
      setVerifying(null);
    }
  }

  const filtered =
    filter === "all"      ? reviews
    : filter === "verified" ? reviews.filter(r => r.verified)
    : reviews.filter(r => r.rating === filter);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const verifiedCount = reviews.filter(r => r.verified).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Total reseñas</p>
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Promedio</p>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">5 estrellas</p>
          <p className="text-2xl font-bold text-gray-900">{reviews.filter(r => r.rating === 5).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Compra verificada</p>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-bold text-gray-900">{verifiedCount}</p>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Info verificación */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 mb-0.5">¿Qué es “Compra verificada”?</p>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Una reseña se verifica <strong>automáticamente</strong> cuando el cliente deja su email y coincide con una compra entregada en tu tienda.
            También podés verificarla <strong>manualmente</strong> desde acá para ventas por WhatsApp, efectivo o transferencia.
            El badge “✓ Compra verificada” aparece visible en tu tienda.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: "all",      label: "Todas" },
          { key: "verified", label: `✓ Verificadas (${verifiedCount})` },
          { key: 5, label: `${"★".repeat(5)} (${reviews.filter(r => r.rating === 5).length})` },
          { key: 4, label: `${"★".repeat(4)} (${reviews.filter(r => r.rating === 4).length})` },
          { key: 3, label: `${"★".repeat(3)} (${reviews.filter(r => r.rating === 3).length})` },
          { key: 2, label: `${"★".repeat(2)} (${reviews.filter(r => r.rating === 2).length})` },
          { key: 1, label: `${"★".repeat(1)} (${reviews.filter(r => r.rating === 1).length})` },
        ] as { key: typeof filter; label: string }[]).map(f => (
          <button
            key={String(f.key)}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {reviews.length === 0
              ? "Todavía no tenés reseñas. Cuando tus clientes dejen una, aparecerán acá."
              : "No hay reseñas con ese filtro."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-xl border p-4 flex gap-4 transition-colors ${
                r.verified ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
              }`}
            >
              {/* Imagen del producto */}
              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 self-start">
                {r.product.image ? (
                  <Image src={r.product.image} alt={r.product.name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Cabecera: estrellas + nombre + fecha */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{r.reviewer}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                  </span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      {r.verifiedBy === "auto" ? "Compra verificada" : "Verificada por vos"}
                    </span>
                  )}
                </div>

                {/* Comentario */}
                {r.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">&ldquo;{r.comment}&rdquo;</p>
                )}

                {/* Producto */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="font-medium">{r.product.name}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {/* Botón verificar / desverificar */}
                <button
                  onClick={() => handleVerify(r.id, r.verified)}
                  disabled={!!deleting || !!verifying}
                  title={r.verified ? "Quitar verificación" : "Marcar como compra real"}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                    r.verified
                      ? "text-emerald-600 hover:text-gray-400 hover:bg-gray-50"
                      : "text-gray-300 hover:text-emerald-600 hover:bg-emerald-50"
                  } ${verifying === r.id ? "animate-pulse" : ""}`}
                >
                  {r.verified
                    ? <ShieldOff className="w-4 h-4" />
                    : <ShieldCheck className="w-4 h-4" />
                  }
                </button>

                {/* Botón eliminar */}
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={!!deleting || !!verifying}
                  title="Eliminar reseña"
                  className={`p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 ${
                    deleting === r.id ? "animate-pulse" : ""
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
