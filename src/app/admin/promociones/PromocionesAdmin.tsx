"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Check, Megaphone, Link2, Trash2 } from "lucide-react";

type Promotion = {
  id: string;
  imageUrl: string;
  link: string | null;
  sortOrder: number;
  active: boolean;
};

const SLOT_COUNT = 3;

async function putJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo guardar");
  }
  return res.json();
}

function LinkField({ promotionId, initialValue }: { promotionId: string; initialValue: string | null }) {
  const [text, setText] = useState(initialValue ?? "");
  const lastSaved = useRef(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function commit() {
    if (submittingRef.current || text === lastSaved.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await putJSON(`/api/admin/promociones/${promotionId}`, { link: text.trim() || null });
      lastSaved.current = text;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2 py-1.5">
        <Link2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
        <input
          type="text"
          placeholder="Link al hacer click (opcional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full bg-transparent text-xs text-white outline-none"
        />
        {saving && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-500" />}
        {saved && <Check className="h-3 w-3 shrink-0 text-green-500" />}
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// Mismo método que usamos para los flyers de las tiendas: 3 espacios fijos
// (slot 0, 1, 2), cada uno se sube/cambia/quita por separado — nada de ir
// agregando de a uno con un botón "+".
function PromotionSlot({
  slot,
  promotion,
  onUploaded,
  onRemoved,
}: {
  slot: number;
  promotion: Promotion | null;
  onUploaded: (p: Promotion) => void;
  onRemoved: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const removingRef = useRef(false);

  async function handleFile(file: File) {
    if (uploadingRef.current) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "Error al subir la imagen");
      }
      const { url } = await uploadRes.json();

      if (promotion) {
        const updated = await putJSON(`/api/admin/promociones/${promotion.id}`, { imageUrl: url });
        onUploaded(updated);
      } else {
        const res = await fetch("/api/admin/promociones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url, sortOrder: slot }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo crear la promoción");
        onUploaded(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!promotion || removingRef.current) return;
    removingRef.current = true;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/promociones/${promotion.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo quitar");
      onRemoved(promotion.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar");
      removingRef.current = false;
      setRemoving(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: slot * 0.06 }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2.5"
    >
      <div className="relative rounded-xl overflow-hidden bg-white/5 aspect-[9/16]">
        <AnimatePresence mode="wait">
          {promotion ? (
            <motion.div
              key="filled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={promotion.imageUrl} alt={`Promoción ${slot + 1}`} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">#{slot + 1}</div>
              {/* Botones siempre visibles (no solo al hover) para que también
                  se puedan usar desde tablet/celular, sin mouse. */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  title="Cambiar foto"
                  className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  title="Quitar"
                  className="w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center shadow transition-colors disabled:opacity-50"
                >
                  {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="empty"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-amber-400 transition-colors"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              <span className="text-xs">Subir flyer</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {promotion && <LinkField promotionId={promotion.id} initialValue={promotion.link} />}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </motion.div>
  );
}

export default function PromocionesAdmin({ promotions: initial }: { promotions: Promotion[] }) {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>(initial);

  function bySlot(slot: number) {
    return promotions.find((p) => p.sortOrder === slot) ?? null;
  }

  function handleUploaded(p: Promotion) {
    setPromotions((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
    router.refresh();
  }

  function handleRemoved(id: string) {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-1"
      >
        <Megaphone className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-bold text-white">Promociones</h1>
      </motion.div>
      <p className="text-gray-500 text-sm mb-6">
        Hasta {SLOT_COUNT} flyers — se muestran en un carrusel en la página principal. Formato vertical recomendado (1080×1920px).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: SLOT_COUNT }, (_, slot) => (
          <PromotionSlot key={slot} slot={slot} promotion={bySlot(slot)} onUploaded={handleUploaded} onRemoved={handleRemoved} />
        ))}
      </div>
    </div>
  );
}
