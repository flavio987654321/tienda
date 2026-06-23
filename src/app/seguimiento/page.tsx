"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Package, ShoppingBag, Loader2, MessageCircle } from "lucide-react";

export default function SeguimientoPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c.length < 6) { setError("Ingresá el código de tu pedido (mínimo 6 caracteres)."); return; }
    setLoading(true);
    router.push(`/seguimiento/${c}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#tiendas" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Tiendas</Link>
            <Link href="/#como-funciona" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Cómo funciona</Link>
            <Link href="/quienes-somos" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-indigo-600 text-sm font-medium transition-colors flex items-center gap-1.5"><Package className="h-4 w-4" />Seguimiento</Link>
            <Link href="/contacto" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />Contacto</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-gray-700 hover:text-gray-900 text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">Iniciar sesión</Link>
            <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + form */}
      <div className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 py-16 grid md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-6">
              Seguimiento en tiempo real
            </span>
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-none tracking-tight mb-6">
              Seguí tu pedido<br />
              <span className="text-indigo-600">en tiempo real.</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Ingresá el código de 8 caracteres que recibiste en el email de confirmación y mirá el estado de tu pedido al instante.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Actualización instantánea", "Sin registro", "24/7"].map(tag => (
                <span key={tag} className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div>
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
              <h2 className="text-gray-900 font-bold text-xl mb-1">Ingresar código</h2>
              <p className="text-gray-500 text-sm mb-6">Te lo enviamos por email al confirmar el pedido.</p>

              <form onSubmit={buscar} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Código de pedido
                  </label>
                  <input
                    value={codigo}
                    onChange={e => { setCodigo(e.target.value.toUpperCase()); setError(""); }}
                    placeholder="Ej: LRRVV6ZZ"
                    maxLength={20}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-mono font-bold tracking-widest text-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal placeholder:text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-base transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  Ver seguimiento
                </button>
              </form>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {!error && (
                <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">Ejemplo rápido</p>
                  <p className="text-sm text-gray-500">El código aparece en el email como <span className="font-mono text-gray-700">Pedido #XXXXXXXX</span></p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
