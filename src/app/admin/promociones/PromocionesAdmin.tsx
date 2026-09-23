"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Check, Megaphone, Link2, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { LUGARES } from "@/lib/orden-promociones";

type Promotion = {
  id: string;
  imageUrl: string;
  link: string | null;
  sortOrder: number;
  active: boolean;
};

/* Cuántos lugares dibuja el panel. Sale de `orden-promociones`, que es donde lo
   mira también la ruta que los mueve: con el número escrito en los dos lados,
   agrandar el carrusel un día dejaría al panel ofreciendo un lugar que la ruta
   rechaza. */
const SLOT_COUNT = LUGARES;

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
  onMover,
  moviendo,
}: {
  slot: number;
  promotion: Promotion | null;
  onUploaded: (p: Promotion) => void;
  onRemoved: (id: string) => void;
  /* Mover toca DOS lugares, así que el movimiento lo maneja el padre: es el
     único que tiene la lista entera y el que pisa el estado con lo que contesta
     el servidor. Acá sólo se avisa a dónde. */
  onMover: (promotion: Promotion, destino: number) => void;
  moviendo: boolean;
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
              <img src={promotion.imageUrl} alt={`Promoción ${slot + 1}`} className="w-full h-full object-contain" />
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

      {/* Mover de lugar.

          Va abajo de la imagen y no encima, como los de subir y quitar: estos dos
          son los únicos botones que se pueden querer tocar varias veces seguidas,
          y tapando el flyer no se ve el resultado de lo que se acaba de hacer.

          El número del lugar se dice acá con todas las letras porque ES el orden
          del carrusel de la home: el #1 es el que se ve primero. */}
      {promotion && (
        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => onMover(promotion, slot - 1)}
            disabled={slot === 0 || moviendo}
            title="Mover un lugar para atrás"
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors disabled:opacity-25 disabled:hover:bg-white/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-gray-500">Lugar #{slot + 1}</span>
          <button
            type="button"
            onClick={() => onMover(promotion, slot + 1)}
            disabled={slot === SLOT_COUNT - 1 || moviendo}
            title="Mover un lugar para adelante"
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors disabled:opacity-25 disabled:hover:bg-white/5"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ⚠️ `key` con el id del flyer, y NO alcanza con la del `PromotionSlot`,
          que va por lugar. `LinkField` guarda el texto en un `useState` que sólo
          lee `initialValue` al montarse: sin esta key, después de un intercambio
          React reutiliza el input de antes —queda mostrando el link del OTRO
          flyer mientras `promotionId` ya apunta a éste— y el primer cambio que
          se escriba ahí le guarda ese link viejo a la promoción equivocada.

          Antes no podía pasar porque un flyer nunca cambiaba de lugar; lo
          destapó mover. Con la key, React lo desmonta y lo vuelve a montar con
          el valor correcto. */}
      {promotion && (
        <LinkField key={promotion.id} promotionId={promotion.id} initialValue={promotion.link} />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </motion.div>
  );
}

export default function PromocionesAdmin({ promotions: initial }: { promotions: Promotion[] }) {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>(initial);
  const [moviendo, setMoviendo] = useState(false);
  const [errorMover, setErrorMover] = useState<string | null>(null);
  /* El estado tarda un render en llegar; el ref corta en el acto. Es el mismo
     candado que ya usan subir y quitar, y acá importa más: dos clics seguidos en
     la flecha mandarían dos intercambios sobre una lista que ya cambió. */
  const moviendoRef = useRef(false);

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

  async function mover(promotion: Promotion, destino: number) {
    if (moviendoRef.current) return;
    moviendoRef.current = true;
    setMoviendo(true);
    setErrorMover(null);
    try {
      const res = await fetch("/api/admin/promociones/reordenar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promotion.id, sortOrder: destino }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo mover");
      /* Se mira que sea una lista antes de pisar el estado: `bySlot` hace
         `.find` sobre esto, y un 200 con cualquier otra cosa adentro —un proxy
         que devuelve HTML, por ejemplo— dejaría el panel en blanco con un error
         de JavaScript en vez de un mensaje. Es el mismo recaudo que ya toma
         `PromotionsCarousel` con esta misma forma. */
      if (!Array.isArray(data)) throw new Error("El servidor contestó algo raro — recargá la página.");
      /* La lista entera, tal como quedó en la base. Mover toca dos flyers y el
         link se muda con su imagen —son la misma fila—, así que reconstruirlo acá
         era repetir del lado del navegador una cuenta que el servidor ya hizo. */
      setPromotions(data);
      router.refresh();
    } catch (e) {
      setErrorMover(e instanceof Error ? e.message : "No se pudo mover");
    } finally {
      moviendoRef.current = false;
      setMoviendo(false);
    }
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

      {/* Arriba de la grilla y no adentro de un flyer: el que falló puede ser
          cualquiera de los dos que se estaban intercambiando. */}
      {errorMover && (
        <p className="text-sm text-red-400 mb-4">{errorMover}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: SLOT_COUNT }, (_, slot) => (
          <PromotionSlot
            key={slot}
            slot={slot}
            promotion={bySlot(slot)}
            onUploaded={handleUploaded}
            onRemoved={handleRemoved}
            onMover={mover}
            moviendo={moviendo}
          />
        ))}
      </div>
    </div>
  );
}
