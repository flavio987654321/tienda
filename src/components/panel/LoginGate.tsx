"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { esAppInstalada } from "@/lib/pwa";
import { useIsPwa } from "@/hooks/useIsPwa";
import PanelLogin from "./PanelLogin";

/* Decide QUÉ login mostrarle a alguien que llegó al panel sin sesión.
 *
 * En la web se va a `/login`, el de siempre, y no cambia nada: la web tiene un
 * solo login y así se queda. `PanelLogin` aparece únicamente adentro de la app
 * instalada, que es el único lugar donde `/login` no es una opción — está fuera
 * del `scope` del manifest y la app se comería la página comercial entera.
 *
 * ── Por qué la decisión no se toma en el servidor ────────────────────────────
 * Sería más lindo (cero parpadeo), pero no se puede saber desde el servidor.
 * `display-mode: standalone` es del navegador, y la otra idea —que el cliente
 * deje una cookie `pwa=1` y el layout la lea— se cae sola en Android: ahí la app
 * instalada COMPARTE el frasco de cookies con Chrome, así que esa cookie se
 * filtraría al navegador normal y la web terminaría mostrando el login del panel
 * igual. Justo lo que esto viene a evitar.
 *
 * ── Las dos lecturas son distintas a propósito ───────────────────────────────
 * El efecto llama a `isPwa()` derecho, y el render usa `useIsPwa()`. No es un
 * descuido: el hook va con `useSyncExternalStore`, que contesta `false` en el
 * render del servidor Y en el primero del cliente, y recién después vuelve a
 * preguntar. Para DIBUJAR eso no molesta —se ve el spinner un instante de más—
 * pero para IRSE sería un desastre: el efecto se despertaría con el `false` de la
 * hidratación y mandaría a `/login` a alguien que sí está en la app instalada, o
 * sea el bug exacto que este archivo existe para no tener. Leído adentro del
 * efecto, `isPwa()` toca el navegador en el momento y no puede contestar de más.
 */
export default function LoginGate() {
  const enLaApp = useIsPwa();

  useEffect(() => {
    // `esAppInstalada` y no `isPwa`: acá se decide a dónde va una persona, y la
    // segunda le cree al `?source=pwa` de la url. Con la permisiva, un link
    // compartido con ese parámetro le mostraba el login del panel a alguien que
    // está en un navegador común.
    if (esAppInstalada()) return;
    // La url actual se pierde igual: `/login` manda al panel que corresponda al
    // rol, y ese es el comportamiento que la web ya tenía.
    window.location.href = "/login";
  }, []);

  if (enLaApp) return <PanelLogin />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center [color-scheme:light]">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
}
