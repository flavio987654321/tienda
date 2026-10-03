/* ══════════════════════════════════════════════════════════════════════════
   EL TEMA DEL PANEL DE TIENDAS
   ══════════════════════════════════════════════════════════════════════════

   El mismo mecanismo que `tema-digitales` —el mismo atributo, así que la misma
   variante `panel-oscuro:` de `globals.css`—, con su PROPIA preferencia
   guardada: quien tiene las dos cuentas puede querer el panel de la tienda
   claro y el de digitales oscuro, y son aparatos distintos muchas veces.

   ══════════════════════════════════════════════════════════════════════════
   ⚠️ PRENDIDO DESDE EL 03/10/26, CON UN INTERRUPTOR DE EMERGENCIA
   ══════════════════════════════════════════════════════════════════════════

   Se pasó pantalla por pantalla con el tema apagado y se prendió con todas
   pasadas y auditadas. Si algo se ve mal en oscuro y hay que volver atrás ya,
   `NEXT_PUBLIC_TIENDAS_OSCURO=0` en Vercel lo apaga: sin el atributo, ninguna
   clase `panel-oscuro:` hace nada y el panel queda claro como siempre. Ojo:
   es NEXT_PUBLIC, así que el valor queda fijo al armar la versión — cambiarlo
   pide volver a subir. */

import { ATRIBUTO_TEMA, resolverTema, temaDe, type Tema } from "@/lib/tema-digitales";

export { ATRIBUTO_TEMA, TEMAS, COPY_TEMA, type Tema } from "@/lib/tema-digitales";

/** Si el modo oscuro del panel de tiendas ya se puede usar. Ver arriba. */
export const OSCURO_TIENDAS_LISTO = process.env.NEXT_PUBLIC_TIENDAS_OSCURO !== "0";

/** Dónde se guarda. Sólo el navegador: es una preferencia de ESTE aparato. */
export const CLAVE_TEMA_TIENDAS = "tema_tiendas";

/** El aviso de "cambió el tema", para que la luna se entere. */
export const EVENTO_TEMA_TIENDAS = "tema-tiendas";

/** El script que pinta antes del primer dibujo. Ver `SCRIPT_TEMA` en digitales. */
export const SCRIPT_TEMA_TIENDAS = `
(function(){try{
  var t = localStorage.getItem(${JSON.stringify(CLAVE_TEMA_TIENDAS)}) || "claro";
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

/**
 * El tema guardado, o "claro" si nunca eligió.
 *
 * ⚠️ Claro y no "auto" a propósito (pedido de Flavio, 03/10/26): el panel de
 * tiendas arranca SIEMPRE claro, aunque el teléfono o la compu estén en modo
 * oscuro. El oscuro es para quien lo elige con la luna. Digitales, en cambio,
 * sigue al sistema.
 */
export function temaGuardadoTiendas(): Tema {
  try {
    return temaDe(localStorage.getItem(CLAVE_TEMA_TIENDAS)) ?? "claro";
  } catch {
    return "claro";
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
