"use client";

import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/components/AuthProvider";
import { esAppInstalada } from "@/lib/pwa";
import { useIsPwa } from "@/hooks/useIsPwa";

/**
 * Qué hacer cuando alguien abre un panel que no es el de su cuenta.
 *
 * ── El error que esto arregla ────────────────────────────────────────────────
 * Los layouts resolvían esto con un `redirect` del servidor: si una cuenta de
 * afiliado pedía `/dashboard`, se la mandaba a `/afiliados`, y al revés. En la
 * web está perfecto — al que se equivocó de puerta hay que abrirle la correcta,
 * no cerrarle ésta.
 *
 * Adentro de una app instalada es otra cosa. En Android las dos apps comparten
 * el frasco de cookies porque son el mismo dominio, así que entrar a la app de
 * afiliados con una cuenta de afiliado deja esa sesión puesta para las DOS.
 * Después abrías la app del panel de tiendas y pasaba esto:
 *
 *     abrís el ícono del panel → /dashboard → el servidor ve "afiliado"
 *     → redirect a /afiliados → el panel de AFILIADOS adentro de la ventana
 *       de la app de TIENDAS
 *
 * Y esa ventana tiene `scope: /dashboard`, así que además quedaba fuera de su
 * propio scope: sin barra de direcciones y sin forma de volver. Flavio lo
 * encontró con las dos instaladas y lo describió exacto: "abro el panel del
 * dashboard y me abre el panel del afiliado".
 *
 * Adentro de la app no se redirige a ningún lado: se explica lo que pasa y se
 * ofrece lo único que lo arregla, que es entrar con la otra cuenta.
 *
 * ── Las dos lecturas son distintas a propósito ───────────────────────────────
 * El efecto llama a `esAppInstalada()` derecho y el render usa `useIsPwa()`. Es
 * el mismo motivo que en `LoginGate`: el hook contesta `false` en el render del
 * servidor y en el primero del cliente, y recién después vuelve a preguntar.
 * Para DIBUJAR no molesta —se ve el spinner un instante de más— pero para IRSE
 * sería el bug de vuelta: el efecto se despertaría con ese `false` y sacaría de
 * la app a alguien que sí está adentro.
 */
export default function PanelRolAjeno({
  destino,
  raiz,
  panel,
  cuenta,
}: {
  /** A dónde va en la web: el panel que sí le corresponde a esta cuenta. */
  destino: string;
  /** La raíz de ESTE panel (`/dashboard`, `/afiliados`). A dónde vuelve al salir. */
  raiz: string;
  /** Cómo se llama el panel en el que está parado. Ej: "el panel de tu tienda". */
  panel: string;
  /** Qué tipo de cuenta tiene. Ej: "de afiliado". */
  cuenta: string;
}) {
  const enLaApp = useIsPwa();
  const { signOut } = useAuth();

  useEffect(() => {
    if (esAppInstalada()) return;
    window.location.href = destino;
  }, [destino]);

  if (!enLaApp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center [color-scheme:light]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 [color-scheme:light]">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <AppLogo size={96} />
        </div>

        <h1 className="text-2xl font-black text-gray-950 mb-2">
          Esta cuenta no es de acá
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-8">
          Estás en {panel}, pero la sesión abierta es una cuenta {cuenta}. Cada
          cuenta tiene su propio panel y no se cruzan.
        </p>

        {/* Sale a la RAÍZ DE ESTE PANEL, no al que le corresponde a la cuenta.
            Mandarlo al otro panel sería salirse del scope otra vez — el problema
            que este componente vino a resolver. Sin sesión, la raíz de este panel
            dibuja su propio login (ver `LoginGate`), así que queda justo donde
            tiene que estar para entrar con la cuenta correcta.
            Y por eso tampoco hay un link a la otra app: desde acá no se puede
            llegar sin salirse. */}
        <button
          onClick={() => signOut(raiz)}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión y entrar con otra cuenta
        </button>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          Si querés usar la otra cuenta, abrí su propia app desde la pantalla de
          inicio.
        </p>
      </div>
    </div>
  );
}
