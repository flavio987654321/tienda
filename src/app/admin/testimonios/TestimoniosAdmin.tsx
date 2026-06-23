"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Trash2, Clock, User, MapPin, MessageSquare, Star } from "lucide-react";

type Testimonial = {
  id: string;
  name: string;
  role: string;
  location: string | null;
  text: string;
  rating: number;
  approved: boolean;
  createdAt: Date;
};

export default function TestimoniosAdmin({ testimonials: initial }: { testimonials: Testimonial[] }) {
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function setApproved(id: string, approved: boolean) {
    setLoading(id);
    const res = await fetch(`/api/admin/testimonios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, approved } : t)));
    }
    setLoading(null);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este testimonio?")) return;
    setLoading(id);
    const res = await fetch(`/api/admin/testimonios/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((t) => t.id !== id));
    setLoading(null);
  }

  const pending = items.filter((t) => !t.approved);
  const approved = items.filter((t) => t.approved);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-1">Testimonios</h1>
          <p className="text-gray-400 text-sm">
            {pending.length} pendiente{pending.length !== 1 ? "s" : ""} · {approved.length} aprobado{approved.length !== 1 ? "s" : ""}
          </p>
        </div>

        {pending.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Pendientes de aprobación
            </h2>
            <div className="space-y-4">
              {pending.map((t) => (
                <TestimonialCard key={t.id} t={t} loading={loading === t.id} onApprove={() => setApproved(t.id, true)} onReject={() => remove(t.id)} />
              ))}
            </div>
          </div>
        )}

        {approved.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Aprobados (visibles en la home)
            </h2>
            <div className="space-y-4">
              {approved.map((t) => (
                <TestimonialCard key={t.id} t={t} loading={loading === t.id} onApprove={() => setApproved(t.id, false)} onReject={() => remove(t.id)} isApproved />
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Todavía no hay testimonios enviados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TestimonialCard({ t, loading, onApprove, onReject, isApproved = false }: {
  t: Testimonial; loading: boolean; onApprove: () => void; onReject: () => void; isApproved?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${isApproved ? "border-emerald-500/20 bg-emerald-950/10" : "border-white/10 bg-gray-900/50"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
              <User className="h-4 w-4 text-indigo-400" /> {t.name}
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{t.role}</span>
            {t.location && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {t.location}
              </span>
            )}
            <span className="text-xs text-gray-600 ml-auto">
              {new Date(t.createdAt).toLocaleDateString("es-AR")}
            </span>
          </div>
          <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map((s) => <Star key={s} className={`h-3.5 w-3.5 ${s <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />)}
            </div>
          <p className="text-gray-300 text-sm leading-relaxed">&quot;{t.text}&quot;</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isApproved ? (
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Aprobar
            </button>
          ) : (
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex items-center gap-1.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Ocultar
            </button>
          )}
          <button
            onClick={onReject}
            disabled={loading}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
