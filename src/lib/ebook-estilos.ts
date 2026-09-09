/**
 * Cómo está ARMADA la hoja del ebook.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL EJE QUE FALTABA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 09/09/26 había dos elecciones y ninguna era ésta:
 *
 *   · el **formato** (`ebook-opciones`) dice DE QUÉ SE TRATA — texto o
 *     recetario — y por eso cambia lo que se le pide al modelo;
 *   · el **tema** y la **paleta** (`ebook-colores`) dicen DE QUÉ COLOR SALE.
 *
 * Faltaba cómo está puesta la hoja: una columna o dos, dónde caen los
 * subtítulos, qué tan grande abre un capítulo. Eso era uno solo y no se elegía.
 *
 * ── ⚠️ Por qué esto es GRATIS y el formato no ──────────────────────────────
 *
 * **El estilo no toca una sola palabra del texto.** Los capítulos escritos son
 * los mismos; lo único que cambia es dónde se apoya cada cosa en la hoja. Así
 * que cambiar de estilo es volver a armar el PDF con lo que ya está pago —el
 * mismo camino que cambiar el color— y no una generación nueva. El formato sí
 * cuesta: un recetario son campos, no párrafos, y hay que volver a pedirlos.
 *
 * ── Por qué no se importa nada acá adentro ─────────────────────────────────
 *
 * Igual que `ebook-colores`: esto lo miran el PDF **y la pantalla**. Un solo
 * `import` de pdfkit acá arrastraría la biblioteca entera al paquete que baja
 * cada persona. Entran claves y salen números.
 *
 * ── ⚠️ Nuestros nombres, no los de al lado ─────────────────────────────────
 *
 * Está decidido en el documento y se sostiene acá: "Revista / Editorial /
 * Notas al margen / Collage" por separado son genéricos, pero los cuatro
 * juntos son la selección de otro. Estos cuatro son los nuestros, y cada uno
 * se llama por lo que hace con la hoja.
 */

export const ESTILOS = ["libro", "compacto", "manual", "cartel"] as const;
export type EstiloDeEbook = (typeof ESTILOS)[number];

/**
 * Cuáles se pueden armar HOY.
 *
 * Existe por el mismo motivo que `FORMATOS_LISTOS`: si mañana se empieza un
 * molde y queda a medias, se lo saca de acá y la pantalla lo apaga sola, en vez
 * de entregar un PDF que no es el que se eligió. Hoy están los cuatro.
 */
export const ESTILOS_LISTOS: readonly EstiloDeEbook[] = ["libro", "compacto", "manual", "cartel"];

export const ESTILO_DE_FABRICA: EstiloDeEbook = "libro";

/**
 * Cómo se llama cada uno en pantalla, y qué hace de verdad.
 *
 * ⚠️ La explicación dice **lo que cambia en la hoja**, no un adjetivo. "Elegante
 * y premium" no le sirve a nadie para elegir: las cuatro salen elegantes. Lo que
 * se necesita saber es si va a tener dos columnas y si se va a poder imprimir.
 *
 * Y el contra de cada uno va escrito. Un selector donde las cuatro opciones son
 * buenas no ayuda a elegir; uno que dice cuál se lee peor en el celular, sí.
 */
export const QUE_ES_CADA_ESTILO: Record<
  EstiloDeEbook,
  {
    nombre: string;
    explica: string;
    contra: string;
    /**
     * Qué hace con LA HOJA DE UNA RECETA, que no es prosa.
     *
     * ⚠️ Está aparte porque un recetario no tiene columnas de texto corrido ni
     * subtítulos: tiene fichas, ingredientes y pasos. Con el texto de arriba,
     * el selector de un recetario prometía "una franja al costado donde caen
     * los subtítulos" — algo que ese archivo nunca iba a tener.
     */
    receta: string;
  }
> = {
  libro: {
    nombre: "Libro",
    explica: "Una columna, con aire, y cada capítulo abre con su foto y su número.",
    contra: "Es el más largo en hojas.",
    receta: "Foto ancha arriba, las tres fichas en una fila y abajo los ingredientes y los pasos.",
  },
  compacto: {
    nombre: "Compacto",
    explica: "Dos columnas, como un diario. El título va sobre la foto y entra casi el doble por hoja.",
    contra: "En el celular se lee peor: hay que subir y bajar por cada columna.",
    receta: "La foto cuadrada al lado del título: se gana alto y entra una receta más larga.",
  },
  manual: {
    nombre: "Manual",
    explica: "Columna angosta y una franja al costado donde caen los subtítulos, afuera del texto.",
    contra: "El renglón es corto: un texto largo se estira en más hojas.",
    receta: "Rinde, tiempo y cocción en la franja del costado, a la vista mientras bajás por los pasos.",
  },
  cartel: {
    nombre: "Cartel",
    explica: "Títulos enormes, fotos a toda la hoja y los subtítulos resaltados en color.",
    contra: "Gasta mucha tinta si alguien lo imprime.",
    receta: "La foto tapa lo alto de la hoja y el título de la receta va encima.",
  },
};

