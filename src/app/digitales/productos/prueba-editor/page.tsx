import { notFound } from "next/navigation";
import PruebaEditor from "./PruebaEditor";

/**
 * Para mirar el editor del texto sin tener un ebook escrito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SÓLO EN DESARROLLO, Y CON DOS CANDADOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 1. `notFound()` fuera de desarrollo: en producción esta dirección contesta
 *    404 como cualquier otra que no existe.
 * 2. Y no pide sesión a propósito **porque no muestra nada de nadie**: el ebook
 *    está escrito a mano adentro del componente. Si algún día esta página
 *    llegara a leer algo de la base, el candado de arriba deja de alcanzar y
 *    hay que ponerle el de la sesión.
 *
 * Existe por un motivo concreto: la otra forma de ver esta pantalla era meter
 * un ebook falso en la base, que es la de PRODUCCIÓN — datos de alguien de
 * verdad, que quedan ahí hasta que uno se acuerde de borrarlos.
 *
 * Se abre en `/digitales/productos/prueba-editor`.
 *
 * ⚠️ Está adentro de `productos/` y eso es a propósito: un segmento fijo le
 * gana al `[id]` de al lado, así que ningún producto puede quedar tapado —los
 * id son cuid y ninguno se llama así— y la página hereda el panel, la barra
 * lateral y el tema oscuro, que es justo lo que hay que mirar.
 */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PruebaEditor />;
}
