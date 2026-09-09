import { limpiarTexto } from "@/lib/texto-limpio";

/**
 * Escribir un ebook con IA: qué se le pide al modelo y cómo se lima lo que
 * devuelve.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTO NO ES EL BOTÓN BARATO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Armar el embudo son tres fichas de tres campos y cuesta centavos. Esto es el
 * PRODUCTO: el archivo que alguien va a pagar y bajar. Si sale mal, no es una
 * pantalla fea — es una devolución, y con razón.
 *
 * ── Se escribe de a un capítulo, y no por prolijidad ───────────────────────
 *
 * Una función de este plan de Vercel tiene **60 segundos** y se corta. Un ebook
 * entero son varios minutos de escritura, así que no entra en un pedido ni
 * apretando. Se pide el temario primero y después un capítulo por vez, y lo
 * escrito se guarda en la base entre uno y otro (`EbookIA`).
 *
 * De yapa sale mejor: un modelo al que se le pide "escribime 40 páginas" de una
 * afloja a la mitad y termina resumiendo. Pidiéndole un capítulo por vez, cada
 * uno recibe toda la atención.
 *
 * ── Lo que el modelo NO puede escribir ─────────────────────────────────────
 *
 * La misma lista que en la página de venta, por el mismo motivo: lo que se
 * publica lo firma quien vende. Nada de estadísticas, estudios, casos reales ni
 * testimonios — un modelo los inventa con total naturalidad y suenan
 * perfectos. Nada de promesas de resultado. Y si el tema toca salud, plata o
 * leyes, va la aclaración de que esto no reemplaza a un profesional.
 *
 * Eso último no es cobertura legal nuestra: es de quien vende. El art. 40 de la
 * Ley 24.240 lo alcanza a él primero.
 */

/* ── Lo que escribe la persona ──────────────────────────────────────────── */

/**
 * Lo que se le cuenta al modelo para que escriba el ebook.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 2.500 → 5.000 EL 09/09/26, Y ES EL ÚNICO DE LOS DOS QUE SE SUBIÓ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Este campo **invita a pegar un índice**: el texto de ayuda dice "si ya tenés
 * el índice pensado, pegalo tal cual". Un índice de diez capítulos con una
 * línea cada uno entra en 2.500; uno con capítulo más tres viñetas de detalle
 * —que es el mejor material que nos pueden dar— no entra. O sea que el tope
 * apretaba justo a quien viene MÁS preparado, obligándolo a resumir; y resumir
 * el índice es perder exactamente lo que lo hace suyo.
 *
 * ⚠️ LO QUE CUESTA, PORQUE ESTE TEXTO NO VIAJA UNA VEZ SINO ONCE. Va en la
 * llamada del temario y **otra vez en la de cada capítulo** (ver
 * `pedidoDelCapitulo`), así que 2.500 caracteres de más son unos 6.900 tokens
 * de entrada por ebook: **US$0,02**, sobre los US$0,44 que cuesta un ebook.
 * Un 5% más, y sólo para quien de verdad llena el campo.
 *
 * ── Por qué el nicho del embudo NO se subió ────────────────────────────────
 *
 * Porque no pide lo mismo. `LARGO_DEL_NICHO` pregunta "qué sabés hacer y a
 * quién le sirve", que es un párrafo: ahí más largo no es más información, es
 * relleno — y el relleno entierra la instrucción, que es el peor resultado
 * posible. Sólo se agranda el campo donde lo que se pega es estructura.
 */
export const LARGO_TEMA = 5_000;
export const MINIMO_TEMA = 20;
export const LARGO_PUBLICO = 200;

/* ── La forma del ebook ─────────────────────────────────────────────────── */

/**
 * Cuántos capítulos. El mínimo existe para que no salga un folleto de tres
 * carillas cobrado como ebook; el máximo, porque cada capítulo es una llamada
 * al modelo que se paga.
 *
 * Con 8 capítulos de unas 900 palabras da un PDF de entre 25 y 35 páginas, que
 * es lo que en este mercado se vende como ebook.
 */
export const CAPITULOS_MIN = 5;
export const CAPITULOS_MAX = 10;
export const PALABRAS_POR_CAPITULO = 900;

export const LARGO_TITULO_EBOOK = 120;
export const LARGO_TITULO_CAPITULO = 120;
export const LARGO_RESUMEN_CAPITULO = 400;

/**
 * Cuántos pedazos puede tener un capítulo y cuánto mide cada uno.
 *
 * No son números de adorno: es lo que frena que un capítulo se coma la memoria
 * del que arma el PDF. 60 × 2.000 son 120 KB por capítulo, y diez capítulos
 * 1,2 MB de texto — bastante más de lo que cualquier ebook de verdad ocupa.
 */
export const BLOQUES_MAX = 60;
export const LARGO_BLOQUE = 2_000;

/**
 * Cuántos pedazos necesita un capítulo para contar como escrito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ NO ES UN GUSTO: ES LA REGLA CON LA QUE `leerCapitulos` DESCARTA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un capítulo que queda por debajo de esto no se guarda mal: se guarda bien, y
 * después **desaparece al leerlo** — y todo lo que estaba abajo se corre un
 * lugar, así que el texto del capítulo 4 sale abajo del título del 3. Eso no
 * falla en ningún lado: sale un PDF perfecto que dice cualquier cosa.
 *
 * Por eso es una constante y no un `3` suelto adentro de la función: el editor
 * del texto (`ebook-texto`) tiene que frenar **exactamente acá**, ni un bloque
 * más abajo. Dos copias del número se desincronizan de a una, y la que queda
 * vieja es la que nadie mira.
 */
export const BLOQUES_MIN = 3;

/**
 * Los tipos de pedazo que sabe dibujar el PDF. Nada más entra.
 *
 * ⚠️ `aviso` se sumó el 07/09/26 y es el único que no es texto corrido: sale
 * como un recuadro de color, aparte del párrafo. Agregar uno nuevo acá **no
 * alcanza**: hay que enseñarle al PDF a dibujarlo (`dibujarBloque`), porque
 * todo lo que no reconoce lo dibuja como párrafo y el recuadro no aparecería
 * nunca — sin fallar, que es lo peor.
 */
export const TIPOS_DE_BLOQUE = ["subtitulo", "parrafo", "vineta", "aviso"] as const;
export type TipoDeBloque = (typeof TIPOS_DE_BLOQUE)[number];

export type Bloque = { tipo: TipoDeBloque; texto: string };

/** Cuántas palabras entran en la búsqueda de la foto del capítulo. */
export const LARGO_FOTO = 80;

/** Los textos que vienen del banco de imágenes: dirección, autor, enlace. */
export const LARGO_DIRECCION_FOTO = 500;
export const LARGO_AUTOR_FOTO = 120;

/**
 * Una foto elegida a mano, en vez de buscada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIN ESTO, LAS FOTOS CAMBIABAN SOLAS EN CADA ARMADO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 09/09/26 no se guardaba **ninguna** foto: el armado buscaba de nuevo
 * cada vez, con la frase del capítulo. O sea que rehacer el PDF para arreglar
 * una falta de ortografía podía traer diez fotos distintas — y quien ya había
 * mirado su ebook y le gustaba cómo se veía, lo perdía sin tocar nada.
 *
 * Y era peor que eso: no había forma de decir "esta no, la otra". La única
 * palanca era reescribir la frase de búsqueda y cruzar los dedos.
 *
 * Guardando lo elegido, la foto **queda**. Y se puede cambiar, que es de lo que
 * se trata: el editor muestra lo que hay en el banco y se elige una.
 *
 * ⚠️ Se guarda la DIRECCIÓN, no la imagen. Bajarla y guardarla nosotros sería
 * pagar depósito y tránsito por una foto que Pexels sirve gratis; el armado la
 * baja igual que antes, sólo que ya sabe cuál.
 */
