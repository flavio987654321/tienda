"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Users, Mail, HeartHandshake, Upload, Trash2 } from "lucide-react";

type Donor = {
  id: string;
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  donorLocalidad: string;
  amount: number;
  status: string;
  createdAt: string | Date;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
} | null;

type TestimonialData = { donorName: string; mediaUrl: string | null; mediaType: string | null; text: string | null } | null;

type HistoryItem = {
  campaignId: string;
  campaignName: string;
  deliveredAt: string | Date;
  testimonial: TestimonialData;
};

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function NotifyDonorsForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (sending || !message.trim()) return;
    if (!confirm("Esto le va a llegar por email a todos los donantes confirmados. ¿Confirmás el envío?")) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/canasta/notify-donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setResult(`Enviado a ${data.sent} de ${data.totalDonors} donantes. Te quedan ${data.remainingToday} avisos hoy.`);
      setMessage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-white">Avisar a los donantes</span>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ej: ¡Ya llegamos a la meta! Pronto les contamos a quién le entregamos la canasta."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white resize-none"
      />
      <button
        type="button"
        onClick={send}
        disabled={sending || !message.trim()}
        className="mt-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
        Enviar
      </button>
      {result && <p className="text-xs text-green-400 mt-2">{result}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// Formulario único: el admin elige a mano la familia beneficiaria (no
// necesariamente alguien que donó) y confirma la entrega en un solo paso.
// Eso cierra esta campaña para siempre y arranca la próxima automáticamente.
function CompletarCampanaForm({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [donorName, setDonorName] = useState("");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir el archivo");
      setMediaUrl(data.url);
      setMediaType(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function confirmar() {
    if (!campaign || submitting || !donorName.trim()) return;
    if (
      !confirm(
        `¿Confirmar que la canasta se le entrega a "${donorName}"? Esta campaña se cierra para siempre y se crea una nueva, vacía, automáticamente. No se puede deshacer.`
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, donorName, text, mediaUrl, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo confirmar");
      alert(
        `¡Listo! Esta campaña quedó cerrada y se creó "${data.newCampaignName}", lista para recibir donaciones desde cero. El detalle de esta entrega quedó en la pestaña "Historial".`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!campaign || campaign.status !== "COMPLETED") return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 mb-8 space-y-3">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-white">Se completó la meta — elegí a quién se le entrega</span>
      </div>
      <p className="text-xs text-gray-400">
        Esta canasta ya juntó el 100%. Elegí la familia beneficiaria (no tiene que ser alguien que donó) y confirmá la entrega para cerrar esta campaña.
      </p>

      {mediaUrl &&
        (mediaType === "VIDEO" ? (
          <video src={mediaUrl} controls className="w-full max-h-56 rounded-lg bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="w-full max-h-56 object-cover rounded-lg" />
        ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {mediaUrl ? "Cambiar foto/video" : "Subir foto o video (opcional)"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/ogg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <input
        type="text"
        value={donorName}
        onChange={(e) => setDonorName(e.target.value)}
        placeholder="Nombre de la familia beneficiaria"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Mensaje o historia (opcional)"
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white resize-none"
      />
      <button
        type="button"
        onClick={confirmar}
        disabled={submitting || !donorName.trim()}
        className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Confirmar entrega y cerrar campaña
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function TestimonialEditor({ campaignId, defaultDonorName, existing }: { campaignId: string; defaultDonorName: string; existing: TestimonialData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [donorName, setDonorName] = useState(existing?.donorName ?? defaultDonorName);
  const [text, setText] = useState(existing?.text ?? "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(existing?.mediaUrl ?? null);
  const [mediaType, setMediaType] = useState<string | null>(existing?.mediaType ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSavedTestimonial = !!existing;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir el archivo");
      setMediaUrl(data.url);
      setMediaType(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving || !donorName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, donorName, mediaUrl, mediaType, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (deleting) return;
    if (!confirm("¿Eliminar esta reseña? Va a dejar de mostrarse en /comunidad. No se puede deshacer.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/canasta/testimonials?campaignId=${campaignId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      setMediaUrl(null);
      setMediaType(null);
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {mediaUrl &&
        (mediaType === "VIDEO" ? (
          <video src={mediaUrl} controls className="w-full max-h-56 rounded-lg bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="w-full max-h-56 object-cover rounded-lg" />
        ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {mediaUrl ? "Cambiar foto/video" : "Subir foto o video"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/ogg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <input
        type="text"
        value={donorName}
        onChange={(e) => setDonorName(e.target.value)}
        placeholder="Nombre de la familia"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Mensaje de agradecimiento (opcional)"
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || deleting || !donorName.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          Guardar
        </button>
        {hasSavedTestimonial && (
          <button
            type="button"
            onClick={remove}
            disabled={saving || deleting}
            className="bg-white/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Eliminar reseña
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function HistorialTab({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) {
    return <div className="text-center text-gray-500 py-10 text-sm">Todavía no se entregó ninguna canasta.</div>;
  }
  return (
    <div className="space-y-4">
      {history.map((h) => (
        <div key={h.campaignId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-white">{h.campaignName}</span>
            <span className="text-xs text-gray-500">{new Date(h.deliveredAt).toLocaleDateString("es-AR")}</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">Entregada a: {h.testimonial?.donorName ?? "—"}</p>
          <TestimonialEditor campaignId={h.campaignId} defaultDonorName={h.testimonial?.donorName ?? ""} existing={h.testimonial} />
        </div>
      ))}
    </div>
  );
}

export default function CanastaEntregaAdmin({
  campaign,
  donors,
  notifiedCount,
  history,
}: {
  campaign: Campaign;
  donors: Donor[];
  notifiedCount: number;
  history: HistoryItem[];
}) {
  const [tab, setTab] = useState<"entrega" | "historial">("entrega");

  if (!campaign) return null;

  return (
    <div className="p-6 sm:p-8 max-w-5xl border-t border-white/5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <HeartHandshake className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold text-white">Canasta Solidaria — Entrega</h2>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab("entrega")}
          className={`text-sm font-semibold px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "entrega" ? "border-amber-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Entrega
        </button>
        <button
          type="button"
          onClick={() => setTab("historial")}
          className={`text-sm font-semibold px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "historial" ? "border-amber-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Historial ({history.length})
        </button>
      </div>

      {tab === "historial" ? (
        <HistorialTab history={history} />
      ) : (
        <>
          <CompletarCampanaForm campaign={campaign} />

          <div className="mb-8">
            <NotifyDonorsForm />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-400">Donantes ({donors.length})</h3>
            </div>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-left text-xs text-gray-500">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Monto</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d.id} className="border-t border-white/5">
                      <td className="px-3 py-2 text-gray-200">{d.donorName}</td>
                      <td className="px-3 py-2 text-gray-400">{d.donorPhone}</td>
                      <td className="px-3 py-2 text-gray-400">{d.donorLocalidad}</td>
                      <td className="px-3 py-2 text-gray-200">{formatMoney(d.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "CONFIRMED" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {donors.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Todavía no hay donaciones.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
