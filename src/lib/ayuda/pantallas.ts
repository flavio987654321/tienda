/* Qué pantalla del panel tiene artículo, y cuál.
 *
 * Esto está SEPARADO de `articulos.ts` a propósito, y la razón es el peso.
 * El `?` del panel es un componente de cliente: todo lo que importe viaja al
 * navegador. Si preguntara por la pantalla actual contra `ARTICULOS`, cada
 * pantalla del panel se bajaría los diecisiete artículos completos —el texto
 * entero, tablas y avisos incluidos— para terminar usando un título y un slug.
 *
 * Acá viven solo esos dos datos. `index.ts` compara esta tabla contra los
 * artículos de verdad y avisa por consola si se separan (ver `verificarPantallas`),
 * así que duplicar el título no puede quedar desactualizado en silencio. */

export type Pantalla = { href: string; slug: string; titulo: string };

export const PANTALLAS: Pantalla[] = [
  { href: "/dashboard/pedidos",              slug: "los-estados-de-un-pedido",         titulo: "Los estados de un pedido" },
  { href: "/dashboard/consultas",            slug: "consultas",                        titulo: "Las consultas de tus vehículos" },
  { href: "/dashboard/productos",            slug: "que-muestra-google-de-tus-productos", titulo: "Qué muestra Google de tus productos" },
  { href: "/dashboard/cupones",              slug: "cupones",                          titulo: "Cupones: cómo funcionan" },
  { href: "/dashboard/promociones",          slug: "como-armar-una-promocion",         titulo: "Cómo armar una promoción" },
  { href: "/dashboard/carritos-abandonados", slug: "carritos-abandonados",             titulo: "Carritos abandonados" },
  { href: "/dashboard/vendedoras",           slug: "afiliados",                        titulo: "Que otros vendan lo tuyo" },
  { href: "/dashboard/resenas",              slug: "moderar-resenas",                  titulo: "Reseñas: cuáles se publican solas y cuáles no" },
  { href: "/dashboard/notificaciones",       slug: "notificaciones",                   titulo: "Avisarle a tus clientes" },
  { href: "/dashboard/configuracion",        slug: "publicar-la-tienda",               titulo: "Publicar tu tienda" },
  { href: "/dashboard/pagos",                slug: "medios-de-cobro",                  titulo: "Cómo cobrar" },
  { href: "/dashboard/perfil",               slug: "verificar-tu-cuenta",              titulo: "Verificar tu identidad" },
  { href: "/dashboard/mi-plan",              slug: "tu-plan",                          titulo: "Tu plan: prueba, activo y vencido" },
];

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