export type FotoElegida = {
  /** El id en el banco. Es lo que evita que dos capítulos elijan la misma. */
  id: string;
  /** De dónde bajarla al armar el PDF. */
  url: string;
  /**
   * Quien la sacó. Va en la hoja de créditos, y para una foto del banco **no
   * es opcional: es la licencia**. Vacío sólo cuando la foto es propia.
   */
  fotografo: string;
  /** La página de la foto en el banco. También va en los créditos. */
  enlace: string;
  /**
   * `true` si la subió quien vende, en vez de sacarla del banco.
   *
   * ⚠️ Cambia DOS reglas, y las dos importan:
   *
   *   · **De dónde puede venir la dirección.** Una del banco tiene que ser de
   *     Pexels; una propia, de nuestro propio depósito. Ninguna puede ser una
   *     dirección cualquiera: lo que se guarda acá lo baja nuestro servidor.
   *   · **Los créditos.** Una foto propia no lleva a nadie a la hoja de
   *     créditos —no hay a quién acreditar— y por eso ahí `fotografo` puede ir
   *     vacío. `creditos` ya descarta los vacíos, así que sale sola.
   */
  propia?: boolean;
};

export type CapituloPlaneado = {
  titulo: string;
  resumen: string;
  /**
   * Con qué buscar la foto de este capítulo en el banco de imágenes.
   *
   * ⚠️ Va acá y no se saca del título porque **el título no describe una
   * foto**. Buscando por título, "Primeros pasos para arrancar esta semana"
   * trajo una guitarra acústica y "Las masas base que no fallan" un pedazo de
   * carne en salsa: 3 de 8 capítulos con una foto de otro tema, adentro de un
   * ebook que se vende.
   *
   * Puede venir vacío —un ebook guardado antes de esta fecha no lo tiene— y en
   * ese caso quien busca cae al título, que es lo que se hacía antes.
   */
  foto: string;
  /**
   * La foto que se eligió a mano para este capítulo, o `null` para que la
   * busque el armado con la frase de arriba. Ver `FotoElegida`.
   */
  fotoElegida?: FotoElegida | null;
};
export type CapituloEscrito = { titulo: string; bloques: Bloque[] };

/* ── El recetario ───────────────────────────────────────────────────────── */

/**
 * La otra clase de ebook.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNA RECETA NO ES PROSA: SON CAMPOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un ebook de texto se arma con párrafos y el molde sólo decide dónde cortan.
 * Una receta no: "500 g de harina" va en una columna con la cantidad alineada
 * a la derecha, "165 °C" va en una ficha arriba, y los pasos van numerados con
 * su bolita. Eso **no se puede sacar de un párrafo** sin adivinar.
 *
 * Por eso el modelo devuelve los campos sueltos y el molde los ubica. Es la
 * diferencia entre un recetario de verdad y un texto largo sobre cocina.
 *
 * ⚠️ Cada receta ocupa UNA hoja, y una hoja no es elástica: los topes de acá
 * abajo no son manía de ordenado, son lo que hace que entre. Ver
 * `hojaDeReceta` en `ebook-pdf.ts`.
 *
 * ── Por qué bajaron el 07/09/26 ────────────────────────────────────────────
 *
 * Estaban en 9 pasos de 200 caracteres, y con eso la receta más grande que el
 * limado dejaba pasar **no entraba en la hoja ni con la maqueta más apretada**.
 * Se midió: faltaban 32 puntos. Un tope que el molde no puede cumplir no es un
 * tope, es una promesa rota más adelante. Ver PDF-W.
 */
export const INGREDIENTES_MAX = 14;
export const PASOS_MAX = 8;
export const LARGO_CAMPO_CORTO = 60;
export const LARGO_PASO = 160;

/**
 * La descripción de la receta, la línea que va abajo del título.
 *
 * ⚠️ Acá se limaba con `LARGO_RESUMEN_CAPITULO`, que son 400 caracteres —el
 * largo del resumen de un capítulo, que es otra cosa—. El molde la dibuja como
 * UNA línea abajo del título: con 400 caracteres ocupaba cinco renglones y se
 * comía el alto que necesitaban los pasos. Era uno de los tres motivos por los
 * que una receta grande no cerraba en su hoja.
 */
export const LARGO_DESCRIPCION_RECETA = 120;

export type Ingrediente = {
  nombre: string;
  /** "500 g", "2 cucharadas". Puede venir vacío: "sal a gusto" no lleva número. */
  cantidad: string;
};

export type PasoDeReceta = {
  /** En dos o tres palabras: "Activar la levadura". Va en negrita arriba del texto. */
  titulo: string;
  texto: string;
};

export type Receta = {
  titulo: string;
  /** Una línea, para debajo del título. */
  descripcion: string;
  /** Las tres fichas de arriba. Vacías si no aplican. */
  rinde: string;
  tiempo: string;
  coccion: string;
  ingredientes: Ingrediente[];
  pasos: PasoDeReceta[];
  /** El recuadro de abajo. Opcional. */
  tip: string;
  /** Con qué buscar la foto. Igual que en los capítulos de texto. */
  foto: string;
  /**
   * La que se eligió a mano, si se eligió alguna.
   *
   * ⚠️ Igual que en un capítulo de texto (`CapituloPlaneado.fotoElegida`), y por
   * el mismo motivo: sin esto el armado busca de nuevo en cada PDF que se rehace
   * y las fotos cambian solas. En un recetario se nota más — cada receta es una
   * hoja con su foto, y quien ya acomodó las treinta no las quiere perder por
   * arreglar una coma.
   *
   * Vive adentro de la receta y no en el índice, porque acá la unidad es la
   * receta: el índice de un recetario tiene secciones, no recetas.
   */
  fotoElegida?: FotoElegida | null;
};

export type IndiceSugerido = {
  titulo: string;
  /** Una línea que dice qué se lleva quien lo lea. Va en la tapa. */
  promesa: string;
  capitulos: CapituloPlaneado[];
};

/* ── Lo que se le pide al modelo ────────────────────────────────────────── */

/** Las reglas que valen para el temario y para cada capítulo. Se escriben una vez. */
const REGLAS_COMUNES = `
CÓMO ESCRIBÍS

- En castellano rioplatense, tratando de "vos" a quien lee. Claro y directo,
  sin lunfardo cerrado y sin palabras rebuscadas.
- Nada de markdown: ni asteriscos, ni almohadillas, ni guiones de lista. El
  formato lo pone el PDF, vos mandás el texto pelado.
- Sin emojis.
- Frases cortas. Si una frase necesita tres comas, son dos frases.

LO QUE NO PODÉS ESCRIBIR — esto no es estilo, es lo que después se reclama

- Estadísticas, porcentajes, estudios, encuestas o "está comprobado que". No
  tenés de dónde sacarlos y quedan escritos como ciertos en algo que se vende.
- Casos reales, testimonios, nombres de personas o de empresas. Ninguno existe.
- Promesas de resultado: nada de "vas a ganar", "en 30 días vas a", "garantizado".
  Se explica cómo se hace algo, no lo que le va a pasar a quien lo lea.
- Precios, fechas, direcciones o datos de contacto.

Si para explicar algo hace falta un número que no tenés, explicá el concepto sin
el número. Un ejemplo inventado está bien SIEMPRE que se note que es un ejemplo.

Si el tema toca la salud, el dinero o cuestiones legales, en algún momento tiene
que decir con todas las letras que esto es información general y que no
reemplaza a un profesional.
`.trim();

/**
 * El temario. Es la llamada barata y la más importante: de acá sale la forma de
 * todo lo demás, y es lo único que la persona ve antes de que se gaste el resto.
 */
