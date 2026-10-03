/* ══════════════════════════════════════════════════════════════════════════
   EL TEMA DEL PANEL DE TIENDAS
   ══════════════════════════════════════════════════════════════════════════

   El mismo mecanismo que `tema-digitales` —el mismo atributo, así que la misma
   variante `panel-oscuro:` de `globals.css`—, con su PROPIA preferencia
   guardada: quien tiene las dos cuentas puede querer el panel de la tienda
   claro y el de digitales oscuro, y son aparatos distintos muchas veces.

   ══════════════════════════════════════════════════════════════════════════
   ⚠️ APAGADO HASTA QUE ESTÉN TODAS LAS PANTALLAS (03/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Se va pasando pantalla por pantalla. Una pantalla a medio pasar en oscuro se
   ve peor que el panel claro de siempre, así que mientras falten, el tema NO
   se aplica: sin el atributo, ninguna clase `panel-oscuro:` hace nada y el
   panel queda exactamente como estaba. Se prende con
   `NEXT_PUBLIC_TIENDAS_OSCURO=1`, que es lo que se usa para probar en local. */

import { ATRIBUTO_TEMA, resolverTema, temaDe, type Tema } from "@/lib/tema-digitales";

export { ATRIBUTO_TEMA, TEMAS, COPY_TEMA, type Tema } from "@/lib/tema-digitales";

/** Si el modo oscuro del panel de tiendas ya se puede usar. Ver arriba. */
export const OSCURO_TIENDAS_LISTO = process.env.NEXT_PUBLIC_TIENDAS_OSCURO === "1";

/** Dónde se guarda. Sólo el navegador: es una preferencia de ESTE aparato. */
export const CLAVE_TEMA_TIENDAS = "tema_tiendas";

/** El aviso de "cambió el tema", para la luna y para el selector de Ajustes. */
export const EVENTO_TEMA_TIENDAS = "tema-tiendas";

/** El script que pinta antes del primer dibujo. Ver `SCRIPT_TEMA` en digitales. */
export const SCRIPT_TEMA_TIENDAS = `
(function(){try{
  var t = localStorage.getItem(${JSON.stringify(CLAVE_TEMA_TIENDAS)}) || "auto";
  if (t !== "claro" && t !== "oscuro") {
    t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  }
  document.documentElement.setAttribute(${JSON.stringify(ATRIBUTO_TEMA)}, t);
}catch(e){
  document.documentElement.setAttribute(${JSON.stringify(ATRIBUTO_TEMA)}, "claro");
}})();
`.trim();

/** Aplica el tema al documento, lo guarda y avisa. */
export function aplicarTemaTiendas(t: Tema): void {
  document.documentElement.setAttribute(ATRIBUTO_TEMA, resolverTema(t));
  try {
    localStorage.setItem(CLAVE_TEMA_TIENDAS, t);
  } catch {
    /* Almacenamiento bloqueado: vale para esta visita. */
  }
  try {
    window.dispatchEvent(new Event(EVENTO_TEMA_TIENDAS));
  } catch {
    /* Sin eventos, el otro selector se entera al volver a dibujarse. */
  }
}

/** El tema guardado, o "auto". */
export function temaGuardadoTiendas(): Tema {
  try {
    return temaDe(localStorage.getItem(CLAVE_TEMA_TIENDAS)) ?? "auto";
  } catch {
    return "auto";
  }
}

/**
 * Sigue los cambios de tema DEL SISTEMA mientras la preferencia sea "auto".
 * Devuelve la función que corta la escucha. Ver `escucharSistema` en digitales,
 * que explica por qué se relee la preferencia en cada aviso.
 */
export function escucharSistemaTiendas(): () => void {
  if (typeof window === "undefined") return () => {};
  let mq: MediaQueryList;
  try {
    mq = window.matchMedia("(prefers-color-scheme: dark)");
  } catch {
    return () => {};
  }
  const alCambiar = () => {
    if (temaGuardadoTiendas() === "auto") aplicarTemaTiendas("auto");
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }
  const legado = mq as MediaQueryList & {
    addListener?: (cb: () => void) => void;
    removeListener?: (cb: () => void) => void;
  };
  legado.addListener?.(alCambiar);
  return () => legado.removeListener?.(alCambiar);
}
