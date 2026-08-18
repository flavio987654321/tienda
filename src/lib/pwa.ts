// Browser-only — import only from client components ("use client").

/* Hay DOS preguntas parecidas y no son la misma. Elegir mal la respuesta no
 * rompe nada visible, que es justo lo peligroso.
 *
 *   esAppInstalada()  — ¿esto CORRE adentro de la app instalada?
 *                       Se lo pregunta el navegador y no se puede falsear.
 *
 *   isPwa()           — lo mismo, pero además le cree al `?source=pwa` de la url.
 *                       Más permisiva, y por lo tanto falseable por cualquiera.
 *
 * La regla: si de la respuesta sale algo que se GUARDA o que cambia un flujo,
 * va la estricta. Para decidir cuántos milisegundos esperar antes de animar algo,
 * la permisiva alcanza y sobra.
 */

/** Los modos en los que el navegador dice que esto es una app y no una pestaña. */
const MODOS_APP = ["standalone", "fullscreen", "minimal-ui"];

/**
 * ¿Está corriendo como app instalada? Sin atajos.
 *
 * Mira solamente lo que reporta el navegador: `display-mode` (y `navigator
 * .standalone`, que es como lo contesta iOS). Nada de esto lo puede escribir
 * quien arma un link.
 */
export function esAppInstalada(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return MODOS_APP.some((m) => window.matchMedia(`(display-mode: ${m})`).matches);
}

/**
 * Igual que la de arriba, pero acepta también el `?source=pwa` de la url.
 *
 * Ese parámetro lo pone el `start_url` del manifest y los links de las
 * notificaciones, así que sirve como red de seguridad cuando `display-mode`
 * todavía no contestó. Pero es texto en una dirección: **cualquiera puede
 * pegarlo**. Si alguien comparte `…/tienda/x?source=pwa` en un grupo, todos los
 * que entren desde ahí se declaran "app instalada".
 *
 * NO USAR para nada que se escriba en la base ni que decida a dónde va una
 * persona. Pasó: la métrica de visitas se colgó de acá y un link compartido
 * habría inflado el número de "App instalada" —el número que justamente mide si
 * el premium sirve—. Para eso está `esAppInstalada`.
 *
 * Queda para lo cosmético: cuánto esperar antes de mostrar un cartel, si conviene
 * una animación de entrada. Ahí equivocarse no cuesta nada.
 */
export function isPwa(): boolean {
  if (typeof window === "undefined") return false;
  if (esAppInstalada()) return true;
  return new URLSearchParams(window.location.search).get("source") === "pwa";
}

/**
 * ¿Es un iPhone o un iPad?
 *
 * Importa más de lo que parece: en iOS las notificaciones web SOLO funcionan si
 * la app está instalada en la pantalla de inicio (iOS 16.4+). Es una regla de
 * Apple, no algo que podamos rodear. Sin instalar, pedir el permiso no sirve de
 * nada: el navegador ni siquiera muestra el diálogo.
 *
 * El iPad moderno se declara "MacIntel" en el user agent, así que sin mirar
 * `maxTouchPoints` se cuela como escritorio. Estaba escrito así dentro de
 * `PwaInstallBanner`; se movió acá cuando el panel necesitó la misma pregunta,
 * para no tener dos definiciones que un día digan cosas distintas.
 */
export function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
