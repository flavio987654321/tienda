/* Qué pantalla del panel tiene artículo, y cuál.
 *
 * Esto está SEPARADO de `articulos.ts` a propósito, y la razón es el peso.
 * El `?` del panel es un componente de cliente: todo lo que importe viaja al
 * navegador. Si preguntara por la pantalla actual contra `ARTICULOS`, cada
 * pantalla del panel se bajaría los veintidós artículos completos —el texto
 * entero, tablas y avisos incluidos— para terminar usando un título y un slug.
 *
 * Acá vive solo el par ruta → artículo. El título NO se repite: sale de
 * `indice.ts`, que es la lista liviana de los veintidós y ya viajaba igual al
 * navegador por los botones de Sasha. Repetido en dos lados era manejable con
 * el chequeo de `index.ts`; en tres ya no valía la pena. */

import { tituloDeAyuda } from "./indice";

export type Pantalla = { href: string; slug: string; titulo: string };

const RUTAS: [href: string, slug: string][] = [
  ["/dashboard/pedidos",              "los-estados-de-un-pedido"],
  ["/dashboard/consultas",            "consultas"],
  // El `?` de Productos abre el paso a paso, no el artículo de Google: el que
  // está parado ahí y toca ayuda está cargando algo, no planificando su SEO.
  ["/dashboard/productos",            "como-cargar-un-producto"],
  ["/dashboard/cupones",              "cupones"],
  ["/dashboard/promociones",          "como-armar-una-promocion"],
  ["/dashboard/carritos-abandonados", "carritos-abandonados"],
  ["/dashboard/vendedoras",           "afiliados"],
  ["/dashboard/resenas",              "moderar-resenas"],
  ["/dashboard/notificaciones",       "notificaciones"],
  ["/dashboard/configuracion",        "elegir-y-editar-el-diseno"],
  ["/dashboard/ajustes",              "configuracion-de-la-tienda"],
  ["/dashboard/metricas",             "leer-tus-estadisticas"],
  ["/dashboard/pagos",                "medios-de-cobro"],
  ["/dashboard/perfil",               "verificar-tu-cuenta"],
  ["/dashboard/mi-plan",              "tu-plan"],
];

/* Una ruta que apunte a un slug que no existe se descarta acá mismo. El `?` de
   esa pantalla desaparece, que es molesto pero honesto; ofrecer ayuda y abrir
   un 404 es peor. `verificarPantallas` avisa por consola cuál se cayó. */
export const PANTALLAS: Pantalla[] = RUTAS.flatMap(([href, slug]) => {
  const titulo = tituloDeAyuda(slug);
  if (!titulo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[ayuda] ${href} apunta a "${slug}", que no está en indice.ts — se ocultó el "?" de esa pantalla.`);
    }
    return [];
  }
  return [{ href, slug, titulo }];
});

/* La pantalla en la que estás parado.
 *
 * Dos cuidados:
 *
 * · POR PREFIJO, no por igualdad. `/dashboard/productos/nuevo` sigue siendo la
 *   pantalla de Productos aunque la ruta no coincida carácter por carácter.
 * · `/dashboard` A SECAS sería la excepción: todo el panel empieza con eso, así
 *   que como prefijo el artículo de Inicio ganaría en TODAS las pantallas. Hoy
 *   ninguna entrada usa esa ruta; el corte queda escrito para cuando exista.
 *
 * Si dos matchean, gana la ruta más larga —la más específica—. */
export function pantallaDe(pathname: string): Pantalla | undefined {
  return PANTALLAS.filter((p) => {
    if (p.href === "/dashboard") return pathname === "/dashboard";
    return pathname === p.href || pathname.startsWith(`${p.href}/`);
  }).sort((a, b) => b.href.length - a.href.length)[0];
}
