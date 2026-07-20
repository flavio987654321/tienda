// Versión de la app que corre en el navegador. PWAManager la compara contra la
// que el usuario tiene guardada y, si cambió, le muestra el avisito de "nueva
// versión disponible" (un toast chiquito y cerrable, no un cartel que tapa).
//
// Sale del commit deployado (ver BUILD_ID en next.config.ts), así que cambia
// sola en cada deploy. Antes eran dos números escritos a mano que había que
// acordarse de subir; si te lo olvidabas, quien tuviera una pestaña abierta
// nunca se enteraba de que había algo nuevo.
//
// Vale aclarar qué pasaba si te lo olvidabas, porque no era grave: el service
// worker no cachea el código de la app (es network-first y solo guarda la
// pantalla de "sin conexión"), así que nadie quedaba con una versión vieja
// pegada. Simplemente no veía lo nuevo hasta recargar.
//
// Dashboard y tienda comparten valor pero NO la clave de localStorage: son dos
// superficies distintas y cada una avisa por su lado.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export const DASHBOARD_VERSION = BUILD_ID;
export const STORE_VERSION = BUILD_ID;
