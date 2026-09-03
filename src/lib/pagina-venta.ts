/* ══════════════════════════════════════════════════════════════════════════
   QUÉ ES UNA PÁGINA DE VENTA
   ══════════════════════════════════════════════════════════════════════════

   Un producto digital no se vende desde una ficha de catálogo: se vende desde
   una página larga que arranca prometiendo algo y termina en un botón. Este
   archivo declara **qué secciones existen, en qué orden, con qué campos y con
   qué topes**. No dibuja nada.

   ── Por qué un catálogo y no bloques libres ─────────────────────────────────

   Se podría dejar armar la página con bloques sueltos, como un editor. No, y el
   motivo no es ahorrar trabajo: **esta página la va a llenar la IA** (Fase 4).
   Con un catálogo fijo, lo que la IA devuelve se compara campo por campo contra
   esta lista antes de guardarse — sobra algo, se tira; falta algo, se ve. Con
   bloques libres no hay contra qué comparar y lo que devuelva entra tal cual.

   Y de paso sale gratis lo otro: la pantalla se dibuja leyendo esta lista, así
   que un campo nuevo no se olvida en ningún lado, y el tope de caracteres es uno
   solo para el panel, para la ruta que guarda y para la IA.

   ── Una sola pieza dibuja la página ─────────────────────────────────────────

   La vista previa del panel y la página pública tienen que ser EL MISMO código
   leyendo esto. Si son dos, se separan solas y la previa termina mintiendo —
   ya nos pasó con la previa de los templates de tienda, que apagaba los clics y
   mostraba algo que no era.

   ── Sin saltos de línea ─────────────────────────────────────────────────────

   Todos los textos pasan por `limpiarTexto`, que reemplaza los caracteres de
   control por un espacio. O sea que no hay párrafos con Enter adentro. Es a
   propósito: si hacen falta dos ideas separadas, son dos campos o dos ítems de
   una lista, no un campo con un salto. Un texto con saltos se rompe distinto en
   cada ancho y viaja mal al mail. */

import { limpiarTexto } from "@/lib/texto-limpio";

/* ── Los tipos de campo ─────────────────────────────────────────────────────
 *
 *   texto    → una línea (títulos, nombres, texto de botón)
 *   parrafo  → varias oraciones, pero seguidas (ver arriba: sin saltos)
 *   lista    → varios ítems iguales, cada uno con sus propios campos
 *   imagen   → una dirección de imagen
 *   fecha    → un momento real, en ISO
 *   numero   → un entero con piso y techo
 *   icono    → UN símbolo: un emoji, no una letra
 */
export type TipoCampo = "texto" | "parrafo" | "lista" | "imagen" | "fecha" | "numero" | "icono";

/* ── El aviso que el editor le manda a su previa ────────────────────────────
 *
 * La previa es un `iframe` a la página real —necesita su propia ventana para que
 * el diseño se reacomode de verdad—, así que para que siga lo que se escribe hay
 * que **mandarle el borrador a esa ventana**. Este es el nombre del aviso.
 *
 * Vive acá, con el catálogo, porque lo usan los dos lados: el editor para
 * mandarlo y la página para escucharlo. En dos archivos distintos, alguien
 * cambia uno y la previa deja de moverse sin que nada falle. */
export const AVISO_BORRADOR = "pagina-venta:borrador";
/** La previa avisa que ya está lista para recibir. Ver el porqué en el editor. */
export const AVISO_LISTA = "pagina-venta:lista";
/** Y avisa que tocaron una sección, para que el editor la abra. */
export const AVISO_TOCAR = "pagina-venta:tocar";

/** Lo que se puede escribir adentro de un texto y se reemplaza al dibujar. */
export const FICHA_DIAS = "{dias}";
/** El año, para el copyright. Ver el porqué en la sección `pie`. */
export const FICHA_ANIO = "{año}";

export type Campo = {
  clave: string;
  /** Lo que se lee arriba de la casilla en el panel. */
  etiqueta: string;
  tipo: TipoCampo;
  /** Tope de caracteres. En `lista`, no aplica. */
  largo: number;
  /** El texto con el que arranca la sección. Neutro: no habla de ningún rubro. */
  ejemplo?: string;
  /** Debajo de la casilla. Se usa para lo que hay que aclarar, no para adornar. */
  ayuda?: string;
  /** Si queda vacío, vuelve al ejemplo. Sólo para lo que rompe la página si falta. */
  obligatorio?: boolean;
  /** Sólo en `lista`. */
  campos?: Campo[];
  /** Sólo en `lista`: cuántos ítems entran. */
  maxItems?: number;
  /**
   * Sólo en `icono`: los que se ofrecen de un clic.
   *
   * No son la única opción: se puede pegar cualquier emoji. Están porque el
   * teclado de emojis de Windows es Win+punto y mucha gente no lo sabe — sin
   * esta fila, el campo queda vacío en la mayoría de las páginas.
   */
  sugerencias?: string[];
  /** Sólo en `numero`: piso, techo y con cuál arranca. */
  min?: number;
  max?: number;
  porDefecto?: number;
};

export type Seccion = {
  clave: string;
  /** El nombre en la lista del panel. */
  nombre: string;
  /** Para qué sirve, en una línea. Se muestra al lado del nombre. */
  para: string;
  /** `false` = no tiene botón de ocultar. Ver los porqués abajo, uno por uno. */
  sePuedeOcultar: boolean;
  /** `false` = queda clavada en su lugar del catálogo. */
  sePuedeMover: boolean;
  /** Si arranca encendida en una página nueva. */
  encendida: boolean;
  /**
   * Con qué fondo nace, de `TONOS`. Después se cambia desde el editor.
   *
   * `undefined` = esta sección NO lleva fondo propio, y el editor no le
   * muestra el control. Son las que no dibujan una franja: la barra flotante,
   * el reloj, el pie y el aviso de ventas.
   */
  tono?: string;
  /**
   * Lo que hay que leer ANTES de llenar esta sección. Se muestra arriba de
   * todas las casillas, en el editor.
   *
   * ⚠️ No es para explicar qué va: para eso está `para` y la `ayuda` de cada
   * campo. Es para las secciones donde escribir algo tiene consecuencias
   * afuera de la página — una promesa que después hay que cumplir, o una
   * afirmación de la que responde quien vende. La mayoría no lleva ninguno,
   * y ahí está la gracia: si lo llevaran todas, no se lee ninguno.
   */
  aviso?: string;
  campos: Campo[];
};

/** Largo de una dirección de imagen. Las de Supabase firmadas son largas. */
const LARGO_IMAGEN = 600;

/* ══════════════════════════════════════════════════════════════════════════
   EL CATÁLOGO
   ══════════════════════════════════════════════════════════════════════════

   El orden de esta lista es el orden con el que nace una página, y es un guion
   de venta: prometer → mostrar qué es → qué más se lleva → por qué le sirve →
   qué le pasa si no lo resuelve → cómo funciona → quién más lo compró → cuánto
   sale → qué pasa si no le gusta → dudas.

   Se puede reordenar casi todo. Lo que NO se puede está marcado y explicado. */
