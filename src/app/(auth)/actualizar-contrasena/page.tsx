"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!hasSupabaseBrowserConfig()) {
      setError("Falta configurar Supabase en las variables de entorno.");
      return;
    }
    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No se pudo actualizar la contrasena. Abre otra vez el link del email.");
      return;
    }

    setSuccess(true);
    window.setTimeout(() => router.push("/login"), 1600);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <Link href="/login" className="mb-8 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          ← Volver al login
        </Link>

        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15">
          <Lock className="h-6 w-6 text-indigo-300" />
        </div>

        <h1 className="text-3xl font-black text-white">Nueva contrasena</h1>
        <p className="mt-2 text-sm text-gray-500">Elige una nueva contrasena para tu cuenta.</p>

        {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            Contrasena actualizada. Te estamos redirigiendo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">Nueva contrasena</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">Repetir contrasena</label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Guardando..." : "Guardar nueva contrasena"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