export const INSTRUCCIONES_INDICE = `
Sos quien arma el temario de un ebook que se va a vender en internet, en
Argentina.

Te van a contar de qué se trata, con las palabras de quien lo vende. A veces va
a ser una idea suelta y a veces un índice ya pensado: si te dan un índice,
respetalo — no lo mejores.

QUÉ DEVOLVÉS

- Un título del ebook. Concreto, que diga qué problema resuelve. Nada de
  títulos de una palabra ni de frases de autoayuda.
- Una promesa de una línea: qué va a poder hacer quien lo lea cuando termine.
- Entre ${CAPITULOS_MIN} y ${CAPITULOS_MAX} capítulos, en orden.

CÓMO SON LOS CAPÍTULOS

- El primero ubica el problema y para quién es esto. El último cierra con qué
  hacer a partir de ahora.
- Cada uno con su título y un resumen de dos o tres renglones de qué se explica
  adentro. Ese resumen lo va a leer después quien escriba el capítulo, así que
  tiene que decir el contenido, no venderlo.
- Y cada uno con una búsqueda de foto: dos a cuatro palabras que describan una
  ESCENA QUE SE PUEDA FOTOGRAFIAR y que tenga que ver con el capítulo. Se va a
  usar tal cual en un banco de imágenes.
  Sí: "torta decorada sobre mesada", "manos amasando harina", "cuaderno de
  pedidos y calculadora".
  No: "primeros pasos", "la lógica del negocio", "expectativas realistas" — eso
  no es ninguna foto y trae cualquier cosa.
  Si el capítulo es abstracto, describí igual algo concreto del mundo de este
  ebook. Nunca lo dejes vacío.
- Uno no puede repetir a otro. Si dos se pisan, son uno solo.
- Tienen que poder escribirse: si el tema no da para ${CAPITULOS_MIN}, hacé menos
  capítulos más largos antes que rellenar.

${REGLAS_COMUNES}
`.trim();

export const ESQUEMA_DEL_INDICE = {
  type: "object" as const,
  properties: {
    titulo: { type: "string", description: "El título del ebook." },
    promesa: { type: "string", description: "Una línea: qué se lleva quien lo lea." },
    capitulos: {
      type: "array",
      minItems: CAPITULOS_MIN,
      maxItems: CAPITULOS_MAX,
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          resumen: { type: "string", description: "Dos o tres renglones de qué se explica adentro." },
          foto: {
            type: "string",
            description:
              "Dos a cuatro palabras que describan una escena fotografiable de este capítulo. " +
              "Se busca tal cual en un banco de imágenes. Nada abstracto.",
          },
        },
        required: ["titulo", "resumen", "foto"],
      },
    },
  },
  required: ["titulo", "promesa", "capitulos"],
};

/**
 * Un capítulo.
 *
 * Recibe el temario entero —para no repetir lo de al lado ni adelantar lo de
 * más adelante— pero **no el texto de los otros capítulos**: serían decenas de
 * miles de tokens en cada llamada, pagados diez veces, para algo que el resumen
 * ya resuelve.
 */
export const INSTRUCCIONES_CAPITULO = `
Escribís UN capítulo de un ebook que se vende en internet, en Argentina.

Te paso el ebook entero en temario y cuál de esos capítulos te toca. Escribí ESE
y sólo ese.

CÓMO SALE

- Alrededor de ${PALABRAS_POR_CAPITULO} palabras. Ni la mitad ni el doble.
- En pedazos: párrafos, algún subtítulo cuando el capítulo cambia de tema, y
  viñetas cuando de verdad hay una lista. Un capítulo que es todo viñetas no es
  un capítulo, es un apunte.
- Y como mucho DOS "aviso" por capítulo. Un aviso sale en un recuadro de color,
  aparte del texto, y sirve para una sola cosa: el dato que a quien lee le
  ahorra un error o le da un atajo. Dos o tres renglones, no más.
  Sí: "Si la masa se pega a las manos, no le agregues harina: metela 10 minutos
  en la heladera."
  No: un resumen de lo que ya dijiste, ni una frase de aliento, ni algo que
  también está en un párrafo. Si el capítulo no tiene nada así, no pongas
  ninguno — un recuadro con una obviedad adentro es peor que no tenerlo.
- Arrancá por el contenido. Nada de "en este capítulo vamos a ver": quien lee
  ya leyó el título.
- Explicá cómo se hace lo que estás explicando, con pasos y con ejemplos. Lo que
  no se puede poner en práctica, no va.
- No repitas lo que dicen los otros capítulos del temario, ni adelantes lo que
  viene después.
- No cierres con un resumen de lo que acabás de decir.

${REGLAS_COMUNES}
`.trim();

export const ESQUEMA_DEL_CAPITULO = {
  type: "object" as const,
  properties: {
    bloques: {
      type: "array",
      minItems: BLOQUES_MIN,
      maxItems: BLOQUES_MAX,
      items: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: [...TIPOS_DE_BLOQUE],
            description:
              "subtitulo, parrafo, vineta, o aviso para el dato que va en un recuadro aparte.",
          },
          texto: { type: "string" },
        },
        required: ["tipo", "texto"],
      },
    },
  },
  required: ["bloques"],
};

/* ── El limado ──────────────────────────────────────────────────────────── */

/**
 * El temario que devolvió el modelo, o `null` si no se puede usar.
 *
 * ⚠️ El esquema de la herramienta garantiza que `capitulos` sea una lista de
 * objetos con dos textos. **No garantiza que los textos digan algo**: puede
 * venir un título vacío, o doce capítulos aunque el máximo diga diez. Lo que se
 * guarda es lo que sale de acá, no lo que llegó.
 *
 * `tituloPropio` es el nombre que la persona ya le puso al producto. Si existe,
 * gana: pedirle al modelo que lo respete es una sugerencia, imponerlo acá es la
 * garantía. Es la misma decisión que en `normalizarEmbudo`.
 */
/**
 * @param minimo Cuántas entradas hacen falta para que el temario sirva. Por
 *   defecto `CAPITULOS_MIN`, que es lo que necesita un ebook de texto. Un
 *   recetario pasa **la cantidad exacta de secciones** que se pidió: si vuelven
 *   menos, el recetario saldría más chico de lo que se cobró.
 */
export function normalizarIndice(
  crudo: unknown,
  tituloPropio?: string | null,
  minimo: number = CAPITULOS_MIN,
): IndiceSugerido | null {
  if (!crudo || typeof crudo !== "object") return null;
  const c = crudo as Record<string, unknown>;

  const propio = limpiarTexto(tituloPropio, LARGO_TITULO_EBOOK);
  const titulo = (propio && propio.length >= 2 ? propio : null)
    ?? limpiarTexto(c.titulo, LARGO_TITULO_EBOOK);
  const promesa = limpiarTexto(c.promesa, LARGO_RESUMEN_CAPITULO) ?? "";

  if (!titulo || titulo.length < 2) return null;
  if (!Array.isArray(c.capitulos)) return null;

  const capitulos: CapituloPlaneado[] = [];
  const vistos = new Set<string>();
  for (const bruto of c.capitulos) {
    if (capitulos.length >= CAPITULOS_MAX) break;
    if (!bruto || typeof bruto !== "object") continue;
    const b = bruto as Record<string, unknown>;
    const tit = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    const res = limpiarTexto(b.resumen, LARGO_RESUMEN_CAPITULO);
    if (!tit || tit.length < 2 || !res) continue;

    /* Dos capítulos con el mismo título dejan un índice que se lee como un
       error de imprenta, y encima se pagan dos veces. */
    const clave = tit.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    /* ⚠️ La búsqueda de foto NO puede tumbar un capítulo. Si el modelo no la
       mandó, el capítulo sigue siendo bueno y el ebook se arma igual: quien
       busca la foto cae al título, que es lo que se hacía antes de que este
       campo existiera. Rechazar el capítulo por esto sería tirar un ebook
       entero por una foto. */
    capitulos.push({ titulo: tit, resumen: res, foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "" });
  }

  /* Menos del mínimo no es un ebook. Se rechaza entero y se devuelve el cupo:
     es preferible "probá de nuevo" a cobrarle tres capítulos a alguien. */
  if (capitulos.length < minimo) return null;

  return { titulo, promesa, capitulos };
}

