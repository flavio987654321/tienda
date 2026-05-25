"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Save } from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  city: string | null;
  phone: string | null;
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
        </div>
      </div>
    </DashboardLayout>
  );
}
