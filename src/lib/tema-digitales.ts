/* ══════════════════════════════════════════════════════════════════════════
   EL TEMA DEL PANEL DE PRODUCTOS DIGITALES
   ══════════════════════════════════════════════════════════════════════════

   Vive acá y no adentro de un componente porque lo tienen que compartir tres
   cosas que corren en momentos distintos: el script que pinta antes del primer
   dibujo, la pantalla de Configuración que lo deja elegir, y la barra lateral.
   Con la clave escrita a mano en cada lugar, cambiarla en uno la rompía en los
   otros dos sin que nadie se enterara. */

export const TEMAS = ["auto", "claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

/** Dónde se guarda. Sólo el navegador: es una preferencia de ESTE aparato. */
export const CLAVE_TEMA = "tema_digitales";

/** El atributo que lee la variante `panel-oscuro:` de `globals.css`. */
export const ATRIBUTO_TEMA = "data-panel-tema";

/** El tema que llega de donde sea, o `null`. Nunca un valor por defecto. */
export function temaDe(valor: unknown): Tema | null {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor)
    ? (valor as Tema)
    : null;
}

export const COPY_TEMA: Record<Tema, string> = {
  auto: "Automático",
  claro: "Claro",
  oscuro: "Oscuro",
};

/**
 * El script que pinta el tema ANTES del primer dibujo.
 *
 * Sin esto, entrar en oscuro es un flash blanco de pantalla completa y después
 * el fondo correcto: el HTML llega claro, React hidrata, recién ahí se lee la
 * preferencia. En una pantalla grande ese parpadeo es lo primero que se ve.
 *
 * Va como texto y se inyecta con `dangerouslySetInnerHTML` a propósito: tiene
 * que ejecutarse de forma sincrónica, antes de que el navegador pinte, y eso no
 * lo puede hacer ningún efecto de React.
 *
 * Todo adentro de un `try`: si el navegador tiene el almacenamiento bloqueado
 * —modo incógnito con restricciones, por ejemplo—, leerlo TIRA. Sin el `try`,
 * ese error corta el script y la página queda a medio pintar.
 *
 * Escribe el atributo y NADA MÁS. Las barras de scroll y los desplegables del
 * navegador salen del `color-scheme`, que lo pone `globals.css` colgado de este
 * mismo atributo: `next-themes` lo escribe en línea sobre `<html>` y en línea le
 * gana a cualquier JS que corra antes. Ver el comentario largo allá.
 */
export const SCRIPT_TEMA = `
(function(){try{
  var t = localStorage.getItem(${JSON.stringify(CLAVE_TEMA)}) || "auto";
  if (t !== "claro" && t !== "oscuro") {
    t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  }
  document.documentElement.setAttribute(${JSON.stringify(ATRIBUTO_TEMA)}, t);
}catch(e){
  document.documentElement.setAttribute(${JSON.stringify(ATRIBUTO_TEMA)}, "claro");
}})();
`.trim();

/** Lo que hay que pintar de verdad: "auto" se resuelve contra el sistema. */
export function resolverTema(t: Tema): "claro" | "oscuro" {
  if (t !== "auto") return t;
  if (typeof window === "undefined") return "claro";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

/** Aplica el tema al documento y lo guarda. */
export function aplicarTema(t: Tema): void {
  const resuelto = resolverTema(t);
  /* El atributo y nada más: el `color-scheme` —las barras de scroll, el menú de
     un `<select>`, el calendario de una fecha— cuelga de este mismo atributo
     desde `globals.css`. Escribirlo también acá era tener dos mecanismos para lo
     mismo, y el de acá perdía contra el estilo en línea de `next-themes` justo
     cuando más importa: al entrar. */
  document.documentElement.setAttribute(ATRIBUTO_TEMA, resuelto);
  try {
    localStorage.setItem(CLAVE_TEMA, t);
  } catch {
    /* Almacenamiento bloqueado: el tema vale para esta visita y se pierde al
       recargar. Es mejor que no poder cambiarlo. */
  }
}

/** El tema guardado, o "auto". */
export function temaGuardado(): Tema {
  try {
    return temaDe(localStorage.getItem(CLAVE_TEMA)) ?? "auto";
  } catch {
    return "auto";
  }
}

/**
 * Escucha los cambios de tema DEL SISTEMA y repinta, mientras la preferencia
 * guardada siga siendo "auto". Devuelve la función que corta la escucha.
 *
 * Hace falta porque `SCRIPT_TEMA` lee `prefers-color-scheme` UNA sola vez, antes
 * del primer dibujo, y ahí se queda. Windows y macOS pueden cambiar de tema
 * solos por horario: un panel abierto a las 19:00 se quedaba en claro toda la
 * noche, con el resto del sistema ya en oscuro.
 *
 * La preferencia de la persona gana siempre: si eligió "Claro" u "Oscuro" a
 * mano, esto no toca nada. Por eso se relee de `localStorage` en CADA aviso y no
 * se guarda en una variable al suscribirse — si no, elegir "Claro" y que después
 * anochezca te dejaba la pantalla oscura contra lo que pediste.
 */
export function escucharSistema(): () => void {
  if (typeof window === "undefined") return () => {};

  let mq: MediaQueryList;
  try {
    mq = window.matchMedia("(prefers-color-scheme: dark)");
  } catch {
    /* Mismo motivo que el `try` del script: hay navegadores donde esto tira.
       Sin la escucha el panel sigue andando; sólo no se entera de los cambios. */
    return () => {};
  }

  const alCambiar = () => {
    if (temaGuardado() === "auto") aplicarTema("auto");
  };

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }

  /* Safari anterior al 14 no tiene `addEventListener` en un MediaQueryList: sólo
     el `addListener` viejo, que sigue funcionando aunque esté marcado obsoleto. */
  const legado = mq as MediaQueryList & {
    addListener?: (cb: () => void) => void;
    removeListener?: (cb: () => void) => void;
  };
  legado.addListener?.(alCambiar);
  return () => legado.removeListener?.(alCambiar);
}
