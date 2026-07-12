"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock, ShieldAlert, X, Loader2, ExternalLink, ShieldX } from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VerifRequest = {
  id: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  cuit: string | null;
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
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | "REVOKE" | null>(null);
  const [error, setError] = useState("");
  const [showRevoke, setShowRevoke] = useState(false);
  const [banOnRevoke, setBanOnRevoke] = useState(false);
  const inFlight = useRef(false);

  function handleNoteChange(val: string) {
    setNote(val);
    if (error) setError("");
  }

  async function handleAction(action: "APPROVE" | "REJECT" | "REVOKE") {
    if (inFlight.current) return;

    if (action === "APPROVE") {
      if (!confirm(`¿Aprobar la verificación de "${req.store.name}"?\n\nSe enviará un email y una notificación al dueño de la tienda.`)) return;
    }
    if (action === "REJECT") {
      if (!note.trim()) { setError("Escribí el motivo del rechazo."); return; }
      if (!confirm(`¿Rechazar la verificación de "${req.store.name}"?\n\nEl dueño recibirá una notificación con el motivo indicado.`)) return;
    }
    if (action === "REVOKE") {
      if (!note.trim()) { setError("Escribí el motivo de la revocación."); return; }
    }

    inFlight.current = true;
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/verificacion/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim(), ...(action === "REVOKE" && { ban: banOnRevoke }) }),
      });
      const d = await res.json();
      if (res.ok) { onAction(); }
      else { setError(d.error || "Error al procesar."); }
    } catch { setError("Error de conexión. Intentá de nuevo."); }
    finally { setLoading(null); inFlight.current = false; }
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
          {req.cuit && (
            <p className="text-xs mt-1">
              <span className="text-gray-500 font-medium">CUIT:</span>{" "}
              <span className="font-mono text-indigo-400">{req.cuit}</span>
              <span className="text-gray-600"> · verificar en afip.gob.ar</span>
            </p>
          )}
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
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Motivo de rechazo (requerido si rechazás)"
            rows={2}
            maxLength={500}
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
          <div className="flex items-center justify-between">
            {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
            <span className="text-xs text-gray-600">{note.length}/500</span>
          </div>
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

      {req.status === "APPROVED" && (
        <div className="pt-1">
          {!showRevoke ? (
            <button
              onClick={() => { setShowRevoke(true); setNote(""); setError(""); setBanOnRevoke(false); }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800/40 hover:border-red-600/60 bg-red-900/10 hover:bg-red-900/20 px-3 py-2 rounded-xl transition-colors"
            >
              <ShieldX className="h-3.5 w-3.5" />
              Revocar verificación
            </button>
          ) : (
            <div className="space-y-2 bg-red-900/10 border border-red-800/30 rounded-xl p-3">
              <p className="text-xs text-red-400 font-semibold">Revocar badge — esto quitará el verificado y notificará al dueño.</p>
              <textarea
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Motivo de la revocación (requerido)"
                rows={2}
                maxLength={500}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
                <span className="text-xs text-gray-600">{note.length}/500</span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={banOnRevoke}
                  onChange={(e) => setBanOnRevoke(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-red-300">Prohibir futuros reenvíos (fraude / documentación falsa)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">El dueño no podrá volver a enviar solicitudes de verificación. Se le notificará por email y panel.</p>
                </div>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction("REVOKE")}
                  disabled={!!loading}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50 transition-colors ${banOnRevoke ? "bg-gray-800 hover:bg-gray-700 border border-red-700" : "bg-red-700 hover:bg-red-600"}`}
                >
                  {loading === "REVOKE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                  {banOnRevoke ? "Revocar e inhabilitar" : "Confirmar revocación"}
                </button>
                <button
                  onClick={() => { setShowRevoke(false); setNote(""); setError(""); setBanOnRevoke(false); }}
                  disabled={!!loading}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
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

  // No setea loading=true acá: el spinner del montaje sale de useState(true) y
  // el del cambio de pestaña lo enciende el botón (evento). Así el efecto que la
  // llama no hace setState sincrónico (el primer setState es después del await).
  const load = useCallback(async () => {
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
      <div className="flex gap-1 mb-6 bg-gray-900 border border-white/10 rounded-2xl p-1 w-fit mx-auto">
        {TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => { setLoading(true); setActiveTab(value); }}
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
