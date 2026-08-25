// Cuánto texto entra en cada cosa editable de un template.
//
// ── El problema, medido ──────────────────────────────────────────────────────
// Había UN tope para todo: 500 letras, lo mismo para un párrafo que para el
// botón "Ver productos". Se probó en el navegador metiendo 500 letras en cada
// campo de Aire, en PC y en celular:
//
//     heroHeading   con 500 letras  →  un título de 1763px de alto
//     contactoTitulo                →  1338px
//     nosotrosTitulo                →  1000px
//     heroCta       (un BOTÓN)      →  156px de alto
//
// Nada de eso "rompe" en el sentido de tirar un error: la página sigue en pie y
// el texto se ve entero. Pero un botón de 156px de alto no es un botón, y un
// título de dos pantallas de alto no es un título — la dueña estaría destruyendo
// su propio diseño sin que nada le avise.
//
// ── Por qué por patrón y no una lista de los 80 campos ───────────────────────
// Son 80 campos repartidos en once templates, y cada template nuevo trae más.
// Una lista a mano se desactualiza al primer template que se agregue, y encima
// en silencio: el campo nuevo caería en el tope de 500 y nadie se entera. Los
// nombres ya siguen una convención pareja en los once (`heroCta`,
// `contactHeading`, `aboutKicker`, `nosotrosParrafo1`), así que la convención es
// lo que se lee.
//
// Los que no entran en ninguna convención están abajo, a mano y explicados.
//
// ── Dónde se aplica ──────────────────────────────────────────────────────────
// En el PANEL del editor: frena mientras se escribe y avisa cuánto falta.
//
// A propósito NO se aplica en el servidor. El servidor sigue con su tope de 500
// para todos, que es el que impide el abuso. Si acá se bajara también el del
// servidor, cualquier tienda que hoy tenga un texto más largo que el tope nuevo
// no podría volver a guardar NADA hasta acortarlo — y el aviso hablaría de un
// campo que ella no está tocando. Estos topes son una guía de diseño, no una
// defensa: el que se defiende es el de 500.

/** Un botón. Más de esto deja de parecer un botón. */
export const TOPE_BOTON = 40;
/** Una etiqueta chiquita: un cartelito, un "ver todo", un número suelto. */
export const TOPE_ETIQUETA = 40;
/** Un título. Dos renglones largos en PC. */
export const TOPE_TITULO = 90;
/** Una bajada: la frase que acompaña al título. */
export const TOPE_BAJADA = 200;
/** Un párrafo de verdad. Es el tope que ya existía, y para esto sí está bien. */
export const TOPE_PARRAFO = 500;

/* Los que no siguen la convención de nombres, con el motivo. */
const A_MANO: Record<string, number> = {
  /* Es una sola línea que cruza la pantalla de lado a lado, arriba de todo.
     Termina en "Text" pero no es un párrafo. */
  announcementText: 120,
  /* Una línea al pie. */
  footerCopyright: 120,
  footerMadeIn: 60,
  trustLine: 120,
  /* El nombre de la tienda entra en la barra, al lado del logo. */
  storeName: 60,
  footerBrandName: 60,
  /* Datos de contacto: un mail, un teléfono. */
  contactEmail: 80,
  contactPhone: 40,
  contactWhatsApp: 40,
};

/* Cada regla es un pedazo del NOMBRE del campo y el tope que le toca.

   SE PRUEBAN EN ORDEN Y GANA LA PRIMERA, y el orden no es cosmetico:

     · "Cta" va antes que "Title" para que un `masVistoCta` sea un boton.
     · La BAJADA va antes que el TITULO porque "subtitle" contiene "title".
       Con el orden al reves, `pruebaSocialSubtitle` quedaba tratado como un
       titulo y se le cortaba a 90 letras una bajada que necesita 200. Lo agarro
       la prueba de este archivo, no la lectura: leyendo las dos lineas parecen
       independientes. */
const POR_NOMBRE: [RegExp, number][] = [
  [/cta$|cta[A-Z]|boton|button/i,                        TOPE_BOTON],
  [/badge|label|viewall|anios|stat\d|statlabel/i,        TOPE_ETIQUETA],
  [/kicker|subtext|bajada|tagline|subtitle|subtitulo/i,  TOPE_BAJADA],
  [/heading|titulo|title/i,                              TOPE_TITULO],
];

/**
 * Cuántas letras entran en este campo.
 *
 * Lo que no cae en ninguna regla queda en 500, que es el tope de siempre: un
 * campo desconocido es casi siempre un párrafo, y equivocarse para el lado de
 * dejar escribir de más es mucho menos molesto que cortarle el texto a alguien
 * en la mitad de una frase.
 */
export function topeDelTexto(field: string): number {
  if (field in A_MANO) return A_MANO[field];
  for (const [regla, tope] of POR_NOMBRE) if (regla.test(field)) return tope;
  return TOPE_PARRAFO;
}

/** Cómo se llama esto en castellano, para poder decírselo a la dueña. */
export function nombreDelTope(tope: number): string {
  if (tope <= TOPE_BOTON) return "un botón";
  if (tope <= TOPE_TITULO) return "un título";
  if (tope <= TOPE_BAJADA) return "una bajada";
  return "un párrafo";
}
