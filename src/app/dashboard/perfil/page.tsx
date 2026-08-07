"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BadgeCheck, Camera, Check, Clock, Loader2, Save, ShieldAlert, Upload, X } from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  city: string | null;
  phone: string | null;
}

interface VerifStore {
  isVerified: boolean;
  verificationBanned: boolean;
  verifiedShowName: boolean;
  verifiedShowCity: boolean;
  verifiedShowPhone: boolean;
  verifiedShowSince: boolean;
  verificationRequest: { id: string; status: string; reviewNote: string | null; createdAt: string } | null;
}

function getInitials(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function getAvatarColor(str: string) {
  const colors = ["bg-indigo-500", "bg-violet-500", "bg-pink-500", "bg-rose-500", "bg-orange-500", "bg-teal-500", "bg-cyan-500"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      title={checked ? "Visible públicamente" : "Oculto"}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-blue-500" : "bg-gray-200"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_BYTES = 10 * 1024; // 10KB mínimo para evitar imágenes en blanco

function CameraModal({ facingMode, label, onCapture, onClose }: {
  facingMode: "user" | "environment";
  label: string;
  onCapture: (f: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState("");

  // Dar vuelta la cámara resetea el cartel de error y el "listo" del render
  // anterior. Se hace acá y no dentro del efecto porque es un reseteo por cambio
  // de prop: adentro del efecto sería un setState sincrónico que encadena renders.
  const [prevFacingMode, setPrevFacingMode] = useState(facingMode);
  if (facingMode !== prevFacingMode) {
    setPrevFacingMode(facingMode);
    setCamError("");
    setReady(false);
  }

  // Si el navegador soporta cámara o no es algo que no cambia mientras el modal
  // está abierto, así que se resuelve una vez al montar y se muestra como texto
  // derivado. Antes se escribía con setCamError desde el efecto, que era el
  // setState sincrónico que encadenaba renders.
  const [cameraUnsupported] = useState(
    () => typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia
  );
  const shownError = cameraUnsupported
    ? "Tu navegador no soporta acceso a cámara. Probá con Chrome o Edge actualizados."
    : camError;

  function startCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) return;

    media.getUserMedia({ video: { facingMode: { ideal: facingMode } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setReady(true)).catch(() => {});
        }
      })
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCamError("Acceso bloqueado. Hacé clic en el candado en la barra del navegador → Cámara → Permitir → recargá la página e intentá de nuevo.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCamError("No se encontró ninguna cámara en este dispositivo. Subí la foto desde tu galería.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setCamError("La cámara está siendo usada por otra aplicación. Cerrala y volvé a intentar.");
        } else {
          setCamError(`No se pudo acceder a la cámara (${name || "error desconocido"}). Verificá permisos e intentá de nuevo.`);
        }
      });
  }

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camara-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {!ready && !shownError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          {shownError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
              <p className="text-white text-sm">{shownError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg border border-white/40 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Camera className="h-4 w-4" /> Capturar
          </button>
        </div>
      </div>
    </div>
  );
}

function FileInput({ label, file, onChange, error, onError, facingMode = "environment" }: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  onError?: (msg: string) => void;
  facingMode?: "user" | "environment";
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // La miniatura se deriva del archivo en vez de guardarse en estado: antes esto
  // era un useEffect que hacía setState, y eso encadena un render de más cada vez
  // que cambiás la foto. El efecto queda solo para liberar la URL del blob.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFile(f: File | null) {
    if (!f) { onChange(null); onError?.(""); if (galleryRef.current) galleryRef.current.value = ""; return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      onError?.("Solo se aceptan imágenes JPG, PNG o WEBP.");
      if (galleryRef.current) galleryRef.current.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      onError?.("La imagen no puede pesar más de 5MB.");
      if (galleryRef.current) galleryRef.current.value = "";
      return;
    }
    if (f.size < MIN_BYTES) {
      onError?.("La imagen parece estar vacía o corrupta (menos de 10KB).");
      if (galleryRef.current) galleryRef.current.value = "";
      return;
    }
    onError?.("");
    onChange(f);
  }

  return (
    <div>
      {showCamera && (
        <CameraModal
          facingMode={facingMode}
          label={label}
          onCapture={(f) => { onError?.(""); onChange(f); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
        error ? "border-red-300 bg-red-50" : file ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
      }`}>
        {file && preview ? (
          <div className="relative">
            {/* Va <img> y no <Image>: `preview` es una URL blob: del archivo que
                la persona acaba de elegir y que todavía no se subió a ningún
                lado. next/image no puede optimizar un blob local —lo pasaría por
                el optimizador y fallaría— y acá no hay nada que optimizar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="w-full h-28 object-cover" />
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full p-1 shadow transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-3 py-1.5 flex items-center gap-1.5 bg-indigo-50">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs text-indigo-700 truncate">{file.name}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-stretch">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 hover:bg-indigo-50/50 transition-colors"
            >
              <Upload className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 text-left">Elegir foto (máx 5MB)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              title="Usar cámara"
              className="px-3 border-l border-dashed border-gray-200 hover:bg-indigo-50/50 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-800 mb-1">¿Estás seguro?</p>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", city: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [verifStore, setVerifStore] = useState<VerifStore | null>(null);
  const [verifLoading, setVerifLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [cuit, setCuit] = useState("");
  const [cuitError, setCuitError] = useState("");
  const [fileErrors, setFileErrors] = useState({ dniFront: "", dniBack: "", selfie: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  function setFileError(key: "dniFront" | "dniBack" | "selfie", msg: string) {
    setFileErrors((prev) => ({ ...prev, [key]: msg }));
  }

  useEffect(() => {
    fetch("/api/perfil").then((r) => r.json()).then((d) => {
      if (!d.profile) return;
      setProfile(d.profile);
      setForm({ name: d.profile.name || "", city: d.profile.city || "", phone: d.profile.phone || "" });
    });
    fetch("/api/verificacion").then((r) => r.json()).then((d) => {
      if (d.store) setVerifStore(d.store);
    }).finally(() => setVerifLoading(false));
  }, []);

  async function doSave() {
    setSaving(true); setSaved(false); setSaveError("");
    try {
      const res = await fetch("/api/perfil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok && d.profile) { setProfile(d.profile); setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else { setSaveError(d.error || "No se pudo guardar. Intentá de nuevo."); }
    } catch { setSaveError("Error de conexión."); }
    finally { setSaving(false); }
  }

  async function handleToggle(key: string, value: boolean) {
    setTogglingKey(key);
    try {
      const res = await fetch("/api/verificacion/toggles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
      const d = await res.json();
      if (res.ok && d.toggles) setVerifStore((prev) => prev ? { ...prev, ...d.toggles } : prev);
    } finally { setTogglingKey(null); }
  }

  async function doSubmitVerification() {
    if (cuit.trim()) {
      const digits = cuit.replace(/-/g, "").trim();
      if (!/^\d{11}$/.test(digits)) { setCuitError("El CUIT debe tener 11 dígitos (ej: 20-12345678-9)."); return; }
    }
    if (!dniFront || !dniBack || !selfie) { setSubmitError("Necesitás subir las 3 imágenes."); return; }
    setSubmitting(true); setSubmitError("");
    const fd = new FormData();
    fd.append("dniFront", dniFront); fd.append("dniBack", dniBack); fd.append("selfie", selfie);
    if (cuit.trim()) fd.append("cuit", cuit.trim());
    try {
      const res = await fetch("/api/verificacion", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setVerifStore((prev) => prev ? { ...prev, verificationRequest: { id: "", status: "PENDING", reviewNote: null, createdAt: new Date().toISOString() } } : prev);
        setDniFront(null); setDniBack(null); setSelfie(null);
      } else { setSubmitError(d.error || "No se pudo enviar. Intentá de nuevo."); }
    } catch { setSubmitError("Error de conexión."); }
    finally { setSubmitting(false); }
  }

  const initials = profile ? getInitials(profile.name, profile.email) : "?";
  const avatarColor = profile ? getAvatarColor(profile.email) : "bg-indigo-500";
  const req = verifStore?.verificationRequest;
  const verifStatus = req?.status ?? "NONE";
  const isVerified = verifStore?.isVerified ?? false;
  const verificationBanned = verifStore?.verificationBanned ?? false;

  const toggleDisabled = !!togglingKey || !isVerified;

  return (
    <DashboardLayout userName={profile?.name}>
      {showSaveConfirm && (
        <ConfirmDialog
          message="¿Guardás los cambios de tu perfil?"
          onConfirm={() => { setShowSaveConfirm(false); doSave(); }}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
      {showSubmitConfirm && (
        <ConfirmDialog
          message="Vas a enviar tus documentos para verificación. El equipo los revisará en hasta 48hs."
          onConfirm={() => { setShowSubmitConfirm(false); doSubmitVerification(); }}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}

      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center shadow-lg mb-2`}>
            <span className="text-white text-2xl font-bold leading-none">{initials}</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{profile?.name || "Mi perfil"}</h1>
            {isVerified && <span title="Identidad verificada"><BadgeCheck className="h-5 w-5 text-blue-500" /></span>}
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{profile?.email}</p>
        </div>

        {/* Layout 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Columna izquierda — Datos del perfil */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Datos personales</h2>
              {verifStore && <p className="text-xs text-gray-400 mt-0.5">El toggle azul indica si ese dato se muestra al público cuando verificás tu identidad.</p>}
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Email — sin toggle, siempre privado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={profile?.email || ""} disabled className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Siempre privado, no se muestra al público.</p>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre y apellido</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text" value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Tu nombre completo"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {verifStore && (
                    <div className="shrink-0" title={toggleDisabled && !isVerified ? "Solo disponible tras verificación" : ""}>
                      <Toggle checked={verifStore.verifiedShowName} onChange={(v) => handleToggle("verifiedShowName", v)} disabled={toggleDisabled} />
                    </div>
                  )}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono / WhatsApp</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text" value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="5491112345678"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {verifStore && (
                    <div className="shrink-0" title={toggleDisabled && !isVerified ? "Solo disponible tras verificación" : ""}>
                      <Toggle checked={verifStore.verifiedShowPhone} onChange={(v) => handleToggle("verifiedShowPhone", v)} disabled={toggleDisabled} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Con código de país, sin + ni espacios. Ej: 5491112345678</p>
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text" value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Buenos Aires"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {verifStore && (
                    <div className="shrink-0" title={toggleDisabled && !isVerified ? "Solo disponible tras verificación" : ""}>
                      <Toggle checked={verifStore.verifiedShowCity} onChange={(v) => handleToggle("verifiedShowCity", v)} disabled={toggleDisabled} />
                    </div>
                  )}
                </div>
              </div>

              {/* Fecha de ingreso — solo toggle, no editable */}
              {verifStore && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Fecha de ingreso</p>
                    <p className="text-xs text-gray-400">Ej: &quot;Vendedor desde junio 2024&quot;</p>
                  </div>
                  <Toggle checked={verifStore.verifiedShowSince} onChange={(v) => handleToggle("verifiedShowSince", v)} disabled={toggleDisabled} />
                </div>
              )}

              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">{saveError}</p>}

              <button
                type="button"
                onClick={() => setShowSaveConfirm(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
              </button>
              {verifStore && !isVerified && (
                <p className="text-xs text-gray-400 text-center">Los toggles se activan una vez que tu identidad esté verificada.</p>
              )}
            </div>
          </div>

          {/* Columna derecha — Verificación */}
          {verifStore !== null && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <BadgeCheck className={`h-5 w-5 ${isVerified ? "text-blue-500" : "text-gray-300"}`} />
                <h2 className="text-sm font-bold text-gray-900">Verificación de identidad</h2>
              </div>

              {verifLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
              ) : isVerified ? (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <BadgeCheck className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Identidad verificada</p>
                      <p className="text-xs text-blue-600">Tu tienda tiene el badge azul. Activá los toggles en &quot;Datos personales&quot; para elegir qué se muestra al público.</p>
                    </div>
                  </div>

                  {/* Certificado de identidad */}
                  <div className="relative border border-blue-100 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5">
                    {/* Marca de agua */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
                      <BadgeCheck className="h-48 w-48 text-blue-600" />
                    </div>
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">TiendaApps · Certificado de identidad</span>
                        <BadgeCheck className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">{profile?.name || "—"}</p>
                        {profile?.city && (
                          <p className="text-xs text-gray-500 mt-0.5">{profile.city}</p>
                        )}
                      </div>
                      <div className="pt-3 border-t border-blue-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Verificado por TiendaApps</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                          <Check className="h-3 w-3" /> Verificado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : verifStatus === "PENDING" ? (
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
                    <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Solicitud en revisión</p>
                      <p className="text-xs text-yellow-600">Te notificamos cuando esté aprobada. Puede tardar hasta 48hs.</p>
                    </div>
                  </div>
                </div>
              ) : verificationBanned ? (
                <div className="px-6 py-5">
                  <div className="flex items-start gap-2.5 bg-gray-100 border border-gray-200 rounded-xl px-4 py-4">
                    <ShieldAlert className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Cuenta inhabilitada para verificación</p>
                      {req?.reviewNote && <p className="text-xs text-gray-600 mt-0.5">{req.reviewNote}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Tu cuenta no puede enviar nuevas solicitudes de verificación. Si creés que fue un error escribinos a{" "}
                        <a href="mailto:soporte@tiendaapps.com" className="text-indigo-500 underline">soporte@tiendaapps.com</a>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-4">
                  {verifStatus === "REJECTED" && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Verificación no activa</p>
                        {req?.reviewNote && <p className="text-xs text-red-600 mt-0.5">{req.reviewNote}</p>}
                        <p className="text-xs text-red-500 mt-1">Podés volver a enviar una solicitud. Si tenés dudas escribinos a soporte@tiendaapps.com.</p>
                      </div>
                    </div>
                  )}

                  {verifStatus === "NONE" && (
                    <p className="text-sm text-gray-500">Subí una foto de tu DNI (frente y dorso) y una selfie sosteniéndolo. Solo lo ve el equipo de TiendaApps.</p>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      CUIT / CUIL <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={cuit}
                      onChange={(e) => { setCuit(e.target.value); setCuitError(""); }}
                      placeholder="20-12345678-9"
                      maxLength={13}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${cuitError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    {cuitError
                      ? <p className="text-xs text-red-600 mt-1">{cuitError}</p>
                      : <p className="text-xs text-gray-400 mt-1">Tu número de contribuyente. Lo usamos para confirmar actividad comercial ante AFIP.</p>
                    }
                  </div>

                  <FileInput label="DNI — frente" file={dniFront} onChange={setDniFront} error={fileErrors.dniFront} onError={(m) => setFileError("dniFront", m)} facingMode="environment" />
                  <FileInput label="DNI — dorso" file={dniBack} onChange={setDniBack} error={fileErrors.dniBack} onError={(m) => setFileError("dniBack", m)} facingMode="environment" />
                  <FileInput label="Selfie sosteniendo el DNI" file={selfie} onChange={setSelfie} error={fileErrors.selfie} onError={(m) => setFileError("selfie", m)} facingMode="user" />

                  {submitError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">{submitError}</p>}
                  {submitted && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-center">¡Solicitud enviada! Te avisamos cuando esté aprobada.</p>}

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Al enviar aceptás que TiendaApps trate tus documentos de identidad con fines exclusivos de verificación, conforme al art. 7 de la Ley 25.326.
                    Los documentos son privados y solo los ve el equipo de TiendaApps. Podés solicitar su eliminación en cualquier momento.{" "}
                    <a href="/privacidad?role=owner" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">Política de privacidad</a>
                    {" · "}
                    <a href="/terminos?role=owner" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">Términos</a>
                  </p>

                  <button
                    type="button"
                    disabled={submitting || !dniFront || !dniBack || !selfie || Object.values(fileErrors).some(Boolean) || !!cuitError}
                    onClick={() => setShowSubmitConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {submitting ? "Enviando..." : "Enviar para verificación"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
