"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Check, Play, Users, Mail, Trophy, AlertTriangle, Upload, Trash2 } from "lucide-react";

type WinnerInfo = { donorName: string; donorPhone: string; donorEmail: string } | null;

type Draw = {
  id: string;
  attemptNumber: number;
  currentPosition: number;
  winnerStatus: string;
  winner1: WinnerInfo;
  winner2: WinnerInfo;
  winner3: WinnerInfo;
} | null;

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
  drawStatus: string;
  scheduledDrawAt: string | Date | null;
} | null;

type TestimonialData = { donorName: string; mediaUrl: string | null; mediaType: string | null; text: string | null } | null;

type HistoryItem = {
  campaignId: string;
  campaignName: string;
  finishedAt: string | Date;
  winnerName: string | null;
  testimonial: TestimonialData;
};

type StepStatus = "done" | "current" | "pending";

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function toDatetimeLocal(d: string | Date | null) {
  if (!d) return "";
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// Bloque visual numerado ("paso 1, paso 2...") para que el orden a seguir
// sea obvio incluso para alguien que nunca usó este panel.
function Step({ number, title, status, children }: { number: number; title: string; status: StepStatus; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${
        status === "current"
          ? "border-amber-500/40 bg-amber-500/5"
          : status === "done"
            ? "border-white/10 bg-white/[0.02]"
            : "border-white/10 bg-white/[0.02] opacity-50"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            status === "done" ? "bg-green-500/20 text-green-400" : status === "current" ? "bg-amber-500 text-gray-950" : "bg-white/10 text-gray-500"
          }`}
        >
          {status === "done" ? <Check className="h-3.5 w-3.5" /> : number}
        </div>
        <span className={`text-sm font-semibold ${status === "pending" ? "text-gray-500" : "text-white"}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function DrawTimeBanner({ campaign }: { campaign: Campaign }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (!campaign || campaign.drawStatus !== "SCHEDULED" || !campaign.scheduledDrawAt) return null;
  const scheduledMs = new Date(campaign.scheduledDrawAt).getTime();
  if (nowMs < scheduledMs) return null;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-300">¡Ya llegó la hora programada del sorteo!</p>
        <p className="text-xs text-red-400/80">Activalo cuando estés listo desde el paso 3, más abajo.</p>
      </div>
    </div>
  );
}

function ScheduleDrawForm({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const initialValue = toDatetimeLocal(campaign?.scheduledDrawAt ?? null);
  const [value, setValue] = useState(initialValue);
  const [lastSavedValue, setLastSavedValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(
    campaign?.scheduledDrawAt ? new Date(campaign.scheduledDrawAt).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" }) : null
  );

  const notCompleted = campaign?.status !== "COMPLETED";
  const locked = campaign?.drawStatus === "LIVE" || campaign?.drawStatus === "FINISHED" || notCompleted;

  async function save() {
    if (!campaign || !value || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/campaign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaign.id, scheduledDrawAt: new Date(value).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      setSavedLabel(new Date(value).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" }));
      setLastSavedValue(value);
      // El resto del panel (botón de activar, etc.) depende de esta fecha,
      // así que hay que refrescar los datos del servidor.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!campaign) return null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={locked}
          className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || locked || !value || value === lastSavedValue}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          Guardar
        </button>
      </div>
      {savedLabel && !locked && <p className="text-xs text-green-400 mt-2">Programado para: {savedLabel}</p>}
      {notCompleted && campaign.drawStatus === "SCHEDULED" && (
        <p className="text-xs text-gray-500 mt-2">Esperando que se complete la meta de la canasta para poder programar el sorteo.</p>
      )}
      {campaign.drawStatus === "LIVE" && <p className="text-xs text-gray-500 mt-2">El sorteo ya arrancó, no se puede reprogramar desde aquí.</p>}
      {campaign.drawStatus === "FINISHED" && <p className="text-xs text-gray-500 mt-2">Esta campaña ya terminó (el ganador confirmó). Para la próxima canasta se crea una campaña nueva.</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function ActivateDrawButton({ campaign, notifiedCount }: { campaign: Campaign; notifiedCount: number }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasNotified = notifiedCount > 0;
  const scheduledMs = campaign?.scheduledDrawAt ? new Date(campaign.scheduledDrawAt).getTime() : null;
  const hasReachedTime = !!scheduledMs && nowMs >= scheduledMs;
  const canActivate = campaign?.drawStatus === "SCHEDULED" && !!campaign.scheduledDrawAt && hasNotified && hasReachedTime;

  async function activate() {
    if (submitting || !canActivate) return;
    if (
      !confirm(
        "¿Activar el sorteo? Los ganadores se calculan en este instante, pero la ruleta recién arranca para todos en 5 minutos (para que te dé tiempo de pasar a /canasta/sorteo). No se puede deshacer."
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/draw/activate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo activar");
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar");
      setSubmitting(false);
    }
  }

  if (!campaign) return null;

  return (
    <div>
      <button
        type="button"
        onClick={activate}
        disabled={!canActivate || submitting}
        className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Activar sorteo ahora
      </button>
      {campaign.drawStatus === "SCHEDULED" && !hasNotified && (
        <p className="text-xs text-red-400 mt-2">Primero completá el paso 2 (avisar a los donantes) — recién ahí se habilita este botón.</p>
      )}
      {campaign.drawStatus === "SCHEDULED" && hasNotified && !hasReachedTime && scheduledMs && (
        <p className="text-xs text-red-400 mt-2">
          Todavía no llegó la hora programada ({new Date(scheduledMs).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}) — se habilita automáticamente cuando llegue.
        </p>
      )}
      {campaign.drawStatus === "SCHEDULED" && hasNotified && hasReachedTime && (
        <p className="text-xs text-gray-500 mt-2">Al activar, la ruleta arranca 5 minutos después para todos.</p>
      )}
      {campaign.drawStatus === "LIVE" && <p className="text-xs text-amber-500 mt-2">El sorteo está en vivo en /canasta/sorteo</p>}
      {campaign.drawStatus === "FINISHED" && (
        <p className="text-xs text-green-400 mt-2">El ganador ya confirmó. Esta campaña quedó cerrada — la próxima canasta se arma como una campaña nueva.</p>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function WinnerCard({ position, info, isCurrent, drawId, locked }: {
  position: 1 | 2 | 3;
  info: WinnerInfo;
  isCurrent: boolean;
  drawId: string;
  locked: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark(status: "CONFIRMED" | "NO_RESPONSE") {
    if (submitting) return;
    const confirmText =
      status === "CONFIRMED"
        ? `¿Confirmar que ${info?.donorName} respondió y se entrega el premio? Esta campaña se va a cerrar para siempre y se va a crear una canasta nueva, vacía, automáticamente.`
        : `¿Marcar a ${info?.donorName} como "sin respuesta"? Esto pasa el premio al siguiente puesto y no se puede deshacer.`;
    if (!confirm(confirmText)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/draw/winner-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      if (status === "CONFIRMED" && data.newCampaignName) {
        alert(`¡Listo! Esta campaña quedó cerrada y se creó la nueva canasta "${data.newCampaignName}", lista para recibir donaciones desde cero. Esta pantalla va a mostrar ahora la canasta nueva — para ver el detalle del ganador que acabás de confirmar, entrá a la pestaña "Historial".`);
      }
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
      setSubmitting(false);
    }
  }

  if (!info) return null;

  return (
    <div className={`rounded-xl border p-4 ${isCurrent ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-white">{position}° puesto</span>
        {isCurrent && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Activo</span>}
      </div>
      <p className="text-sm text-gray-300">{info.donorName}</p>
      <p className="text-xs text-gray-500">{info.donorPhone} · {info.donorEmail}</p>
      {isCurrent && !locked && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => mark("CONFIRMED")}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            Confirmó
          </button>
          <button
            type="button"
            onClick={() => mark("NO_RESPONSE")}
            disabled={submitting}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            Sin respuesta → pasar al siguiente
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
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
      // Refresca los datos del servidor (ej: habilita "Activar sorteo ahora")
      // sin perder el mensaje de éxito que acabamos de mostrar.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ej: El sorteo es el sábado a las 20hs, ¡no te lo pierdas!"
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
    if (!confirm("¿Eliminar esta reseña? Va a dejar de mostrarse en /canasta. No se puede deshacer.")) return;
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
        placeholder="Nombre del ganador"
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
            <span className="text-xs text-gray-500">{new Date(h.finishedAt).toLocaleDateString("es-AR")}</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">Ganador: {h.winnerName ?? "—"}</p>
          <TestimonialEditor campaignId={h.campaignId} defaultDonorName={h.winnerName ?? ""} existing={h.testimonial} />
        </div>
      ))}
    </div>
  );
}

export default function CanastaSorteoAdmin({
  campaign,
  draw,
  donors,
  notifiedCount,
  history,
}: {
  campaign: Campaign;
  draw: Draw;
  donors: Donor[];
  notifiedCount: number;
  history: HistoryItem[];
}) {
  const [tab, setTab] = useState<"sorteo" | "historial">("sorteo");

  if (!campaign) return null;

  const winnersByPosition: Array<[1 | 2 | 3, WinnerInfo]> = draw
    ? [[1, draw.winner1], [2, draw.winner2], [3, draw.winner3]]
    : [];

  const hasDate = !!campaign.scheduledDrawAt;
  const hasNotified = notifiedCount > 0;
  const isLive = campaign.drawStatus === "LIVE";
  const isFinished = campaign.drawStatus === "FINISHED";
  const isCompleted = campaign.status === "COMPLETED";

  const step1: StepStatus = hasDate ? "done" : isCompleted ? "current" : "pending";
  const step2: StepStatus = !hasDate ? "pending" : hasNotified ? "done" : "current";
  const step3: StepStatus = !hasNotified ? "pending" : isLive || isFinished ? "done" : "current";
  const step4: StepStatus = !(isLive || isFinished) ? "pending" : isFinished ? "done" : "current";

  return (
    <div className="p-6 sm:p-8 max-w-5xl border-t border-white/5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold text-white">Canasta Solidaria — Sorteo</h2>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab("sorteo")}
          className={`text-sm font-semibold px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "sorteo" ? "border-amber-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Sorteo
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
          <DrawTimeBanner campaign={campaign} />

          <div className="space-y-3 mb-8">
            <Step number={1} title="Programar fecha y hora del sorteo" status={step1}>
              <ScheduleDrawForm campaign={campaign} />
            </Step>
            <Step number={2} title="Avisar a los donantes" status={step2}>
              <NotifyDonorsForm />
            </Step>
            <Step number={3} title="Activar el sorteo" status={step3}>
              <ActivateDrawButton campaign={campaign} notifiedCount={notifiedCount} />
            </Step>
            {draw && (
              <Step number={4} title="Confirmar al ganador (cuando responda)" status={step4}>
                <div className="grid sm:grid-cols-3 gap-3">
                  {winnersByPosition.map(([pos, info]) => (
                    <WinnerCard
                      key={pos}
                      position={pos}
                      info={info}
                      isCurrent={draw.currentPosition === pos && draw.winnerStatus === "PENDING"}
                      drawId={draw.id}
                      locked={draw.winnerStatus !== "PENDING" && draw.currentPosition !== pos}
                    />
                  ))}
                </div>
              </Step>
            )}
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