/**
 * Las medidas de un estilo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES UNA TABLA DE DECISIONES, NO CUATRO COPIAS DEL DIBUJANTE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cuatro moldes podían salir de dos formas: cuatro funciones que dibujan la
 * hoja entera, o **una sola que lee números de acá**. Va la segunda, y no por
 * gusto: el dibujante de `ebook-pdf` tiene adentro seis arreglos que costaron
 * ebooks rotos —la hoja en blanco de la viñeta, el párrafo que salía con la
 * letra del pie, el número del capítulo perdido sobre una foto clara—. Cada uno
 * está anotado ahí con el caso que lo provocó. Con cuatro copias, esos seis
 * arreglos viven en una sola y los otros tres estilos vuelven a tener los bugs
 * de julio.
 *
 * El mismo patrón que ya usa `Medidas` (HOLGADA / APRETADA / AL_LIMITE) para
 * acomodar una receta: una tabla, un dibujante.
 */
export type Molde = {
  /* ── La hoja ───────────────────────────────────────────────────────────── */

  /** El margen lateral. Todo lo que no va a sangre arranca acá. */
  margen: number;
  /** Dónde puede empezar a escribir el texto, y dónde tiene que parar. */
  arriba: number;
  abajo: number;

  /* ── El cuerpo ─────────────────────────────────────────────────────────── */

  /**
   * En cuántas columnas se escribe.
   *
   * ⚠️ Con dos, el texto NO lo corta pdfkit solo: hay que partir cada párrafo a
   * mano y pasarlo de columna. Ver `escribirParrafo` en `ebook-pdf`.
   */
  columnas: 1 | 2;
  /** El aire entre las dos columnas, y entre la franja y el texto. */
  calle: number;
  /**
   * Cuánto se lleva la franja del costado, a la IZQUIERDA del texto. 0 = no hay.
   *
   * Cuando hay franja, el cuerpo se corre a la derecha y los subtítulos se
   * dibujan acá, a la altura del renglón donde iban. Es lo que hace que un
   * manual se pueda hojear buscando el subtítulo sin leer nada.
   */
  franja: number;
  /** El cuerpo del texto y el aire entre renglones. */
  cuerpo: number;
  interlinea: number;
  /**
   * Justificado o alineado a la izquierda.
   *
   * ⚠️ Justificar una columna angosta abre ríos de espacio en blanco entre las
   * palabras. Por eso `manual` va a la izquierda y `libro` justificado: la
   * diferencia es el ancho del renglón, no el gusto.
   */
  alineado: "justify" | "left";
  /**
   * El primer párrafo del capítulo, más grande y en otro color.
   *
   * ⚠️ Es una **entrada**, no una letra capital. Una capital de verdad tiene
   * que envolverse con los tres primeros renglones, y pdfkit no sabe correr un
   * renglón: habría que medir y dibujar el párrafo renglón por renglón a mano.
   * La entrada logra lo mismo —que el capítulo arranque con algo— con lo que la
   * biblioteca sí sabe hacer bien.
   */
  entrada: boolean;

  /* ── Cómo abre cada capítulo ───────────────────────────────────────────── */

  /**
   * - `banda`: la foto arriba, el número grande apoyado en el papel, y la caja
   *   con lo que viene. Es el de siempre.
   * - `sangre`: la foto tapa la hoja y el título va ENCIMA, sobre un velo.
   * - `ficha`: la foto chica al costado y el título al lado, sin banda.
   */
  portadilla: "banda" | "sangre" | "ficha";
  altoFoto: number;
  /** El número del capítulo, en puntos. */
  numero: number;

  /* ── Los adornos ───────────────────────────────────────────────────────── */

  /**
   * - `raya`: una rayita de acento en el margen, al lado del subtítulo.
   * - `linea`: una línea fina de lado a lado, arriba del subtítulo.
   * - `resaltado`: el subtítulo con el fondo de acento, como un marcador.
   */
  subtitulo: "raya" | "linea" | "resaltado";
  subtituloPt: number;
  /** El redondeo de los recuadros. 0 son esquinas rectas. */
  esquina: number;

  /* ── La hoja de UNA RECETA ─────────────────────────────────────────────── */

  /**
   * Cómo se acomoda una receta, que no es prosa: es una ficha.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ POR QUÉ ES UN CAMPO APARTE Y NO SALE DE `portadilla`
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Los campos de arriba —columnas, franja, entrada, subtítulo— están hechos
   * para prosa, y una receta no tiene nada de eso. Hasta el 09/09/26 la hoja de
   * una receta no leía el molde: las cuatro salían iguales adentro y el estilo
   * le cambiaba nada más que la tapa.
   *
   * - `banda`: la foto ancha arriba, las tres fichas en una fila a todo el
   *   ancho, y abajo los ingredientes y los pasos. **Es el de siempre.**
   * - `ficha`: la foto cuadrada al lado del título, nunca de banda. Gana el
   *   alto que se llevaba la banda, así que entra una receta más larga sin que
   *   la hoja tenga que apretar la letra.
   * - `franja`: las tres fichas apiladas arriba de los ingredientes, en la
   *   columna del costado, en vez de en una fila arriba. Es como se lee una
   *   receta cocinando: el tiempo a la vista mientras se baja por los pasos.
   * - `sangre`: la foto tapa lo alto de la hoja y el título va encima.
   *
   * ⚠️ El acomodo lo elige el MOLDE; qué tan apretada sale la hoja lo sigue
   * decidiendo la medición (`HOLGADA` / `APRETADA` / `AL_LIMITE` en
   * `ebook-pdf`). Son dos cosas distintas y no se pisan: el molde dice dónde va
   * cada cosa, la medición dice de qué tamaño para que la receta no se parta.
   */
  receta: "banda" | "ficha" | "franja" | "sangre";

  /* ── La tapa ───────────────────────────────────────────────────────────── */

  /**
   * - `clasica`: la foto arriba y el texto abajo, en el papel. En tema oscuro
   *   pasa sola a foto entera con velo, que es como ya venía funcionando.
   * - `titular`: la foto arriba y el título adentro de una franja de acento.
   * - `ficha`: la foto a la derecha y el texto a la izquierda, al costado.
   * - `sangre`: la foto tapa la hoja SIEMPRE, con el texto encima del velo.
   */
  tapa: "clasica" | "titular" | "ficha" | "sangre";
  /** El título de la tapa, en puntos. */
  tituloTapa: number;
};

