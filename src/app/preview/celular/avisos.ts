/* Los avisos entre el editor de Diseño y la previa de celular. En un archivo
   aparte porque los usan las dos puntas, y una página no puede exportar nada más
   que su componente. */

/** Editor → previa: el borrador entero de la config, y si se está editando. */
export const AVISO_CONFIG = "previa-celular:config";
/** Previa → editor: "ya cargué, mandame la config". */
export const AVISO_LISTA = "previa-celular:lista";
/** Previa → editor: tocaron algo que cambia la config. Ver `LLAMADAS`. */
export const AVISO_LLAMADA = "previa-celular:llamada";

/**
 * Lo que la previa le puede pedir al editor: las funciones de `EditContext` que
 * cambian algo. Adentro del celular el template las llama como siempre, pero la
 * config vive en el editor, así que se le reenvían por nombre.
 *
 * Es una lista cerrada a propósito: el editor sólo ejecuta lo que figura acá.
 * Si mañana `EditContext` suma una función que cambia la config, va acá también.
 * Si no, en el celular ese botón no haría nada, y eso se lee como que está roto.
 */
export const LLAMADAS = [
  "setActiveField",
  "setOverride",
  "resetOverride",
  "setImageOverride",
  "setSectionColor",
  "toggleHiddenSection",
  "moveSection",
  "setHiddenSectionCelular",
] as const;
export type Llamada = (typeof LLAMADAS)[number];

/** Previa → editor: los textos que se pueden tocar, en el orden en que se ven. */
export const AVISO_INDICE = "previa-celular:indice";

/** Previa → editor: si alinear el texto elegido lo mueve de verdad. */
export const AVISO_ALINEABLE = "previa-celular:alineable";

/** Un renglón de la lista de textos del panel. */
export type ItemIndice = {
  field: string;
  label: string;
  /** El nombre del bloque donde está (la chapita). `null` = arriba de todo. */
  bloque: string | null;
  /** Lo que dice hoy: para reconocerlo en la lista sin tener que buscarlo. */
  texto: string;
  /** El que trae el diseño, aunque ya se haya cambiado: arranca la caja del panel. */
  original: string;
  /** Cuántos renglones ocupa en el celular, y el tamaño de la letra en px. */
  renglones: number;
  tamano: number;
};

/** Un título "largo" en el celular: letra grande que ocupa cuatro renglones o
 *  más. No se mide por alto: los títulos de portada son enormes a propósito
 *  (Boho Terra: tres renglones a 52 px de fábrica), y un aviso que salta sobre el
 *  diseño tal como viene haría creer que el template está mal. */
export const esLargo = (it: Pick<ItemIndice, "renglones" | "tamano">) => it.tamano >= 20 && it.renglones >= 4;

/** Lo que el editor le cuenta a la previa cuando se está editando. */
export type Edicion = {
  activeField: string | null;
  activeLabel: string | null;
  imageLoading: Record<string, boolean>;
};
