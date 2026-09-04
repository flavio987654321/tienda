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
 * Igual de largo que el nicho del embudo, y por el mismo motivo: acá también
 * hay gente que **ya tiene el ebook pensado** y quiere pegar su índice entero.
 * Con 600 caracteres tenía que resumirlo, y resumir el índice es justo perder
 * lo que lo hace suyo.
 */
export const LARGO_TEMA = 2_500;
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

/** Los tres tipos de pedazo que sabe dibujar el PDF. Nada más entra. */
export const TIPOS_DE_BLOQUE = ["subtitulo", "parrafo", "vineta"] as const;
export type TipoDeBloque = (typeof TIPOS_DE_BLOQUE)[number];

export type Bloque = { tipo: TipoDeBloque; texto: string };

export type CapituloPlaneado = { titulo: string; resumen: string };
export type CapituloEscrito = { titulo: string; bloques: Bloque[] };

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
        },
        required: ["titulo", "resumen"],
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
      minItems: 3,
      maxItems: BLOQUES_MAX,
      items: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: [...TIPOS_DE_BLOQUE],
            description: "subtitulo, parrafo o vineta.",
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
export function normalizarIndice(crudo: unknown, tituloPropio?: string | null): IndiceSugerido | null {
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

    capitulos.push({ titulo: tit, resumen: res });
  }

  /* Menos del mínimo no es un ebook. Se rechaza entero y se devuelve el cupo:
     es preferible "probá de nuevo" a cobrarle tres capítulos a alguien. */
  if (capitulos.length < CAPITULOS_MIN) return null;

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
  if (bloques.length < 3) return null;

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
export function leerIndice(guardado: string | null | undefined): CapituloPlaneado[] {
  if (typeof guardado !== "string") return [];
  let crudo: unknown;
  try { crudo = JSON.parse(guardado); } catch { return []; }
  if (!Array.isArray(crudo)) return [];

  const capitulos: CapituloPlaneado[] = [];
  for (const bruto of crudo) {
    if (capitulos.length >= CAPITULOS_MAX) break;
    if (!bruto || typeof bruto !== "object") continue;
    const b = bruto as Record<string, unknown>;
    const tit = limpiarTexto(b.titulo, LARGO_TITULO_CAPITULO);
    const res = limpiarTexto(b.resumen, LARGO_RESUMEN_CAPITULO);
    if (!tit) continue;
    capitulos.push({ titulo: tit, resumen: res ?? "" });
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
