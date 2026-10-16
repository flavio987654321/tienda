"use client";
/**
 * La página "La agencia" en los templates de autos de UNA sola página (Motor,
 * Drive): todo lo demás son bloques de la portada a los que el menú baja.
 *
 * Usa `useVistaTemplate` sólo para su vista "nosotros", así la dirección es
 * de verdad (/tienda/<slug>/nosotros: se comparte, el botón atrás anda) y en
 * el editor se cambia de pantalla sin salir de Diseño. Desde la agencia, un
 * link del menú a un bloque vuelve a la portada y baja cuando ya está dibujado.
 *
 * Volt no lo usa porque ya maneja sus pantallas (catálogo propio).
 */
import { useEffect, useState } from "react";
import { useVistaTemplate } from "@/components/store/templates/shared/useVistaTemplate";
import { irASeccion } from "@/components/store/templates/shared/irASeccion";

/** El id de menú que lleva a la página y no a un bloque. */
export const MENU_AGENCIA = "agencia";

export function useVistaAgencia({ isPreview, slug, templateId, conPagina }: {
  isPreview: boolean; slug: string; templateId: string;
  /** Ver hayAgenciaCargada: sin datos, "La agencia" baja al bloque de la portada. */
  conPagina: boolean;
}) {
  const vista = useVistaTemplate({ isPreview, slug, templateId, catalogo: "vehiculos" });
  const [pendiente, setPendiente] = useState<string | null>(null);
  useEffect(() => {
    if (!pendiente || !vista.enPortada) return;
    const t = setTimeout(() => { irASeccion(pendiente); setPendiente(null); }, 80);
    return () => clearTimeout(t);
  }, [pendiente, vista.enPortada]);

  const ir = (id: string) => {
    if (id === MENU_AGENCIA) {
      if (conPagina) { if (!vista.enNosotros) vista.irANosotros(); return; }
      id = "nosotros";
    }
    // Desde la agencia o la planilla: primero a la portada, y la sección se busca cuando ya está.
    if (!vista.enPortada) { setPendiente(id); vista.irALaPortada(); return; }
    irASeccion(id);
  };

  return {
    enAgencia: vista.enNosotros,
    conPagina,
    /** Ver el candado en useVistaTemplate: la raíz apaga sus clics mientras dura. */
    cambiando: vista.cambiandoPantalla,
    ir,
    irALaAgencia: vista.irANosotros,
    irALaPortada: vista.irALaPortada,
    hrefAgencia: `${vista.urlTienda}/nosotros${vista.sufijoEditor}`,
    /* La planilla de vehículos dentro del template (Drive, 16/10/26). Motor no la
       usa: su "Ver todos" sigue yendo a la página genérica. */
    enCatalogo: vista.enCatalogo,
    irAlCatalogo: vista.irAlCatalogo,
  };
}