/**
 * ⚠️ Los cuatro tienen que dar una hoja que se pueda leer, no cuatro grados de
 * lo mismo. Si dos salen parecidos, el selector le está haciendo perder el
 * tiempo a alguien que después no ve la diferencia en el archivo que vende.
 */
export const MOLDES: Record<EstiloDeEbook, Molde> = {
  /* El de siempre. Los números son EXACTAMENTE los que tenía `ebook-pdf`
     escritos adentro: quien ya generó un ebook y lo vuelve a armar tiene que
     recibir el mismo archivo, no uno parecido. */
  libro: {
    margen: 56, arriba: 92, abajo: 78,
    columnas: 1, calle: 0, franja: 0,
    cuerpo: 11.5, interlinea: 3, alineado: "justify", entrada: false,
    portadilla: "banda", altoFoto: 350, numero: 72,
    subtitulo: "raya", subtituloPt: 13, esquina: 10,
    receta: "banda",
    tapa: "clasica", tituloTapa: 30,
  },

  /* Dos columnas. El cuerpo BAJA a 10 puntos porque un renglón de 10 palabras
     con letra de 11,5 se corta cada tres palabras y queda ilegible. */
  compacto: {
    margen: 48, arriba: 92, abajo: 78,
    columnas: 2, calle: 22, franja: 0,
    cuerpo: 10, interlinea: 2.2, alineado: "justify", entrada: true,
    portadilla: "sangre", altoFoto: 300, numero: 60,
    subtitulo: "linea", subtituloPt: 11, esquina: 0,
    receta: "ficha",
    tapa: "titular", tituloTapa: 32,
  },

  /* La franja de 132 puntos entra justo: quedan 343 de texto, que con cuerpo de
     11 son unos 60 caracteres por renglón — el ancho que se lee cómodo. Con la
     franja más ancha el renglón baja de 50 y el ebook se estira sin motivo. */
  manual: {
    margen: 50, arriba: 92, abajo: 78,
    columnas: 1, calle: 20, franja: 132,
    cuerpo: 11, interlinea: 3.2, alineado: "left", entrada: false,
    portadilla: "ficha", altoFoto: 200, numero: 56,
    subtitulo: "raya", subtituloPt: 12.5, esquina: 4,
    receta: "franja",
    tapa: "ficha", tituloTapa: 31,
  },

  /* Todo grande. El cuerpo SUBE a 12,5: si el resto de la hoja grita y el texto
     se queda en 11,5, el texto parece la letra chica de un contrato. */
  cartel: {
    margen: 46, arriba: 92, abajo: 78,
    columnas: 1, calle: 0, franja: 0,
    cuerpo: 12.5, interlinea: 4.5, alineado: "left", entrada: true,
    portadilla: "sangre", altoFoto: 430, numero: 110,
    subtitulo: "resaltado", subtituloPt: 15, esquina: 0,
    receta: "sangre",
    tapa: "sangre", tituloTapa: 38,
  },
};

