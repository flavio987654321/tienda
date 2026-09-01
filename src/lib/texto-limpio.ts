/**
 * Texto que llega de afuera, listo para guardar.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 * La regla estaba escrita adentro de `/api/perfil` y en ningún lado más. O sea
 * que el nombre que esa ruta limpiaba se podía guardar sucio entrando por la
 * puerta de al lado —Configuración o Productos— y quedaba así en la base.
 *
 * Es el mismo agujero que ya tuvimos con el teléfono y con los IDs de medición,
 * y siempre por el mismo motivo: dos copias de una regla se desincronizan de a
 * una, y la que se queda vieja es la que nadie mira.
 *
 * ── Qué saca, y por qué importa ──────────────────────────────────────────────
 * Los caracteres de control. **Nadie los escribe a mano**: llegan pegados desde
 * otro lado. Y hacen daño de tres formas distintas:
 *
 *   - Un **salto de línea** adentro de un nombre se arrastra a los mails y a sus
 *     encabezados, donde una línea nueva puede separar un encabezado del
 *     siguiente.
 *   - El **byte nulo** rompe Postgres, que no lo acepta adentro de un texto: el
 *     guardado falla con un error que nadie sabe leer.
 *   - Los demás son invisibles, así que en pantalla el texto se ve igual y en la
 *     base hay otra cosa.
 */

/** Los caracteres de control, que se reemplazan por un espacio. */
const CONTROL = /[\u0000-\u001F\u007F]/g;

/**
 * El texto limpio y recortado, o `null` si no quedó nada.
 *
 * Se limpia ANTES de medir: si no, un texto de puros caracteres invisibles
 * pasaría cualquier largo mínimo y quedaría guardado como si fuera algo. Y se
 * recorta antes del último `trim()`, porque el corte puede dejar un espacio
 * colgando al final.
 */
export function limpiarTexto(valor: unknown, tope: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(CONTROL, " ").trim().slice(0, tope).trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * Igual, pero distingue "no vino" de "vino vacío".
 *
 * `undefined` quiere decir "de este campo no te estoy hablando" y `null` quiere
 * decir "borralo". Un PATCH parcial necesita esa diferencia: sin ella, no mandar
 * un campo y mandarlo vacío harían lo mismo.
 */
export function campoTexto(valor: unknown, tope: number): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string") return undefined;
  return limpiarTexto(valor, tope);
}
