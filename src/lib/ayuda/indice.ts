/* El slug y el título de cada artículo, y nada más.
 *
 * Existe por el mismo motivo que `pantallas.ts`: hay dos partes del panel que
 * necesitan nombrar un artículo desde el NAVEGADOR —el `?` de cada pantalla y
 * los botones que arma Sasha— y las dos son componentes de cliente. Importar
 * `articulos.ts` desde ahí bajaría los artículos enteros, texto,
 * tablas y avisos incluidos, para terminar mostrando un título.
 *
 * Es la lista COMPLETA a propósito, no solo la de artículos con pantalla:
 * Sasha puede ofrecer cualquiera de ellos, y lo que no está acá no se
 * puede validar — o sea que no se pinta como botón.
 *
 * `index.ts` compara esta tabla contra los artículos de verdad y avisa por
 * consola si se separan (ver `verificarPantallas`). */

export const INDICE: { slug: string; titulo: string }[] = [
  { slug: "publicar-la-tienda",                  titulo: "Publicar tu tienda" },
  { slug: "que-significan-los-avisos-del-panel", titulo: "Qué significan los avisos del panel" },
  { slug: "que-muestra-google-de-tus-productos", titulo: "Qué muestra Google de tus productos" },
  { slug: "como-armar-una-promocion",            titulo: "Cómo armar una promoción" },
  { slug: "que-promocion-conviene",              titulo: "Qué promoción te conviene" },
  { slug: "cupones",                             titulo: "Cupones: cómo funcionan" },
  { slug: "cupon-o-promocion",                   titulo: "¿Cupón o promoción?" },
  { slug: "moderar-resenas",                     titulo: "Reseñas: cuáles se publican solas y cuáles no" },
  { slug: "carritos-abandonados",                titulo: "Carritos abandonados" },
  { slug: "los-estados-de-un-pedido",            titulo: "Los estados de un pedido" },
  { slug: "verificar-tu-cuenta",                 titulo: "Verificar tu identidad" },
  { slug: "medios-de-cobro",                     titulo: "Cómo cobrar" },
  { slug: "consultas",                           titulo: "Las consultas de tus vehículos" },
  { slug: "las-fotos-de-tus-productos",          titulo: "Las fotos: cuál va primera y por qué importa" },
  { slug: "afiliados",                           titulo: "Que otros vendan lo tuyo" },
  { slug: "notificaciones",                      titulo: "Avisarle a tus clientes" },
  { slug: "tu-plan",                             titulo: "Tu plan: prueba, activo y vencido" },
  { slug: "envios",                              titulo: "Cómo entregar" },
  { slug: "como-cargar-un-producto",             titulo: "Cómo cargar un producto" },
  { slug: "elegir-y-editar-el-diseno",           titulo: "Elegir y editar el diseño" },
  { slug: "configuracion-de-la-tienda",          titulo: "La configuración de tu tienda" },
  { slug: "leer-tus-estadisticas",               titulo: "Leer tus estadísticas" },
];

const POR_SLUG = new Map(INDICE.map((a) => [a.slug, a.titulo]));

/* El título de un artículo, o `undefined` si ese slug no existe.
 *
 * Devolver `undefined` en vez de tirar es la parte importante: quien pregunta
 * es un componente de cliente, y un slug inventado —por un typo o por Sasha—
 * no puede voltear el panel entero. El que llama decide qué hacer sin él, que
 * siempre es no mostrar el link. */
export function tituloDeAyuda(slug: string): string | undefined {
  return POR_SLUG.get(slug);
}
