"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Trash2, Image as ImageIcon, Loader2, Check, X, Play } from "lucide-react";

interface LogoUploadCardProps {
  storeName: string;
  initialLogo: string | null;
  initialLogoColor: string | null;
  primaryColor?: string | null;
  isPremium?: boolean;
}

export default function LogoUploadCard({ storeName, initialLogo, initialLogoColor, primaryColor, isPremium = false }: LogoUploadCardProps) {
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [logoColor, setLogoColor] = useState<string | null>(initialLogoColor);
  const effectiveColor = (() => {
    if (!logoColor) return null;
    const r = parseInt(logoColor.slice(1, 3), 16);
    const g = parseInt(logoColor.slice(3, 5), 16);
    const b = parseInt(logoColor.slice(5, 7), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance < 40 ? null : logoColor;
  })();
  const splashBg = effectiveColor || primaryColor || "linear-gradient(135deg, #6366f1, #8b5cf6)";
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSplashModal, setShowSplashModal] = useState(false);
  const [splashActive, setSplashActive] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [splashMounted, setSplashMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const splashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const initials = storeName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const startSplash = useCallback(() => {
    splashTimers.current.forEach(clearTimeout);
    splashTimers.current = [];
    setSplashActive(true);
    setSplashFading(false);
    setSplashMounted(false);
    const t0 = setTimeout(() => setSplashMounted(true), 50);
    const t1 = setTimeout(() => setSplashFading(true), 1700);
    const t2 = setTimeout(() => { setSplashActive(false); setSplashMounted(false); }, 2250);
    splashTimers.current = [t0, t1, t2];
  }, []);

  useEffect(() => {
    if (showSplashModal) {
      const t = setTimeout(() => startSplash(), 400);
      return () => clearTimeout(t);
    } else {
      splashTimers.current.forEach(clearTimeout);
      setSplashActive(false);
      setSplashFading(false);
      setSplashMounted(false);
    }
  }, [showSplashModal, startSplash]);

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
      setEditing(false);
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
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
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

              {/* Sin logo: solo "Subir logo" */}
              {!logo && (
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  Subir logo
                </button>
              )}

              {/* Con logo, modo normal: solo "Editar" */}
              {logo && !editing && !uploading && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Editar
                </button>
              )}

              {/* Con logo, modo edición: "Cambiar foto" + "Quitar" + "×" */}
              {logo && editing && (
                <>
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Cambiar foto
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </button>
                  <button
                    onClick={() => { setEditing(false); setError(null); }}
                    disabled={uploading}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Spinner standalone cuando hay logo y está subiendo */}
              {logo && uploading && (
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </div>
              )}
            </div>
          </div>

          {/* Right: previews */}
          {logo && (
            <div className="shrink-0 hidden lg:flex flex-col gap-3">
              {/* Preview OG / compartir */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5 text-center font-medium">Al compartir el link</p>
                <div
                  className="w-60 rounded-xl border border-gray-200 overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group relative"
                  onClick={() => setShowShareModal(true)}
                >
                  <div className="h-14 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center gap-3 px-3">
                    <img src={logo} alt={storeName} className="h-9 w-9 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{storeName}</p>
                      <p className="text-[10px] text-gray-400 truncate">tiendaapps.com</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">Comprá en {storeName} — Envíos a todo el país</p>
                    <span className="text-[9px] font-semibold text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-1">
                      Ver →
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview splash PWA */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5 text-center font-medium">Splash al abrir la app</p>
                {isPremium ? (
                  <>
                    <div
                      className="w-60 h-24 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                      style={{ background: splashBg }}
                      onClick={() => setShowSplashModal(true)}
                    >
                      <img src={logo} alt={storeName} className="h-10 w-10 rounded-xl object-cover shadow-md" />
                      <p className="text-xs font-bold text-white truncate px-4" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                        {storeName}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
                          <Play className="h-3 w-3 text-white fill-white" />
                          <span className="text-[9px] font-semibold text-white">Ver animación</span>
                        </div>
                      </div>
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
                  </>
                ) : (
                  <div className="w-60 h-24 rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-sm relative overflow-hidden border border-dashed border-violet-200 bg-violet-50/60">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span className="text-xs font-bold text-violet-500">Solo Premium</span>
                    </div>
                    <p className="text-[10px] text-violet-400 text-center px-4 leading-tight">Instalá tu tienda como app en el celular de tus clientes</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && logo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
            <h3 className="font-bold text-gray-900 mb-1">Así se ve al compartir el link</h3>
            <p className="text-xs text-gray-400 mb-5">Preview de cómo aparece en WhatsApp, Telegram y otras apps</p>

            {/* WhatsApp */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">WhatsApp</p>
              <div className="bg-[#ECE5DD] rounded-xl p-3">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <div className="h-36 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <img src={logo} alt={storeName} className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-900">{storeName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Comprá en {storeName} — Envíos a todo el país</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">tiendaapps.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Telegram / otros */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Telegram / otros</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-3 border-l-4 border-purple-500 bg-purple-50/40">
                  <img src={logo} alt={storeName} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{storeName}</p>
                    <p className="text-[11px] text-gray-500 truncate">Comprá en {storeName} — Envíos a todo el país</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">tiendaapps.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Splash Modal */}
      {showSplashModal && logo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSplashModal(false)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-1">
              <div>
                <p className="text-white font-bold text-sm">Splash al abrir la app</p>
                <p className="text-white/60 text-xs mt-0.5">Así se ve cuando alguien abre la tienda como app</p>
              </div>
              <button
                onClick={() => setShowSplashModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Phone frame */}
            <div className="relative w-52 h-[420px] bg-gray-900 rounded-[2.75rem] p-[6px] shadow-2xl ring-1 ring-white/10">
              {/* Status bar */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-20" />
              {/* Screen */}
              <div className="w-full h-full rounded-[2.25rem] overflow-hidden bg-white relative">
                {/* Store content placeholder */}
                <div className="p-3 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <img src={logo} alt={storeName} className="h-8 w-8 rounded-lg object-cover" />
                    <div className="h-3 bg-gray-200 rounded-full flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl h-20" />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 bg-gray-100 rounded-full w-full" />
                    <div className="h-2 bg-gray-100 rounded-full w-3/4" />
                  </div>
                </div>

                {/* Splash overlay */}
                {splashActive && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{
                      background: splashBg,
                      opacity: splashFading ? 0 : splashMounted ? 1 : 0,
                      transform: splashFading ? "scale(1.06)" : splashMounted ? "scale(1)" : "scale(0.92)",
                      transition: "opacity 0.5s ease, transform 0.5s ease",
                    }}
                  >
                    <img
                      src={logo}
                      alt={storeName}
                      className="h-16 w-16 rounded-2xl object-cover shadow-xl"
                    />
                    <p
                      className="mt-4 text-sm font-bold text-white text-center px-6 leading-tight"
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
                    >
                      {storeName}
                    </p>
                  </div>
                )}

                {/* Replay overlay when animation is done */}
                {!splashActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px]">
                    <button
                      onClick={startSplash}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      <Play className="h-6 w-6 text-purple-600 fill-purple-600" />
                      <span className="text-xs font-semibold text-gray-700">Repetir</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {logoColor && (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/20" style={{ background: logoColor }} />
                <p className="text-white/60 text-xs">Color del fondo: {logoColor}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
