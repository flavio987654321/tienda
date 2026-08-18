/**
 * Qué contraseña se acepta. Una sola definición, para los tres lugares.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────────
 * La regla estaba escrita tres veces —el formulario de registro, el de cambiar
 * contraseña, y la API de registro— y las tres decían cosas distintas:
 *
 *   registro (formulario)  → mínimo 6
 *   cambiar contraseña     → mínimo 6
 *   registro (API)         → NINGÚN mínimo
 *
 * O sea que el navegador frenaba a quien escribiera `abc`, pero cualquiera que
 * le mandara el pedido directo a la API —sin pasar por el formulario— podía
 * crear una cuenta con una contraseña de un solo carácter. Lo que valida el
 * navegador no protege nada: el que ataca no usa el navegador.
 *
 * Con la regla en un solo lado, agregarle una condición mañana la agrega en los
 * tres a la vez, y no puede volver a pasar que uno quede atrás.
 *
 * ── El largo ────────────────────────────────────────────────────────────────
 * El mínimo pasó de 6 a 8. Seis caracteres se prueban por fuerza bruta en un
 * rato; ocho no es el paraíso pero cambia el orden de magnitud, y es el piso que
 * recomienda todo el mundo hoy.
 *
 * El máximo de 72 no es un capricho: es el límite de bcrypt, que es lo que usa
 * Supabase por debajo, y se mide en BYTES y no en caracteres. Una contraseña con
 * acentos o emojis gasta más de un byte por letra, así que contando caracteres
 * podía pasar una de 72 letras que en realidad ocupa 90 bytes — y ahí el error
 * lo tiraba Supabase, en inglés y sin explicar nada.
 */

export const LARGO_MINIMO = 8;
export const LARGO_MAXIMO_BYTES = 72;

/* Las que están primeras en cualquier lista de las más usadas del mundo, más las
   obvias de esta plataforma. No reemplaza a la lista de contraseñas filtradas de
   verdad (la de Supabase, que se prende aparte y tiene cientos de millones):
   esto es el piso, gratis y del lado nuestro, para que las peores no entren ni
   aunque esa opción esté apagada.
   Se compara en minúsculas y sin espacios, así que `Password123 ` tampoco pasa. */
const DEMASIADO_COMUNES = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "password123",
  "qwerty123", "qwertyui", "11111111", "00000000", "abc12345", "iloveyou",
  "princesa", "argentina", "bocajuniors", "riverplate", "contrasena", "contraseña",
  "administrador", "administrator", "bienvenido", "tiendaapps", "tienda123",
  "12345678910", "1q2w3e4r", "asdasdasd", "12341234", "qwe123456",
]);

/**
 * `null` si la contraseña sirve, o el motivo para mostrarle a la persona.
 *
 * Recibe `unknown` a propósito: del lado del servidor lo que llega es lo que
 * mandó cualquiera, y puede no ser ni texto.
 */
export function validarContrasena(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0) {
    return "Ingresá una contraseña.";
  }

  if (valor.length < LARGO_MINIMO) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`;
  }

  // En bytes, no en caracteres: ver el comentario de arriba sobre bcrypt.
  if (new TextEncoder().encode(valor).length > LARGO_MAXIMO_BYTES) {
    return "La contraseña es demasiado larga.";
  }

  if (DEMASIADO_COMUNES.has(valor.trim().toLowerCase())) {
    return "Esa contraseña es de las más usadas del mundo y ya está en las listas que prueban los robots. Elegí otra.";
  }

  /* Un solo carácter repetido pasa el largo pero no vale nada: `aaaaaaaa` tiene
     ocho caracteres y se adivina en el primer intento. */
  if (new Set(valor).size === 1) {
    return "La contraseña no puede ser un mismo carácter repetido.";
  }

  return null;
}
