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
  const colors = [
    "bg-indigo-500", "bg-violet-500", "bg-pink-500",
    "bg-rose-500", "bg-orange-500", "bg-teal-500", "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function FileInput({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${
          file ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        {file ? (
          <>
            <BadgeCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-xs text-indigo-700 truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ""; }}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">Seleccionar imagen (JPG/PNG, máx 5MB)</span>
          </>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function VerificationSection({ profile }: { profile: Profile }) {
  const [verifStore, setVerifStore] = useState<VerifStore | null>(null);
  const [loading, setLoading] = useState(true);

  const [dniFront, setDniFront] = useState<File | null>(null);
  const [dniBack, setDniBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/verificacion")
      .then((r) => r.json())
      .then((d) => { if (d.store) setVerifStore(d.store); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dniFront || !dniBack || !selfie) {
      setSubmitError("Necesitás subir las 3 imágenes.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const fd = new FormData();
    fd.append("dniFront", dniFront);
    fd.append("dniBack", dniBack);
    fd.append("selfie", selfie);
    try {
      const res = await fetch("/api/verificacion", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setVerifStore((prev) => prev ? {
          ...prev,
          verificationRequest: { id: "", status: "PENDING", reviewNote: null, createdAt: new Date().toISOString() },
        } : prev);
        setDniFront(null); setDniBack(null); setSelfie(null);
      } else {
        setSubmitError(d.error || "No se pudo enviar. Intentá de nuevo.");
      }
    } catch {
      setSubmitError("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(key: string, value: boolean) {
    setTogglingKey(key);
    try {
      const res = await fetch("/api/verificacion/toggles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const d = await res.json();
      if (res.ok && d.toggles) {
        setVerifStore((prev) => prev ? { ...prev, ...d.toggles } : prev);
      }
    } catch { /* noop */ } finally {
      setTogglingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!verifStore) return null;

  const req = verifStore.verificationRequest;
  const status = req?.status ?? "NONE";

  return (
    <div className="w-full max-w-md mt-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Verificación de identidad</h2>
        </div>

        {/* APROBADO */}
        {status === "APPROVED" && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <BadgeCheck className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Identidad verificada</p>
                <p className="text-xs text-green-600">Tu tienda muestra el badge azul de verificación.</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Qué mostrás al público cuando hacen click en el badge
              </p>
              <div className={togglingKey ? "opacity-60 pointer-events-none" : ""}>
                <ToggleField
                  label="Nombre"
                  description={`"${profile.name || "Tu nombre"}"`}
                  checked={verifStore.verifiedShowName}
                  onChange={(v) => handleToggle("verifiedShowName", v)}
                />
                <ToggleField
                  label="Ciudad"
                  description={profile.city ? `"${profile.city}"` : "No cargaste ciudad aún"}
                  checked={verifStore.verifiedShowCity}
                  onChange={(v) => handleToggle("verifiedShowCity", v)}
                />
                <ToggleField
                  label="WhatsApp"
                  description={profile.phone ? `+${profile.phone}` : "No cargaste teléfono aún"}
                  checked={verifStore.verifiedShowPhone}
                  onChange={(v) => handleToggle("verifiedShowPhone", v)}
                />
                <ToggleField
                  label="Fecha de ingreso"
                  description="Ej: Vendedor desde junio 2024"
                  checked={verifStore.verifiedShowSince}
                  onChange={(v) => handleToggle("verifiedShowSince", v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* EN REVISIÓN */}
        {status === "PENDING" && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
              <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Solicitud en revisión</p>
                <p className="text-xs text-yellow-600">Te notificamos cuando esté aprobada. Puede tardar hasta 48hs.</p>
              </div>
            </div>
          </div>
        )}

        {/* RECHAZADO o SIN SOLICITUD */}
        {(status === "NONE" || status === "REJECTED") && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {status === "REJECTED" && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Solicitud rechazada</p>
                  {req?.reviewNote && (
                    <p className="text-xs text-red-600 mt-0.5">{req.reviewNote}</p>
                  )}
                  <p className="text-xs text-red-500 mt-1">Podés volver a enviar las imágenes corregidas.</p>
                </div>
              </div>
            )}

            {status === "NONE" && (
              <p className="text-sm text-gray-500">
                Subí las fotos de tu DNI y una selfie sosteniéndolo para verificar tu identidad. Solo lo ve el equipo de TiendaApps. Se muestra un badge azul en tu tienda pública.
              </p>
            )}

            <FileInput label="DNI — frente" file={dniFront} onChange={setDniFront} />
            <FileInput label="DNI — dorso" file={dniBack} onChange={setDniBack} />
            <FileInput label="Selfie sosteniendo el DNI" file={selfie} onChange={setSelfie} />

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">
                {submitError}
              </p>
            )}
            {submitted && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-center">
                ¡Solicitud enviada! Te avisamos cuando esté aprobada.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !dniFront || !dniBack || !selfie}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? "Enviando..." : "Enviar para verificación"}
            </button>
          </form>
        )}
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

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) return;
        setProfile(d.profile);
        setForm({
          name: d.profile.name || "",
          city: d.profile.city || "",
          phone: d.profile.phone || "",
        });
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok && d.profile) {
        setProfile(d.profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(d.error || "No se pudo guardar. Intentá de nuevo.");
      }
    } catch {
      setSaveError("Error de conexión. Verificá tu internet.");
    } finally {
      setSaving(false);
    }
  }

  const initials = profile ? getInitials(profile.name, profile.email) : "?";
  const avatarColor = profile ? getAvatarColor(profile.email) : "bg-indigo-500";

  return (
    <DashboardLayout userName={profile?.name} userEmail={profile?.email}>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className={`w-20 h-20 rounded-full ${avatarColor} flex items-center justify-center shadow-lg mb-3`}>
              <span className="text-white text-3xl font-bold leading-none">{initials}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.name || "Mi perfil"}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{profile?.email}</p>
          </div>

          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre y apellido</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tu nombre completo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="5491112345678"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Con código de país, sin + ni espacios. Ej: 5491112345678</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Buenos Aires"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">
                {saveError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
            </button>
          </form>

          {/* Sección de verificación — solo para dueños de tienda */}
          {profile && <VerificationSection profile={profile} />}
        </div>
      </div>
    </DashboardLayout>
  );
}
