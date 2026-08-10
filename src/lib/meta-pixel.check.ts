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
]) {
  chequear(ruta, pixelHabilitadoEn(ruta) === false);
}

console.log("\nRutas de plataforma — el pixel SÍ debe cargar:");
for (const ruta of [
  "/",
  "/login",
  "/registro",
  "/precios",
  "/plantillas",
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

console.log(
  fallos === 0
    ? "\nTodo bien: ninguna ruta puede tener los dos pixeles a la vez.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