export const SECCIONES: readonly Seccion[] = [
  {
    clave: "portada",
    nombre: "Portada",
    para: "Lo primero que se ve, con el botón de comprar",
    /* No se oculta ni se mueve: es la primera pantalla. Una página sin portada
       arranca en el medio de una explicación. */
    sePuedeOcultar: false,
    sePuedeMover: false,
    encendida: true,
    tono: "fondo",
    campos: [
      /* El rótulo de arriba de todo. Es corto a propósito —30 caracteres— porque
         no es un título: es la etiqueta que dice QUÉ COSA es esto antes de que
         se lea nada. Quien entra desde un anuncio cae acá sin contexto ninguno.

         La competencia lo tiene, pero pegado adelante del nombre del producto
         ("EBOOK: Mecánica del automotor…"), o sea escrito adentro del mismo
         campo. Separado se puede dibujar distinto y se puede dejar vacío. */
      { clave: "rotulo", etiqueta: "Rótulo", tipo: "texto", largo: 30,
        ejemplo: "EBOOK",
        ayuda: "Qué tipo de cosa es. Dejalo vacío si no suma." },
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 120,
        ejemplo: "La promesa de tu producto, en una línea",
        ayuda: "Lo que se lleva quien compra, no el nombre del archivo." },
      { clave: "subtitulo", etiqueta: "Subtítulo", tipo: "parrafo", largo: 300,
        ejemplo: "Explicá en dos o tres oraciones qué resuelve y para quién es." },
      { clave: "imagen", etiqueta: "Imagen", tipo: "imagen", largo: LARGO_IMAGEN },
      { clave: "textoBoton", etiqueta: "Texto del botón", tipo: "texto", largo: 40,
        ejemplo: "Comprar ahora", obligatorio: true },
    ],
  },

  {
    clave: "producto",
    nombre: "Qué te llevás",
    para: "El ebook principal",
    /* ⚠️ No se oculta: es lo que se compra. Una página de venta sin el producto
       cobra sin decir qué entrega. */
    sePuedeOcultar: false,
    sePuedeMover: true,
    encendida: true,
    tono: "suave",
    campos: [
      { clave: "titulo", etiqueta: "Título de la sección", tipo: "texto", largo: 80,
        ejemplo: "Qué te llevás" },
      { clave: "textoBoton", etiqueta: "Texto del botón", tipo: "texto", largo: 40,
        ejemplo: "Comprar ahora", obligatorio: true },
    ],
    /* El nombre, la descripción, la imagen y el precio NO se escriben acá: salen
       del producto. Si se copiaran, el día que se corrige el precio en Productos
       la página de venta seguiría mostrando el viejo, y ese número es el que la
       persona lee antes de pagar. */
  },

  {
    clave: "bonos",
    nombre: "Bonos de regalo",
    para: "Lo que va incluido y gratis con la compra",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "fuerte",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Además te llevás gratis" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "parrafo", largo: 200,
        ejemplo: "Todo esto viene incluido, sin costo extra." },
    ],
    /* Los bonos salen de los hijos del producto, igual que arriba. Acá sólo va
       el encabezado. Y si no hay ningún bono cargado, la sección no se dibuja
       aunque esté encendida: un título de regalos sin regalos abajo es peor que
       no tenerlo. */
  },

  {
    clave: "beneficios",
    nombre: "Beneficios",
    para: "Qué gana quien lo compra",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "fondo",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Qué vas a lograr" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "texto", largo: 140,
        ejemplo: "Todo lo que te llevás en un solo lugar." },
      /* ⚠️ Título Y explicación, no un renglón suelto. Un renglón se lee como una
         lista de supermercado; con el porqué abajo, convence. Es lo que hace la
         competencia y es la diferencia más grande entre su página y la nuestra. */
      { clave: "items", etiqueta: "Beneficios", tipo: "lista", largo: 0, maxItems: 8,
        campos: [
          { clave: "icono", etiqueta: "Ícono", tipo: "icono", largo: 8,
            sugerencias: ["✅", "⭐", "🚀", "💡", "🎯", "🔒", "⚡", "📈", "🧠", "🏆", "❤️", "🔧"] },
          { clave: "titulo", etiqueta: "Beneficio", tipo: "texto", largo: 90 },
          { clave: "detalle", etiqueta: "Por qué te sirve", tipo: "parrafo", largo: 220 },
        ] },
    ],
  },

  {
    clave: "dolores",
    nombre: "Esto te suena",
    para: "El problema que la persona tiene hoy",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "suave",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "¿Te pasa esto?" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "texto", largo: 140,
        ejemplo: "Si alguna de estas te suena, esto es para vos." },
      { clave: "items", etiqueta: "Situaciones", tipo: "lista", largo: 0, maxItems: 6,
        campos: [
          { clave: "icono", etiqueta: "Ícono", tipo: "icono", largo: 8,
            sugerencias: ["😩", "😕", "⏳", "💸", "❌", "😰", "🌀", "🤯", "🚧", "📉"] },
          { clave: "titulo", etiqueta: "Situación", tipo: "texto", largo: 90 },
          { clave: "detalle", etiqueta: "Por qué duele", tipo: "parrafo", largo: 220 },
        ] },
    ],
  },

  {
    clave: "comoFunciona",
    nombre: "Cómo funciona",
    para: "Qué pasa después de pagar",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "fondo",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Cómo lo recibís" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "texto", largo: 140,
        ejemplo: "Tres pasos y ya lo tenés." },
      { clave: "pasos", etiqueta: "Pasos", tipo: "lista", largo: 0, maxItems: 5,
        campos: [
          { clave: "titulo", etiqueta: "Paso", tipo: "texto", largo: 60 },
          /* ⚠️ 130 y no 220 como los beneficios, y el motivo es DÓNDE se dibuja:
             hasta cuatro pasos van en fila, o sea una columna de unos 180
             píxeles cada uno. Con 220 caracteres esa columna se estira a diez
             renglones y queda el triple de alta que las de al lado — probado
             el 02/09/26, se ve como un error aunque no lo sea. Los beneficios
             van de a dos y a todo el ancho, así que ahí 220 entra.

             O sea: el tope no es un número redondo, sale del lugar donde el
             texto termina dibujado. */
          { clave: "detalle", etiqueta: "Detalle", tipo: "parrafo", largo: 130,
            ayuda: "Corto: los pasos van uno al lado del otro." },
        ] },
    ],
  },

  {
    clave: "opiniones",
    nombre: "Opiniones",
    para: "Lo que dijeron quienes ya lo compraron",
    sePuedeOcultar: true,
    /* Apagada por defecto, y no es un descuido: una página recién creada no
       tiene ninguna opinión de verdad, así que si naciera encendida lo primero
       que hace la herramienta es pedirte que inventes tres. */
    sePuedeMover: true,
    encendida: false,
    tono: "suave",
    /* ⚠️ Visto el 02/09/26 en el editor de la competencia: su IA llena esta
       sección sola con tres personas inventadas —nombre, texto y un rating
       del 1 al 5 escrito a mano— y la dibuja como una captura de WhatsApp,
       con hora, señal y doble tilde de leído. Arriba del bloque el título
       dice "TESTIMONIOS REALES".

       Eso ya no es exagerar: es prueba falsificada. Y el que responde por lo
       que dice la página no es la plataforma, es quien vende. Por eso acá la
       sección nace apagada, no hay campo de rating, y esto se lee antes de
       escribir la primera letra. */
    aviso: "Sólo opiniones que te hayan dicho de verdad. Una inventada es publicidad engañosa, y el que responde sos vos.",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Lo que dicen" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "texto", largo: 140 },
      { clave: "items", etiqueta: "Opiniones", tipo: "lista", largo: 0, maxItems: 6,
        campos: [
          { clave: "nombre", etiqueta: "Nombre", tipo: "texto", largo: 60,
            ayuda: "De una persona real que te lo haya dicho." },
          { clave: "texto", etiqueta: "Qué dijo", tipo: "parrafo", largo: 300 },
        ] },
    ],
  },

  {
    clave: "precio",
    nombre: "Precio",
    para: "Cuánto sale y el botón de comprar",
    /* ⚠️ **No se oculta.** En el de la competencia sí, y esa combinación permite
       armar una página que dice "Comprar ahora" y no muestra el precio en ningún
       lado hasta el checkout. Eso genera devoluciones, y acá la ley de defensa
       del consumidor pide que el precio esté a la vista antes de pagar. */
    sePuedeOcultar: false,
    sePuedeMover: true,
    encendida: true,
    tono: "fuerte",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Todo esto por" },
      { clave: "aclaracion", etiqueta: "Aclaración", tipo: "texto", largo: 120,
        ejemplo: "Pago único. Lo recibís al instante por mail." },
      { clave: "textoBoton", etiqueta: "Texto del botón", tipo: "texto", largo: 40,
        ejemplo: "Comprar ahora", obligatorio: true },
    ],
  },

  {
    clave: "garantia",
    nombre: "Garantía",
    para: "Qué pasa si no le sirve",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: false,
    tono: "suave",
    /* La otra sección donde lo que se escribe sale de la página y entra en la
       vida real. En opiniones se afirma algo que pasó; acá se promete algo que
       va a pasar, y lo paga quien vende, de su bolsillo. */
    aviso: "Lo que prometas acá lo vas a tener que cumplir con tu plata. Por ley ya tenés 10 días de arrepentimiento, escribas esto o no.",
    campos: [
      /* ⚠️ El PISO es 10, no 1, y por el mismo motivo que el valor de fábrica:
         en Argentina una compra a distancia ya tiene 10 días corridos de
         arrepentimiento por el art. 34 de la 24.240, y eso corre se escriba o
         no. Dejar poner 7 —que es lo que tiene la competencia— pone en la
         página una garantía MÁS CORTA que la que la ley ya da, y quien la lee
         se cree que a los 8 días no puede devolver.

         Subir el piso recorta hacia arriba, que es el lado seguro: un 7
         guardado antes se dibuja como 10, nunca al revés. */
      { clave: "dias", etiqueta: "Días de garantía", tipo: "numero", largo: 0,
        min: 10, max: 365, porDefecto: 10,
        ayuda: `Mínimo 10: por ley toda compra a distancia ya los tiene. Escribí ${FICHA_DIAS} en el título o en el texto y se reemplaza por este número.` },
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: `Garantía de ${FICHA_DIAS} días` },
      { clave: "texto", etiqueta: "Qué prometés", tipo: "parrafo", largo: 400,
        ejemplo: `Si en los primeros ${FICHA_DIAS} días sentís que no te sirvió, escribinos y te devolvemos lo que pagaste.`,
        ayuda: "Lo que escribas acá es una promesa que después tenés que cumplir vos." },
    ],
    /* Apagada por defecto porque es una obligación que se asume, no una
       decoración que se prende sin leer.

       ⚠️ **El número arranca en 10 y no en 7 por un motivo.** En Argentina una
       compra a distancia ya tiene 10 días corridos de arrepentimiento por ley
       (art. 34 de la 24.240, Resolución 424/2020) y eso corre se escriba o no —
       de hecho ya está hecho, ver `/arrepentimiento`. Prometer 7 no ahorra nada:
       igual hay que dar 10, y encima la página anuncia menos de lo que la
       persona tiene derecho a pedir. La competencia arranca en 7.

       El número vive en UN campo y los textos lo nombran con `{dias}`. Escrito a
       mano en dos lados, se cambia uno y queda un título que dice 7 con una
       configuración que dice 30. */
  },

  {
    clave: "preguntas",
    nombre: "Preguntas frecuentes",
    para: "Las dudas que frenan la compra",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "fondo",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 80,
        ejemplo: "Preguntas frecuentes" },
      { clave: "subtitulo", etiqueta: "Bajada", tipo: "texto", largo: 140,
        ejemplo: "Lo que más nos preguntan antes de comprar." },
      { clave: "items", etiqueta: "Preguntas", tipo: "lista", largo: 0, maxItems: 10,
        campos: [
          { clave: "pregunta", etiqueta: "Pregunta", tipo: "texto", largo: 140 },
          { clave: "respuesta", etiqueta: "Respuesta", tipo: "parrafo", largo: 500 },
        ] },
    ],
  },

  /* ── Las dos de urgencia ────────────────────────────────────────────────────
   *
   * 🔲 **Decisión pendiente (02/09/26).** En el de la competencia las dos son
   * mentira configurable: el reloj es una cuenta regresiva que se reinicia, los
   * cupos son un número que se escribe a mano ("Quedan 7") y no cuenta nada, y
   * el cartelito de "Fulana compró hace 5 minutos" es una sección que se llena
   * sola con nombres.
   *
   * Acá quedaron con la forma honesta, y las dos nacen apagadas:
   *
   *   - La oferta termina en una FECHA de verdad, y cuando termina el precio
   *     tiene que cambiar de verdad (el `comparePrice` del producto).
   *   - El aviso de ventas no tiene nada para escribir: muestra compras reales
   *     de ese producto, que ya están en la base.
   *
   * Si se decide la versión inventada, el cambio es chico y va acá. Pero la
   * herramienta se la damos nosotros, así que la decisión es nuestra también. */
  {
    clave: "urgencia",
    nombre: "Oferta con fecha",
    para: "Una cuenta regresiva que termina de verdad",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: false,
    campos: [
      { clave: "texto", etiqueta: "Texto", tipo: "texto", largo: 60,
        ejemplo: "Oferta por tiempo limitado" },
      { clave: "hasta", etiqueta: "Termina el", tipo: "fecha", largo: 40,
        ayuda: "Cuando llegue esa fecha el cartel desaparece y el precio vuelve al normal." },
    ],
  },

  {
    clave: "avisoDeVentas",
    nombre: "Aviso de ventas",
    para: "Muestra compras reales y recientes de este producto",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: false,
    campos: [],
  },

  /* ── El cierre ─────────────────────────────────────────────────────────────
   *
   * La última pantalla antes de irse: el precio otra vez, lo que se lleva, y el
   * botón. Repetir el precio NO es un truco sucio — la página es larga, la
   * persona baja y se distrae, y tiene que volver a encontrarlo sin subir. Es lo
   * que hace cualquier página de venta.
   *
   * ⚠️ **Pero el precio no se escribe acá.** En la de la competencia el cierre
   * tiene sus propias casillas de "Precio" y "Precio original", con lo cual el
   * número vive en TRES lugares: el producto, el resumen y el cierre. El día que
   * alguien corrige uno y se olvida de los otros, la misma página muestra dos
   * precios distintos — y es el número que la persona lee antes de pagar.
   * Acá sale del producto, siempre, y no hay forma de que discrepen. */
  {
    clave: "cierre",
    nombre: "Cierre",
    para: "El último empujón: el precio otra vez y el botón",
    sePuedeOcultar: true,
    sePuedeMover: true,
    encendida: true,
    tono: "fuerte",
    campos: [
      { clave: "titulo", etiqueta: "Título", tipo: "texto", largo: 120,
        ejemplo: "Empezá hoy" },
      { clave: "textoBoton", etiqueta: "Texto del botón", tipo: "texto", largo: 40,
        ejemplo: "Comprar y descargar", obligatorio: true },
    ],
  },

  /* ── La barra pegada abajo ─────────────────────────────────────────────────
   *
   * Lo único de la pantalla de ellos que copiaría tal cual. En el celular la
   * página mide varias pantallas de alto: sin esto, alguien convencido en la
   * mitad tiene que ponerse a buscar el botón.
   *
   * La de ellos lleva el reloj adentro; ésta no. Precio y botón, nada más. */
  {
    clave: "barra",
    nombre: "Barra de compra",
    para: "El botón siempre a mano, pegado abajo",
    sePuedeOcultar: true,
    sePuedeMover: false,
    encendida: true,
    campos: [
      { clave: "textoBoton", etiqueta: "Texto del botón", tipo: "texto", largo: 30,
        ejemplo: "Comprar", obligatorio: true },
    ],
  },

  {
    clave: "pie",
    nombre: "Pie de página",
    para: "Tus datos de contacto y los enlaces legales",
    /* ⚠️ **No se oculta.** Acá van el contacto de quien vende y los enlaces
       legales. Quien compra tiene que poder encontrar a quién reclamarle, y esa
       parte no es una preferencia de diseño. */
    sePuedeOcultar: false,
    sePuedeMover: false,
    encendida: true,
    campos: [
      { clave: "texto", etiqueta: "Texto libre", tipo: "parrafo", largo: 300,
        ayuda: "Opcional. El contacto y los enlaces legales van solos." },
      /* ⚠️ El año va con ficha y no escrito. El de la competencia dice
         "© 2026 Taller Digital" a mano: el 1 de enero queda viejo en todas las
         páginas de todos sus clientes a la vez, y nadie se entera. */
      { clave: "copyright", etiqueta: "Copyright", tipo: "texto", largo: 120,
        ejemplo: `© ${FICHA_ANIO}`,
        ayuda: `Escribí ${FICHA_ANIO} y se reemplaza solo por el año en curso.` },
    ],
  },
];

