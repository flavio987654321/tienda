/* Las letras de la página de venta.
 *
 * ── Por qué acá y no en el layout ───────────────────────────────────────────
 *
 * `--font-marca` (Figtree) vive en el layout de la plataforma y la usa todo el
 * sitio. Estas dos son SÓLO de la página de venta: no tiene sentido que el panel
 * las cargue.
 *
 * ── Por qué `preload: false` ────────────────────────────────────────────────
 *
 * Con el preload puesto —que es lo de fábrica— el navegador se baja las DOS
 * fuentes en toda página de venta, use la que use. Son dos archivos que casi
 * siempre sobran, en la pantalla donde cada milésima cuenta porque es la que
 * decide si compran.
 *
 * Sin preload, el `@font-face` igual queda declarado y el navegador se baja
 * únicamente la que de verdad aparece en pantalla. Con `display: "swap"` el
 * texto se lee desde el primer momento con la letra de reserva.
 *
 * ⚠️ `next/font` las sirve desde nuestro dominio: el navegador de quien compra
 * nunca le pega a Google, así que Google no se entera de quién entró a la
 * página. Es el mismo motivo por el que la marca se carga así.
 */
import { Lora, Outfit } from "next/font/google";

/** La serif de "Clásica". Variable: todo el rango de peso en un archivo. */
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pv-serif",
});

/** La geométrica de "Marcada". También variable. */
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pv-geo",
});

/**
 * Las dos declaradas juntas, para colgar de la página.
 *
 * Van las dos SIEMPRE y no la elegida, a propósito: la previa del editor cambia
 * de letra sin recargar, y para eso las dos variables tienen que existir ya. Lo
 * que decide cuál se ve es `--pv-letra`, que es puro CSS. Como no hay preload,
 * declararlas no baja nada: se baja la que se dibuja.
 */
export const CLASES_FUENTES = `${lora.variable} ${outfit.variable}`;