/** Un capítulo escrito, limado. `null` si no quedó nada mostrable. */
export function normalizarCapitulo(crudo: unknown, titulo: string): CapituloEscrito | null {
  if (!crudo || typeof crudo !== "object") return null;
  const c = crudo as Record<string, unknown>;
  if (!Array.isArray(c.bloques)) return null;

  const bloques: Bloque[] = [];
  for (const bruto of c.bloques) {
    if (bloques.length >= BLOQUES_MAX) break;
    if (!bruto || typeof bruto !== "object") continue;
    const b = bruto as Record<string, unknown>;
    const texto = limpiarTexto(b.texto, LARGO_BLOQUE);
    if (!texto) continue;
    const tipo = TIPOS_DE_BLOQUE.includes(b.tipo as TipoDeBloque)
      ? (b.tipo as TipoDeBloque)
      : "parrafo";
    bloques.push({ tipo, texto });
  }

  /* Un capítulo de dos renglones es un capítulo fallado. Mejor reintentarlo que
     dejarlo adentro del PDF que alguien va a vender. */
  if (bloques.length < BLOQUES_MIN) return null;

  const tit = limpiarTexto(titulo, LARGO_TITULO_CAPITULO);
  if (!tit) return null;

  return { titulo: tit, bloques };
}

/* ── Lo guardado ────────────────────────────────────────────────────────── */

/**
 * Leer lo que hay guardado en la base.
 *
 * Se guarda JSON en una columna de texto, igual que `Product.paginaVenta`. Y se
 * vuelve a limar al leerlo: la columna es texto, así que lo que hay adentro es
 * lo que había el día que se escribió, no necesariamente lo que el código de hoy
 * espera encontrar.
 */
/**
 * Las dos formas en que puede estar guardado el índice.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA VIEJA ES UNA LISTA; LA NUEVA, UNA LISTA CON LA PROMESA AL LADO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 07/09/26 se guardaba `JSON.stringify(capitulos)` a secas, y **la
 * promesa se tiraba**. La tapa la reemplazaba por el resumen del capítulo 1, que
 * está escrito para el que ESCRIBE el capítulo y no para el que compra: la tapa
 * de un producto en venta arrancaba con "Explica el punto de partida...".
 *
 * Se guarda adentro del mismo JSON y no en una columna nueva a propósito: una
 * columna es una migración de la base para un campo de texto que ya viaja acá.
 * Y por eso hay que seguir leyendo las dos formas — los ebooks de antes tienen
 * la lista pelada y no se pueden reescribir.
 */
function abrirIndice(guardado: string | null | undefined): unknown[] | null {
  if (typeof guardado !== "string") return null;
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return null; }
  if (Array.isArray(crudo)) return crudo;                       // la vieja
  const o = crudo as { capitulos?: unknown };                   // la nueva
  return Array.isArray(o?.capitulos) ? o.capitulos : null;
}

/**
 * La promesa de la tapa: qué se lleva quien lo lea.
 *
 * `""` en los ebooks guardados con la forma vieja, que no la tienen. Quien la
 * usa decide con qué reemplazarla — no se inventa acá.
 */
export function leerPromesa(guardado: string | null | undefined): string {
  if (typeof guardado !== "string") return "";
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return ""; }
  if (Array.isArray(crudo)) return "";
  const o = crudo as { promesa?: unknown };
  return limpiarTexto(o?.promesa, LARGO_RESUMEN_CAPITULO) ?? "";
}

/**
 * La foto elegida, limada. `null` si no hay o si le falta algo.
 *
 * ⚠️ **Los cuatro campos son obligatorios y no hay medio elegido.** Sin `url`
 * no hay qué bajar; sin `fotografo` y `enlace` la hoja de créditos queda
 * incompleta, **y eso es la licencia del banco de imágenes**, no un adorno. Una
 * foto a medias se descarta y el armado vuelve a buscar, que es lo que hacía
 * antes de que esto existiera.
 *
 * Y la dirección se mira: tiene que ser `https` del banco. Lo que se guarda acá
 * lo baja el servidor al armar, así que una dirección cualquiera sería pedirle
 * a nuestro servidor que visite lo que diga el navegador.
 */
export function leerFotoElegida(crudo: unknown): FotoElegida | null {
  if (!crudo || typeof crudo !== "object") return null;
  const f = crudo as Record<string, unknown>;

  const id = limpiarTexto(f.id, 40);
  const url = limpiarTexto(f.url, LARGO_DIRECCION_FOTO);
  const fotografo = limpiarTexto(f.fotografo, LARGO_AUTOR_FOTO);
  const enlace = limpiarTexto(f.enlace, LARGO_DIRECCION_FOTO);

  if (!id || !url) return null;

  /* Una foto propia: no tiene a quién acreditar, y su dirección tiene que ser
     de nuestro depósito. Ver `propia`. */
  if (f.propia === true) {
    if (!esNuestra(url)) return null;
    return { id, url, fotografo: "", enlace: "", propia: true };
  }

  /* Una del banco: los cuatro campos, y las dos direcciones de Pexels. */
  if (!fotografo || !enlace) return null;
  if (!esDelBanco(url) || !esDelBanco(enlace)) return null;

  return { id, url, fotografo, enlace };
}

/**
 * Las direcciones de nuestro propio depósito, para una foto subida a mano.
 *
 * ⚠️ Es la misma guarda que `esDelBanco` y por el mismo motivo: lo que se
 * guarda acá lo baja el servidor al armar el PDF. Sin esta lista, mandando una
 * dirección de la red interna se la hacemos pedir nosotros.
 *
 * En desarrollo `/api/upload` guarda en `public/uploads` y devuelve una ruta
 * relativa; en producción devuelve la dirección pública de Supabase. Se aceptan
 * las dos porque son las dos que esa ruta puede devolver, y ninguna otra.
 */
function esNuestra(direccion: string): boolean {
  if (direccion.startsWith("/uploads/")) return !direccion.includes("..");

  const nuestro = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!nuestro) return false;
  try {
    const u = new URL(direccion);
    return u.protocol === "https:" && u.origin === new URL(nuestro).origin;
  } catch {
    return false;
  }
}

/**
 * Los dominios de los que el servidor acepta bajar una foto.
 *
 * ⚠️ **Esto es lo que impide que el navegador le haga visitar cualquier cosa al
 * servidor.** La dirección viaja desde la pantalla, se guarda en la base y
 * después el armado la baja desde adentro de nuestra red: sin esta lista,
 * mandando una dirección de la red interna se la hacemos pedir nosotros.
 */
const DOMINIOS_DEL_BANCO = ["images.pexels.com", "www.pexels.com", "pexels.com"];

function esDelBanco(direccion: string): boolean {
  try {
    const u = new URL(direccion);
    return u.protocol === "https:" && DOMINIOS_DEL_BANCO.includes(u.hostname);
  } catch {
    return false;
  }
}

/**
 * La foto de la tapa: con qué se busca y cuál se eligió.
 *
 * ⚠️ Vive en la RAÍZ del mismo JSON, al lado de `promesa` y `opciones`, y no
 * adentro de un capítulo: la tapa no es un capítulo. Es el mismo criterio que
 * `leerPromesa` — una columna nueva en la base para un par de campos que ya
 * viajan acá adentro no se justifica.
 *
 * `frase` vacía quiere decir "buscala con el título del ebook", que es lo que
 * hacía el armado antes de que esto existiera.
 */
export function leerFotoDeTapa(
  guardado: string | null | undefined,
): { frase: string; elegida: FotoElegida | null } {
  const vacia = { frase: "", elegida: null };
  if (typeof guardado !== "string") return vacia;
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return vacia; }
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return vacia;

  const t = (crudo as { tapa?: unknown }).tapa;
  if (!t || typeof t !== "object") return vacia;
  const f = t as Record<string, unknown>;

  return {
    frase: limpiarTexto(f.frase, LARGO_FOTO) ?? "",
    elegida: leerFotoElegida(f.elegida),
  };
}