/* SEO no es una sección: no se dibuja en la página, es lo que ve Google. Y no va
   acá porque el producto YA tiene `seoTitle` y `seoDescription` en la base —
   duplicarlo sería tener dos títulos de Google para la misma cosa. */

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE SE GUARDA
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   CÓMO SE VE — el estilo y la paleta
   ══════════════════════════════════════════════════════════════════════════

   ── Por qué son opciones armadas y no colores libres ────────────────────────

   Con un selector de colores libre, alguien elige amarillo sobre blanco y **el
   botón de comprar desaparece**. En una página cualquiera eso es feo; en una que
   cobra, es plata que no entra — y el que la eligió no lo ve, porque en su
   pantalla y con su luz se distingue.

   Con opciones armadas el contraste está garantizado, y hay un chequeo que
   calcula el contraste real de cada paleta y falla si alguna baja del mínimo que
   pide la norma. Ninguna se puede romper por error.

   Y es lo mismo que hace la competencia: paletas para elegir, no un cuentagotas.

   ── El estilo NO lo elige la IA ─────────────────────────────────────────────

   Medido el 02/09/26 en la de ellos: al entrar por primera vez el estilo era el
   de fábrica ("Clásico"), no uno elegido. La IA escribe el contenido; la forma
   viene puesta y la cambia la persona. Acá igual. */

