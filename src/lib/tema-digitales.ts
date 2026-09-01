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
  document.documentElement.setAttribute(ATRIBUTO_TEMA, resuelto);
  /* `color-scheme` no es decorativo: es lo que hace que las barras de scroll,
     los menús de un `<select>` y el calendario de una fecha salgan oscuros. Sin
     esto, adentro de un panel oscuro se abre un desplegable blanco. */
  document.documentElement.style.colorScheme = resuelto === "oscuro" ? "dark" : "light";
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
