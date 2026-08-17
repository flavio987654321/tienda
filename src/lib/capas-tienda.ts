/* Las capas de la tienda, en un solo lugar.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * Había 296 `zIndex` sueltos repartidos en 38 archivos, con 38 valores distintos
 * inventados de a uno: 40, 41, 42, 50, 90, 99, 100, 200, 210, 250, 300, 350,
 * 351, 400, 499, 500, 600, 650, 999, 1000, 2000, 9000, 9990, 9991, 9992, 9995,
 * 9998, 9999, 99999, 100000. Nadie podía saber, al escribir uno nuevo, contra
 * qué estaba compitiendo — así que la respuesta era siempre la misma: poner un
 * número más grande que el último que se vio. De ahí salen los 9999 y los 100000.
 *
 * Con nombres, la pregunta "¿esto va arriba o abajo del menú?" tiene respuesta
 * sin abrir otros diez archivos.
 *
 * ── Lo que NO está acá ───────────────────────────────────────────────────────
 * El apilado interno de un componente: el `zIndex: 1` de una capa adentro de una
 * tarjeta, el `2` de un badge sobre una foto. Esos son relativos a su propio
 * padre, no compiten con nada de afuera y están bien como están. Meterlos en una
 * escala global sería confundir dos cosas distintas.
 *
 * Acá vive lo que se despega de la página —`position: fixed` o `sticky`— y por lo
 * tanto pelea con todo lo demás.
 *
 * ── Los números ──────────────────────────────────────────────────────────────
 * Van de 10 en 10 y de 100 en 100 para que entre dos capas siempre haya lugar
 * sin tener que renumerar nada. Los valores son distintos de los que había, pero
 * el ORDEN es exactamente el mismo: el refactor que los reemplazó se verificó
 * comparando todos los pares antes y después, justamente para no cambiar sin
 * querer qué se ve arriba de qué.
 *
 * La escala EMPIEZA EN 20, y no en 1, por eso mismo: el apilado interno de los
 * componentes usa de 0 a 10 y no se tocó. Si esto arrancara más abajo, una capa
 * global quedaría empatada con el `zIndex: 10` de adentro de una tarjeta — que es
 * justo lo que la verificación encontró cuando la primera versión arrancaba en
 * 10. Cualquier capa nueva tiene que quedar por encima de 10.
 *
 * ── Ojo con esto ─────────────────────────────────────────────────────────────
 * Un z-index solo compite DENTRO de su contexto de apilado. Un padre con
 * `transform`, `filter`, `backdrop-filter`, `opacity` menor a 1 o `will-change`
 * crea uno nuevo, y ahí adentro el número de acá no se compara con el de afuera.
 * Los templates usan bastante `backdropFilter` y `transform`, así que si algo no
 * se apila como esperabas, el problema casi nunca es el número: es un padre que
 * armó un contexto propio.
 */
export const CAPAS = {
  // ── Dentro de la página ───────────────────────────────────────────────────
  /** Capturador de clics de un desplegable, y el desplegable encima. */
  contenido: 20,
  /** Sus partes internas, cuando una sola no alcanza. */
  contenidoMedio: 21,
  contenidoAlto: 22,

  /** Barra de navegación de la ficha de producto (`sticky`) y el botón de WhatsApp. */
  navFicha: 30,

  /** Velo de "sección oculta" en el editor, encima de su propia sección. */
  seccionOculta: 40,

  /** Menú mobile a pantalla completa que despliega la barra de la tienda. */
  menuMobile: 50,

  // ── Barras y flotantes ────────────────────────────────────────────────────
  /** Encabezados pegajosos del listado de productos y de vehículos. */
  encabezadoListado: 60,

  /** La barra superior de la tienda. */
  nav: 100,
  /** Lo que cuelga de la barra: categorías, subcategorías. */
  navMenu: 110,

  /** Botones flotantes de segundo orden. */
  flotanteBajo: 120,
  /** Botones flotantes: volver, WhatsApp, carrito. */
  flotante: 130,

  // ── Paneles ───────────────────────────────────────────────────────────────
  /** Fondo oscuro del panel de filtros. */
  veloFiltros: 140,
  /** El panel de filtros. */
  filtros: 141,
  /** Buscador desplegado. */
  buscador: 150,

  /** Fondo oscuro de un panel lateral. */
  veloPanel: 190,
  /** Panel lateral / carrito. */
  panel: 200,
  /** Lo que tiene que verse por encima de un panel abierto. */
  sobrePanel: 210,
  sobrePanelAlto: 220,

  // ── Modales de la tienda ──────────────────────────────────────────────────
  /** Barra fija de acción del template (comprar, consultar). */
  barraAccion: 300,
  /** Modales que abre el visitante desde un template. */
  modalTemplate: 310,
  modalTemplateAlto: 320,
  /** Galería de imágenes de un template. */
  galeriaTemplate: 330,

  // ── Capas de la plataforma, encima del template ───────────────────────────
  /** Carteles que aparecen solos. El turno lo reparte `lib/interrupcion-tienda`. */
  aviso: 400,
  /** Fondo oscuro del cajón de novedades. */
  veloCajon: 401,
  /** El cajón de novedades. */
  cajon: 402,
  /** Modal del widget de puntos. */
  modalPuntos: 410,
  /** Velo de entrada de la app instalada, y globos de ayuda. */
  entradaApp: 420,
  /** Modales de la plataforma: reportar, pago confirmado, datos verificados. */
  modal: 430,

  /** Confirmaciones que tienen que verse por encima de un modal, y el flyer. */
  critico: 500,
  /** Pantalla completa de verdad: reels, visor de fotos del vehículo. */
  pantallaCompleta: 510,
} as const;

export type Capa = keyof typeof CAPAS;