export type Estilo = {
  clave: string;
  nombre: string;
  para: string;
  /** Clases de Tailwind, escritas enteras: si se armaran pegando pedazos, el
   *  compilador no las ve y la página sale sin estilo. */
  tarjeta: string;
  boton: string;
  titulo: string;
  /**
   * La forma del sello de oferta: la píldora que dice cuánto por ciento se
   * descuenta.
   *
   * ⚠️ Va aparte de `tarjeta` y NO reusa esa clase. La `tarjeta` de Editorial
   * es una línea arriba con espacio abajo; aplicada a una píldora de tres
   * palabras queda un renglón suelto en vez de un sello. Cada estilo dice cómo
   * es su sello, igual que dice cómo es su botón.
   */
  sello: string;
  /** El aire de cada sección. Es lo que más se nota de lejos. */
  seccion: string;
  /**
   * Página oscura. Da vuelta la tinta, el fondo y las tarjetas; el acento de la
   * paleta queda igual, que es lo que hace saltar el botón.
   *
   * Es el único estilo que toca los colores, y por eso los tonos oscuros están
   * acá y no adentro de cada paleta: si cada paleta tuviera su versión oscura
   * serían doce combinaciones para revisar en vez de seis.
   */
  oscuro?: boolean;
};

/** Los grises de la página clara. */
export const COLORES_CLAROS = {
  tinta: "#0f172a",
  /* ⚠️ Era #64748b y se oscureció el 02/09/26. MEDIDO: sobre el tono suave
     daba 4,33–4,55 contra un mínimo de 4,5 — o sea que ya estaba al límite
     con el fondo casi blanco, y cualquier tono con color de verdad lo tiraba
     abajo (3,75 en el peor caso). Con este sube a 7,58 sobre blanco y 4,91 en
     el tono más marcado, y recién ahí los fondos pueden tener color. */
  tenue: "#475569",
  linea: "#e2e8f0",
  tarjeta: "#ffffff",
  /* El verde del "ahorrás", que ahora va sobre CUALQUIERA de los tres fondos.
     Era #047857 y se oscureció junto con los tonos: sobre el fondo fuerte daba
     3,55 en el peor caso, contra el mínimo de 4,5 — o sea que el renglón que
     dice cuánta plata se ahorra no se leía justo en los bloques más marcados.
     Con éste el peor caso es 4,98. */
  ok: "#065f46",
} as const;

