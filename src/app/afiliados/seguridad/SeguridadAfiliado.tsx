"use client";

import { useOscuroDelSitio } from "@/components/seguridad/useOscuroDelSitio";
import PanelSeguridad from "@/components/seguridad/PanelSeguridad";

/**
 * El panel de afiliados pinta su modo oscuro con `dark:` (la clase en <html>) y
 * `PanelSeguridad` con `panel-oscuro:`, la variante de los otros dos paneles.
 * La marca `data-panel-tema` traduce uno al otro sólo para esta pantalla.
 */
export default function SeguridadAfiliado() {
  const oscuro = useOscuroDelSitio();
  return (
    <div data-panel-tema={oscuro ? "oscuro" : "claro"} className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">Seguridad</h1>
      <p className="mt-1 mb-5 text-sm text-gray-500 dark:text-gray-400">
        Verificación en dos pasos, códigos de respaldo y dónde está abierta tu cuenta.
      </p>
      <PanelSeguridad acento="indigo" />
    </div>
  );
}
