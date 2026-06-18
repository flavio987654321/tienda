"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, HeartHandshake, Plus, X, Trash2, Pencil } from "lucide-react";
import { useSavedNumberField, useSavedTextField } from "./useSavedNumberField";

type Product = {
  id: string;
  name: string;
  image: string | null;
  targetPrice: number;
};

type Campaign = {
  id: string;
  name: string;
  reservePct: number;
  products: Product[];
} | null;

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

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
}

async function deleteJSON(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo eliminar");
  }
}

function ProductRow({
  product,
  onPriceSaved,
  onDeleted,
}: {
  product: Product;
  onPriceSaved: (id: string, price: number) => void;
  onDeleted: (id: string) => void;
}) {
  const [image, setImage] = useState(product.image);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const priceField = useSavedNumberField(product.targetPrice, async (value) => {
    await putJSON(`/api/admin/canasta/products/${product.id}`, { targetPrice: value });
    onPriceSaved(product.id, value);
  });

  const nameField = useSavedTextField(product.name, async (value) => {
    await putJSON(`/api/admin/canasta/products/${product.id}`, { name: value });
  });

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`¿Eliminar "${nameField.text}" de la canasta? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteJSON(`/api/admin/canasta/products/${product.id}`);
      onDeleted(product.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar");
      setDeleting(false);
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "Error al subir la imagen");
      }
      const { url } = await uploadRes.json();
      await putJSON(`/api/admin/canasta/products/${product.id}`, { image: url });
      setImage(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => editing && inputRef.current?.click()}
          disabled={uploading || !editing}
          className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/5 flex items-center justify-center group"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Upload className="h-6 w-6 text-gray-500" />
          )}
          {editing && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <span className="text-white text-xs font-semibold flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" /> {image ? "Cambiar" : "Subir foto"}
                </span>
              )}
            </div>
          )}
        </button>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title={editing ? "Listo" : "Editar"}
            className={`w-6 h-6 rounded-full flex items-center justify-center shadow transition-colors ${
              editing ? "bg-amber-500 text-gray-950" : "bg-black/60 text-white hover:bg-black/80"
            }`}
          >
            {editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar"
            className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center shadow disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        </div>
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
      <div>
        {editing ? (
          <>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                {...nameField.inputProps}
                className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-xs font-medium text-white"
              />
              {nameField.saving && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-500" />}
              {nameField.saved && <Check className="h-3 w-3 shrink-0 text-green-500" />}
            </div>
            {nameField.error && <p className="text-xs text-red-400 mt-1">{nameField.error}</p>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                <input
                  type="number"
                  min="1"
                  {...priceField.inputProps}
                  className="w-full bg-white/5 border border-white/10 rounded pl-5 pr-1.5 py-1 text-xs text-white"
                />
              </div>
              {priceField.saving && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-500" />}
              {priceField.saved && <Check className="h-3 w-3 shrink-0 text-green-500" />}
            </div>
            {priceField.error && <p className="text-xs text-red-400 mt-1">{priceField.error}</p>}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white leading-tight truncate" title={nameField.text}>
              {nameField.text}
            </p>
            <p className="text-xs text-gray-500 mt-1">${priceField.text}</p>
          </>
        )}
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        {deleteError && <p className="text-xs text-red-400 mt-1">{deleteError}</p>}
      </div>
    </div>
  );
}

function ReservePctInput({ campaignId, initialValue }: { campaignId: string; initialValue: number }) {
  const field = useSavedNumberField(initialValue, async (value) => {
    if (value > 50) throw new Error("No puede superar el 50%");
    await putJSON("/api/admin/canasta/campaign", { id: campaignId, reservePct: value });
  });

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        max="50"
        {...field.inputProps}
        className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white"
      />
      <span className="text-xs text-gray-500">% reserva (envío + nafta + gastos)</span>
      {field.saving && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
      {field.saved && <Check className="h-3 w-3 text-green-500" />}
      {field.error && <span className="text-xs text-red-400">{field.error}</span>}
    </div>
  );
}

function AddProductCard({ campaignId, onAdded }: { campaignId: string; onAdded: (p: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
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
      setImage(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function add() {
    const targetPrice = Number(price);
    if (!name.trim()) {
      setError("Falta el nombre");
      return;
    }
    if (!targetPrice || targetPrice <= 0) {
      setError("Precio inválido");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: name.trim(), targetPrice, image }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo agregar");
      }
      const product = await res.json();
      onAdded(product);
      setName("");
      setPrice("");
      setImage(null);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-white/15 hover:border-amber-500/40 hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 aspect-square transition-colors"
      >
        <Plus className="h-6 w-6 text-gray-500" />
        <span className="text-xs text-gray-500">Agregar alimento</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-white/[0.02] p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300">Nuevo alimento</span>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setName(""); setPrice(""); setImage(null); }}
          className="text-gray-500 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/5 flex items-center justify-center group"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-gray-500" />
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <span className="text-white text-xs font-semibold flex items-center gap-1">
              <Upload className="h-3.5 w-3.5" /> {image ? "Cambiar" : "Subir foto"}
            </span>
          )}
        </div>
      </button>
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
      <input
        type="text"
        placeholder="Nombre (ej: Café 250g)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
      />
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
        <input
          type="number"
          min="1"
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-full bg-white/5 border border-white/10 rounded pl-5 pr-1.5 py-1 text-xs text-white"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={add}
        disabled={saving || uploading}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Agregar
      </button>
    </div>
  );
}

function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("Canasta Solidaria #1");
  const [reservePct, setReservePct] = useState(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (creating || !name.trim()) return;
    if (!confirm(`¿Crear la campaña "${name}"? Después vas a poder agregar los productos.`)) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/canasta/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), reservePct }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la campaña");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la campaña");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <HeartHandshake className="h-10 w-10 text-amber-500 mx-auto mb-3" />
      <p className="text-gray-400 mb-6">No hay una campaña activa todavía. Creá una nueva para empezar a cargar productos.</p>
      <div className="space-y-3 text-left">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nombre de la campaña</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">% reserva (envío + gastos)</label>
          <input
            type="number"
            min={0}
            max={50}
            value={reservePct}
            onChange={(e) => setReservePct(Number(e.target.value) || 0)}
            className="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={creating || !name.trim()}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Crear campaña
        </button>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default function CanastaAdmin({ campaign }: { campaign: Campaign }) {
  const [products, setProducts] = useState<Product[]>(campaign?.products ?? []);
  const [prices, setPrices] = useState<Record<string, number>>(
    () => Object.fromEntries((campaign?.products ?? []).map((p) => [p.id, p.targetPrice]))
  );

  if (!campaign) {
    return <CreateCampaignForm />;
  }

  const productsTotal = Object.values(prices).reduce((sum, p) => sum + p, 0);
  const goalAmount = Math.round(productsTotal / (1 - campaign.reservePct / 100));

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-1">
        <HeartHandshake className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-bold text-white">Canasta Solidaria</h1>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        {campaign.name} — Meta {formatMoney(goalAmount)} (productos {formatMoney(productsTotal)} + {campaign.reservePct}% reserva)
      </p>
      <div className="mb-6">
        <ReservePctInput campaignId={campaign.id} initialValue={campaign.reservePct} />
      </div>

      <h2 className="text-sm font-semibold text-gray-400 mb-3">Productos</h2>
      <p className="text-xs text-gray-500 mb-4">
        Subí una foto real y editá el precio de cada producto. Si agregás uno nuevo, la meta total se recalcula sola.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            onPriceSaved={(id, price) => setPrices((prev) => ({ ...prev, [id]: price }))}
            onDeleted={(id) => {
              setProducts((prev) => prev.filter((prod) => prod.id !== id));
              setPrices((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
            }}
          />
        ))}
        <AddProductCard
          campaignId={campaign.id}
          onAdded={(p) => {
            setProducts((prev) => [...prev, p]);
            setPrices((prev) => ({ ...prev, [p.id]: p.targetPrice }));
          }}
        />
      </div>
    </div>
  );
}
