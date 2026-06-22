"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, HeartHandshake, Upload, Plus, Trash2 } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  goalAmount: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  contactPhone: string | null;
} | null;

async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo subir el archivo");
  return { url: data.url as string, mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE" };
}

function CreateCausaForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url, mediaType: mt } = await uploadFile(file);
      setMediaUrl(url);
      setMediaType(mt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    if (creating || uploading || !name.trim()) return;
    const parsedGoal = goalAmount.trim() ? Number(goalAmount) : null;
    if (parsedGoal !== null && (Number.isNaN(parsedGoal) || parsedGoal <= 0)) {
      setError("La meta tiene que ser un número mayor a 0 (o dejala vacía para sin techo)");
      return;
    }
    if (!confirm(`¿Crear la causa "${name}"?`)) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LIBRE",
          name: name.trim(),
          description,
          goalAmount: parsedGoal,
          mediaUrl,
          mediaType,
          contactPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la causa");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la causa");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <HeartHandshake className="h-10 w-10 text-amber-500 mx-auto mb-3" />
      <p className="text-gray-400 mb-6">No hay ninguna Causa Libre activa todavía. Creá una nueva para empezar a recibir donaciones.</p>
      <div className="space-y-3 text-left">
        {mediaUrl &&
          (mediaType === "VIDEO" ? (
            <video src={mediaUrl} controls className="w-full max-h-48 rounded-lg bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="w-full max-h-48 object-cover rounded-lg" />
          ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 text-white"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {mediaUrl ? "Cambiar foto/video" : "Subir foto o video de la causa"}
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
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nombre de la causa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Ayudemos a la familia Pérez"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Descripción — por qué hace falta la plata</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Teléfono de contacto</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Meta en $ (opcional — vacío = sin techo)</label>
          <input
            type="number"
            min={0}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="Sin techo"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={creating || uploading || !name.trim()}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Crear causa
        </button>
        {uploading && <p className="text-xs text-gray-500 text-center">Esperá a que termine de subir la foto/video antes de crear.</p>}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}

function EditCausaForm({ campaign }: { campaign: NonNullable<Campaign> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [goalAmount, setGoalAmount] = useState(campaign.goalAmount ? String(campaign.goalAmount) : "");
  const [contactPhone, setContactPhone] = useState(campaign.contactPhone ?? "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(campaign.mediaUrl);
  const [mediaType, setMediaType] = useState<string | null>(campaign.mediaType);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url, mediaType: mt } = await uploadFile(file);
      setMediaUrl(url);
      setMediaType(mt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving || uploading || !name.trim()) return;
    const parsedGoal = goalAmount.trim() ? Number(goalAmount) : null;
    if (parsedGoal !== null && (Number.isNaN(parsedGoal) || parsedGoal <= 0)) {
      setError("La meta tiene que ser un número mayor a 0 (o dejala vacía para sin techo)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/campaign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign.id,
          name,
          description,
          goalAmount: parsedGoal,
          mediaUrl,
          mediaType,
          contactPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
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

  async function handleDeleteCampaign() {
    if (deletingCampaign) return;
    if (!confirm(`¿Eliminar la causa "${campaign.name}"? Solo se puede si todavía no tiene donaciones confirmadas. Esta acción no se puede deshacer.`)) return;
    setDeletingCampaign(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/canasta/campaign?id=${campaign.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setDeletingCampaign(false);
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Causa Libre</h1>
        </div>
        <button
          onClick={handleDeleteCampaign}
          disabled={deletingCampaign}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          title="Eliminar causa"
        >
          {deletingCampaign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Eliminar causa
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Esto es la presentación pública de la causa — se muestra en {"/comunidad/causa"} junto con el chanchito. No confundir con el historial de entrega (eso se carga después, cuando se cierre).
      </p>

      <div className="space-y-3">
        {mediaUrl &&
          (mediaType === "VIDEO" ? (
            <video src={mediaUrl} controls className="w-full max-h-56 rounded-lg bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="w-full max-h-56 object-cover rounded-lg" />
          ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {mediaUrl ? "Cambiar foto/video" : "Subir foto o video de la causa"}
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
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Descripción — por qué hace falta la plata</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Teléfono de contacto</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Meta en $ (opcional — vacío = sin techo)</label>
          <input
            type="number"
            min={0}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="Sin techo"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || uploading || !name.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          Guardar
        </button>
        {uploading && <p className="text-xs text-gray-500">Esperá a que termine de subir la foto/video antes de guardar.</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export default function CausaLibreAdmin({ campaign }: { campaign: Campaign }) {
  if (!campaign) return <CreateCausaForm />;
  return <EditCausaForm campaign={campaign} />;
}
