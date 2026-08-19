/**
 * Si en la pantalla que se está mirando hay algo escrito y todavía sin guardar.
 *
 * ── Por qué hace falta que alguien más lo sepa ───────────────────────────────
 * `UnsavedChangesGuard` se monta en las pantallas donde se está llenando un
 * formulario largo —cargar un producto, editar el diseño— y frena cualquier link
 * para preguntar antes de que se pierda el borrador. Frena TODOS menos los que
 * abren en otra pestaña, porque esos no se llevan la pantalla puesta.
 *
 * El `?` de la barra es justamente el link que no se puede frenar. Alguien que
 * está a mitad de cargar un producto y toca "Ayuda de esta pantalla" no está
 * abandonando el formulario: fue a buscar cómo seguir llenándolo. Mandarlo a
 * elegir entre leer la ayuda o conservar lo que escribió es ofrecerle ayuda con
 * un costo, y en el único momento en que de verdad la necesita.
 *
 * Así que el guard cuelga una marca del `<body>` mientras hay borrador, y el
 * botón de ayuda la lee para decidir si abre aparte. Va por el DOM y no por un
 * contexto de React porque los dos no comparten árbol: el guard lo monta cada
 * pantalla y el `?` vive en la barra del panel, arriba de todas.
 *
 * Lo importante es que se mantiene solo. Cualquier pantalla que mañana monte el
 * guard queda cubierta sin tocar el botón de ayuda — que es lo que evita una
 * lista de rutas escrita a mano, condenada a quedar vieja.
 */
const ATRIBUTO = "cambiosSinGuardar";

/**
 * La pone mientras hay borrador. Devuelve la función que la saca, para usarla
 * directo como limpieza de un `useEffect`.
 */
export function marcarCambiosSinGuardar(): () => void {
  if (typeof document === "undefined") return () => {};
  document.body.dataset[ATRIBUTO] = "1";
  return () => {
    delete document.body.dataset[ATRIBUTO];
  };
}

/** Se lee en el momento del clic, que es cuando la respuesta importa. */
export function hayCambiosSinGuardar(): boolean {
  return typeof document !== "undefined" && document.body.dataset[ATRIBUTO] === "1";
}
