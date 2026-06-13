"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Clock, ShieldAlert, X, Loader2, ExternalLink } from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VerifRequest = {
  id: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  dniFrontUrl: string | null;
  dniBackUrl: string | null;
  selfieUrl: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
    owner: { name: string | null; email: string; city: string | null; createdAt: string };
  };
};

type Tab = "PENDING" | "APPROVED" | "REJECTED";

function statusBadge(status: string) {
  if (status === "APPROVED") return <span className="bg-green-900/40 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">Aprobada</span>;
  if (status === "REJECTED") return <span className="bg-red-900/40 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">Rechazada</span>;
  return <span className="bg-yellow-900/40 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">Pendiente</span>;
}

function ImagePreview({ url, label }: { url: string | null; label: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return <div className="rounded-xl bg-gray-800 h-24 flex items-center justify-center text-gray-600 text-xs">{label} — no disponible</div>;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/40 transition-colors group"
      >
        <Image src={url} alt={label} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ExternalLink className="h-5 w-5 text-white" />
        </div>
        <span className="absolute bottom-1.5 left-2 text-white text-xs font-semibold drop-shadow">{label}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute -top-8 right-0 text-white hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
            <Image src={url} alt={label} width={800} height={600} className="w-full rounded-2xl object-contain max-h-[80vh]" unoptimized />
          </div>
        </div>
      )}
    </>
  );
}

function RequestCard({ req, onAction }: { req: VerifRequest; onAction: () => void }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState("");

  async function handleAction(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !note.trim()) { setError("Escribí el motivo del rechazo."); return; }
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/verificacion/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
      const d = await res.json();
      if (res.ok) { onAction(); }
      else { setError(d.error || "Error al procesar."); }
    } catch { setError("Error de conexión."); }
    finally { setLoading(null); }
  }

  const memberSince = new Date(req.store.owner.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {statusBadge(req.status)}
            <span className="text-gray-500 text-xs">
              {new Date(req.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-white font-bold">{req.store.name}</p>
          <p className="text-gray-400 text-sm">{req.store.owner.email}</p>
          {req.store.owner.name && <p className="text-gray-500 text-xs">{req.store.owner.name}</p>}
          {req.store.owner.city && <p className="text-gray-500 text-xs">{req.store.owner.city}</p>}
          <p className="text-gray-600 text-xs mt-0.5">Miembro desde {memberSince}</p>
        </div>
        <a
          href={`/tienda/${req.store.slug}`}
          target="_blank"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 shrink-0"
        >
          Ver tienda <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ImagePreview url={req.dniFrontUrl} label="DNI frente" />
        <ImagePreview url={req.dniBackUrl} label="DNI dorso" />
        <ImagePreview url={req.selfieUrl} label="Selfie" />
      </div>

      {req.reviewNote && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          Motivo anterior: {req.reviewNote}
        </p>
      )}

      {req.status === "PENDING" && (
        <div className="space-y-2 pt-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo de rechazo (requerido si rechazás)"
            rows={2}
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("APPROVE")}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Aprobar
            </button>
            <button
              onClick={() => handleAction("REJECT")}
              disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-800/60 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "PENDING", label: "Pendientes", icon: <Clock className="h-4 w-4" /> },
  { value: "APPROVED", label: "Aprobadas", icon: <BadgeCheck className="h-4 w-4" /> },
  { value: "REJECTED", label: "Rechazadas", icon: <ShieldAlert className="h-4 w-4" /> },
];

export default function VerificacionesAdmin() {
  const [activeTab, setActiveTab] = useState<Tab>("PENDING");
  const [requests, setRequests] = useState<VerifRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verificacion?status=${activeTab}`);
      const d = await res.json();
      setRequests(d.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-verificaciones-rt")
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "VerificationRequest" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-900 border border-white/10 rounded-2xl p-1 w-fit">
        {TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === value
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          No hay solicitudes {activeTab === "PENDING" ? "pendientes" : activeTab === "APPROVED" ? "aprobadas" : "rechazadas"}.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} onAction={load} />
          ))}
        </div>
      )}
    </div>
  );
}