/** Y los de la oscura. El acento sigue saliendo de la paleta. */
export const COLORES_OSCUROS = {
  tinta: "#f1f5f9",
  tenue: "#94a3b8",
  linea: "#1e293b",
  tarjeta: "#131c2e",
  /* Más claro que el de la página clara: el verde oscuro sobre fondo oscuro no
     se lee, y ese renglón es el que dice cuánta plata se ahorra. */
  ok: "#34d399",
  fondo: "#0b1220",
  suave: "#0f172a",
} as const;

/* ⚠️ Los tres tienen que verse DISTINTOS de lejos, no en el detalle. El primer
   intento tenía "Clásico" y "Suave" con la misma cara —cambiaba el radio de los
   bordes y poco más— y no se distinguían.

   Lo que los separa, y en este orden de importancia:
     1. **El aire.** Suave respira el doble que Clásico. Se nota al scrollear.
     2. **El borde.** Clásico tiene línea fina, Marcado línea gruesa negra,
        Suave no tiene ninguno.
     3. **La sombra.** Clásico no tiene, Marcado la tiene dura y corrida,
        Suave la tiene grande y difusa.
     4. **El título.** Clásico normal, Marcado negrita y mayúsculas, Suave
        apretado.

   Hay un chequeo que falla si dos estilos comparten la misma cara. */
export const ESTILOS: readonly Estilo[] = [
  {
    clave: "clasico",
    nombre: "Clásico",
    para: "Prolijo y compacto. Líneas finas, sin sombras, todo cerca.",
    tarjeta: "rounded-lg border border-slate-200",
    boton: "rounded-lg",
    titulo: "font-bold",
    sello: "rounded-full",
    seccion: "py-10 sm:py-14",
  },
  {
    clave: "marcado",
    nombre: "Marcado",
    para: "Fuerte y directo. Bordes gruesos, sombras duras, títulos en mayúscula.",
    tarjeta: "rounded-none border-2 border-slate-900 shadow-[6px_6px_0_0_rgba(15,23,42,1)]",
    boton: "rounded-none border-2 border-slate-900 shadow-[6px_6px_0_0_rgba(15,23,42,1)]",
    titulo: "font-black uppercase tracking-tight",
    sello: "rounded-none border-2 border-slate-900",
    seccion: "py-12 sm:py-16",
  },
  {
    clave: "suave",
    nombre: "Suave",
    para: "Con mucho aire. Sin bordes, esquinas muy redondeadas, botones tipo píldora.",
    tarjeta: "rounded-[2rem] border-0 shadow-[0_14px_40px_-12px_rgba(15,23,42,0.28)]",
    boton: "rounded-full shadow-[0_14px_30px_-8px_rgba(15,23,42,0.45)]",
    titulo: "font-semibold tracking-tight",
    sello: "rounded-full",
    seccion: "py-16 sm:py-24",
  },
  /* Sin tarjetas: en vez de encerrar cada cosa en un recuadro, las separa con una
     línea, como una revista. La diferencia más grande de los cinco es la letra —
     es el único con serif. */
  {
    clave: "editorial",
    nombre: "Editorial",
    para: "Como una revista. Títulos con serif y líneas en vez de recuadros.",
    tarjeta: "rounded-none border-0 border-t border-[color:var(--pv-linea)] pt-6",
    boton: "rounded-none",
    titulo: "font-serif font-normal tracking-tight",
    sello: "rounded-none",
    seccion: "py-14 sm:py-20",
  },
  /* El único que da vuelta los colores. En una página que se lee de noche en el
     celular —que es donde se compran estas cosas— el botón salta mucho más. */
  {
    clave: "nocturno",
    nombre: "Nocturno",
    para: "Fondo oscuro. El botón salta y las fotos se ven más.",
    tarjeta: "rounded-xl border border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.85)]",
    boton: "rounded-xl shadow-lg",
    titulo: "font-extrabold tracking-tight",
    sello: "rounded-lg",
    seccion: "py-12 sm:py-20",
    oscuro: true,
  },
];

/* ── Las tres letras ────────────────────────────────────────────────────────
 *
 * Lo que más separa dos páginas de un vistazo, y casi nadie lo nota mirando:
 * se nota SINTIENDO. La misma página en serif parece de otra empresa.
 *
 * Acá va sólo el nombre de la familia; los archivos los carga
 * `lib/fuentes-venta`, que es el que puede importar `next/font`. Separado a
 * propósito: este archivo lo lee también el editor, que corre en el navegador.
 *
 * `familia` es un stack entero y no un nombre suelto: si la fuente todavía no
 * bajó —o no bajó nunca— el texto se lee igual con la de reserva, y con una del
 * mismo tipo, no con la que le toque a cada aparato. */
export type Tipografia = {
  clave: string;
  nombre: string;
  para: string;
  /** El `font-family` completo, con sus reservas. */
  familia: string;
};

export const TIPOGRAFIAS: readonly Tipografia[] = [
  {
    clave: "moderna",
    nombre: "Moderna",
    para: "Limpia y neutra. La que ves ahora.",
    /* Es la misma de la plataforma, que ya está cargada en todas las páginas:
       elegir ésta no baja ni un archivo más. */
    familia: "var(--font-marca), ui-sans-serif, system-ui, sans-serif",
  },
  {
    clave: "clasica",
    nombre: "Clásica",
    para: "Con serifas, como un libro. Se lee seria.",
    familia: "var(--pv-serif), Georgia, 'Times New Roman', serif",
  },
  {
    clave: "marcada",
    nombre: "Marcada",
    para: "Geométrica y redonda. Se lee moderna y cercana.",
    familia: "var(--pv-geo), ui-sans-serif, system-ui, sans-serif",
  },
];

/** Una letra desconocida vuelve a la primera. Nunca deja la página sin fuente. */
export function buscarTipografia(clave: unknown): Tipografia {
  return TIPOGRAFIAS.find((t) => t.clave === clave) ?? TIPOGRAFIAS[0];
}
/* ── Lo que se ve FUERA de la página ────────────────────────────────────────
 *
 * Dos textos que no se dibujan en ningún lado de la página y sin embargo son
 * lo primero que la gente ve de ella: el renglón de Google y —sobre todo— la
 * tarjeta que aparece al pegar el link en WhatsApp, en Instagram o en un
 * anuncio. Para este rubro esa tarjeta pesa más que Google: la venta arranca
 * casi siempre en un link compartido, no en una búsqueda.
 *
 * Vacíos NO rompen nada: caen en el nombre y la descripción del producto, que
 * es lo que se usaba hasta ahora. Se pueden escribir porque sirven para cosas
 * distintas — el título de la página es una promesa y puede ser largo; el de
 * Google se corta a los 60 caracteres y conviene que tenga la palabra que la
 * gente busca.
 *
 * ⚠️ Van sueltos y no como una sección más: una sección es un bloque que se
 * dibuja, se apaga y se ordena. Esto no se dibuja nunca. Meterlo en la lista
 * obligaría a inventarle un `visible` y un lugar en el orden que no significan
 * nada.
 */
export const CAMPOS_SEO: readonly Campo[] = [
  { clave: "titulo", etiqueta: "Título en Google y al compartir", tipo: "texto", largo: 60,
    ayuda: "Se corta a los 60 caracteres. Vacío usa el nombre del producto." },
  { clave: "descripcion", etiqueta: "Descripción", tipo: "parrafo", largo: 160,
    ayuda: "El renglón de abajo en Google y en la tarjeta de WhatsApp. Vacía usa la descripción del producto." },
];