/**
 * El molde de un estilo, con red.
 *
 * ⚠️ Nunca falla: un estilo desconocido —un ebook viejo, un pedido hecho a
 * mano— sale con el de fábrica. Es el mismo criterio que `normalizarOpciones`:
 * armar el PDF de algo ya pagado no se corta por una preferencia rara.
 */
export function moldeDe(estilo: string | null | undefined): Molde {
  const clave = (ESTILOS as readonly string[]).includes(estilo ?? "")
    ? (estilo as EstiloDeEbook)
    : ESTILO_DE_FABRICA;
  return MOLDES[clave];
}

/**
 * Las medidas de la hoja de UNA RECETA que miran los tres.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ACÁ Y NO ADENTRO DE `ebook-pdf`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El acomodo lo elige el molde (`receta`), pero las medidas las necesitan tres
 * lugares: el archivo, la miniatura con la que se elige el estilo y la vista
 * previa del editor. Escritas tres veces se desincronizan de a una —alguien
 * agranda la banda en el PDF y la miniatura sigue mostrando la de antes— y
 * entonces se elige mirando una hoja que no es la que sale.
 *
 * Son las mismas que `hojaDeReceta` tenía escritas adentro, con los mismos
 * números: un recetario rearmado tiene que dar el mismo archivo.
 */
export const HOJA_DE_RECETA = {
  /** La columna de los ingredientes, y la calle hasta la de los pasos. */
  ingredientes: 168,
  calle: 26,
  /** La banda ancha de arriba: hasta acá crece, y de acá para abajo no va. */
  bandaMax: 168,
  bandaMin: 70,
  /** El cuadrado de al lado del título. Más chico que el mínimo es una estampilla. */
  ladoMax: 148,
  ladoMin: 74,
  /**
   * La foto a sangre de `cartel`. El mínimo es alto a propósito: una foto a
   * sangre de 120 puntos es una banda ancha que se comió el margen, y entonces
   * `cartel` sale igual que `libro`.
   */
  sangreMax: 400,
  sangreMin: 200,
} as const;

/**
 * Una hoja A4, en puntos.
 *
 * ⚠️ Está acá y no sólo en `ebook-pdf` porque las cuentas de abajo la necesitan
 * y las hacen los dos: el archivo y la pantalla. `ebook-pdf` tiene la suya —se
 * llama `HOJA`— y se la pasa igual a estas funciones: así, el día que el PDF
 * dibuje en otro tamaño, no hay un número escondido acá que se quede viejo.
 */
export const ANCHO_DE_HOJA = 595.28;
export const ALTO_DE_HOJA = 841.89;

/** El ancho de hoja que queda para escribir, sin los dos márgenes. */
export function anchoUtilDe(m: Molde, anchoDeHoja: number = ANCHO_DE_HOJA): number {
  return anchoDeHoja - m.margen * 2;
}

/**
 * Dónde arranca el CUERPO y cuánto mide, que no siempre es el ancho útil.
 *
 * Con franja al costado, el texto se corre a la derecha y se angosta. Sin
 * franja, es el ancho útil entero. Lo usan el PDF y la vista previa, y por eso
 * la cuenta está una sola vez.
 */
export function columnaDeTexto(
  m: Molde, anchoDeHoja: number = ANCHO_DE_HOJA,
): { x: number; ancho: number } {
  const util = anchoUtilDe(m, anchoDeHoja);
  if (m.franja <= 0) return { x: m.margen, ancho: util };
  return { x: m.margen + m.franja + m.calle, ancho: util - m.franja - m.calle };
}

/**
 * El ancho de UNA columna, cuando son dos.
 *
 * Con una sola devuelve la de texto entera, así que quien dibuja no necesita
 * preguntar cuántas hay.
 */
export function anchoDeColumna(m: Molde, anchoDeHoja: number = ANCHO_DE_HOJA): number {
  const { ancho } = columnaDeTexto(m, anchoDeHoja);
  if (m.columnas === 1) return ancho;
  return (ancho - m.calle) / 2;
}