/**
 * Si el último PDF se armó con el banco de fotos al tope.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN EBOOK PUEDE SALIR SIN FOTOS, Y HASTA HOY NADIE SE ENTERABA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La clave del banco es UNA para toda la plataforma. Si en el momento en que se
 * arma el archivo el tope compartido está lleno, `buscarFoto` devuelve `null` y
 * el molde dibuja bloques de color donde iban las fotos. El PDF queda colgado
 * del producto, LISTO, y quien lo hizo cree que ése es el diseño.
 *
 * Se anota acá para poder decirlo en la tarjeta **después**, que es cuando hace
 * falta: el armado suele pasar con la pestaña cerrada. Y lo que se dice tiene
 * arreglo — rehacer el PDF no gasta ninguna generación.
 *
 * ⚠️ Vive en la RAÍZ del mismo JSON, como `promesa`, `opciones` y `tapa`, y no
 * en una columna nueva: agregar una columna es una migración, y esta base es la
 * de producción.
 */
export function leerAvisoDeFotos(guardado: string | null | undefined): boolean {
  if (typeof guardado !== "string") return false;
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return false; }
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return false;
  return (crudo as { fotosAlTope?: unknown }).fotosAlTope === true;
}

/**
 * Dejar anotado —o borrar— ese aviso, sin tocar nada más de lo guardado.
 *
 * ⚠️ Devuelve lo mismo que recibió si el JSON no se puede abrir o no es un
 * objeto. Un aviso no puede romperle el índice a nadie: el índice es de dónde
 * salen los capítulos del ebook, y esto es un cartel.
 *
 * ⚠️ Y BORRA la marca cuando el armado salió bien. Sin eso, un ebook que una
 * vez agarró el tope lleno seguiría diciendo "salió sin fotos" para siempre,
 * incluso mirando un PDF que ya las tiene.
 */
export function conAvisoDeFotos(guardado: string | null | undefined, alTope: boolean): string {
  const tal = typeof guardado === "string" ? guardado : "";
  let crudo: unknown;
  try { crudo = JSON.parse(tal); } catch { return tal; }
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return tal;

  const raiz = { ...(crudo as Record<string, unknown>) };
  if (alTope) raiz.fotosAlTope = true;
  else delete raiz.fotosAlTope;
  return JSON.stringify(raiz);
}

export function leerIndice(guardado: string | null | undefined): CapituloPlaneado[] {
  const crudo = abrirIndice(guardado);
  if (!crudo) return [];

  const capitulos: CapituloPlaneado[] = [];
  for (const bruto of crudo) {
    if (capitulos.length >= CAPITULOS_MAX) break;
    if (!bruto || typeof bruto !== "object") continue;
    const b = bruto as Record<string, unknown>;
    const tit = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    const res = limpiarTexto(b.resumen, LARGO_RESUMEN_CAPITULO);
    if (!tit) continue;
    /* Los ebooks guardados antes del 07/09/26 no tienen `foto`: vuelve vacía y
       quien busca cae al título. Ver `CapituloPlaneado`. */
    capitulos.push({
      titulo: tit,
      resumen: res ?? "",
      foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "",
      fotoElegida: leerFotoElegida(b.fotoElegida),
    });
  }
  return capitulos;
}

export function leerCapitulos(guardado: string | null | undefined): CapituloEscrito[] {
  if (typeof guardado !== "string") return [];
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return []; }
  if (!Array.isArray(crudo)) return [];

  const escritos: CapituloEscrito[] = [];
  for (const bruto of crudo) {
    if (escritos.length >= CAPITULOS_MAX) break;
    const cap = normalizarCapitulo(bruto, (bruto as { titulo?: unknown })?.titulo as string);
    if (cap) escritos.push(cap);
  }
  return escritos;
}

/**
 * Cuál es el capítulo que sigue, o `null` si está completo.
 *
 * Es el largo de lo escrito y no un contador aparte: un contador se puede
 * desincronizar de la lista, y el que manda es lo que de verdad está guardado.
 *
 * ⚠️ **SÓLO SIRVE PARA UN EBOOK DE TEXTO, y la ruta ya no la usa.** Un recetario
 * guarda grupos de recetas donde éste espera capítulos, así que `leerCapitulos`
 * le devolvería una lista vacía y esto contestaría siempre "el primero" — el
 * bucle escribiría la sección 1 para siempre, cobrando cada vuelta. La ruta del
 * paso hace la cuenta ella misma justamente por eso. Queda acá porque su prueba
 * la cubre; si alguna vez se vuelve a usar, tiene que recibir el formato.
 */
export function elCapituloQueSigue(
  indice: CapituloPlaneado[],
  escritos: CapituloEscrito[],
): { numero: number; capitulo: CapituloPlaneado } | null {
  if (escritos.length >= indice.length) return null;
  return { numero: escritos.length + 1, capitulo: indice[escritos.length] };
}

/** El mensaje con el que se le pide al modelo el capítulo que toca. */
export function pedidoDelCapitulo(
  titulo: string,
  tema: string,
  publico: string | null,
  indice: CapituloPlaneado[],
  numero: number,
): string {
  const temario = indice
    .map((c, i) => `${i + 1}. ${c.titulo}\n   ${c.resumen}`)
    .join("\n");

  return [
    `El ebook se llama "${titulo}".`,
    publico ? `Está escrito para: ${publico}` : null,
    "",
    "De qué se trata, en palabras de quien lo vende:",
    `<tema>\n${tema}\n</tema>`,
    "",
    "El temario completo:",
    `<temario>\n${temario}\n</temario>`,
    "",
    `Te toca escribir el capítulo ${numero}: "${indice[numero - 1]?.titulo ?? ""}".`,
  ].filter((l) => l !== null).join("\n");
}

/**
 * Cuánto del producto principal entra en el pedido.
 *
 * `LARGO_DESCRIPCION` son 10.000 caracteres: una descripción entera adentro del
 * pedido tapa al tema, que es lo único que de verdad hay que escribir.
 */
export const LARGO_PADRE_EN_PEDIDO = 600;

/**
 * El contexto del producto principal, para cuando lo que se escribe es un bono
 * o un upsell.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UN BONO NACE DEL PRODUCTO, Y HASTA EL 08/09/26 EL MODELO NO LO SABÍA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La **cáscara** del embudo —título, descripción y precio— siempre se pidió con
 * el principal a la vista: ver `pedidoDeUnaFicha`. El **contenido** no. A la
 * ruta del ebook le llegaba el nombre del bono y nada más, así que un recetario
 * bono de un curso de nutrición se escribía como un recetario suelto, sin una
 * sola línea que lo atara a lo que la persona vende.
 *
 * El costo no era un texto feo. Era que **había que volver a explicar todo el
 * contexto a mano**, en cada bono y en cada upsell, o pagar una generación por
 * algo que no servía. Nadie lo hace: escribe dos palabras y aprieta.
 *
 * ── Por qué "complementarlo, no repetirlo" ─────────────────────────────────
 *
 * Es el único riesgo que agrega darle el contexto. Un modelo al que le contás
 * de qué se trata el principal tiende a **escribir otra vez el principal**, más
 * corto. Un bono que repite lo que la persona ya compró no es un bono.
 *
 * ⚠️ El texto del principal es de quien vende, no nuestro: va CERCADO en
 * etiquetas y cortado, igual que el tema. Lo que frena un "ignorá lo anterior"
 * no es una frase mágica: es que la salida sólo puede llenar un temario.
 */
export function contextoDelPadre(
  rol: "BONO" | "UPSELL",
  padre: { nombre: string; descripcion: string | null },
): string[] {
  const descripcion =
    padre.descripcion?.trim().slice(0, LARGO_PADRE_EN_PEDIDO).trim() || null;

  return [
    rol === "BONO"
      ? `Esto es un BONO DE REGALO de otro producto: se entrega junto con "${padre.nombre}".`
      : `Esto es un UPSELL de otro producto: se le ofrece a quien ya compró "${padre.nombre}".`,
    "Tiene que complementarlo, no repetirlo: quien lo recibe ya tiene el principal.",
    ...(descripcion
      ? ["", "De qué se trata el producto principal:", `<principal>\n${descripcion}\n</principal>`]
      : []),
  ];
}

/* ── El recetario: lo que se le pide al modelo ──────────────────────────── */

