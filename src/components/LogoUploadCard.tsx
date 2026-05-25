"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Image as ImageIcon, Loader2, Check } from "lucide-react";

interface LogoUploadCardProps {
  storeName: string;
  initialLogo: string | null;
  initialLogoColor: string | null;
}

export default function LogoUploadCard({ storeName, initialLogo, initialLogoColor }: LogoUploadCardProps) {
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [logoColor, setLogoColor] = useState<string | null>(initialLogoColor);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = storeName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("La imagen no puede superar los 4 MB");
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

      const saveRes = await fetch("/api/store/logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: url }),
      });
      if (!saveRes.ok) throw new Error("Error al guardar el logo");
      const saveData = await saveRes.json();

      setLogo(url);
      setLogoColor(saveData.logoColor ?? null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/logo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: null }),
      });
      if (!res.ok) throw new Error("Error al eliminar el logo");
      setLogo(null);
      setLogoColor(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Preview */}
        <div className="relative shrink-0">
          {logo ? (
            <img
              src={logo}
              alt={storeName}
              className="h-20 w-20 rounded-2xl object-cover ring-4 ring-purple-50 shadow-md"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md ring-4 ring-purple-50">
              <span className="text-2xl font-black text-white tracking-tight">{initials}</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Info + actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900">Logo de tu tienda</p>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" /> Guardado
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Aparece cuando compartís tu tienda en WhatsApp, Instagram, Facebook y cuando se instala como app en el celular.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Recomendado: imagen cuadrada, mínimo 512×512 px. JPG, PNG o WEBP, máx. 4 MB.
          </p>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : logo ? (
                <Upload className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {logo ? "Cambiar logo" : "Subir logo"}
            </button>

            {logo && !uploading && (
              <button
                onClick={handleRemove}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Quitar
              </button>
            )}
          </div>
        </div>

        {/* Right: previews */}
        {logo && (
          <div className="shrink-0 hidden lg:flex flex-col gap-3">
            {/* Preview OG / compartir */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5 text-center font-medium">Al compartir el link</p>
              <div className="w-60 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="h-14 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center gap-3 px-3">
                  <img src={logo} alt={storeName} className="h-9 w-9 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{storeName}</p>
                    <p className="text-[10px] text-gray-400 truncate">tiendaapps.com</p>
                  </div>
                </div>
                <div className="bg-gray-50 px-3 py-2">
                  <p className="text-[10px] text-gray-500">Comprá en {storeName} — Envíos a todo el país</p>
                </div>
              </div>
            </div>

            {/* Preview splash PWA */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5 text-center font-medium">Splash al abrir la app</p>
              <div
                className="w-60 h-24 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm"
                style={{ background: logoColor || "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <img src={logo} alt={storeName} className="h-10 w-10 rounded-xl object-cover shadow-md" />
                <p className="text-xs font-bold text-white truncate px-4" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                  {storeName}
                </p>
              </div>
              {!logoColor && (
                <p className="text-[10px] text-gray-400 text-center mt-1">
                  PNG sin fondo → usa color de tu tienda
                </p>
              )}
              {logoColor && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className="h-3 w-3 rounded-full border border-gray-200" style={{ background: logoColor }} />
                  <p className="text-[10px] text-gray-400">Color detectado: {logoColor}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
