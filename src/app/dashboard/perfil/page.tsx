"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BadgeCheck, Clock, Loader2, Save, ShieldAlert, Upload, X } from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  city: string | null;
  phone: string | null;
}

interface VerifStore {
  isVerified: boolean;
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

function FileInput({ label, file, onChange, error, onError }: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(f: File | null) {
    if (!f) { onChange(null); onError?.(""); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      onError?.("Solo se aceptan imágenes JPG, PNG o WEBP.");
      if (ref.current) ref.current.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      onError?.("La imagen no puede pesar más de 5MB.");
      if (ref.current) ref.current.value = "";
      return;
    }
    if (f.size < MIN_BYTES) {
      onError?.("La imagen parece estar vacía o corrupta (menos de 10KB).");
      if (ref.current) ref.current.value = "";
      return;
    }
    onError?.("");
    onChange(f);
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-colors ${
          error ? "border-red-300 bg-red-50" : file ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt={label} className="w-full h-28 object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleFile(null); if (ref.current) ref.current.value = ""; }}
              className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full p-1 shadow transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-3 py-1.5 flex items-center gap-1.5 bg-indigo-50">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs text-indigo-700 truncate">{file!.name}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Upload className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">Seleccionar (JPG/PNG/WEBP, máx 5MB)</span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <input
        ref={ref}
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
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
    if (!dniFront || !dniBack || !selfie) { setSubmitError("Necesitás subir las 3 imágenes."); return; }
    setSubmitting(true); setSubmitError("");
    const fd = new FormData();
    fd.append("dniFront", dniFront); fd.append("dniBack", dniBack); fd.append("selfie", selfie);
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

  const toggleDisabled = !!togglingKey || !isVerified;

  return (
    <DashboardLayout userName={profile?.name} userEmail={profile?.email}>
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
                    <p className="text-xs text-gray-400">Ej: "Vendedor desde junio 2024"</p>
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
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <BadgeCheck className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Identidad verificada</p>
                      <p className="text-xs text-blue-600">Tu tienda tiene el badge azul. Activá los toggles en "Datos personales" para elegir qué se muestra al público.</p>
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
              ) : (
                <div className="px-6 py-5 space-y-4">
                  {verifStatus === "REJECTED" && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Solicitud rechazada</p>
                        {req?.reviewNote && <p className="text-xs text-red-600 mt-0.5">{req.reviewNote}</p>}
                        <p className="text-xs text-red-500 mt-1">Podés reenviar las imágenes corregidas.</p>
                      </div>
                    </div>
                  )}

                  {verifStatus === "NONE" && (
                    <p className="text-sm text-gray-500">Subí una foto de tu DNI (frente y dorso) y una selfie sosteniéndolo. Solo lo ve el equipo de TiendaApps.</p>
                  )}

                  <FileInput label="DNI — frente" file={dniFront} onChange={setDniFront} error={fileErrors.dniFront} onError={(m) => setFileError("dniFront", m)} />
                  <FileInput label="DNI — dorso" file={dniBack} onChange={setDniBack} error={fileErrors.dniBack} onError={(m) => setFileError("dniBack", m)} />
                  <FileInput label="Selfie sosteniendo el DNI" file={selfie} onChange={setSelfie} error={fileErrors.selfie} onError={(m) => setFileError("selfie", m)} />

                  {submitError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">{submitError}</p>}
                  {submitted && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-center">¡Solicitud enviada! Te avisamos cuando esté aprobada.</p>}

                  <button
                    type="button"
                    disabled={submitting || !dniFront || !dniBack || !selfie || Object.values(fileErrors).some(Boolean)}
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