/**
 * Cuántas recetas escribe UNA llamada.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES UNA RECETA POR LLAMADA, Y ESA ES TODA LA DIFERENCIA DE PRECIO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un capítulo de texto son 900 palabras: entra una sola por llamada y encima
 * conviene, porque a un modelo al que se le piden dos capítulos le sale peor el
 * segundo. Una receta son 150 palabras en campos cortos. Pedir de a una sería
 * pagar el temario entero de entrada —el pedido va completo en cada llamada—
 * treinta veces para escribir treinta recetas.
 *
 * ── Por qué TRES y no cinco ────────────────────────────────────────────────
 *
 * Medido el 07/09/26 con `probar-recetas.mts`, con este mismo prompt y este
 * mismo esquema:
 *
 *   5 recetas → se cortó en `max_tokens` a los 4.000 y **no volvió ninguna**.
 *                Se pagaron US$0,046 por nada.
 *   3 recetas → 2.866 tokens de salida, 28,9 segundos, US$0,035. Las tres
 *                completas.
 *
 * O sea que una receta son unos 950 tokens de salida, no los 400 que se había
 * estimado. Con cinco harían falta 5.000 tokens y unos 48 segundos, **adentro
 * de una función que se corta a los 60**. Tres deja el margen que hace falta
 * para que un día lento no tire la llamada entera.
 *
 * ⚠️ Subir este número tiene dos techos, y el que muerde primero no es el
 * dinero: es el reloj. Si alguna vez se sube, hay que subir `max_tokens` en la
 * misma proporción — cortarse en `max_tokens` no devuelve las recetas que ya
 * escribió, devuelve nada, y se paga igual.
 */
export const RECETAS_POR_LLAMADA = 3;

/**
 * Un texto recortado que TERMINA donde termina una idea.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN PASO CORTADO A MITAD DE PALABRA ES UNA RECETA QUE NO SE PUEDE SEGUIR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `limpiarTexto` corta en el carácter que toca, y en un nombre de persona o un
 * título eso está bien. En un paso de receta no: en la prueba del 07/09/26 la
 * receta de medialunas decía "Repetí este doblado tres veces, enfriando 10
 * minutos **en**" y ahí se terminaba. Quien está amasando no tiene forma de
 * saber qué venía después, y eso ya está adentro de un archivo vendido.
 *
 * Así que se corta en el último punto que quede razonablemente cerca del final
 * —el paso termina siendo una idea completa, más corta— y si no hay ninguno, en
 * el último espacio con puntos suspensivos, que al menos se lee como recortado
 * y no como un error de tipeo.
 *
 * Esto es la red, no la solución: lo que de verdad evita el corte es que el
 * prompt le diga al modelo cuántos caracteres tiene. Las dos cosas hacen falta.
 */
export function cortarEnUnaIdea(valor: unknown, tope: number): string | null {
  const limpio = limpiarTexto(valor, 10_000);
  if (!limpio) return null;
  if (limpio.length <= tope) return limpio;

  const cortado = limpio.slice(0, tope);

  /* Un punto en el último 40% deja una idea entera y es lo mejor que se puede
     hacer. Más atrás que eso perdería demasiado texto ya pagado. */
  const punto = Math.max(cortado.lastIndexOf(". "), cortado.lastIndexOf("."));
  if (punto >= tope * 0.6) return cortado.slice(0, punto + 1).trim();

  const espacio = cortado.lastIndexOf(" ");
  const hasta = espacio > tope * 0.5 ? espacio : tope - 1;
  return `${cortado.slice(0, hasta).trim()}…`;
}

/**
 * En cuántas secciones se parte un recetario de `total` recetas.
 *
 * Una sección = una llamada al modelo = una entrada del temario. El bucle de
 * las tres rutas queda EXACTAMENTE igual que en un ebook de texto: donde aquél
 * escribe un capítulo, éste escribe las recetas de una sección.
 *
 * ⚠️ Por eso `RECETAS_OPCIONES` llega hasta 30 y no más: 30 ÷ 3 son 10
 * secciones, que es `CAPITULOS_MAX`. Con 40 el temario tendría 14 y `leerIndice`
 * cortaría las últimas cuatro **sin decir nada** — se cobraría un recetario de
 * 40 y saldría uno de 30.
 */
export function seccionesParaRecetas(total: number): number {
  return Math.ceil(total / RECETAS_POR_LLAMADA);
}

/**
 * Cuántas recetas escribe la sección número `numero`.
 *
 * Todas llevan `RECETAS_POR_LLAMADA` menos la última, que se queda con el
 * resto. Con 10 recetas son 3, 3, 3 y 1.
 *
 * ⚠️ Esto NO puede ser `RECETAS_POR_LLAMADA` a secas. Con 10 elegidas saldrían
 * 12: tres de más adentro de un archivo que se vendió como de diez, y el sello
 * de la tapa diciendo otro número que el índice.
 */
export function recetasDeLaSeccion(total: number, numero: number): number {
  const yaPedidas = (numero - 1) * RECETAS_POR_LLAMADA;
  return Math.max(0, Math.min(RECETAS_POR_LLAMADA, total - yaPedidas));
}

/**
 * Las reglas de escritura de una receta.
 *
 * ⚠️ NO son `REGLAS_COMUNES`, y la diferencia es una sola línea que importa
 * mucho: allá se le prohíben los números porque un porcentaje inventado queda
 * escrito como cierto en algo que se vende. **Acá los números son la receta.**
 * Sin "180 °C" y sin "500 g" no hay nada que cocinar. Lo que sigue prohibido es
 * el número que pretende ser un dato del mundo —"el 70% de la gente"—, no la
 * cantidad de harina.
 *
 * Si esto se escribiera pegándole `REGLAS_COMUNES` arriba, el modelo devolvería
 * "harina, cantidad necesaria" en todos los ingredientes y la receta no serviría.
 */
const REGLAS_DE_RECETA = `
CÓMO ESCRIBÍS

- En castellano rioplatense, tratando de "vos" a quien lee. Con los nombres que
  se usan en Argentina: manteca y no mantequilla, palta y no aguacate, crema de
  leche y no nata.
- Ingredientes que se consiguen en cualquier supermercado de acá.
- Nada de markdown, ni asteriscos, ni emojis. El formato lo pone el PDF.
- Frases cortas y en imperativo: "Mezclá", "Llevá al horno". No "se mezcla".

LOS NÚMEROS SÍ VAN

- Cantidades, temperaturas y tiempos son la receta: "500 g", "180 °C", "25
  minutos". Ponelos siempre, en gramos, mililitros, cucharadas o unidades.
- Lo que no va son los números que pretenden ser un dato del mundo:
  estadísticas, porcentajes, estudios, "está comprobado que". Ni testimonios, ni
  nombres de personas o de marcas, ni precios.
- Nada de promesas: "te va a salir perfecta" no se escribe. Se explica cómo se
  hace y en qué se nota que está bien.

QUE ENTRE EN LA HOJA — esto no es un capricho de diseño

Cada receta ocupa UNA carilla y la carilla no se estira. Si te pasás, la receta
sale cortada adentro de un archivo que alguien pagó.

- Entre 4 y ${INGREDIENTES_MAX} ingredientes. Ninguno más.
- El nombre del ingrediente, CORTO: dos o tres palabras. "manteca fría", no
  "manteca fría para el hojaldre". La columna es angosta y un nombre largo sale
  cortado. Para qué se usa cada cosa se explica en el paso.
- Entre 4 y ${PASOS_MAX} pasos. Si te salen doce, juntá los que van seguidos.
- Cada paso, **como mucho ${LARGO_PASO} caracteres**. Es un paso, no un párrafo, y
  lo que se pase de ahí se corta: la receta queda a la mitad y quien la está
  cocinando no tiene cómo saber qué seguía.
- El título del paso, dos o tres palabras: "Activar la levadura".
- La línea de abajo del título, como mucho ${LARGO_DESCRIPCION_RECETA} caracteres.
`.trim();

