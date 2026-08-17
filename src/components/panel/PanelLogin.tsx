"use client";

import { AppLogo } from "@/components/AppLogo";
import { useLoginForm } from "@/hooks/useLoginForm";
import { Loader2, Eye, EyeOff } from "lucide-react";

/* El login de un panel, dibujado POR el panel cuando no hay sesión.
 *
 * ── Por qué no alcanza con mandar a `/login` ─────────────────────────────────
 * `/login` vive fuera del `scope` del manifest (`/dashboard`, y mañana
 * `/afiliados`). Y `scope` no encierra a nadie: un `<Link>` de Next a una ruta
 * de afuera es navegación del cliente, así que la app instalada se comía la
 * página comercial entera —con su embudo de registro y sus links al listado de
 * tiendas— adentro de la ventana de la app, sin barra de direcciones.
 *
 * El parche que había era ir tapando cada link con un `inPwa ?` adentro de
 * `/login`. Llegó a cuatro condicionales y aun así se escapó uno (el "Ver
 * tiendas activas"). Mientras el login siga siendo una pantalla de marketing,
 * cada link que alguien agregue ahí es una fuga nueva que nadie va a recordar
 * tapar.
 *
 * Acá el problema no se tapa: se saca. Este formulario no tiene a dónde ir. No
 * hay links, el logo no navega, y el `reload()` de abajo deja a la persona en la
 * MISMA url en la que estaba. Es imposible salirse del scope porque no hay
 * ninguna navegación.
 *
 * ── Por qué no es una ruta nueva ─────────────────────────────────────────────
 * Una ruta `/dashboard/login` también quedaba adentro del scope, pero hay que
 * mantenerla y sigue habiendo un redirect que puede apuntar mal. Dibujando esto
 * desde el layout no hay ruta que registrar: el que pide `/dashboard/pedidos`
 * sin sesión ve el login ahí mismo, entra, y sigue en `/dashboard/pedidos`. Hoy
 * ese camino lo mandaba a `/login` y de vuelta a `/panel`, o sea que perdía la
 * pantalla a la que quería entrar.
 *
 * `/login` sigue existiendo intacto para la web.
 */
export default function PanelLogin({
  titulo = "Ingresá a tu panel",
  subtitulo = "Usá la misma cuenta de siempre.",
}: {
  titulo?: string;
  subtitulo?: string;
}) {
  /* Recargar la MISMA url, en vez de navegar a ningún lado.
   *
   * Dos cosas al precio de una: la persona vuelve a la pantalla que había pedido,
   * y el servidor vuelve a resolver el layout —que ahora sí ve la sesión— sin que
   * este componente tenga que saber a qué panel corresponde cada rol.
   *
   * Tiene que ser una recarga de verdad y no un `router.refresh()`: la cookie que
   * acaba de escribir el cliente de Supabase puede no estar lista todavía para una
   * transición "soft" de Next. Es el mismo motivo por el que `/login` usa
   * `window.location.href` y no `router.push`. */
  const {
    email, setEmail,
    password, setPassword,
    showPass, setShowPass,
    error, info, loading, resetting,
    handleSubmit, handleForgotPassword,
  } = useLoginForm(() => window.location.reload());

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 [color-scheme:light]">
      <div className="w-full max-w-md">
        {/* El logo NO es un link: adentro de la app no hay a dónde ir, y afuera
            un logo que te saca del panel al que estás entrando no ayuda. */}
        <div className="flex items-center gap-2.5 mb-10">
          <AppLogo size={72} />
          <span className="text-xl font-bold text-gray-950">TiendaApps</span>
        </div>

        <h1 className="text-4xl font-black text-gray-950 mb-2">{titulo}</h1>
        <p className="text-gray-600 mb-8">{subtitulo}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3.5 rounded-2xl text-sm mb-6">
            {error}
          </div>
        )}

        {info && (
          <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3.5 rounded-2xl text-sm mb-6">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="panel-login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="panel-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all hover:border-gray-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="panel-login-password" className="text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="text-xs text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-60"
              >
                {resetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
              </button>
            </div>
            <div className="relative">
              <input
                id="panel-login-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition-all hover:border-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