/* ── Los tres fondos ────────────────────────────────────────────────────────
 *
 * Cada sección elige con cuál de estos tres se dibuja. Es una LISTA CERRADA y
 * no un selector de color libre, y eso no es por ahorrar trabajo:
 *
 *   · Con lista cerrada, el contraste de cada texto sobre cada fondo está
 *     medido de antemano y hay una prueba que lo verifica. Con un selector
 *     libre el color se elige en el momento y no hay nada que verificar —
 *     alguien pone un celeste lindo y el texto tenue desaparece.
 *   · Los tres salen del color que ya eligió la persona, así que no hay
 *     combinación fea posible: cambiás la paleta y los tres cambian juntos.
 *
 * Lo que SÍ da esto, y era el pedido: dos páginas con el mismo estilo y la
 * misma paleta se ven distintas si una alterna suave/fondo y la otra tiene tres
 * bloques fuertes seguidos. */
export type Tono = { clave: string; nombre: string; para: string };

export const TONOS: readonly Tono[] = [
  { clave: "fondo",  nombre: "Fondo",  para: "El fondo de la página" },
  { clave: "suave",  nombre: "Suave",  para: "Un tinte del color elegido" },
  { clave: "fuerte", nombre: "Fuerte", para: "El mismo color, más marcado" },
];

/** Un tono desconocido vuelve al primero. Nunca rompe. */
export function buscarTono(clave: unknown): Tono {
  return TONOS.find((t) => t.clave === clave) ?? TONOS[0];
}
/**
 * Una paleta.
 *
 * `sobreAcento` no es decorativo: es el color del texto ARRIBA del botón. Si
 * fuera siempre blanco, un acento claro dejaría el botón ilegible.
 */
export type Paleta = {
  clave: string;
  nombre: string;
  /** El texto y los títulos. */
  tinta: string;
  /** El botón de comprar y lo que hay que mirar. */
  acento: string;
  /** El texto ARRIBA del acento. */
  sobreAcento: string;
  /**
   * El acento en el estilo Nocturno, y el texto que va encima.
   *
   * ⚠️ No es un capricho: MEDIDO, los acentos oscuros no se despegan del fondo
   * oscuro. Grafito daba 1,28 sobre 3 que hace falta — o sea que el botón de
   * comprar quedaba casi invisible. Azul y Violeta tampoco llegaban.
   *
   * Por eso en oscuro el botón se da vuelta: fondo claro y letra oscura. Es el
   * mismo color de la paleta, más claro.
   */
  acentoOscuro: string;
  sobreAcentoOscuro: string;
  /** El fondo de la página. */
  fondo: string;
  /**
   * Los otros dos fondos: el mismo acento mezclado con blanco al 10% y al 22%.
   *
   * ⚠️ Los números no son al ojo. Con el acento al 22% el texto tenue queda
   * entre 4,91 y 5,60 sobre el mínimo de 4,5; más fuerte que eso y el gris
   * deja de leerse. Si mañana se agrega una paleta, hay una prueba que mide
   * los dos tonos y falla si alguno no llega.
   */
  suave: string;
  fuerte: string;
  /** El tono fuerte del estilo Nocturno: el acento claro sobre el fondo oscuro. */
  fuerteOscuro: string;
};

/* Los acentos son tonos oscuros a propósito. Los claros del mismo color se ven
   más lindos en la tarjetita del panel y dejan el texto del botón por debajo del
   contraste mínimo — ver los chequeos, que lo calculan. */