/**
 * Un grupo de recetas.
 *
 * Recibe el recetario entero en temario, por el mismo motivo que el capítulo de
 * texto: para no repetir la receta de la sección de al lado. No recibe el texto
 * de las otras recetas.
 */
export const INSTRUCCIONES_RECETAS = `
Escribís recetas para un recetario que se vende en internet, en Argentina.

Te paso de qué se trata el recetario entero y qué sección te toca. Escribí las
recetas de ESA sección y ninguna otra.

QUÉ ES CADA RECETA

- Un título con el nombre del plato. Como se lo pediría alguien: "Pan de campo
  en airfryer". Nada de títulos graciosos que no dicen qué es.
- Una línea abajo del título que diga cómo queda o cuándo se come. Una sola.
- Las tres fichas de arriba: cuánto rinde ("6 porciones"), cuánto tiempo lleva
  en total ("40 minutos") y la cocción ("180 °C, 25 minutos" o "Sin horno").
  Si alguna no aplica de verdad, dejala vacía; no la inventes.
- Los ingredientes, cada uno con su cantidad aparte del nombre: nombre "harina
  0000", cantidad "500 g". Van en el orden en que se usan.
  La cantidad es SÓLO el número y la unidad, y va corta: "500 g", "2 cucharadas",
  "a gusto". Nada más entra ahí — si algo es optativo va en el nombre:
  nombre "tomates cherry (opcional)", cantidad "8".
- Los pasos, en orden, cada uno con su título corto y su texto.
- Un consejo al final: el detalle que hace que salga bien, o cómo se guarda, o
  con qué se reemplaza un ingrediente. Dos renglones. Si no tenés nada que
  agregar, dejalo vacío — mejor vacío que una obviedad.
- Y una búsqueda de foto: dos a cuatro palabras que describan el plato ya hecho,
  como se vería en una foto. Se busca tal cual en un banco de imágenes.
  Sí: "pan de campo cortado", "budin de limon en rodajas".
  No: "receta facil", "el secreto de la abuela".

LAS RECETAS TIENEN QUE FUNCIONAR

Cada una se tiene que poder cocinar leyendo sólo esa hoja. Si un paso dice
"preparar la masa" y la masa no está en ningún lado, la receta no sirve.

No repitas una receta que ya está en otra sección del temario. Dos recetas casi
iguales con otro nombre es lo primero que se nota y lo primero que se reclama.

${REGLAS_DE_RECETA}
`.trim();

/**
 * El temario de un recetario: las secciones, no los capítulos.
 *
 * Es el mismo lugar que `INSTRUCCIONES_INDICE` en un ebook de texto, y devuelve
 * la misma forma —título, promesa y una lista— para que el resto del sistema no
 * tenga que distinguirlas. Lo que cambia es qué es cada elemento de la lista.
 */
export const INSTRUCCIONES_INDICE_RECETARIO = `
Sos quien arma el índice de un recetario que se va a vender en internet, en
Argentina.

Te van a contar de qué se trata, con las palabras de quien lo vende, y cuántas
secciones tenés que armar. Ese número no se discute: devolvé exactamente ésas.

QUÉ DEVOLVÉS

- Un título del recetario. Concreto, que diga qué se cocina: "Panadería casera
  en airfryer". Nada de títulos de una palabra.
- Una línea para la tapa que diga QUÉ SE COCINA adentro. Es una descripción del
  contenido, no una promesa de resultado, así que sí va y nunca la dejes vacía:
  "Panes, facturas y pizzas hechos enteros en la airfryer, sin prender el
  horno." Más abajo dice que no escribas promesas — eso es para el texto de las
  recetas, esta línea es otra cosa y tiene que estar.
- Las secciones, en orden.

CÓMO SON LAS SECCIONES

- Cada una agrupa recetas parecidas: "Panes de todos los días", "Facturas y
  dulces", "Pizzas y tartas saladas". Es como está armado cualquier recetario.
- Con su título y un resumen de dos renglones que diga QUÉ RECETAS van adentro.
  Ese resumen lo va a leer después quien escriba las recetas, así que nombrá
  platos concretos: "pan de campo, pan árabe, pan de molde y focaccia".
- Una sección no puede pisar a otra. Si dos se superponen, cambiá una.
- Y cada una con una búsqueda de foto: dos a cuatro palabras que describan un
  plato de esa sección ya hecho, como se vería en una foto.
  Sí: "pan casero cortado", "medialunas en bandeja".
  No: "recetas ricas", "lo básico" — eso no es ninguna foto.
- Ordenalas de lo más simple a lo más elaborado.

${REGLAS_DE_RECETA}
`.trim();

/**
 * El esquema del temario del recetario, con la cantidad de secciones clavada.
 *
 * ⚠️ Es una función y no una constante porque `minItems` y `maxItems` **tienen
 * que ser el mismo número**, y ese número sale de cuántas recetas eligió la
 * persona. Con un rango, el modelo devuelve las que quiere y el recetario sale
 * de otro tamaño que el que se pidió y se cobró.
 */
export function esquemaDelIndiceRecetario(secciones: number) {
  return {
    type: "object" as const,
    properties: {
      titulo: { type: "string", description: "El título del recetario." },
      promesa: {
        type: "string",
        description:
          "Una línea para la tapa que diga qué se cocina adentro. Descripción del " +
          "contenido, no promesa de resultado. Obligatoria: nunca vacía.",
      },
      capitulos: {
        type: "array",
        minItems: secciones,
        maxItems: secciones,
        items: {
          type: "object",
          properties: {
            titulo: { type: "string", description: "El nombre de la sección." },
            resumen: {
              type: "string",
              description: "Dos renglones nombrando los platos concretos que van adentro.",
            },
            foto: {
              type: "string",
              description:
                "Dos a cuatro palabras que describan un plato de esta sección ya hecho. " +
                "Se busca tal cual en un banco de imágenes.",
            },
          },
          required: ["titulo", "resumen", "foto"],
        },
      },
    },
    required: ["titulo", "promesa", "capitulos"],
  };
}

/**
 * El esquema de un grupo de recetas, con la cantidad clavada.
 *
 * ⚠️ Función y no constante por lo mismo que el temario: la última sección de
 * un recetario de 10 escribe UNA receta, no tres. Ver `recetasDeLaSeccion`.
 */
export function esquemaDeRecetas(cuantas: number) {
  return {
    ...ESQUEMA_DE_RECETAS,
    properties: {
      ...ESQUEMA_DE_RECETAS.properties,
      recetas: { ...ESQUEMA_DE_RECETAS.properties.recetas, minItems: cuantas, maxItems: cuantas },
    },
  };
}

export const ESQUEMA_DE_RECETAS = {
  type: "object" as const,
  properties: {
    recetas: {
      type: "array",
      minItems: 1,
      maxItems: RECETAS_POR_LLAMADA,
      items: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "El nombre del plato." },
          descripcion: {
            type: "string",
            description: `Una línea: cómo queda o cuándo se come. Como mucho  caracteres.`,
          },
          rinde: { type: "string", description: "Cuánto rinde, por ejemplo 6 porciones. Vacío si no aplica." },
          tiempo: { type: "string", description: "Cuánto lleva en total, por ejemplo 40 minutos." },
          coccion: { type: "string", description: "La cocción: 180 °C, 25 minutos. O Sin horno." },
          ingredientes: {
            type: "array",
            minItems: 2,
            maxItems: INGREDIENTES_MAX,
            items: {
              type: "object",
              properties: {
                nombre: {
                  type: "string",
                  description: "El ingrediente, corto: dos o tres palabras. Por ejemplo harina 0000.",
                },
                cantidad: { type: "string", description: "Sólo el número y la unidad: 500 g. Vacío en sal a gusto." },
              },
              required: ["nombre", "cantidad"],
            },
          },
          pasos: {
            type: "array",
            minItems: 2,
            maxItems: PASOS_MAX,
            items: {
              type: "object",
              properties: {
                titulo: { type: "string", description: "Dos o tres palabras: Activar la levadura." },
                texto: {
                  type: "string",
                  description: `Dos o tres renglones, como mucho  caracteres. Lo que se pase se corta.`,
                },
              },
              required: ["titulo", "texto"],
            },
          },
          tip: { type: "string", description: "El consejo del final. Puede ir vacío." },
          foto: {
            type: "string",
            description:
              "Dos a cuatro palabras que describan el plato ya hecho. " +
              "Se busca tal cual en un banco de imágenes.",
          },
        },
        required: ["titulo", "descripcion", "rinde", "tiempo", "coccion",
                   "ingredientes", "pasos", "tip", "foto"],
      },
    },
  },
  required: ["recetas"],
};

