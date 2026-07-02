"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { isPwa } from "@/lib/pwa";
import {
  ShoppingBag, Loader2, Eye, EyeOff, ArrowRight,
  Users, CheckCircle, Store, Wallet,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const registered = searchParams.get("registered");
  const redirectTo = searchParams.get("redirect");
  const [inPwa, setInPwa] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el modo de visualización de la PWA (display-mode), no se puede leer en el render inicial sin desincronizar SSR/cliente
  useEffect(() => { setInPwa(isPwa()); }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

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
      const safeRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null;
      // Navegación completa (no router.push): la cookie de sesión recién
      // escrita por el cliente de Supabase puede no estar lista todavía para
      // una transición "soft" de Next — con un request HTTP real siempre llega.
      window.location.href = safeRedirect || "/panel";
    }
  }

  async function handleForgotPassword() {
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Ingresa tu email primero para enviarte el link de recuperacion.");
      return;
    }

    setResetting(true);
    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setInfo("Te enviamos un link para recuperar tu contraseña. Revisa tu email.");
    setResetting(false);
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-gradient-to-br from-orange-600 via-orange-600 to-rose-600 p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-16 -right-12 w-56 h-56 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />

        {inPwa ? (
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TiendaApps</span>
          </div>
        ) : (
          <Link href="/" className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TiendaApps</span>
          </Link>
        )}

        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Una plataforma,<br />tres formas de usarla
            </h2>
            <p className="text-orange-50/80 leading-relaxed text-sm">
              Vendedoras, afiliados y clientes comparten el mismo acceso.
            </p>
          </div>

          <div className="space-y-3">
            {/* Tienda */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Tengo una tienda</p>
                <p className="text-orange-50/70 text-xs leading-relaxed">Gestioná productos, pedidos, afiliados y stock desde tu panel.</p>
              </div>
            </div>

            {/* Afiliado */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Soy vendedor/a</p>
                <p className="text-orange-50/70 text-xs leading-relaxed">Postulate a tiendas, compartí tu link y cobrá comisiones automáticas.</p>
              </div>
            </div>

            {/* Cliente */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold mb-0.5">Soy cliente</p>
                <p className="text-orange-50/70 text-xs leading-relaxed">Explorá tiendas, guardá favoritos y seguí el estado de tus pedidos.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-orange-50/50 text-xs">© 2026 TiendaApps · Argentina</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          {inPwa ? (
            <div className="flex items-center gap-2.5 mb-10 lg:hidden">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-950">TiendaApps</span>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-950">TiendaApps</span>
            </Link>
          )}

          {registered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3.5 rounded-2xl text-sm mb-6 flex items-center gap-3"
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {registered === "seller"
                ? "Cuenta de afiliado creada. Ahora inicia sesion."
                : "¡Cuenta creada con éxito! Ahora iniciá sesión."}
            </motion.div>
          )}

          <h1 className="text-4xl font-black text-gray-950 mb-2">Bienvenido</h1>
          <p className="text-gray-600 mb-8">Ingresá a tu cuenta para continuar.</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3.5 rounded-2xl text-sm mb-6"
            >
              {error}
            </motion.div>
          )}

          {info && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3.5 rounded-2xl text-sm mb-6"
            >
              {info}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all hover:border-gray-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                <button type="button" onClick={handleForgotPassword} disabled={resetting} className="text-xs text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-60">
                  {resetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all hover:border-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Ingresando..." : "Ingresar a mi cuenta"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">¿Sos afiliado?</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Seller card */}
          <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-5 flex items-start gap-4 hover:border-orange-200 transition-all">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Acceso de afiliado</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Si tenes cuenta de afiliado inicia sesion arriba. Si queres postularte a una tienda, explora las activas.
              </p>
              <Link
                href="/afiliados"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                Ver tiendas activas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {!inPwa && (
            <p className="text-center text-sm text-gray-500 mt-7">
              ¿No tenés cuenta?{" "}
              <Link href="/registro" className="text-orange-600 font-bold hover:text-orange-700 transition-colors">
                Registrate gratis →
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
