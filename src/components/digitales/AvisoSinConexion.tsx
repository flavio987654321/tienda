"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, Wifi } from "lucide-react";

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/**
 * El cartel de "sin conexión" del panel de Productos Digitales.
 *
 * ⚠️ No existía: con la señal cortada, los botones del panel giraban o no
 * hacían nada, y la persona no tenía cómo saber si era el panel o su internet.
 * El panel de tiendas lo tiene escondido en la barra lateral; acá va a la vista,
 * arriba y al centro, porque el que más lo necesita es el celular, donde la
 * barra está cerrada. Encontrado en la auditoría del 03/10/26.
 *
 * Al volver la señal dice "Volvió la conexión" un ratito y se va solo: sin eso
 * el cartel desaparecía en silencio y no quedaba claro si ya se podía seguir.
 *
 * En el servidor dice "hay conexión" (sin cartel), así no rompe la hidratación.
 */
export default function AvisoSinConexion() {
  const enLinea = useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
  const [volvio, setVolvio] = useState(false);

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined;
    function alVolver() {
      setVolvio(true);
      clearTimeout(espera);
      espera = setTimeout(() => setVolvio(false), 3000);
    }
    window.addEventListener("online", alVolver);
    return () => { window.removeEventListener("online", alVolver); clearTimeout(espera); };
  }, []);

  if (enLinea && !volvio) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      /* `inset-x-0 mx-auto w-fit` y no `left-1/2 -translate-x-1/2`: con eso el
         ancho disponible era la MITAD de la pantalla y en un celular el texto
         quedaba en tres renglones. En computadora va DEBAJO de la barra de
         atajos (\`lg:top-16\`): arriba de todo, a 1024 px, tapaba el botón de
         "+ Nuevo producto". */
      className={`fixed inset-x-0 top-[4.25rem] z-[70] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl px-4 py-2 text-[13px] font-semibold shadow-lg lg:top-16 ${
        enLinea ? "bg-emerald-600 text-white" : "bg-gray-900 text-white panel-oscuro:bg-gray-100 panel-oscuro:text-gray-900"
      }`}
    >
      {enLinea ? <Wifi className="h-4 w-4 shrink-0" /> : <WifiOff className="h-4 w-4 shrink-0" />}
      <span className="min-w-0">
        {enLinea ? "Volvió la conexión" : "Sin conexión: lo que hagas no se guarda hasta que vuelva."}
      </span>
    </div>
  );
}