/**
 * Las recetas que devolvió el modelo, limadas.
 *
 * ⚠️ Los topes de acá abajo son los que hacen que la receta ENTRE EN LA HOJA. El
 * esquema se los pide al modelo, pero pedir no es garantizar: si vuelve con
 * dieciocho ingredientes, el molde los dibuja todos y la receta se derrama a la
 * hoja siguiente, donde no hay ni título ni foto. Se corta acá.
 *
 * Y una receta sin ingredientes o sin pasos NO es una receta a la que le falta
 * algo: es media hoja en blanco adentro de un archivo que se vendió. Se descarta
 * entera y quien llama decide si reintenta.
 */
export function normalizarRecetas(crudo: unknown, cuantas = RECETAS_POR_LLAMADA): Receta[] {
  if (!crudo || typeof crudo !== "object") return [];
  const c = crudo as Record<string, unknown>;
  if (!Array.isArray(c.recetas)) return [];

  /* ⚠️ El tope es el de ESTA sección, no el general: la última de un recetario
     de 10 escribe una sola. Si el modelo manda tres igual, sobran dos adentro
     de algo que se vendió como de diez. */
  const tope = Math.max(1, Math.min(cuantas, RECETAS_POR_LLAMADA));

  const recetas: Receta[] = [];
  for (const bruto of c.recetas) {
    if (recetas.length >= tope) break;
    if (!bruto || typeof bruto !== "object") continue;
    const b = bruto as Record<string, unknown>;

    const titulo = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    if (!titulo || titulo.length < 2) continue;

    const ingredientes: Ingrediente[] = [];
    if (Array.isArray(b.ingredientes)) {
      for (const bi of b.ingredientes) {
        if (ingredientes.length >= INGREDIENTES_MAX) break;
        if (!bi || typeof bi !== "object") continue;
        const i = bi as Record<string, unknown>;
        const nombre = limpiarTexto(i.nombre, LARGO_CAMPO_CORTO);
        if (!nombre) continue;
        /* La cantidad SÍ puede venir vacía: "sal a gusto" no lleva número. */
        ingredientes.push({ nombre, cantidad: limpiarTexto(i.cantidad, LARGO_CAMPO_CORTO) ?? "" });
      }
    }

    const pasos: PasoDeReceta[] = [];
    if (Array.isArray(b.pasos)) {
      for (const bp of b.pasos) {
        if (pasos.length >= PASOS_MAX) break;
        if (!bp || typeof bp !== "object") continue;
        const p = bp as Record<string, unknown>;
        const texto = cortarEnUnaIdea(p.texto, LARGO_PASO);
        if (!texto) continue;
        /* El título del paso sí puede faltar: el molde numera igual. */
        pasos.push({ titulo: limpiarTexto(p.titulo, LARGO_CAMPO_CORTO) ?? "", texto });
      }
    }

    /* ⚠️ Sin esto no hay receta. Ver el comentario de arriba. */
    if (ingredientes.length < 2 || pasos.length < 2) continue;

    recetas.push({
      titulo,
      /* ⚠️ Con `LARGO_RESUMEN_CAPITULO` acá, la descripción entraba de 400
         caracteres y ocupaba cinco renglones abajo del título. Ver
         `LARGO_DESCRIPCION_RECETA`. */
      descripcion: cortarEnUnaIdea(b.descripcion, LARGO_DESCRIPCION_RECETA) ?? "",
      rinde: limpiarTexto(b.rinde, LARGO_CAMPO_CORTO) ?? "",
      tiempo: limpiarTexto(b.tiempo, LARGO_CAMPO_CORTO) ?? "",
      coccion: limpiarTexto(b.coccion, LARGO_CAMPO_CORTO) ?? "",
      ingredientes,
      pasos,
      tip: cortarEnUnaIdea(b.tip, LARGO_BLOQUE) ?? "",
      foto: limpiarTexto(b.foto, LARGO_FOTO) ?? "",
      /* ⚠️ Se lee y se conserva: esta misma función es la que vuelve a leer lo
         guardado (ver `leerGruposDeRecetas`), así que sin esta línea la foto que
         alguien eligió a mano se perdería en la primera relectura. Del modelo
         nunca viene —él manda `foto`, la frase— y ahí queda `null`. */
      fotoElegida: leerFotoElegida(b.fotoElegida),
    });
  }

  return recetas;
}

/**
 * Las recetas ya escritas, tal como quedan guardadas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SE GUARDAN AGRUPADAS POR SECCIÓN, NO TODAS SEGUIDAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Van en la misma columna que los capítulos de un ebook de texto —`capitulos`—
 * y con la misma forma de afuera: una lista donde **cada elemento es una
 * llamada al modelo ya cobrada**. Así `escritos >= indice.length` sigue
 * queriendo decir "está completo" sin que nadie tenga que dividir por tres.
 *
 * Si se guardaran todas seguidas, retomar un recetario a medias necesitaría
 * adivinar en qué sección se quedó a partir de cuántas recetas hay — y con la
 * última sección más corta esa cuenta no cierra.
 */
export function leerGruposDeRecetas(guardado: string | null | undefined): Receta[][] {
  if (typeof guardado !== "string") return [];
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return []; }
  if (!Array.isArray(crudo)) return [];

  const grupos: Receta[][] = [];
  for (const bruto of crudo) {
    if (grupos.length >= CAPITULOS_MAX) break;
    if (!Array.isArray(bruto)) continue;
    const recetas = normalizarRecetas({ recetas: bruto });
    /* Un grupo vacío corta la lista: si la sección 2 no tiene nada, la 3 no
       puede contar como escrita — el bucle tiene que volver a la 2. */
    if (recetas.length === 0) break;
    grupos.push(recetas);
  }
  return grupos;
}

/** Todas las recetas del recetario, en orden, para dibujar el PDF. */
export function todasLasRecetas(guardado: string | null | undefined): Receta[] {
  return leerGruposDeRecetas(guardado).flat();
}

/**
 * El mensaje con el que se le piden las recetas de una sección.
 *
 * Es el mismo armado que `pedidoDelCapitulo` —y a propósito: la sección de un
 * recetario ocupa el mismo lugar que el capítulo de un ebook de texto, así el
 * bucle de las tres rutas no cambia—. Lo único que cambia es que en vez de un
 * capítulo pide varias recetas.
 */
export function pedidoDeRecetas(
  titulo: string,
  tema: string,
  publico: string | null,
  indice: CapituloPlaneado[],
  numero: number,
  cuantas: number = RECETAS_POR_LLAMADA,
): string {
  const temario = indice
    .map((c, i) => `${i + 1}. ${c.titulo}\n   ${c.resumen}`)
    .join("\n");
  const seccion = indice[numero - 1];

  return [
    `El recetario se llama "${titulo}".`,
    publico ? `Está escrito para: ${publico}` : null,
    "",
    "De qué se trata, en palabras de quien lo vende:",
    `<tema>\n${tema}\n</tema>`,
    "",
    "Las secciones del recetario:",
    `<temario>\n${temario}\n</temario>`,
    "",
    `Te toca la sección ${numero}: "${seccion?.titulo ?? ""}".`,
    seccion?.resumen ? `Qué va adentro: ${seccion.resumen}` : null,
    "",
    `Escribí ${cuantas} recetas para esa sección.`,
  ].filter((l) => l !== null).join("\n");
}