export const PALETAS: readonly Paleta[] = [
  { clave: "naranja", nombre: "Naranja", tinta: "#0f172a", acento: "#c2410c", sobreAcento: "#ffffff", acentoOscuro: "#fb923c", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#f9ece7", fuerte: "#f2d5ca", fuerteOscuro: "#2d2424" },
  { clave: "azul",    nombre: "Azul",    tinta: "#0f172a", acento: "#1d4ed8", sobreAcento: "#ffffff", acentoOscuro: "#60a5fa", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#e8edfb", fuerte: "#cdd8f6", fuerteOscuro: "#17273f" },
  { clave: "verde",   nombre: "Verde",   tinta: "#0f172a", acento: "#15803d", sobreAcento: "#ffffff", acentoOscuro: "#4ade80", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#e8f2ec", fuerte: "#cce3d4", fuerteOscuro: "#142f2d" },
  { clave: "violeta", nombre: "Violeta", tinta: "#0f172a", acento: "#6d28d9", sobreAcento: "#ffffff", acentoOscuro: "#a78bfa", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#f0eafb", fuerte: "#dfd0f7", fuerteOscuro: "#21233f" },
  { clave: "rosa",    nombre: "Rosa",    tinta: "#0f172a", acento: "#be185d", sobreAcento: "#ffffff", acentoOscuro: "#f472b6", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#f9e8ef", fuerte: "#f1ccdb", fuerteOscuro: "#2c1f35" },
  { clave: "grafito", nombre: "Grafito", tinta: "#0f172a", acento: "#1e293b", sobreAcento: "#ffffff", acentoOscuro: "#e2e8f0", sobreAcentoOscuro: "#0f172a", fondo: "#ffffff", suave: "#e9eaeb", fuerte: "#ced0d4", fuerteOscuro: "#29303d" },
];

export const buscarEstilo = (clave: unknown): Estilo =>
  ESTILOS.find((e) => e.clave === clave) ?? ESTILOS[0];

export const buscarPaleta = (clave: unknown): Paleta =>
  PALETAS.find((p) => p.clave === clave) ?? PALETAS[0];

/** Una sección, como queda guardada. El orden del array ES el orden de la página. */
export type SeccionGuardada = {
  clave: string;
  visible: boolean;
  /** Clave de `TONOS`. Una desconocida vuelve a la primera, nunca rompe. */
  tono: string;
  campos: Record<string, unknown>;
};

export type PaginaVenta = {
  /** Clave de `ESTILOS`. Una desconocida vuelve a la primera, nunca rompe. */
  estilo: string;
  /** Clave de `PALETAS`. Idem. */
  paleta: string;
  /** Clave de `TIPOGRAFIAS`. Idem. */
  tipografia: string;
  /** Los textos de `CAMPOS_SEO`. No se dibujan: viajan en las cabeceras. */
  seo: Record<string, unknown>;
  secciones: SeccionGuardada[];
};

export function buscarSeccion(clave: string): Seccion | null {
  return SECCIONES.find((s) => s.clave === clave) ?? null;
}

/* ── Si una sección se dibuja o no ──────────────────────────────────────────
 *
 * ⚠️ **Una sola regla, leída desde los dos lados**: la usa la página pública
 * para decidir qué pinta, y el editor para avisar "esta no se va a ver, y por
 * qué". Si fueran dos, el panel diría una cosa y la página haría otra — que es
 * la peor forma de descubrir que tu página salió a medias.
 *
 * Estar encendida no alcanza. Un "Además te llevás gratis" sin ningún bono
 * abajo, o un "Preguntas frecuentes" sin preguntas, se leen como que la página
 * se rompió; no tenerlos, no. */

const conAlgo = (v: unknown): boolean =>
  Array.isArray(v) && v.some((i) => i && typeof i === "object" &&
    Object.values(i as Record<string, unknown>).some((x) => typeof x === "string" && x.length > 0));

const hayTexto = (v: unknown): boolean => typeof v === "string" && v.length > 0;

/** Qué necesita saber la regla y no está adentro del contenido. */
export type ContextoDePagina = { hayBonos: boolean };

/**
 * Por qué esta sección NO se va a ver. `null` = se ve.
 *
 * Devuelve el motivo y no un `false` a secas porque el editor lo muestra tal
 * cual: "no se dibuja" sin decir por qué se lee como un error nuestro.
 */
export function porQueNoSeDibuja(s: SeccionGuardada, ctx: ContextoDePagina): string | null {
  if (!s.visible) return "Está apagada";

  switch (s.clave) {
    case "bonos":
      return ctx.hayBonos ? null : "Todavía no cargaste ningún bono";
    case "beneficios":
      return conAlgo(s.campos.items) ? null : "Todavía no escribiste ningún beneficio";
    case "dolores":
      return conAlgo(s.campos.items) ? null : "Todavía no escribiste ninguna situación";
    case "comoFunciona":
      return conAlgo(s.campos.pasos) ? null : "Todavía no escribiste ningún paso";
    case "opiniones":
      return conAlgo(s.campos.items) ? null : "Todavía no cargaste ninguna opinión";
    case "preguntas":
      return conAlgo(s.campos.items) ? null : "Todavía no escribiste ninguna pregunta";
    case "garantia":
      return hayTexto(s.campos.texto) ? null : "Todavía no escribiste qué prometés";
    case "urgencia":
      return hayTexto(s.campos.hasta) ? null : "Falta la fecha en que termina";
    /* Muestra compras REALES, y todavía no hay ninguna venta digital en el
       sistema. Lo que no va a hacer nunca es inventar una. */
    case "avisoDeVentas":
      return "Va a aparecer con tu primera venta";
    default:
      return null;
  }
}

/**
 * Reemplaza `{dias}` por el número que tiene la sección.
 *
 * Existe para que el número viva en UN solo campo. Escrito a mano en el título y
 * en el texto, se corrige uno y queda un título que dice 7 al lado de una
 * garantía de 30.
 *
 * Va con `split`/`join` y no con una expresión regular: las llaves tienen
 * significado propio ahí adentro y este texto lo escribe una persona.
 */
export function conFichas(
  valor: string,
  campos: Record<string, unknown>,
  extra?: { anio?: number }
): string {
  let salida = valor;
  if (salida.includes(FICHA_DIAS)) {
    const dias = typeof campos.dias === "number" ? String(campos.dias) : "";
    salida = salida.split(FICHA_DIAS).join(dias);
  }
  /* ⚠️ El año llega de afuera y no se saca acá con `new Date()`. Dos motivos:
     esta función tiene que dar siempre lo mismo con las mismas entradas —si no,
     no se puede chequear—, y el año lo tiene que resolver quien sabe cuándo se
     está dibujando la página. */
  if (salida.includes(FICHA_ANIO) && typeof extra?.anio === "number") {
    salida = salida.split(FICHA_ANIO).join(String(extra.anio));
  }
  return salida;
}

/** Atajo para la página pública, que sólo necesita el sí o el no. */
export const seDibuja = (s: SeccionGuardada, ctx: ContextoDePagina): boolean =>
  porQueNoSeDibuja(s, ctx) === null;

/* ── Normalizar ─────────────────────────────────────────────────────────────
 *
 * Todo lo que llega de afuera pasa por acá, y sale una página válida SIEMPRE.
 * No devuelve errores: recorta, descarta lo que no conoce y completa lo que
 * falta. El motivo es que esta misma función atiende dos puertas distintas —el
 * panel y la IA— y ninguna de las dos puede dejar la página en un estado que la
 * pantalla no sepa dibujar.
 *
 * Lo que garantiza, y por qué cada cosa:
 *
 *   - **Sólo claves del catálogo.** Una sección inventada no entra. Sin esto, lo
 *     que devuelva la IA se guarda tal cual y después se dibuja.
 *   - **Ninguna repetida.** Dos "precio" en la misma página son dos botones de
 *     comprar con dos números.
 *   - **Están todas.** Si falta una, se agrega apagada en su lugar. Así una
 *     sección nueva del catálogo aparece sola en las páginas viejas.
 *   - **Lo que no se puede ocultar, va visible.** El precio y el producto no se
 *     apagan mandando `visible: false` a mano.
 *   - **Lo que no se puede mover, vuelve a su lugar.** La portada primera, el
 *     pie último, aunque el pedido diga otra cosa.
 *   - **Todo texto recortado a su tope**, con `limpiarTexto`, igual que en el
 *     resto de la app.
 */
export function normalizarContenido(valor: unknown): PaginaVenta {
  const entrada = leerSecciones(valor);

  /* Lo que vino, en su orden, sin desconocidas y sin repetidas. */
  const vistas = new Set<string>();
  const enOrden: SeccionGuardada[] = [];
  for (const cruda of entrada) {
    const clave = typeof cruda?.clave === "string" ? cruda.clave : null;
    if (!clave || vistas.has(clave)) continue;
    const def = buscarSeccion(clave);
    if (!def) continue;
    vistas.add(clave);
    enOrden.push(normalizarSeccion(def, cruda));
  }

  /* Las que faltan se agregan en el lugar que tienen en el catálogo. Van con su
     `encendida` de fábrica sólo si la página venía vacía; si la persona ya
     ordenó su página y aparece una sección nueva, entra apagada para no
     cambiarle la página sin avisar. */
  const paginaNueva = enOrden.length === 0;
  for (let i = 0; i < SECCIONES.length; i++) {
    const def = SECCIONES[i];
    if (vistas.has(def.clave)) continue;
    const nueva = normalizarSeccion(def, null);
    if (!paginaNueva && def.sePuedeOcultar) nueva.visible = false;
    enOrden.splice(Math.min(i, enOrden.length), 0, nueva);
  }

  /* Las clavadas vuelven a su lugar del catálogo, venga lo que venga. */
  const sueltas = enOrden.filter((s) => buscarSeccion(s.clave)?.sePuedeMover !== false);
  const finales: SeccionGuardada[] = [...sueltas];
  for (let i = 0; i < SECCIONES.length; i++) {
    const def = SECCIONES[i];
    if (def.sePuedeMover) continue;
    const fija = enOrden.find((s) => s.clave === def.clave);
    if (fija) finales.splice(Math.min(i, finales.length), 0, fija);
  }

  /* Una clave de estilo o de paleta que no conocemos vuelve a la primera. No se
     guarda lo que llegó: si mañana se saca una paleta, las páginas que la usaban
     se dibujan con la de fábrica y no con un color que ya no existe. */
  const suelto = leerObjeto(valor);
  return {
    estilo: buscarEstilo(suelto?.estilo).clave,
    paleta: buscarPaleta(suelto?.paleta).clave,
    tipografia: buscarTipografia(suelto?.tipografia).clave,
    seo: normalizarSeo(suelto?.seo),
    secciones: finales,
  };
}

/**
 * Los textos de buscadores, con los mismos topes que todo lo demás.
 *
 * Pasa por `normalizarCampo` igual que un campo de sección: lo que no está en
 * `CAMPOS_SEO` se descarta y lo largo se recorta. Un título de 400 caracteres
 * no rompe la página —no se dibuja— pero le llega entero a Google.
 */
function normalizarSeo(valor: unknown): Record<string, unknown> {
  const origen = valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
  const seo: Record<string, unknown> = {};
  for (const campo of CAMPOS_SEO) {
    /* `esNueva` en false a propósito: acá NO hay texto de fábrica que poner.
       Vacío significa 'usá el del producto', que es lo que hace la página. */
    seo[campo.clave] = normalizarCampo(campo, origen[campo.clave], false);
  }
  return seo;
}

/** El objeto de arriba de todo, venga como objeto o como JSON. */
function leerObjeto(valor: unknown): Record<string, unknown> | null {
  if (typeof valor === "string") {
    try {
      return leerObjeto(JSON.parse(valor));
    } catch {
      return null;
    }
  }
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function leerSecciones(valor: unknown): Array<Record<string, unknown>> {
  if (typeof valor === "string") {
    try {
      return leerSecciones(JSON.parse(valor));
    } catch {
      return [];
    }
  }
  if (!valor || typeof valor !== "object") return [];
  const lista = (valor as { secciones?: unknown }).secciones;
  if (!Array.isArray(lista)) return [];
  /* Tope duro por si llega un array enorme: el catálogo tiene un largo fijo, así
     que más que eso es basura o un intento de hacernos trabajar de más. */
  return lista.slice(0, SECCIONES.length * 4).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)
  );
}

function normalizarSeccion(def: Seccion, cruda: Record<string, unknown> | null): SeccionGuardada {
  const visible = def.sePuedeOcultar ? cruda?.visible !== false : true;
  const crudos = cruda?.campos;
  const origen: Record<string, unknown> =
    crudos && typeof crudos === "object" && !Array.isArray(crudos)
      ? (crudos as Record<string, unknown>)
      : {};

  const campos: Record<string, unknown> = {};
  for (const campo of def.campos) {
    campos[campo.clave] = normalizarCampo(campo, origen[campo.clave], cruda === null);
  }
  /* Una sección sin `tono` en el catálogo no dibuja franja, así que el que
     venga se descarta: guardar un fuerte que nunca se ve es guardar mentira. */
  const tono = def.tono ? buscarTono(cruda?.tono ?? def.tono).clave : TONOS[0].clave;

  return {
    clave: def.clave,
    visible: cruda === null ? def.encendida && visible : visible,
    tono,
    campos,
  };
}

/**
 * El primer símbolo de un texto, o vacío.
 *
 * ⚠️ Dos cosas que parecen detalle y no lo son:
 *
 *   · Un emoji puede ser VARIOS caracteres —una bandera, o uno con modificador
 *     de color— así que cortar con `slice(0, 1)` deja medio dibujo, que se ve
 *     como un cuadradito. `Intl.Segmenter` los cuenta como uno solo.
 *   · Las letras y los números se descartan. En el campo de la competencia se
 *     escribe cualquier cosa; si alguien escribe "hola" acá, no puede quedar
 *     una "h" suelta adentro del círculo donde va el ícono.
 */
function primerSimbolo(texto: string): string {
  const t = texto.trim();
  if (!t) return "";

  let primero: string;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const partes = new Intl.Segmenter("es", { granularity: "grapheme" }).segment(t);
    primero = [...partes][0]?.segment ?? "";
  } else {
    primero = Array.from(t)[0] ?? "";
  }

  if (/[\p{L}\p{N}]/u.test(primero)) return "";
  return primero;
}

function normalizarCampo(campo: Campo, valor: unknown, esNueva: boolean): unknown {
  if (campo.tipo === "lista") {
    const hijos = campo.campos ?? [];
    const tope = campo.maxItems ?? 0;
    if (!Array.isArray(valor)) return [];
    const items: Array<Record<string, unknown>> = [];
    for (const cruda of valor.slice(0, tope)) {
      if (!cruda || typeof cruda !== "object" || Array.isArray(cruda)) continue;
      const item: Record<string, unknown> = {};
      let algo = false;
      for (const hijo of hijos) {
        const limpio = normalizarCampo(hijo, (cruda as Record<string, unknown>)[hijo.clave], false);
        item[hijo.clave] = limpio;
        if (typeof limpio === "string" && limpio.length > 0) algo = true;
      }
      /* Un ítem con todos los campos vacíos dibuja una fila en blanco. */
      if (algo) items.push(item);
    }
    return items;
  }

  if (campo.tipo === "icono") {
    return primerSimbolo(limpiarTexto(valor, campo.largo) ?? "");
  }

  if (campo.tipo === "numero") {
    const piso = campo.min ?? 0;
    const techo = campo.max ?? Number.MAX_SAFE_INTEGER;
    const base = campo.porDefecto ?? piso;
    /* Llega del navegador, así que puede venir como texto. Lo que no sea un
       número usable vuelve al DE FÁBRICA, no al piso: la casilla vacía es lo que
       manda el editor cuando la borrás, y ahí querés los 10 de vuelta, no un 1.
       Y un campo de días vacío dibujaría "Garantía de  días".

       ⚠️ Se mira el tipo antes de convertir. `Number("")`, `Number(null)` y
       `Number([])` son 0 —los tres— así que un `Number()` a secas los da por
       válidos y los baja al piso. */
    let n: number;
    if (typeof valor === "number") n = valor;
    else if (typeof valor === "string" && valor.trim() !== "") n = Number(valor);
    else return base;
    if (!Number.isFinite(n)) return base;
    return Math.min(techo, Math.max(piso, Math.round(n)));
  }

  if (campo.tipo === "fecha") {
    if (typeof valor !== "string") return null;
    const t = Date.parse(valor);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }

  if (campo.tipo === "imagen") {
    const limpio = limpiarTexto(valor, campo.largo);
    /* Sólo direcciones https. Un `javascript:` o un `data:` acá terminan
       adentro de un atributo de la página pública. */
    return limpio && /^https:\/\//i.test(limpio) ? limpio : "";
  }

  const limpio = limpiarTexto(valor, campo.largo);
  if (limpio) return limpio;
  /* Vacío es vacío, salvo lo que rompe la página: el botón de comprar sin texto
     es un botón que no se lee. */
  if (campo.obligatorio) return campo.ejemplo ?? "";
  return esNueva ? campo.ejemplo ?? "" : "";
}

/** La página con la que nace un producto: todo por defecto. */
export function contenidoPorDefecto(): PaginaVenta {
  return normalizarContenido(null);
}
