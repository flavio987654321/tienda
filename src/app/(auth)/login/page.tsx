"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import {
  ShoppingBag, Loader2, Eye, EyeOff, ArrowRight,
  Users, CheckCircle, Store, Wallet,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!hasSupabaseBrowserConfig()) {
      setError("Falta configurar Supabase en las variables de entorno.");
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    } else {
      setRedirecting(true);
      router.refresh();
      router.push("/panel");
    }
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px); background-size: 48px 48px; }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gradient-text { background: linear-gradient(135deg,#818cf8,#a78bfa,#f472b6,#818cf8); background-size:300% 300%; animation:gradient-shift 4s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-gradient-to-br from-indigo-950 via-[#1a0f3c] to-purple-950 p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-16 -right-12 w-56 h-56 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">MiTienda</span>
        </Link>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Una plataforma,<br /><span className="gradient-text">tres formas de usarla</span>
            </h2>
            <p className="text-indigo-200/70 leading-relaxed text-sm">
              Vendedoras, afiliados y clientes comparten el mismo acceso.
            </p>
          </div>

          <div className="space-y-3">
            {/* Tienda */}
            <div className="bg-white/5 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Store className="h-4 w-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Tengo una tienda</p>
                <p className="text-indigo-200/60 text-xs leading-relaxed">Gestioná productos, pedidos, afiliados y stock desde tu panel.</p>
              </div>
            </div>

            {/* Afiliado */}
            <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="h-4 w-4 text-purple-300" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Soy vendedor/a</p>
                <p className="text-indigo-200/60 text-xs leading-relaxed">Postulate a tiendas, compartí tu link y cobrá comisiones automáticas.</p>
              </div>
            </div>

            {/* Cliente */}
            <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Wallet className="h-4 w-4 text-pink-300" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Soy cliente</p>
                <p className="text-indigo-200/60 text-xs leading-relaxed">Explorá tiendas, guardá favoritos y seguí el estado de tus pedidos.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-indigo-400/40 text-xs">© 2026 MiTienda · Argentina</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MiTienda</span>
          </Link>

          {registered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3.5 rounded-2xl text-sm mb-6 flex items-center gap-3"
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {registered === "seller"
                ? "Cuenta de afiliado creada. Ahora inicia sesion."
                : "¡Cuenta creada con éxito! Ahora iniciá sesión."}
            </motion.div>
          )}

          <h1 className="text-4xl font-black text-white mb-2">Bienvenida</h1>
          <p className="text-gray-500 mb-8">Ingresá a tu cuenta para continuar.</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-2xl text-sm mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all hover:border-white/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-400">Contraseña</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all hover:border-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Ingresando..." : "Ingresar a mi cuenta"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-gray-700 font-medium">¿Sos afiliado?</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Seller card */}
          <div className="bg-purple-500/5 border border-purple-500/15 rounded-2xl p-5 flex items-start gap-4 hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-1">Acceso de afiliado</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Si tenes cuenta de afiliado inicia sesion arriba. Si queres postularte a una tienda, explora las activas.
              </p>
              <Link
                href="/vendedoras"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-purple-400 font-semibold hover:text-purple-300 transition-colors"
              >
                Ver tiendas activas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-7">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              Registrate gratis →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <LoginForm />
    </Suspense>
  );
}
