/**
 * Qué forma tiene un ID de medición. Una sola definición, para todos los lugares.
 *
 * ── Por qué está acá y no adentro de la pantalla que lo usa ──────────────────
 * Estos dos valores salen de un campo de texto libre que completa el vendedor y
 * terminan **interpolados literalmente adentro de un `<script>`** de una página
 * pública. Si la validación viviera en un solo lado, la otra puerta de entrada
 * quedaría sin ella — que es exactamente lo que pasó con el teléfono, y por eso
 * existe `telefono.ts`.
 *
 * Las usa `StoreTrackingScripts` (que es quien inyecta) y la Configuración de
 * Productos Digitales (que es quien deja escribirlas). Copiadas se
 * desincronizan de a una, y acá desincronizarse quiere decir que un lado acepta
 * lo que el otro va a meter adentro de un `<script>`.
 */

/** Google Analytics 4: `G-` y letras o números. Los `UA-` viejos ya no miden. */
export const GA_ID_RE = /^G-[A-Z0-9]+$/i;

/** Meta: el píxel es un número largo, nada más. */
export const PIXEL_ID_RE = /^\d{10,20}$/;

/** El tope de la columna donde se guardan (`storeConfig.analytics`). */
export const LARGO_ID_MEDICION = 30;

/**
 * `null` si el ID de Google Analytics sirve; el problema en castellano si no.
 *
 * El vacío es válido: es opcional, y borrarlo es una respuesta legítima.
 */
export function validarGaId(valor: unknown): string | null {
  if (typeof valor !== "string") return "El ID de Google Analytics no es válido";
  const v = valor.trim();
  if (v.length === 0) return null;
  if (v.length > LARGO_ID_MEDICION) return "Ese ID es demasiado largo";
  if (!GA_ID_RE.test(v)) return 'El ID de Google Analytics empieza con "G-". Ejemplo: G-XXXXXXX';
  return null;
}

/**
 * Microsoft Clarity: letras y números, sin guiones.
 *
 * Clarity da grabaciones de pantalla y mapas de calor **gratis y sin límite**.
 * En una página de venta eso vale más que cualquier número: se ve a la persona
 * bajar y dónde se planta.
 */
export const CLARITY_ID_RE = /^[a-z0-9]{6,20}$/i;

/**
 * El Project ID de Clarity, aunque hayan pegado el script entero.
 *
 * Clarity no te muestra el ID pelado en ningún lado cómodo: lo que te da para
 * copiar es un bloque de `<script>` de diez líneas. Pedirle a alguien que
 * busque el pedacito de adentro es pedirle que haga a mano algo que podemos
 * hacer nosotros — y el primero que se equivoque va a pegar el script igual.
 *
 * En el script, el ID es el último argumento de la función:
 *
 *     })(window, document, "clarity", "script", "abc123def4");
 */
export function extraerClarityId(valor: string): string {
  const v = valor.trim();
  const delScript = v.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]+)["']/i);
  if (delScript) return delScript[1];
  return v;
}

/** `null` si el Project ID de Clarity sirve; el problema en castellano si no. */
export function validarClarityId(valor: unknown): string | null {
  if (typeof valor !== "string") return "El Project ID no es válido";
  const v = extraerClarityId(valor);
  if (v.length === 0) return null;
  if (v.length > LARGO_ID_MEDICION) return "Ese Project ID es demasiado largo";
  if (!CLARITY_ID_RE.test(v)) {
    return "Pegá el Project ID de Clarity, o el script de instalación entero y lo sacamos nosotros";
  }
  return null;
}

/** `null` si el ID del píxel de Meta sirve; el problema en castellano si no. */
export function validarPixelId(valor: unknown): string | null {
  if (typeof valor !== "string") return "El ID del píxel no es válido";
  const v = valor.trim();
  if (v.length === 0) return null;
  if (v.length > LARGO_ID_MEDICION) return "Ese ID es demasiado largo";
  if (!PIXEL_ID_RE.test(v)) return "El ID del píxel de Meta son sólo números (entre 10 y 20)";
  return null;
}
