/* ══════════════════════════════════════════════════════════════════════════
   CUÁNTOS ESTÁN MIRANDO LA PÁGINA AHORA
   ══════════════════════════════════════════════════════════════════════════

   El puntito verde del panel. Es una ayuda visual y nada más: sirve para
   saber que hay alguien del otro lado cuando se publica un anuncio.

   ── Qué NO guarda, y por qué importa ──────────────────────────────────────

   No guarda quién. No guarda cuándo. No hay una tabla, no hay una fila por
   visita y no queda registro de nadie en la base.

   Lo único que existe son dos contadores en Redis por producto —el medio
   minuto que corre y el anterior— que **se borran solos**. Y ni siquiera
   guardan la huella: un HyperLogLog no almacena los elementos, sólo
   lo que hace falta para estimar cuántos distintos hubo. O sea que aunque
   alguien leyera esa clave, no hay nada adentro que devuelva a una persona.

   ⚠️ Por eso mismo esto NO sirve para estadísticas y no se usa para ninguna:
   los números que se miran de verdad salen de `DigitalVisita`, que cuenta por
   día y sí se guarda. Esto es el cartelito, y se borra.

   ── Por qué dos ventanas y no "conectados de verdad" ──────────────────────

   Porque saber quién sigue con la pestaña abierta exige que la página avise
   cada tanto que sigue ahí (el latido de `VisitaDigital`). Con el latido cada
   20 segundos, dos ventanas de medio minuto alcanzan para que nadie parpadee
   y para que el que se fue desaparezca en menos de un minuto.

   ⚠️ ESE "MENOS DE UN MINUTO" ES EL PISO Y NO SE PUEDE BAJAR SIN COSTO. Nadie
   avisa cuando cierra la pestaña —el navegador no lo promete—, así que irse
   es dejar de latir, y dejar de latir sólo se nota cuando pasa el tiempo de
   las ventanas. Achicarlas más obliga a latir más seguido, o sea a escribir
   en Redis más seguido, por un cartelito. Acá se eligió el minuto.

   Este archivo es puro y lo importa el navegador: los plazos y las claves. Lo
   que toca Redis y la huella firmada vive en `mirando-ahora-servidor`.
   Probado en `mirando-ahora.check.ts`. */

/** Cuánto dura cada ventana. Con el latido cada 20 s, nadie parpadea. */
export const VENTANA_MS = 30_000;

/**
 * Cada cuánto avisa la página que sigue abierta.
 *
 * ⚠️ Tiene que ser MENOR que la ventana, y por un buen margen: si latiera
 * cada 30 s justos, quien entra en el segundo 29 de una ventana cae en la
 * siguiente recién 30 s después y desaparece del contador en el medio.
 */
export const LATIDO_MS = 20_000;

/** Cuánto vive la clave en Redis antes de borrarse sola, en segundos. */
export const VIDA_SEG = 90;

/**
 * Cada cuánto vuelve a preguntar el panel.
 *
 * ⚠️ Esto es lo que hace que el cartelito sea de AHORA. Sin volver a
 * preguntar, el número queda congelado en el momento en que se cargó la
 * pantalla: el que se fue sigue apareciendo hasta que alguien recargue, y un
 * cartel que dice "ahora" y no se mueve parece roto —porque lo está—.
 *
 * Va a la par del latido: preguntar más seguido no puede enterarse de nada
 * nuevo, porque nada nuevo se escribió.
 */
export const REFRESCO_DEL_PANEL_MS = LATIDO_MS;

/**
 * La clave de una ventana. Lleva la ventana adentro, así que al terminarse se
 * escribe en otra y la vieja se borra sola: nadie tiene que limpiar nada.
 */
export function claveDeVentana(productId: string, ahora: number): string {
  return `mirando:${productId}:${Math.floor(ahora / VENTANA_MS)}`;
}

/**
 * Las dos ventanas que se cuentan: la que corre y la anterior. Sin la
 * anterior, el contador caería a cero cada vez que cambia la ventana.
 */
export function ventanasVivas(productId: string, ahora: number): string[] {
  return [claveDeVentana(productId, ahora), claveDeVentana(productId, ahora - VENTANA_MS)];
}
