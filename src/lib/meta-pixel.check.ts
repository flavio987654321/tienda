/**
 * Chequeos del pixel de plataforma. Se corre a mano (necesita la env var, así
 * que va con dotenv como el CLI de Prisma):
 *
 *   npx dotenv -e .env.local -- npx tsx src/lib/meta-pixel.check.ts
 *
 * Lo que se está protegiendo acá es que el pixel de plataforma NUNCA se cargue
 * en una ruta donde ya vive el pixel de un comerciante. Si eso pasa, los dos
 * pixeles quedan inicializados en la misma página y `fbq('track')` le pega a
 * los dos: el `Purchase` del comprador de una tienda ajena —con monto y email
 * hasheado— entra a nuestra cuenta de anuncios. El motivo largo está arriba de
 * RUTAS_EXCLUIDAS_PIXEL en `meta-pixel.ts`.
 *
 * El caso que más fácil se rompe es /tiendas: comparar prefijos con un
 * startsWith pelado lo excluiría por parecerse a /tienda, y perderíamos el
 * directorio público, que sí es una página de plataforma.
 */

import { pixelHabilitadoEn, META_PIXEL_ID } from "./meta-pixel";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) {
    console.log(`  ok   ${titulo}`);
  } else {
    fallos++;
    console.log(`  FALLA ${titulo}`, detalle ?? "");
  }
};

if (!META_PIXEL_ID) {
  console.error(
    "Falta NEXT_PUBLIC_FACEBOOK_PIXEL_ID — corré con:\n" +
    "  npx dotenv -e .env.local -- npx tsx src/lib/meta-pixel.check.ts"
  );
  process.exit(1);
}

// Las únicas rutas del proyecto donde StoreTrackingScripts monta el pixel del
// comerciante, más el resto de la superficie de tienda de cara al comprador.
console.log("\nRutas de comerciante / comprador final — el pixel NO debe cargar:");
for (const ruta of [
  "/tienda/mi-tienda",
  "/tienda/mi-tienda/producto/abc123",
  "/tienda/mi-tienda/productos",
  "/tienda/mi-tienda/politicas",
  "/tienda/mi-tienda/vehiculos",
  "/seguimiento",
  "/seguimiento/ABC123",
  "/v/afiliado1/producto1",
  // Canasta Solidaria: una familia pidiendo asistencia no queda marcada en el
  // sistema publicitario. /soporte es el formulario donde se pide la ayuda.
  "/canasta",
  "/canasta/donar",
  "/canasta/soporte",
  "/canasta/campana",
  "/canasta/terminos",
  "/canasta/seguimiento/abc123",
  // La página de venta de un producto digital, su checkout y su gracias: ahí
  // vive el píxel de la vendedora. Hasta el 15/09/26 no estaban acá.
  "/p/ckabc123",
  "/p/ckabc123/pagar",
  "/p/ckabc123/gracias",
]) {
  chequear(ruta, pixelHabilitadoEn(ruta) === false);
}

console.log("\nRutas de plataforma — el pixel SÍ debe cargar:");
for (const ruta of [
  "/",
  "/login",
  "/registro",
  "/precios",
  "/preview/aurora",
  "/dashboard",
  "/dashboard/productos/nuevo",
  "/afiliados",
  "/mi-cuenta",
  "/panel",
  "/admin",
  "/comunidad",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/quienes-somos",
  "/diseno-propio",
  "/newsletter",
  "/verificar-2fa",
  "/actualizar-contrasena",
]) {
  chequear(ruta, pixelHabilitadoEn(ruta) === true);
}

console.log("\nPrefijos que se parecen pero NO son rutas de tienda:");
chequear("/tiendas (directorio público)", pixelHabilitadoEn("/tiendas") === true);
chequear("/tiendas/destacadas", pixelHabilitadoEn("/tiendas/destacadas") === true);
chequear("/verificar-2fa (empieza con /v)", pixelHabilitadoEn("/verificar-2fa") === true);
chequear("/videos (empieza con /v)", pixelHabilitadoEn("/videos") === true);
// Hoy no existe ninguna ruta /canasta*, pero si mañana se agrega una que
// arranque igual sin ser la Canasta, tiene que seguir contando como plataforma.
chequear("/canastas", pixelHabilitadoEn("/canastas") === true);
chequear("/canasta-regalo", pixelHabilitadoEn("/canasta-regalo") === true);
chequear("/seguimientos", pixelHabilitadoEn("/seguimientos") === true);

// Con el host: un subdominio o un dominio propio llegan reescritos y el
// navegador ve "/". Sólo el host dice que la página es de una vendedora.
process.env.NEXT_PUBLIC_APP_URL = "https://www.tiendaapps.com";
console.log("\nPor host — en un dominio que no es el nuestro, el pixel NO debe cargar:");
chequear("/ en mitienda.tiendaapps.com (subdominio)", pixelHabilitadoEn("/", "mitienda.tiendaapps.com") === false);
chequear("/ en midominio.com.ar (dominio propio)", pixelHabilitadoEn("/", "midominio.com.ar") === false);
chequear("/pagar en midominio.com.ar", pixelHabilitadoEn("/pagar", "midominio.com.ar") === false);
console.log("\nPor host — en el nuestro sí:");
chequear("/precios en www.tiendaapps.com", pixelHabilitadoEn("/precios", "www.tiendaapps.com") === true);
chequear("/precios en tiendaapps.com (apex)", pixelHabilitadoEn("/precios", "tiendaapps.com") === true);
chequear("/ en localhost:3000", pixelHabilitadoEn("/", "localhost:3000") === true);
chequear("/tienda/x en www.tiendaapps.com sigue excluida por ruta", pixelHabilitadoEn("/tienda/x", "www.tiendaapps.com") === false);
chequear("/p/abc en www.tiendaapps.com sigue excluida por ruta", pixelHabilitadoEn("/p/abc", "www.tiendaapps.com") === false);

console.log(
  fallos === 0
    ? "\nTodo bien: ninguna ruta puede tener los dos pixeles a la vez.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
