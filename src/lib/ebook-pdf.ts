import path from "path";
import PDFDocument from "pdfkit";
import { INGREDIENTES_MAX, PASOS_MAX, type Bloque, type CapituloEscrito, type Receta } from "@/lib/ebook-ia";
import type { FotoDelEbook } from "@/lib/fotos-pexels";
/* Los colores salieron de acá el 09/09/26 para que la vista previa del editor
   los pueda usar sin arrastrar pdfkit al navegador. Ver `ebook-colores`. */
import {
  TAPA_DE_FABRICA, coloresDelEbook, SOBRE_LA_FOTO, acentoSobreLaFoto,
  type ColoresDeTapa, type ColoresDelEbook, type ModoDelEbook,
} from "@/lib/ebook-colores";
/* Y el molde salió de acá el mismo día, por el mismo motivo y para lo mismo:
   la previa tiene que poder dibujar la hoja del estilo que se eligió. */
import {
  moldeDe, anchoUtilDe, columnaDeTexto, anchoDeColumna,
  type Molde, type EstiloDeEbook,
} from "@/lib/ebook-estilos";

/**
 * De los capítulos escritos al PDF que se entrega.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTE ARCHIVO ES EL PRODUCTO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lo que sale de acá es lo que el comprador baja. No es una vista previa ni un
 * borrador: es la cosa por la que pagó.
 *
 * ── Por qué pdfkit y no un navegador ───────────────────────────────────────
 *
 * Lo natural sería dibujar HTML y pedirle a Chrome que lo imprima. No entra:
 * un Chrome adentro de una función serverless pesa más de 100 MB y tarda
 * segundos en arrancar, y acá el techo es de 60 segundos para todo.
 *
 * pdfkit escribe el PDF derecho, sin navegador. Corta los renglones y salta de
 * página solo, que es el 90 % del trabajo de maquetar texto corrido.
 *
 * ── ⚠️ Por qué el texto se limpia igual, con fuentes propias ───────────────
 *
 * Desde el 07/09/26 el ebook va con Playfair Display y Lora incrustadas (ver
 * `ARCHIVOS_DE_FUENTE`). Eso arregló que antes, con las 14 de fábrica, sólo
 * entrara el alfabeto latino de un byte.
 *
 * Pero **el filtro se queda**, y no por costumbre: ninguna tipografía del
 * mundo tiene todos los signos. Lora no dibuja un emoji ni una flecha, y un
 * carácter que la fuente no tiene sale como un cuadradito o hace fallar el
 * armado — adentro del archivo que alguien ya pagó. Además está el respaldo:
 * si un día una fuente no viaja, se dibuja con las de fábrica y volvemos a
 * tener el límite de un byte. Por eso todo pasa por `soloLoQueEntra`.
 *
 * ── Qué cambió el 07/09/26 ────────────────────────────────────────────────
 *
 * Hasta esa fecha esto dibujaba una tapa de dos bloques de color, una hoja de
 * contenido y capítulos de párrafos sobre blanco. Se leía como un apunte
 * impreso, no como algo que se paga.
 *
 * Ahora tiene **fotos, tema claro u oscuro, portadilla por capítulo y muebles
 * que se repiten** —encabezado, franja al pie, número de página—. Las fotos
 * son opcionales de punta a punta: sin ellas sale lo de antes, con bloques de
 * color donde iría la imagen. Ver `fotos-pexels.ts`.
 */

/* ── El papel ───────────────────────────────────────────────────────────── */

const HOJA = { ancho: 595.28, alto: 841.89 };  // A4 en puntos
const ALTO_FRANJA = 34;

/* ══════════════════════════════════════════════════════════════════════════
   ⚠️ EL t.margen Y EL AIRE DE t.arriba Y t.abajo YA NO ESTÁN ACÁ
   ══════════════════════════════════════════════════════════════════════════

   Eran cuatro constantes de este archivo —t.margen 56, t.ancho, t.arriba 92,
   t.abajo 78— y ahora salen del **molde** que eligió quien vende: un `cartel`
   usa 46 de margen y un `manual` corre el texto 152 puntos a la derecha para
   dejar la franja de los subtítulos. Ver `ebook-estilos`.

   Viajan adentro del tema, ya calculadas, por el mismo motivo que las letras:
   cada función que dibuja ya recibe `t`, así que no hace falta un parámetro
   más y no hay forma de que una dibuje con el margen de un molde y otra con el
   de otro. Las que se usan a cada rato son:

     t.margen  · el margen lateral
     t.ancho   · lo que queda de hoja entre los dos márgenes
     t.xTexto  · dónde arranca el CUERPO, que con franja no es el margen
     t.anchoTexto · cuánto mide el cuerpo
     t.columna · cuánto mide UNA columna (con una sola, es todo el cuerpo)
     t.arriba / t.abajo · dónde puede empezar y dónde tiene que parar */

/* ── Las tipografías ────────────────────────────────────────────────────── */

/**
 * Los cuatro archivos que se empaquetan con el ebook, en `fuentes/`.
 *
 * **Playfair Display** para lo que se mira —tapa, números de capítulo,
 * títulos—: es una serif de trazo contrastado, la que hace que una tapa se lea
 * como un libro y no como un informe. **Lora** para lo que se lee: está hecha
 * para textos largos en pantalla y aguanta 40 hojas seguidas sin cansar.
 *
 * Las dos son de licencia abierta (OFL) y se pueden incrustar en un archivo
 * que se vende. La licencia de cada una viaja al lado, en la misma carpeta.
 *
 * ⚠️ **Van declaradas en `next.config.ts`.** El empaquetador no ve estas
 * aperturas —la ruta se arma sola, no hay `import` que las nombre— así que sin
 * la línea de `outputFileTracingIncludes` los archivos no viajan y la función
 * se cae recién EN PRODUCCIÓN. Es el mismo problema, y la misma solución, que
 * ya tienen los `.afm` de pdfkit.
 */
const ARCHIVOS_DE_FUENTE = {
  titulo: "PlayfairDisplay-Bold.ttf",
  cuerpo: "Lora-Regular.ttf",
  cursiva: "Lora-Italic.ttf",
  etiqueta: "Lora-Bold.ttf",
} as const;

/**
 * Las de fábrica, para cuando un archivo no está.
 *
 * Son las 14 que todo lector de PDF ya tiene adentro. ⚠️ Esto **no es un
 * adorno defensivo**: si un día el empaquetado deja una fuente afuera, la
 * alternativa a caer acá es que reviente el armado de un ebook ya pagado. Sale
 * más feo, sale entero.
 */
const DE_FABRICA = {
  titulo: "Helvetica-Bold",
  cuerpo: "Times-Roman",
  cursiva: "Times-Italic",
  etiqueta: "Helvetica-Bold",
} as const;

type Letras = { titulo: string; cuerpo: string; cursiva: string; etiqueta: string };

/**
 * Registrar las cuatro en el documento y decir con qué nombre quedó cada una.
 *
 * Cae de a una y no todas juntas: si Playfair no está pero Lora sí, el ebook
 * sale con Lora en el cuerpo y Helvetica en los títulos, que es bastante mejor
 * que renunciar a las dos.
 */
function registrarLetras(doc: Doc): Letras {
  const salida = { ...DE_FABRICA } as Letras;

  for (const [papel, archivo] of Object.entries(ARCHIVOS_DE_FUENTE)) {
    const ruta = path.join(process.cwd(), "fuentes", archivo);
    try {
      doc.registerFont(archivo, ruta);
      salida[papel as keyof Letras] = archivo;
    } catch {
      console.error("[ebook-pdf] no se pudo cargar la tipografía; va la de fábrica", { archivo });
    }
  }

  return salida;
}

/* ── Lo que entra en una tipografía de un byte ──────────────────────────── */

/**
 * Los caracteres de más allá de 0xFF que WinAnsi sí sabe dibujar: las comillas
 * tipográficas, los guiones largos, los puntos suspensivos, la viñeta.
 *
 * Están acá porque son **los que un modelo escribe todo el tiempo**. Sin esta
 * lista, cada comilla curva de cada párrafo se perdería.
 */
const ENTRAN_IGUAL = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/** Los que no entran pero tienen un reemplazo obvio, en vez de desaparecer. */
const REEMPLAZOS: Record<string, string> = {
  "→": "->", "←": "<-", "⇒": "=>", "↔": "<->",
  "≈": "aprox. ", "≠": "!=", "≤": "<=", "≥": ">=",
  "✓": "-", "✔": "-", "✅": "-", "•": "•", "·": "-",
  "…": "…", "–": "–", "—": "—",
  /* ⚠️ Escritos con su código y no con el carácter: son tres espacios que a
     simple vista son idénticos —duro, fino y de ancho cero— y cualquier
     herramienta que reescriba este archivo los aplasta a un espacio común.
     Cuando pasa, las tres claves quedan iguales y TypeScript corta el build
     con "multiple properties with the same name". Ya pasó. */
  " ": " ", " ": " ", "​": "",
};

/**
 * Las letras latinas que NFD no parte en base más acento.
 *
 * Son pocas: la mayoría —ć, ż, č, ř, ș— sí se parten y no hacen falta acá. Estas
 * llevan el adorno adentro del trazo, así que hay que decir a mano con qué se
 * reemplazan. Ver el comentario en `soloLoQueEntra`.
 */
const SIN_ADORNO: Record<string, string> = {
  "ł": "l", "Ł": "L",
  "đ": "d", "Đ": "D",
  "ı": "i", "ħ": "h", "Ħ": "H",
  "ŧ": "t", "Ŧ": "T",
  "ŋ": "n", "Ŋ": "N",
};

/**
 * El texto, dejando sólo lo que la tipografía puede dibujar.
 *
 * ⚠️ **No es cosmética.** Un carácter que la fuente no tiene sale como un
 * cuadradito o directamente hace fallar el armado, y eso pasaría adentro del
 * archivo que alguien ya pagó. Todo lo que va al PDF pasa por acá, venga del
 * modelo o de un campo que escribió la persona.
 */
export function soloLoQueEntra(texto: string): string {
  let salida = "";
  for (const c of texto.normalize("NFC")) {
    const reemplazo = REEMPLAZOS[c];
    if (reemplazo !== undefined) { salida += reemplazo; continue; }

    const punto = c.codePointAt(0) ?? 0;
    /* Los de control se van: nadie los escribe a mano y rompen el renglón. El
       salto de línea tampoco entra — cada bloque es un párrafo, y el salto lo
       pone la maqueta, no el texto. */
    if (punto < 0x20 || punto === 0x7f) { salida += " "; continue; }
    if (punto <= 0xff || ENTRAN_IGUAL.has(punto)) { salida += c; continue; }

    /* ── ⚠️ ANTES DE TIRARLO, PROBAR CON LA LETRA SIN EL ADORNO ─────────────
       Una letra latina con un acento que la tipografía no tiene se descartaba
       entera, y eso **le come una letra al nombre de una persona**. En la hoja
       de créditos —la que existe justamente para nombrar a quien sacó la foto—
       "İdil Ceren Çelikler" salió como "dil Ceren Çelikler".

       Los nombres del banco de imágenes son de todo el mundo: turcos, polacos,
       checos, vietnamitas. Escribir mal el nombre de alguien a quien estamos
       obligados a acreditar es peor que escribirlo sin el acento.

       NFD parte la letra en base + acento, así que alcanza con quedarse con la
       base. Las pocas que no se parten —la ł polaca, la đ croata— van en
       `SIN_ADORNO`. Las que no son latinas se siguen descartando: no hay
       ninguna "letra parecida" razonable para un ideograma. */
    const acostumbrada = SIN_ADORNO[c] ?? c.normalize("NFD")[0];
    const base = acostumbrada.codePointAt(0) ?? 0;
    if (base <= 0xff && base >= 0x20) { salida += acostumbrada; continue; }

    /* Lo que quedó afuera —emojis, flechas raras, alfabetos de otro idioma— se
       descarta en silencio. Dejarlo pasar sería peor. */
  }
  return salida.replace(/ {2,}/g, " ").trim();
}

/* ── Los colores ────────────────────────────────────────────────────────── */

/**
 * Los colores viven en , que no importa nada.
 *
 * ⚠️ Salieron de acá el 09/09/26 y NO fue por orden: la vista previa del editor
 * pinta el mismo ebook en el navegador, y este archivo importa pdfkit. La otra
 * salida era escribir los colores otra vez allá — dos copias de una regla que
 * se desincronizan de a una, con la previa mostrando un verde y el archivo
 * saliendo con otro. Ver el encabezado de aquel archivo.
 *
 * Se vuelven a exportar desde acá porque quien dibuja el PDF los pide a este
 * archivo desde antes, y su prueba también.
 */
export {
  TAPA_DE_FABRICA, contraste, acentoQueSeVe, coloresDelEbook,
} from "@/lib/ebook-colores";
export type { ColoresDeTapa, ModoDelEbook } from "@/lib/ebook-colores";

/**
 * Las medidas del molde, ya resueltas contra el ancho de la hoja.
 *
 * ⚠️ Se calculan UNA vez, al armar el tema, y no en cada función que dibuja. No
 * es por velocidad: es porque `t.xTexto` y `t.columna` salen de una cuenta con
 * la franja y la calle, y esa cuenta hecha en dos lugares se desincroniza — el
 * texto arrancaría en un lugar y el subtítulo se dibujaría en otro.
 */
type Tema = ColoresDelEbook & Letras & {
  /** El molde entero, para lo que es una decisión y no una medida. */
  molde: Molde;
  margen: number;
  /** Lo que queda de hoja entre los dos márgenes. */
  ancho: number;
  /** Dónde arranca el cuerpo del texto. Con franja al costado, no es el margen. */
  xTexto: number;
  anchoTexto: number;
  /** Una columna. Con una sola, es el cuerpo entero. */
  columna: number;
  arriba: number;
  abajo: number;
};

/** Los colores del ebook, las letras con las que se dibuja y el molde. */
export function armarTema(
  paleta: ColoresDeTapa, modo: ModoDelEbook, letras: Letras, molde: Molde,
): Tema {
  const texto = columnaDeTexto(molde, HOJA.ancho);
  return {
    ...coloresDelEbook(paleta, modo),
    ...letras,
    molde,
    margen: molde.margen,
    ancho: anchoUtilDe(molde, HOJA.ancho),
    xTexto: texto.x,
    anchoTexto: texto.ancho,
    columna: anchoDeColumna(molde, HOJA.ancho),
    arriba: molde.arriba,
    abajo: molde.abajo,
  };
}

/* ── El armado ──────────────────────────────────────────────────────────── */

export type DatosDelEbook = {
  titulo: string;
  promesa: string;
  /** Quién lo vende. Va en la tapa y en la franja del pie: el ebook es de esa persona. */
  autor: string;
  capitulos: CapituloEscrito[];
  /**
   * Los colores: los MISMOS que la persona ya eligió para su página de venta
   * (`PaginaVenta.paleta`). No hay que preguntarle nada nuevo — elige una vez y
   * el PDF que entrega combina con la página que lo vendió.
   *
   * Opcional a propósito: un ebook de una cuenta que todavía no armó su página
   * tiene que salir igual. Sin paleta se cae a la de fábrica.
   */
  paleta?: ColoresDeTapa;
  /** Claro por defecto: es el que se imprime bien y el que no sorprende a nadie. */
  modo?: ModoDelEbook;
  /**
   * Cómo está armada la hoja. Una de `ESTILOS`; ver `ebook-estilos`.
   *
   * Opcional, y sin él sale `libro`, que es **exactamente** el molde con el que
   * se armaban todos los ebooks antes del 09/09/26. Así, rearmar uno viejo
   * devuelve el mismo archivo y no uno parecido.
   */
  estilo?: EstiloDeEbook;
  /** La foto de la tapa. Sin ella la tapa sale con los bloques de color. */
  fotoTapa?: FotoDelEbook | null;
  /**
   * Una por capítulo, EN ORDEN y del mismo largo que `capitulos`.
   *
   * ⚠️ Los huecos van como `null` y no salteados: un arreglo más corto correría
   * todas las fotos de lugar y cada capítulo saldría con la del siguiente.
   */
  fotosCapitulos?: (FotoDelEbook | null)[];
  /**
   * Las recetas, cuando el ebook es un recetario.
   *
   * ⚠️ Si viene con algo, **manda esto y `capitulos` se ignora**: son dos
   * moldes distintos para el mismo archivo, no dos cosas que se apilan. La
   * hoja de contenido y las fotos salen de acá igual que salían de los
   * capítulos, y `fotosCapitulos` se empareja POR POSICIÓN con las recetas.
   */
  recetas?: Receta[];
};

type Doc = PDFKit.PDFDocument;

/** Lo que los muebles de cada hoja necesitan saber mientras se dibuja. */
type Estado = {
  numero: number;
  capitulo: string;
  /** La portadilla y la de contenido traen su propio título: no llevan encabezado. */
  conEncabezado: boolean;
  pie: string;
  /**
   * En qué columna se está escribiendo. Siempre 0 si el molde tiene una sola.
   *
   * ⚠️ Vive en el estado y no en una variable de `capitulo` porque `muebles`
   * —que corre colgado de `pageAdded`, en el medio de un párrafo— tiene que
   * poder devolverla a 0: una hoja nueva empieza por la columna de la
   * izquierda, y sin esto el texto seguiría en la derecha con la izquierda en
   * blanco.
   */
  columna: 0 | 1;
  /**
   * Hasta dónde llegó el último subtítulo de la franja del costado.
   *
   * Sólo lo usan los moldes con franja. Ver `dibujarSubtitulo`: ahí está por
   * qué dos subtítulos seguidos se pisarían sin esto.
   */
  pisoFranja: number;
  /**
   * A qué altura empiezan las columnas de ESTA hoja.
   *
   * No siempre es `arriba`: en la hoja donde abre un capítulo, las dos columnas
   * arrancan abajo de la portadilla. Sin esto, al pasar a la segunda columna el
   * texto subiría hasta el borde y se metería adentro de la foto del capítulo.
   */
  yColumna: number;
};

/**
 * Una foto tapando un rectángulo exacto, sin deformarse.
 *
 * pdfkit estira la imagen a lo que se le pida, así que una foto apaisada
 * puesta en un hueco vertical sale aplastada. Acá se calcula la escala que
 * cubre el hueco, se centra y **se recorta lo que sobra**.
 *
 * Devuelve `false` cuando la imagen no se pudo abrir —un archivo cortado, un
 * formato que pdfkit no conoce— para que quien llama dibuje el bloque de color
 * en su lugar. ⚠️ Si esto tirara la excepción se caería el armado entero de un
 * ebook que ya está escrito y pago.
 */
function fotoCubriendo(
  doc: Doc, foto: FotoDelEbook, x: number, y: number, ancho: number, alto: number,
): boolean {
  try {
    /* ⚠️ `openImage` existe en pdfkit desde hace años pero NO está en sus
       tipos, así que TypeScript lo rechaza. Se declara acá lo poco que se usa
       —el alto y el ancho de la imagen— en vez de castear a `any`: si algún
       día lo sacan, esto sigue compilando y falla en la prueba, que es donde
       hay que enterarse. */
    const conMedidas = doc as unknown as {
      openImage(datos: Buffer): { width: number; height: number };
    };
    const imagen = conMedidas.openImage(foto.datos);
    const escala = Math.max(ancho / imagen.width, alto / imagen.height);
    const a = imagen.width * escala;
    const b = imagen.height * escala;

    doc.save();
    doc.rect(x, y, ancho, alto).clip();
    doc.image(foto.datos, x + (ancho - a) / 2, y + (alto - b) / 2, { width: a, height: b });
    doc.restore();
    return true;
  } catch {
    console.error("[ebook-pdf] no se pudo abrir una foto; va el bloque de color");
    return false;
  }
}

/**
 * Dibujar abajo del margen sin que pdfkit abra una hoja nueva.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIN ESTO EL PDF NO TERMINA NUNCA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * pdfkit se fija, antes de escribir cada renglón, si entra arriba del margen
 * de abajo; si no entra, **abre otra hoja**. Y el pie va justamente ahí abajo,
 * pasado el margen. Escrito de frente, el pie de la hoja 1 abre la hoja 2, que
 * dispara su propio pie, que abre la hoja 3: se va en recursión hasta que
 * revienta la pila. Pasó, y el error que tira —"Maximum call stack size
 * exceeded" adentro de `reference.js`— no dice una palabra de todo esto.
 *
 * `lineBreak: false` NO alcanza: eso frena el corte de renglón a lo ancho, no
 * el salto de hoja. Lo único que lo frena es correr el margen de abajo
 * mientras se dibuja, y devolverlo después.
 */
function sinCortes(doc: Doc, dibujar: () => void): void {
  const guardado = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  try {
    dibujar();
  } finally {
    doc.page.margins.bottom = guardado;
  }
}

/**
 * Un velo negro de arriba abajo, para que el texto claro se lea sobre la foto.
 *
 * Lleva tres paradas y no dos porque **la foto la elige Pexels y puede salir
 * cualquiera**: una torta sobre mantel blanco a pleno sol deja el título
 * blanco ilegible si el velo recién se pone negro abajo del todo. Con una
 * parada en el medio el oscurecido llega antes, donde arranca el texto.
 */
function velo(doc: Doc, y: number, alto: number, paradas: [number, number][]): void {
  const g = doc.linearGradient(0, y, 0, y + alto);
  for (const [donde, cuanto] of paradas) g.stop(donde, "#000000", cuanto);
  doc.rect(0, y, HOJA.ancho, alto).fill(g);
}

/**
 * El sello redondo con la cantidad de capítulos.
 *
 * Va montado sobre el borde de la foto. Además de decir algo cierto —cuánto
 * hay adentro— tapa el corte recto entre la foto y el papel, que es lo que
 * hacía ver la mitad de abajo de la tapa clara como una hoja a medio llenar.
 */
function sello(doc: Doc, cantidad: number, palabra: [string, string], t: Tema, x: number, y: number): void {
  if (cantidad <= 0) return;
  const RADIO = 42;
  doc.circle(x, y, RADIO).fill(t.acento);
  sinCortes(doc, () => {
    doc.font(t.titulo).fontSize(20).fillColor(t.sobreAcento)
      .text(String(cantidad), x - RADIO, y - 17,
        { width: RADIO * 2, align: "center", lineBreak: false });
    doc.font(t.titulo).fontSize(7).fillColor(t.sobreAcento)
      .text(cantidad === 1 ? palabra[0] : palabra[1], x - RADIO, y + 6,
        { width: RADIO * 2, align: "center", characterSpacing: 1.2, lineBreak: false });
  });
}

/**
 * LA TAPA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LO ÚNICO QUE SE VE ANTES DE COMPRAR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es la imagen que la persona va a mostrar en su página, en Instagram y en
 * WhatsApp.
 *
 * Hay tres tapas y el motivo de cada una:
 *
 * - **Oscura con foto**: la foto ocupa la hoja entera y el texto va encima de
 *   un velo negro. Es la que más pega.
 * - **Clara con foto**: la foto se queda arriba y el texto baja al papel. Con
 *   el texto encima de la foto quedaba apretado contra el borde y la mitad de
 *   abajo vacía.
 * - **Sin foto**: los dos bloques de color de siempre. Es la red: una cuenta
 *   sin clave de Pexels, o una búsqueda que no trajo nada, tiene que entregar
 *   una tapa igual de terminada.
 */
function tapa(doc: Doc, d: DatosDelEbook, t: Tema): void {
  const titulo = soloLoQueEntra(d.titulo);
  const promesa = soloLoQueEntra(d.promesa);
  const autor = soloLoQueEntra(d.autor).toUpperCase();

  doc.rect(0, 0, HOJA.ancho, HOJA.alto).fill(t.fondo);

  const hayFoto = !!d.fotoTapa;
  const dentroDelLibro = loQueTieneAdentro(d);

  /* Las otras tres tapas. La de acá abajo es `clasica`, la de siempre. */
  if (t.molde.tapa === "titular" && hayFoto && d.fotoTapa) {
    tapaDeTitular(doc, d, { titulo, promesa, autor }, t, dentroDelLibro);
    return;
  }
  if (t.molde.tapa === "ficha" && hayFoto && d.fotoTapa) {
    tapaDeFicha(doc, d, { titulo, promesa, autor }, t, dentroDelLibro);
    return;
  }

  /* ⚠️ `cartel` va a sangre SIEMPRE, no sólo en tema oscuro. Por eso la
     condición mira el molde además del modo: la foto entera con el texto encima
     es la mitad de lo que hace a ese estilo, y en tema claro también. */
  const aSangre = t.molde.tapa === "sangre" || t.modo === "oscuro";

  if (hayFoto && d.fotoTapa && aSangre) {
    if (fotoCubriendo(doc, d.fotoTapa, 0, 0, HOJA.ancho, HOJA.alto)) {
      /* De un cuarto para abajo se oscurece: ahí va todo el texto. */
      velo(doc, HOJA.alto * 0.26, HOJA.alto * 0.74, [[0, 0], [0.4, 0.66], [1, 0.97]]);
      velo(doc, 0, 200, [[0, 0.62], [1, 0]]);
      tapaASangre(doc, { titulo, promesa, autor }, t);
      sello(
        doc, dentroDelLibro.titulos.length, dentroDelLibro.palabra, t,
        HOJA.ancho - t.margen - 42, 706,
      );
      return;
    }
  }

  /* Las otras dos comparten el corte: arriba la foto o el color, abajo el
     papel con el texto. */
  const CORTE = HOJA.alto * (hayFoto ? 0.52 : 0.6);
  const foto = hayFoto && d.fotoTapa
    ? fotoCubriendo(doc, d.fotoTapa, 0, 0, HOJA.ancho, CORTE)
    : false;

  if (!foto) {
    /* A sangre, sin respetar el margen: el margen es para el texto, no para el
       color. Un bloque con bordes alrededor parece una hoja mal impresa. */
    doc.rect(0, 0, HOJA.ancho, CORTE).fill(t.acento);

    /* Sin foto el título va DENTRO del bloque: si bajara al papel, la tapa
       quedaría con medio metro de color vacío arriba. */
    doc.font(t.titulo).fontSize(34);
    const alto = doc.heightOfString(titulo, { width: t.ancho, lineGap: 4 });
    doc.fillColor(t.sobreAcento)
      .text(titulo, t.margen, CORTE - alto - 54, { width: t.ancho, lineGap: 4 });
    doc.rect(t.margen, CORTE - 34, 62, 4).fill(t.sobreAcento);
    tapaPie(doc, { promesa, autor }, t, CORTE + 48);
    return;
  }

  /* Montado sobre el borde de la foto, del lado derecho. */
  sello(doc, dentroDelLibro.titulos.length, dentroDelLibro.palabra, t, HOJA.ancho - t.margen - 42, CORTE);

  doc.font(t.titulo).fontSize(9).fillColor(t.acento)
    .text("GUÍA COMPLETA", t.margen, CORTE + 44,
      { width: t.ancho, characterSpacing: 2.4, lineBreak: false });

  doc.font(t.titulo).fontSize(t.molde.tituloTapa).fillColor(t.tinta)
    .text(titulo, t.margen, CORTE + 64, { width: t.ancho, lineGap: 3 });

  const yRaya = doc.y + 16;
  doc.rect(t.margen, yRaya, 62, 4).fill(t.acento);
  tapaPie(doc, { promesa, autor }, t, yRaya + 24);
}

/** Lo que las tapas nuevas necesitan del ebook, ya limpio. */
type TextoDeTapa = { titulo: string; promesa: string; autor: string };
type LoDeAdentro = { titulos: string[]; palabra: [string, string] };

/**
 * La tapa de titular: la foto arriba y el título adentro de una franja de
 * acento que cruza la hoja. Es la de `compacto`.
 *
 * ⚠️ El título va sobre el acento y NO sobre el papel, así que se escribe con
 * `sobreAcento` — el color que la paleta trae verificado contra él. Escribirlo
 * con `tinta`, que es lo que hace la tapa clásica, daría un azul noche sobre
 * un azul noche adentro de un archivo que ya se vendió.
 */
function tapaDeTitular(
  doc: Doc, d: DatosDelEbook, x: TextoDeTapa, t: Tema, dentro: LoDeAdentro,
): void {
  const CORTE = HOJA.alto * 0.44;

  if (!fotoCubriendo(doc, d.fotoTapa!, 0, 0, HOJA.ancho, CORTE)) {
    doc.rect(0, 0, HOJA.ancho, CORTE).fill(t.caja);
  }

  doc.font(t.titulo).fontSize(t.molde.tituloTapa);
  const altoTitulo = doc.heightOfString(x.titulo, { width: t.ancho, lineGap: 3 });
  const altoFranja = altoTitulo + 76;

  doc.rect(0, CORTE, HOJA.ancho, altoFranja).fill(t.acento);

  doc.font(t.titulo).fontSize(9).fillColor(t.sobreAcento)
    .text("GUÍA COMPLETA", t.margen, CORTE + 28,
      { width: t.ancho, characterSpacing: 2.4, lineBreak: false });

  doc.font(t.titulo).fontSize(t.molde.tituloTapa).fillColor(t.sobreAcento)
    .text(x.titulo, t.margen, CORTE + 48, { width: t.ancho, lineGap: 3 });

  const yPapel = CORTE + altoFranja + 34;
  if (x.promesa) {
    doc.font(t.cursiva).fontSize(13).fillColor(t.tinta)
      .text(x.promesa, t.margen, yPapel, { width: t.ancho - 30, lineGap: 3 });
  }

  sello(
    doc, dentro.titulos.length, dentro.palabra, t,
    HOJA.ancho - t.margen - 42, CORTE + altoFranja,
  );

  if (x.autor) {
    sinCortes(doc, () => {
      doc.font(t.titulo).fontSize(9).fillColor(t.suave)
        .text(x.autor, t.margen, HOJA.alto - 62,
          { width: t.ancho, characterSpacing: 2.2, lineBreak: false });
    });
  }
}

/**
 * La tapa de ficha: el texto a la izquierda y la foto en una columna alta a la
 * derecha. Es la de `manual`, y repite en la tapa lo que el molde hace adentro.
 */
function tapaDeFicha(
  doc: Doc, d: DatosDelEbook, x: TextoDeTapa, t: Tema, dentro: LoDeAdentro,
): void {
  /* La foto se lleva el 46 % del ancho y baja hasta la franja del autor. */
  const anchoFoto = HOJA.ancho * 0.46;
  const xFoto = HOJA.ancho - anchoFoto;
  const altoFoto = HOJA.alto - 96;

  if (!fotoCubriendo(doc, d.fotoTapa!, xFoto, 0, anchoFoto, altoFoto)) {
    doc.rect(xFoto, 0, anchoFoto, altoFoto).fill(t.caja);
  }

  const anchoTexto = xFoto - t.margen * 2;

  doc.font(t.titulo).fontSize(8.5).fillColor(t.acento)
    .text("GUÍA COMPLETA", t.margen, 96,
      { width: anchoTexto, characterSpacing: 2.2, lineBreak: false });

  doc.rect(t.margen, 118, 44, 4).fill(t.acento);

  doc.font(t.titulo).fontSize(t.molde.tituloTapa).fillColor(t.tinta)
    .text(x.titulo, t.margen, 148, { width: anchoTexto, lineGap: 3 });

  if (x.promesa) {
    doc.font(t.cursiva).fontSize(12).fillColor(t.suave)
      .text(x.promesa, t.margen, doc.y + 20, { width: anchoTexto, lineGap: 3 });
  }

  /* El sello, en la columna del texto y no montado sobre la foto: acá la foto
     llega hasta el borde de abajo, así que un círculo encima le comería la
     única parte que se ve entera. */
  sello(doc, dentro.titulos.length, dentro.palabra, t, t.margen + 42, altoFoto - 150);

  if (x.autor) {
    doc.rect(0, HOJA.alto - 96, HOJA.ancho, 96).fill(t.acento);
    sinCortes(doc, () => {
      doc.font(t.titulo).fontSize(9).fillColor(t.sobreAcento)
        .text(x.autor, t.margen, HOJA.alto - 54,
          { width: HOJA.ancho - t.margen * 2, characterSpacing: 2.4, lineBreak: false });
    });
  }
}

/** El texto de la tapa a sangre, apoyado sobre la foto oscurecida. */
function tapaASangre(
  doc: Doc, x: { titulo: string; promesa: string; autor: string }, t: Tema,
): void {
  /* ⚠️ El acento corrido contra el velo y no el de la paleta: con el molde
     `cartel` esta tapa sale también en tema claro, y ahí un bordó de fondo
     claro encima del velo desaparece. Ver `acentoSobreLaFoto`. */
  const acento = acentoSobreLaFoto(t);

  doc.font(t.titulo).fontSize(9).fillColor(acento)
    .text("GUÍA COMPLETA", t.margen, 60,
      { width: t.ancho, characterSpacing: 2.4, lineBreak: false });

  /* ⚠️ 37 y no `tituloTapa`. Acá llegan DOS caminos: el molde `cartel`, que
     eligió la foto entera, y cualquier otro molde en tema oscuro. `tituloTapa`
     es la medida de la tapa de papel —30 en `libro`—, y usarla acá achicaría el
     título de todas las tapas oscuras que ya se generaron. Así que el número
     tuneado se queda, y sólo el molde que pidió esta tapa manda el suyo. */
  const cuerpoDelTitulo = t.molde.tapa === "sangre" ? t.molde.tituloTapa : 37;

  doc.font(t.titulo).fontSize(cuerpoDelTitulo);
  const alto = doc.heightOfString(x.titulo, { width: t.ancho, lineGap: 3 });
  doc.fillColor(SOBRE_LA_FOTO.titulo).text(x.titulo, t.margen, 588 - alto, { width: t.ancho, lineGap: 3 });

  doc.rect(t.margen, 608, 62, 4).fill(acento);

  if (x.promesa) {
    doc.font(t.cursiva).fontSize(13).fillColor(SOBRE_LA_FOTO.promesa)
      .text(x.promesa, t.margen, 636, { width: t.ancho - 30, lineGap: 3 });
  }
  if (x.autor) {
    sinCortes(doc, () => {
      doc.font(t.titulo).fontSize(9).fillColor(SOBRE_LA_FOTO.autor)
        .text(x.autor, t.margen, HOJA.alto - 66,
          { width: t.ancho, characterSpacing: 2.2, lineBreak: false });
    });
  }
}

/** La promesa y el nombre de quien vende, en las tapas que tienen papel abajo. */
function tapaPie(
  doc: Doc, x: { promesa: string; autor: string }, t: Tema, y: number,
): void {
  if (x.promesa) {
    doc.font(t.cursiva).fontSize(13).fillColor(t.tinta)
      .text(x.promesa, t.margen, y, { width: t.ancho - 30, lineGap: 3 });
  }
  if (x.autor) {
    doc.rect(0, HOJA.alto - 44, HOJA.ancho, 44).fill(t.acento);
    sinCortes(doc, () => {
      doc.font(t.titulo).fontSize(9).fillColor(t.sobreAcento)
        .text(x.autor, 0, HOJA.alto - 28,
          { width: HOJA.ancho, align: "center", characterSpacing: 2.4, lineBreak: false });
    });
  }
}

/** La hoja de contenido. */
function contenido(doc: Doc, d: DatosDelEbook, t: Tema, e: Estado): void {
  e.conEncabezado = false;
  doc.addPage();
  e.conEncabezado = true;

  doc.font(t.titulo).fontSize(9).fillColor(t.acento)
    .text("EN ESTE LIBRO", t.margen, t.arriba,
      { width: t.ancho, characterSpacing: 2.4, lineBreak: false });
  doc.font(t.titulo).fontSize(26).fillColor(t.tinta)
    .text("Contenido", t.margen, t.arriba + 22, { width: t.ancho });
  doc.rect(t.margen, t.arriba + 66, 52, 3).fill(t.acento);

  /* Sin números de página a propósito: pdfkit no sabe en qué hoja va a caer un
     capítulo hasta haberlo dibujado, y una tabla de contenidos con números
     equivocados es peor que una sin números. */
  let y = t.arriba + 100;
  for (const [i, titulo] of loQueTieneAdentro(d).titulos.entries()) {
    doc.font(t.titulo).fontSize(11).fillColor(t.acento)
      .text(String(i + 1).padStart(2, "0"), t.margen, y + 1, { width: 26, lineBreak: false });
    doc.font(t.cuerpo).fontSize(12.5).fillColor(t.tinta)
      .text(soloLoQueEntra(titulo), t.margen + 32, y, { width: t.ancho - 32 });
    y = doc.y + 12;
  }
}

/**
 * Qué lista el índice y qué dice el sello de la tapa.
 *
 * Un recetario tiene recetas y un ebook de texto tiene capítulos. Es la misma
 * hoja de contenido y el mismo sello, con otra palabra: decir "10 CAPÍTULOS"
 * en la tapa de un recetario es raro, y listar "capítulos" que en realidad son
 * recetas confunde a quien lo compra.
 */
function loQueTieneAdentro(d: DatosDelEbook): { titulos: string[]; palabra: [string, string] } {
  if (d.recetas && d.recetas.length > 0) {
    return { titulos: d.recetas.map((r) => r.titulo), palabra: ["RECETA", "RECETAS"] };
  }
  return { titulos: d.capitulos.map((c) => c.titulo), palabra: ["CAPÍTULO", "CAPÍTULOS"] };
}

/**
 * La portadilla del capítulo.
 *
 * Es lo que convierte un documento largo en un libro: número grande, foto y
 * **la lista de lo que viene**. Esa lista sale de los subtítulos que el modelo
 * ya escribió, así que no cuesta ni una llamada más.
 *
 * ⚠️ **El capítulo sigue en ESTA misma hoja, abajo de la caja.** Hasta el
 * 07/09/26 la portadilla se llevaba una hoja entera y el texto arrancaba en la
 * siguiente: con nueve capítulos eran nueve hojas con la mitad de abajo en
 * blanco, y un ebook que se hojeaba lleno de aire. Por eso esto no abre hoja al
 * terminar: deja el cursor donde tiene que seguir escribiendo.
 */
function portadilla(
  doc: Doc, c: CapituloEscrito, numero: number, foto: FotoDelEbook | null | undefined,
  t: Tema, e: Estado,
): void {
  /* ⚠️ SÓLO se abre hoja si la de ahora tiene algo escrito.
     `muebles` deja el cursor en `t.arriba` cada vez que nace una hoja, así que
     `doc.y === t.arriba` significa "esta hoja está vacía".

     Sin esta condición aparecían **hojas totalmente en blanco**, con la franja
     del pie y nada más: cuando el último párrafo de un capítulo terminaba justo
     contra el borde, pdfkit abría una hoja para un renglón que ya no llegaba, y
     acá se abría otra encima. Se veía en la hoja 21 del ebook de tortas. */
  if (doc.y > t.arriba + 1) {
    e.conEncabezado = false;
    doc.addPage();
    e.conEncabezado = true;
  }

  /* Los otros dos moldes abren el capítulo de otra manera. El de acá abajo es
     `banda`, el de siempre, y por eso queda escrito en esta función y no en
     una tercera: es el que ya tiene los arreglos encima. */
  if (t.molde.portadilla === "sangre") { portadillaASangre(doc, c, numero, foto, t); return; }
  if (t.molde.portadilla === "ficha") { portadillaDeFicha(doc, c, numero, foto, t); return; }

  const ALTO_FOTO = t.molde.altoFoto;
  const puesta = foto ? fotoCubriendo(doc, foto, 0, 0, HOJA.ancho, ALTO_FOTO) : false;

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ EL NÚMERO VA ARRIBA DE LA FOTO, Y UNA FOTO PUEDE SER DE CUALQUIER COLOR
     ══════════════════════════════════════════════════════════════════════════

     El "07" se dibuja en el color de acento, apoyado en el borde de abajo de la
     banda. Sobre una foto clara con un acento claro —o al revés— desaparece: se
     lee "0" y media panza del 7, o directamente nada.

     Antes había un solo degradado, de 130 puntos, que terminaba de tapar recién
     en el borde. El número arranca 88 puntos más arriba, o sea que su mitad de
     arriba caía sobre una foto tapada apenas un tercio. Con una foto tranquila
     no se notaba; con una de contraste alto, el número se perdía adentro de un
     archivo que se vende.

     Ahora son dos cosas:

       · El degradado ARRANCA MÁS ARRIBA (190 en vez de 130) y termina de tapar
         ANTES de donde empieza el número.
       · Y de ahí para abajo va papel liso.

     O sea que el número nunca se apoya sobre la foto: se apoya sobre el papel,
     y la foto se disuelve antes de llegar. La transición sigue siendo suave —de
     eso se trataba el degradado— y encima es más larga que antes. */
  /* Proporcionales al número y no escritos: eran 96 y 88 para un número de 72
     puntos, que es el de `libro`. Si el molde lo cambia, el papel liso donde se
     apoya y la altura de la que cuelga tienen que acompañarlo o el número
     vuelve a caer encima de la foto.

     ⚠️ Y la cuenta queda escrita como `96 / 72` en vez de `1.33`. No es estilo:
     1,33 por 72 da 95,76, o sea que el ebook de siempre habría salido con todo
     corrido un cuarto de punto. No se ve en ninguna pantalla y hace que el mismo
     ebook rearmado devuelva un archivo distinto del que se vendió.

     Comparado contra la versión anterior de este archivo, `libro` sale con el
     texto en las MISMAS coordenadas, con las mismas letras y los mismos colores.
     Lo único que cambia son las curvas de las esquinas: el recuadro de aviso se
     dibujaba con radio 9 y la caja de la portadilla con 10, siendo la misma
     caja. Ahora las dos leen `esquina` del molde y quedan en 10. */
  const ALTO_NUMERO = t.molde.numero * (96 / 72);
  const CUELGA = t.molde.numero * (88 / 72);

  if (puesta) {
    /* La foto se funde con el papel: un corte duro parece un recorte pegado. */
    const desde = ALTO_FOTO - 190;
    const hasta = ALTO_FOTO - ALTO_NUMERO;
    const g = doc.linearGradient(0, desde, 0, hasta);
    g.stop(0, t.fondo, 0).stop(1, t.fondo, 1);
    doc.rect(0, desde, HOJA.ancho, hasta - desde).fill(g);
    /* Y el pedazo donde se apoya el número, liso. */
    doc.rect(0, hasta, HOJA.ancho, ALTO_NUMERO).fill(t.fondo);
  } else {
    doc.rect(0, 0, HOJA.ancho, ALTO_FOTO).fill(t.caja);
  }

  doc.font(t.titulo).fontSize(t.molde.numero).fillColor(t.acento)
    .text(String(numero).padStart(2, "0"), t.margen, ALTO_FOTO - CUELGA,
      { width: t.ancho, lineBreak: false });

  doc.font(t.titulo).fontSize(25).fillColor(t.tinta)
    .text(soloLoQueEntra(c.titulo), t.margen, ALTO_FOTO + 18, { width: t.ancho, lineGap: 2 });

  const yRaya = doc.y + 14;
  doc.rect(t.margen, yRaya, 48, 3).fill(t.acento);

  /* Los subtítulos del capítulo, como promesa de lo que se va a leer. Si el
     capítulo no tiene ninguno —pasa, el modelo a veces escribe corrido— la
     caja no se dibuja: un recuadro vacío se ve peor que no tenerlo. */
  const puntos = c.bloques
    .filter((b) => b.tipo === "subtitulo")
    .map((b) => soloLoQueEntra(b.texto))
    .filter(Boolean)
    .slice(0, 6);

  if (puntos.length === 0) {
    /* Sin caja, el texto arranca abajo de la rayita. */
    doc.x = t.margen;
    doc.y = yRaya + 26;
    return;
  }

  const y = yRaya + 30;
  const alto = 46 + puntos.length * 22;
  doc.roundedRect(t.margen, y, t.ancho, alto, t.molde.esquina).fill(t.caja);
  doc.rect(t.margen, y, 3, alto).fill(t.acento);

  doc.font(t.titulo).fontSize(9).fillColor(t.acento)
    .text("EN ESTE CAPÍTULO", t.margen + 22, y + 20,
      { width: t.ancho - 44, characterSpacing: 1.8, lineBreak: false });

  for (const [i, p] of puntos.entries()) {
    const fila = y + 44 + i * 22;
    doc.font(t.titulo).fontSize(8.5).fillColor(t.acento)
      .text(String(i + 1).padStart(2, "0"), t.margen + 22, fila + 1, { width: 20, lineBreak: false });
    doc.font(t.cuerpo).fontSize(11).fillColor(t.tinta)
      .text(p, t.margen + 46, fila, { width: t.ancho - 70, lineBreak: false, ellipsis: true });
  }

  /* Y el texto del capítulo arranca acá abajo, en esta misma hoja. */
  doc.x = t.margen;
  doc.y = y + alto + 26;
}

/**
 * La portadilla a sangre: la foto tapa el ancho de la hoja y el título va
 * ENCIMA. Es la de `compacto` y la de `cartel`.
 *
 * ⚠️ Acá no va la caja de "en este capítulo", y no es un olvido: el punto de
 * estos dos moldes es que el capítulo empiece de una. La lista de subtítulos
 * baja tres centímetros el arranque del texto, que es exactamente lo contrario.
 * Quien la quiera, tiene `libro` y `manual`.
 */
function portadillaASangre(
  doc: Doc, c: CapituloEscrito, numero: number,
  foto: FotoDelEbook | null | undefined, t: Tema,
): void {
  const alto = t.molde.altoFoto;
  const puesta = foto ? fotoCubriendo(doc, foto, 0, 0, HOJA.ancho, alto) : false;

  if (!puesta) {
    /* Sin foto, el bloque de acento. Es la misma red que en la tapa: una cuenta
       sin fotos tiene que entregar un capítulo igual de terminado. */
    doc.rect(0, 0, HOJA.ancho, alto).fill(t.acento);
  } else {
    /* ⚠️ El velo NO es decoración: el título va en blanco encima de una foto
       que puede ser de cualquier color. Sobre una playa al mediodía, sin velo,
       el título del capítulo desaparece adentro de un archivo que se vende. Es
       el mismo motivo por el que la portadilla de `banda` funde la foto con el
       papel antes de apoyar el número. */
    velo(doc, alto * 0.22, alto * 0.78, [[0, 0], [0.45, 0.6], [1, 0.92]]);
  }

  const tinta = puesta ? SOBRE_LA_FOTO.titulo : t.sobreAcento;
  const TITULO = 27;

  doc.font(t.titulo).fontSize(TITULO);
  const altoTitulo = doc.heightOfString(soloLoQueEntra(c.titulo), {
    width: t.ancho, lineGap: 2,
  });

  const yTitulo = alto - altoTitulo - 42;
  doc.font(t.titulo).fontSize(t.molde.numero).fillColor(tinta)
    .text(String(numero).padStart(2, "0"), t.margen, yTitulo - t.molde.numero * 1.15,
      { width: t.ancho, lineBreak: false });

  doc.font(t.titulo).fontSize(TITULO).fillColor(tinta)
    .text(soloLoQueEntra(c.titulo), t.margen, yTitulo, { width: t.ancho, lineGap: 2 });

  doc.rect(t.margen, alto - 26, 48, 3).fill(puesta ? acentoSobreLaFoto(t) : tinta);

  doc.x = t.xTexto;
  doc.y = alto + 26;
}

/**
 * La portadilla de ficha: el número en la franja del costado, el título al
 * lado y la foto adentro de la columna de texto, como una figura.
 *
 * Es la de `manual`, y es la única que **no ocupa el ancho de la hoja**: en un
 * libro de estudio la foto es parte del texto, no un corte entre capítulos.
 */
function portadillaDeFicha(
  doc: Doc, c: CapituloEscrito, numero: number,
  foto: FotoDelEbook | null | undefined, t: Tema,
): void {
  const y0 = t.arriba;

  doc.font(t.titulo).fontSize(t.molde.numero).fillColor(t.acento)
    .text(String(numero).padStart(2, "0"), t.margen, y0 - 12,
      { width: t.molde.franja, lineBreak: false });

  doc.font(t.titulo).fontSize(24).fillColor(t.tinta)
    .text(soloLoQueEntra(c.titulo), t.xTexto, y0, { width: t.anchoTexto, lineGap: 2 });

  const yRaya = doc.y + 12;
  doc.rect(t.xTexto, yRaya, 48, 3).fill(t.acento);

  const yFoto = yRaya + 22;
  const puesta = foto
    ? fotoCubriendo(doc, foto, t.xTexto, yFoto, t.anchoTexto, t.molde.altoFoto)
    : false;
  if (!puesta) doc.rect(t.xTexto, yFoto, t.anchoTexto, t.molde.altoFoto).fill(t.caja);

  /* Los subtítulos, en la franja del costado y a la altura de la foto: es el
     índice del capítulo puesto donde después van a estar los subtítulos de
     verdad. Sin ellos no se dibuja nada — un título suelto sobre nada se lee
     como un error. */
  const puntos = c.bloques
    .filter((b) => b.tipo === "subtitulo")
    .map((b) => soloLoQueEntra(b.texto))
    .filter(Boolean)
    .slice(0, 5);

  if (puntos.length > 0) {
    doc.font(t.titulo).fontSize(7.5).fillColor(t.acento)
      .text("EN ESTE CAPÍTULO", t.margen, yFoto,
        { width: t.molde.franja, characterSpacing: 1.4, lineBreak: false });

    let fila = yFoto + 18;
    for (const p of puntos) {
      doc.font(t.cuerpo).fontSize(8.5).fillColor(t.suave);
      const altoPunto = doc.heightOfString(p, { width: t.molde.franja, lineGap: 1 });
      doc.text(p, t.margen, fila, { width: t.molde.franja, lineGap: 1 });
      fila += altoPunto + 7;
    }
  }

  doc.x = t.xTexto;
  doc.y = yFoto + t.molde.altoFoto + 24;
}

/** Si todavía entra algo de este alto en lo que queda de la hoja. */
function entra(doc: Doc, alto: number, t: Tema): boolean {
  return doc.y + alto <= HOJA.alto - t.abajo;
}

/**
 * El recuadro de color: el dato que se lee sin leer todo lo de arriba.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ESTE SE MIDE ANTES DE DIBUJARSE, Y LOS DEMÁS NO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un párrafo lo corta pdfkit solo: si no entra, parte el texto y sigue en la
 * hoja siguiente. Un recuadro no se puede partir — se dibuja como una caja de
 * un solo trazo, así que si arranca a diez puntos del pie, **la caja sigue de
 * largo por encima de la franja y del número de página**, y pdfkit no avisa
 * porque para él es un rectángulo, no texto.
 *
 * Por eso acá se calcula cuánto va a medir y, si no entra en lo que queda de
 * hoja, se pasa a la siguiente antes de dibujar nada.
 */
function dibujarAviso(
  doc: Doc, texto: string, t: Tema, etiqueta = "OJO CON ESTO",
  /* ⚠️ Los dos números tienen que ser LOS MISMOS que usó `alturaDelTip` para
     decidir si la receta entraba. Por eso viajan como parámetro en vez de estar
     escritos acá: si acá dijera 10.5 y allá 9.5, la cuenta daría que entra y la
     hoja saldría partida igual. */
  cuerpo = 10.5, relleno = 46,
  /* Dónde y de qué ancho. De fábrica va a lo ancho del margen, que es lo que
     necesita la hoja de receta; el cuerpo de un capítulo le pasa su columna,
     que con dos columnas es la mitad y con franja al costado está corrida. */
  x = t.margen, ancho = t.ancho,
  /* Si no entra, a la columna que sigue en vez de a la hoja que sigue. Sin
     esto, un aviso al pie de la primera columna se llevaría la hoja entera y
     dejaría la segunda columna vacía. */
  seguir?: () => void,
): void {
  const ANCHO_TEXTO = ancho - 44;

  doc.font(t.cuerpo).fontSize(cuerpo);
  const altoTexto = doc.heightOfString(texto, { width: ANCHO_TEXTO, lineGap: 2.5 });
  const alto = altoTexto + relleno;

  doc.moveDown(0.6);
  if (!entra(doc, alto, t)) {
    if (seguir) seguir();
    else doc.addPage();
  }

  const y = doc.y;
  /* Las esquinas las decide el molde: `cartel` y `compacto` van rectas, que es
     lo que los hace ver de imprenta y no de aplicación. `roundedRect` con radio
     0 dibuja un rectángulo igual, pero se llama al derecho para que se lea. */
  if (t.molde.esquina > 0) doc.roundedRect(x, y, ancho, alto, t.molde.esquina).fill(t.caja);
  else doc.rect(x, y, ancho, alto).fill(t.caja);
  doc.rect(x, y, 3, alto).fill(t.acento);

  doc.font(t.etiqueta).fontSize(8).fillColor(t.acento)
    .text(etiqueta, x + 22, y + relleno * 0.30,
      { width: ANCHO_TEXTO, characterSpacing: 1.6, lineBreak: false });

  doc.font(t.cuerpo).fontSize(cuerpo).fillColor(t.tinta)
    .text(texto, x + 22, y + relleno * 0.61, { width: ANCHO_TEXTO, lineGap: 2.5 });

  /* El cursor queda abajo de la caja, no abajo del texto: el relleno de abajo
     es parte del recuadro y lo que siga tiene que arrancar después. */
  doc.x = x;
  doc.y = y + alto + 12;
}

/* ══════════════════════════════════════════════════════════════════════════
   LAS COLUMNAS
   ══════════════════════════════════════════════════════════════════════════

   Sólo el molde `compacto` tiene dos. Los otros tres pasan por acá igual, con
   una sola, y **caen en el camino de siempre**: `escribirParrafo` con una
   columna llama al mismo `doc.text` de antes, con los mismos parámetros.

   ⚠️ Es a propósito y no es pereza. pdfkit sabe cortar un párrafo entre hojas
   —lo hace solo, y ese camino tiene tres arreglos encima que costaron ebooks
   rotos—, pero NO sabe cortarlo entre columnas: para él la hoja es una sola
   caja. Así que las dos columnas se parten a mano. Meter a los cuatro moldes
   por el partido a mano habría puesto el camino nuevo, sin probar, abajo del
   estilo que ya usa todo el mundo. */

/** Dónde arranca la columna en la que se está escribiendo. */
function xDeColumna(t: Tema, e: Estado): number {
  if (t.molde.columnas === 1) return t.xTexto;
  return t.xTexto + e.columna * (t.columna + t.molde.calle);
}

/** Hasta dónde se puede escribir antes de pisar la franja del pie. */
function pieDeHoja(t: Tema): number {
  return HOJA.alto - t.abajo;
}

/**
 * Pasar a la columna de al lado; si ya era la última, a la hoja siguiente.
 *
 * ⚠️ No toca `e.columna` en el caso de la hoja nueva: eso lo hace `muebles`,
 * que corre colgado de `pageAdded`. Si se hiciera en los dos lados, una hoja
 * abierta por pdfkit —en el medio de un párrafo— dejaría la columna en 1 y el
 * texto seguiría por la derecha con la izquierda en blanco.
 */
function seguirEnLaOtraColumna(doc: Doc, t: Tema, e: Estado): void {
  if (t.molde.columnas === 2 && e.columna === 0) {
    e.columna = 1;
    doc.x = xDeColumna(t, e);
    doc.y = e.yColumna;
    return;
  }
  doc.addPage();
}

/**
 * Hasta qué letra del texto entra en `libre` puntos de alto.
 *
 * Devuelve una posición que cae **después de un espacio**, nunca en el medio de
 * una palabra. Busca por mitades: son unas diez mediciones para un párrafo de
 * mil letras, en vez de mil.
 *
 * ⚠️ Devuelve 0 si no entra ni la primera palabra. Quien llama tiene que tratar
 * ese caso pasando de columna, o se queda en un bucle infinito partiendo un
 * texto que nunca achica.
 */
function hastaDondeEntra(
  doc: Doc, texto: string, ancho: number, libre: number, t: Tema,
): number {
  const cortes: number[] = [];
  for (let i = 0; i < texto.length; i++) if (texto[i] === " ") cortes.push(i + 1);
  if (cortes.length === 0) return 0;

  let bajo = 0;
  let alto = cortes.length - 1;
  let mejor = -1;

  while (bajo <= alto) {
    const medio = (bajo + alto) >> 1;
    const pedazo = texto.slice(0, cortes[medio]).trimEnd();
    const mide = doc.heightOfString(pedazo, { width: ancho, lineGap: t.molde.interlinea });
    if (mide <= libre) { mejor = medio; bajo = medio + 1; } else { alto = medio - 1; }
  }

  return mejor < 0 ? 0 : cortes[mejor];
}

/**
 * Un párrafo, partido entre columnas y hojas si hace falta.
 *
 * Con una sola columna es literalmente el `doc.text` de siempre: pdfkit corta
 * entre hojas mejor de lo que podría cortar esto. Con dos, se mide cuánto entra
 * en lo que queda de columna, se escribe ese pedazo y el resto sigue al lado.
 */
function escribirParrafo(
  doc: Doc, texto: string, t: Tema, e: Estado,
  extra: { tamano?: number; color?: string; fuente?: string; separacion?: number } = {},
): void {
  const tamano = extra.tamano ?? t.molde.cuerpo;
  const fuente = extra.fuente ?? t.cuerpo;
  const color = extra.color ?? t.tinta;
  const separacion = extra.separacion ?? 9;

  if (t.molde.columnas === 1) {
    doc.font(fuente).fontSize(tamano).fillColor(color)
      .text(texto, t.xTexto, doc.y, {
        width: t.anchoTexto, align: t.molde.alineado,
        lineGap: t.molde.interlinea, paragraphGap: separacion,
      });
    return;
  }

  let resto = texto;
  /* Un tope por si algo mide mal: cuarenta pedazos son cuarenta columnas, o
     sea veinte hojas para UN párrafo. Antes de eso ya está roto, y salir con
     el párrafo cortado es mejor que colgar el armado de un ebook pagado. */
  for (let vuelta = 0; resto && vuelta < 40; vuelta++) {
    doc.font(fuente).fontSize(tamano).fillColor(color);

    const libre = pieDeHoja(t) - doc.y - 1;
    if (libre < doc.currentLineHeight(true)) {
      seguirEnLaOtraColumna(doc, t, e);
      continue;
    }

    const mide = doc.heightOfString(resto, { width: t.columna, lineGap: t.molde.interlinea });
    if (mide <= libre) {
      doc.text(resto, xDeColumna(t, e), doc.y, {
        width: t.columna, align: t.molde.alineado,
        lineGap: t.molde.interlinea, paragraphGap: separacion,
      });
      return;
    }

    const corte = hastaDondeEntra(doc, resto, t.columna, libre, t);
    if (corte <= 0) { seguirEnLaOtraColumna(doc, t, e); continue; }

    doc.text(resto.slice(0, corte).trimEnd(), xDeColumna(t, e), doc.y, {
      width: t.columna, align: t.molde.alineado, lineGap: t.molde.interlinea,
    });
    resto = resto.slice(corte).trimStart();
    seguirEnLaOtraColumna(doc, t, e);
  }
}

/**
 * El subtítulo, de las tres maneras que hay.
 *
 * Y una cuarta que no es una manera sino un lugar: con `franja`, el subtítulo
 * se va **al costado**, afuera del texto, y el cuerpo no baja. Es lo que hace
 * que un manual se pueda hojear buscando un tema sin leer nada.
 */
function dibujarSubtitulo(doc: Doc, texto: string, t: Tema, e: Estado): void {
  const m = t.molde;

  if (m.franja > 0) {
    doc.moveDown(0.8);
    doc.font(t.titulo).fontSize(m.subtituloPt);

    /* Lo mismo que abajo: un subtítulo solo al pie es un error de imprenta. */
    if (!entra(doc, doc.currentLineHeight(true) + 34, t)) seguirEnLaOtraColumna(doc, t, e);

    /* ⚠️ Y que no se pise con el anterior. En la franja los subtítulos NO
       empujan el texto —ése es el punto— así que dos seguidos con dos renglones
       de cuerpo en el medio se dibujarían uno encima del otro. `pisoFranja`
       guarda dónde terminó el último y, si el nuevo cae más arriba, se baja el
       cuerpo hasta ahí: se pierde un poco de aire y no se pierde el subtítulo. */
    if (doc.y < e.pisoFranja) doc.y = e.pisoFranja;

    const y = doc.y;
    const alto = doc.heightOfString(texto, { width: m.franja, lineGap: 1 });
    doc.fillColor(t.acento).text(texto, t.margen, y, { width: m.franja, lineGap: 1 });

    e.pisoFranja = y + alto + 10;
    doc.x = t.xTexto;
    doc.y = y;
    return;
  }

  doc.moveDown(1);
  doc.font(t.titulo).fontSize(m.subtituloPt);
  /* ⚠️ Un subtítulo solo al pie de una hoja, con su texto en la siguiente, se
     lee como un error de imprenta. Y la rayita es peor: se dibuja en la
     posición de ahora aunque el texto se vaya a la otra hoja, así que quedaba
     sola —y podía caer encima de la franja del pie—. Se pide hoja nueva
     ANTES si no entran el subtítulo y al menos un renglón de lo que sigue. */
  if (!entra(doc, doc.currentLineHeight(true) + 34, t)) seguirEnLaOtraColumna(doc, t, e);

  const x = xDeColumna(t, e);
  const ancho = t.columna;

  if (m.subtitulo === "resaltado") {
    /* El fondo de acento detrás del texto, como un marcador. Se dibuja primero
       y el texto encima, con el color que la paleta ya verificó contra él. */
    const alto = doc.heightOfString(texto, { width: ancho - 24, lineGap: 1 });
    const y = doc.y;
    doc.rect(x, y, ancho, alto + 18).fill(t.acento);
    doc.font(t.titulo).fontSize(m.subtituloPt).fillColor(t.sobreAcento)
      .text(texto, x + 12, y + 9, { width: ancho - 24, lineGap: 1 });
    doc.x = x;
    doc.y = y + alto + 18;
    doc.moveDown(0.5);
    return;
  }

  if (m.subtitulo === "linea") {
    /* Una línea fina de lado a lado, arriba. Es el corte de un diario: separa
       sin gritar, que es lo que hace falta cuando la columna ya es angosta. */
    const y = doc.y;
    doc.rect(x, y, ancho, 0.8).fill(t.acento);
    doc.font(t.titulo).fontSize(m.subtituloPt).fillColor(t.tinta)
      .text(texto, x, y + 8, { width: ancho, lineGap: 1 });
    doc.moveDown(0.4);
    return;
  }

  /* La rayita del margen es lo que hace que un subtítulo se vea como parte
     del libro y no como un renglón en negrita más. */
  doc.rect(x - 14, doc.y + 4, 3, 13).fill(t.acento);
  doc.font(t.titulo).fontSize(m.subtituloPt).fillColor(t.tinta)
    .text(texto, x, doc.y, { width: ancho, lineGap: 1 });
  doc.moveDown(0.4);
}

function dibujarBloque(
  doc: Doc, b: Bloque, t: Tema, e: Estado,
  /* Si es el primer párrafo del capítulo: los moldes que tienen entrada lo
     escriben más grande. Ver `entrada` en `ebook-estilos`. */
  deEntrada = false,
): void {
  const texto = soloLoQueEntra(b.texto);
  if (!texto) return;

  if (b.tipo === "subtitulo") { dibujarSubtitulo(doc, texto, t, e); return; }

  if (b.tipo === "aviso") {
    dibujarAviso(
      doc, texto, t, "OJO CON ESTO", 10.5, 46,
      xDeColumna(t, e), t.columna, () => seguirEnLaOtraColumna(doc, t, e),
    );
    return;
  }

  if (b.tipo === "vineta") {
    /* ⚠️ La bolita se dibuja aparte del texto, y el texto arranca corrido.
       Antes iba todo junto —"•  " pegado adelante— con `indent`, y `indent`
       en pdfkit corre SÓLO el primer renglón: una viñeta de dos renglones
       volvía al margen y el segundo renglón quedaba debajo de la bolita, como
       si fuera un párrafo nuevo. Con las letras de fábrica casi no se veía
       porque entraban en un renglón; con Lora, que es más ancha, se ve en
       todas. */
    doc.font(t.cuerpo).fontSize(t.molde.cuerpo).fillColor(t.tinta);
    /* ⚠️ Y acá el que dejaba HOJAS EN BLANCO. La bolita y el texto se dibujan
       los dos en la misma posición `y`, calculada antes. Si esa posición ya no
       entra en la hoja, pdfkit abre una para la bolita —y la dibuja arriba de
       todo— y después abre OTRA para el texto, porque le sigue llegando la `y`
       vieja. Resultado: una hoja con una bolita sola y nada más. Se veía en la
       hoja 20 del ebook de tortas. Pidiendo la hoja antes, las dos caen juntas. */
    if (!entra(doc, doc.currentLineHeight(true), t)) seguirEnLaOtraColumna(doc, t, e);

    const x = xDeColumna(t, e);
    const y = doc.y;
    doc.text("•", x + 4, y, { width: 10, lineBreak: false });
    doc.text(texto, x + 20, y, {
      width: t.columna - 20, lineGap: 2.5, paragraphGap: 6,
    });
    return;
  }

  /* La entrada: el primer párrafo del capítulo, más grande y en el color de
     segunda. Es lo que en un diario separa el arranque del resto. */
  if (deEntrada && t.molde.entrada) {
    escribirParrafo(doc, texto, t, e, {
      tamano: t.molde.cuerpo + 2.5, color: t.suave, fuente: t.cursiva, separacion: 12,
    });
    return;
  }

  escribirParrafo(doc, texto, t, e);
}

/**
 * El texto del capítulo.
 *
 * ⚠️ NO abre hoja: sigue donde la dejó `portadilla`, en la misma. Abrir una
 * acá era lo que dejaba la portadilla sola en una hoja con la mitad de abajo
 * vacía, nueve veces por ebook.
 */
function capitulo(doc: Doc, c: CapituloEscrito, t: Tema, e: Estado): void {
  doc.x = t.xTexto;

  /* Las dos columnas de ESTA hoja arrancan abajo de la portadilla, no arriba
     de todo: sin esto, la segunda columna subiría hasta el borde y se metería
     adentro de la foto del capítulo. */
  e.columna = 0;
  e.yColumna = doc.y;
  e.pisoFranja = doc.y;

  /* Cuál es el primer párrafo de verdad: los moldes con entrada lo escriben
     más grande, y un subtítulo o una viñeta no son el arranque del capítulo. */
  const arranque = c.bloques.findIndex((b) => b.tipo !== "subtitulo" && !!soloLoQueEntra(b.texto));

  for (const [i, b] of c.bloques.entries()) dibujarBloque(doc, b, t, e, i === arranque);
}

/**
 * UNA RECETA, EN UNA HOJA.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ACÁ NO CORTA pdfkit: CORTAMOS NOSOTROS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * En un capítulo de texto pdfkit decide dónde parte cada párrafo y nosotros
 * sólo le damos el ancho. Acá no sirve: la hoja tiene **dos columnas que
 * arrancan a la misma altura** —ingredientes a la izquierda, preparación a la
 * derecha— y pdfkit no sabe hacer eso. Cada cosa se ubica a mano.
 *
 * ── Qué pasa si la receta no entra ─────────────────────────────────────────
 *
 * Los ingredientes entran siempre: son renglones cortos y hay tope
 * (`INGREDIENTES_MAX`). Los pasos no: uno largo puede empujar al resto abajo
 * del pie. Por eso los pasos se dibujan de a uno mirando si entran, y el que no
 * entra sigue **en la hoja siguiente y a todo el ancho** — la columna angosta
 * sola en una hoja vacía se lee peor que un bloque ancho.
 */
/**
 * El texto recortado a lo que de verdad entra en un ancho.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ `lineBreak: false` NO ALCANZA, Y ESTO COSTÓ DOS VUELTAS DE AVERIGUARLO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Uno esperaría que `text(t, x, y, { width, lineBreak: false })` escriba un
 * renglón y listo. No: pdfkit, en cuanto recibe un `width`, manda el texto al
 * partidor de renglones igual. `ellipsis: true` tampoco lo salva.
 *
 * El resultado no es que el texto se desborde —eso se vería y se arreglaría—:
 * es que **cae un segundo renglón encima del que sigue**. En la prueba se leía
 * "1 cucharadi" y abajo, superpuesto a "300 ml", un "ta"; y "8 unidades," con
 * "opcional" tapando el ingrediente de abajo. En una lista de ingredientes que
 * alguien va a leer mientras cocina.
 *
 * Así que se recorta antes de dibujar. Un ingrediente cortado con puntos
 * suspensivos se lee; dos renglones encimados, no.
 *
 * ⚠️ La fuente y el tamaño tienen que estar puestos ANTES de llamar: se mide
 * con los que estén activos en el documento.
 */
function recortarAlAncho(doc: Doc, texto: string, ancho: number): string {
  if (!texto || ancho <= 0) return texto;
  if (doc.widthOfString(texto) <= ancho) return texto;

  const puntos = doc.widthOfString("…");
  let corte = texto.length;
  while (corte > 0 && doc.widthOfString(texto.slice(0, corte)) + puntos > ancho) corte--;
  return corte > 0 ? `${texto.slice(0, corte).trimEnd()}…` : "";
}

/** Si la receta tiene al menos una de las tres fichas de arriba. */
function tieneFichas(r: Receta): boolean {
  return !!(soloLoQueEntra(r.rinde) || soloLoQueEntra(r.tiempo) || soloLoQueEntra(r.coccion));
}

/**
 * Los tamaños de la hoja de receta, en dos densidades.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SI LA RECETA NO ENTRA, LA HOJA APRIETA — NO SE PARTE LA RECETA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * "Una receta, una hoja" es la promesa del formato: quien cocina apoya el
 * teléfono y lee de ahí. Una receta partida al medio rompe justo eso, y el
 * pedazo que cae en la hoja siguiente deja la anterior con un hueco.
 *
 * El problema es que lo que escribe el modelo no tiene un alto fijo. Medido con
 * recetas de verdad: una de ocho pasos de tres renglones cada uno se pasaba por
 * **74 puntos**. No era un error de cuentas: no entraba.
 *
 * Así que la hoja se mide dos veces. Con la holgada, que es como se ve mejor. Si
 * no da, con la apretada: la misma hoja con la letra un punto más chica y menos
 * aire entre las cosas. Se pierde un poco de aire y se gana que la receta esté
 * entera, que es lo que importa.
 *
 * ⚠️ Estos números están puestos de a pares con lo que dibuja `hojaDeReceta`.
 * Cambiar uno acá sin cambiar el dibujo hace que la cuenta de "¿entra?" mienta,
 * y eso no falla: sale una hoja mal cortada, sin ningún error.
 */
type Medidas = {
  /** Cuerpo de los pasos. */
  paso: number;
  /** Aire entre un paso y el siguiente. */
  airePaso: number;
  /** Alto del renglón de cada ingrediente. */
  ingrediente: number;
  /** Cuerpo del título de la receta y de su descripción. */
  titulo: number;
  descripcion: number;
  /** La caja de rinde / tiempo / cocción, y el aire que deja abajo. */
  fichas: number;
  aireFichas: number;
  /** El recuadro del tip: cuerpo del texto y relleno de la caja. */
  tip: number;
  rellenoTip: number;
};

const HOLGADA: Medidas = {
  paso: 9.5, airePaso: 9, ingrediente: 18, titulo: 27, descripcion: 12,
  fichas: 52, aireFichas: 22, tip: 10.5, rellenoTip: 46,
};

const APRETADA: Medidas = {
  paso: 8.6, airePaso: 5, ingrediente: 16, titulo: 22, descripcion: 10.5,
  fichas: 44, aireFichas: 13, tip: 9.5, rellenoTip: 38,
};

/**
 * El piso. Es fea y se usa poco, y existe para que el molde **no tenga que
 * partir nunca**: con `PASOS_MAX` pasos de `LARGO_PASO` caracteres y
 * `INGREDIENTES_MAX` ingredientes —la receta más grande que el limado deja
 * pasar— la hoja tiene que cerrar igual. Ver PDF-W.
 */
const AL_LIMITE: Medidas = {
  paso: 7.8, airePaso: 3, ingrediente: 14, titulo: 17, descripcion: 9,
  fichas: 34, aireFichas: 8, tip: 8.8, rellenoTip: 28,
};

/**
 * Cuánto ocupa el recuadro del tip, incluyendo el aire de arriba y de abajo.
 *
 * Los números salen de `dibujarAviso`: el `moveDown(0.6)` de antes, el relleno
 * del recuadro y el aire que deja después. Si aquello cambia, esto también.
 */
function alturaDelTip(doc: Doc, texto: string, t: Tema, m: Medidas): number {
  doc.font(t.cuerpo).fontSize(m.tip);
  return 9 + doc.heightOfString(texto, { width: t.ancho - 44, lineGap: 2.5 })
    + m.rellenoTip + 12;
}

/** Cuánto ocupa la columna de la preparación, medida antes de dibujarla. */
function alturaDeLosPasos(doc: Doc, r: Receta, t: Tema, ancho: number, m: Medidas): number {
  doc.font(t.cuerpo).fontSize(m.paso);
  let alto = 0;
  for (const paso of r.pasos.slice(0, PASOS_MAX)) {
    const cuerpo = soloLoQueEntra(paso.texto);
    alto += (soloLoQueEntra(paso.titulo) ? 12 : 0)
      + doc.heightOfString(cuerpo, { width: ancho - 26, lineGap: 1.5 })
      + m.airePaso;
  }
  return alto;
}

function hojaDeReceta(
  doc: Doc, r: Receta, numero: number, foto: FotoDelEbook | null | undefined,
  t: Tema, e: Estado,
): void {
  e.capitulo = `Receta ${String(numero).padStart(2, "0")}`;
  if (doc.y > t.arriba + 1) doc.addPage();

  const titulo = soloLoQueEntra(r.titulo);
  const descripcion = soloLoQueEntra(r.descripcion);

  /* ── ⚠️ TODO SE MIDE ANTES DE DIBUJAR NADA ────────────────────────────────
     Una receta no se puede partir: los ingredientes de un lado y media
     preparación del otro no se leen. Así que primero se mide lo que NO se
     puede achicar —ingredientes, pasos, fichas y tip— y la foto se acomoda a
     lo que sobre.

     Y la foto va SIEMPRE, de una de dos formas. Si sobra alto, va de banda a
     todo el ancho, que es lo que mejor se ve. Si no, va cuadrada al lado del
     título: ese hueco de la derecha estaba vacío igual, así que no cuesta ni
     un punto. Sin esto, las recetas largas salían sin foto y en un recetario
     eso desentona hoja por medio. */
  const ALTO_BANDA_MAX = 168;
  const ALTO_BANDA_MIN = 70;
  const LADO_CHICA = 148;
  /* Más chica que esto ya no es una foto de comida, es una estampilla. */
  const LADO_CHICA_MIN = 74;

  const alturaDelEncabezado = (ancho: number, m: Medidas) => {
    doc.font(t.titulo).fontSize(m.titulo);
    let alto = doc.heightOfString(titulo, { width: ancho, lineGap: 1 });
    if (descripcion) {
      doc.font(t.cursiva).fontSize(m.descripcion);
      alto += 6 + doc.heightOfString(descripcion, { width: ancho - 30, lineGap: 2 });
    }
    return alto;
  };

  /**
   * Todo lo que va abajo del título, con una densidad dada.
   *
   * `piso` es el renglón más abajo en el que puede arrancar sin que el final de
   * la receta se caiga a otra hoja. Si da menos que `t.arriba`, con esta densidad
   * la receta no entra.
   */
  const medir = (m: Medidas) => {
    const altoPasos = alturaDeLosPasos(doc, r, t, t.ancho - 168 - 26, m);
    const altoIngredientes = 20 + Math.min(r.ingredientes.length, INGREDIENTES_MAX) * m.ingrediente;
    const altoColumnas = 20 + Math.max(altoPasos, altoIngredientes);
    const altoFichas = tieneFichas(r) ? m.fichas + m.aireFichas : 0;
    /* ⚠️ Medido, no estimado. Acá había un 76 puesto a ojo y se pasaba por CINCO
       puntos: la receta entera se iba a una segunda hoja por un tip de dos
       renglones. Un número inventado en una cuenta de "¿entra o no entra?" no
       sirve — o sobra lugar, o se parte la hoja. */
    const altoTip = r.tip ? alturaDelTip(doc, soloLoQueEntra(r.tip), t, m) : 0;
    const piso = (HOJA.alto - t.abajo) - (altoFichas + altoColumnas + altoTip + 16);
    return { piso, entra: piso >= t.arriba + alturaDelEncabezado(t.ancho - 148 - 20, m) + 18 };
  };

  /* ⚠️ De la más holgada a la más apretada, y se toma la PRIMERA que entra. Al
     revés —apretar siempre— se vería todo el recetario chiquito sin necesidad,
     que es lo contrario de lo que se busca. La última es el piso: si ni esa da,
     se dibuja con ella igual y la receta se parte, pero eso ya no puede pasar
     con lo que el limado deja pasar. */
  const m = [HOLGADA, APRETADA, AL_LIMITE].find((x) => medir(x).entra) ?? AL_LIMITE;
  const { piso } = medir(m);

  const sobra = piso - (t.arriba + alturaDelEncabezado(t.ancho - 60, m) + 18);
  const banda = sobra >= ALTO_BANDA_MIN ? Math.min(ALTO_BANDA_MAX, Math.floor(sobra)) : 0;

  const anchoEncabezado = banda > 0 ? t.ancho - 60 : t.ancho - LADO_CHICA - 20;

  /* ── ⚠️ ACÁ ESTABA EL ERROR QUE PARTÍA LAS RECETAS ────────────────────────
     Cuando la banda no entra, la foto va cuadrada al lado del título. El
     cuadrado era SIEMPRE de 148 puntos y arrancaba 6 arriba, así que empujaba
     todo lo demás hasta 160 puntos abajo del borde: **más de lo que ocupaba la
     banda de 70 que no había entrado**. Se cambiaba la foto ancha por una chica
     y se gastaba más alto que antes, con lo cual el último paso y el tip se iban
     a una hoja siguiente que quedaba casi vacía. Las tres recetas de la prueba
     salieron partidas en dos, 9 hojas para 3 recetas.

     El comentario de arriba decía que el cuadrado "no cuesta ni un punto"
     porque el hueco de la derecha estaba vacío igual. Eso es cierto sólo si el
     cuadrado mide lo que mide el título. Ahora mide eso, más lo que de verdad
     sobre hasta el piso, y nunca más.

     Si ni el cuadrado más chico entra, no hay foto. Una receta entera en su hoja
     vale más que una foto y media receta. */
  const altoDelTitulo = alturaDelEncabezado(anchoEncabezado, m);
  const holgura = Math.max(0, piso - (t.arriba + altoDelTitulo + 18));
  const ladoChica = Math.min(LADO_CHICA, Math.floor(altoDelTitulo + 6 + holgura));
  const conCuadrada = banda === 0 && ladoChica >= LADO_CHICA_MIN;

  doc.font(t.titulo).fontSize(m.titulo).fillColor(t.tinta)
    .text(titulo, t.margen, t.arriba, { width: anchoEncabezado, lineGap: 1 });

  if (descripcion) {
    doc.font(t.cursiva).fontSize(m.descripcion).fillColor(t.suave)
      .text(descripcion, t.margen, doc.y + 6, { width: anchoEncabezado - 30, lineGap: 2 });
  }

  let y = doc.y + 18;

  /* La foto no es adorno: es lo que deja ver cómo tiene que quedar. */
  if (foto) {
    if (banda > 0) {
      if (fotoCubriendo(doc, foto, t.margen, y, t.ancho, banda)) y += banda + 16;
    } else if (conCuadrada) {
      const x = HOJA.ancho - t.margen - ladoChica;
      if (fotoCubriendo(doc, foto, x, t.arriba - 6, ladoChica, ladoChica)) {
        /* Lo que siga arranca abajo de la foto si el título era más corto. */
        y = Math.max(y, t.arriba - 6 + ladoChica + 18);
      }
    }
  }

  /* Las tres fichas. Es lo que alguien mira antes de leer nada: cuánto rinde,
     cuánto tarda, a qué temperatura. */
  const fichas = ([
    ["RINDE", soloLoQueEntra(r.rinde)],
    ["TIEMPO", soloLoQueEntra(r.tiempo)],
    ["COCCIÓN", soloLoQueEntra(r.coccion)],
  ] as [string, string][]).filter((f) => !!f[1]);

  if (fichas.length > 0) {
    const ALTO = m.fichas;
    doc.roundedRect(t.margen, y, t.ancho, ALTO, 8).fill(t.caja);
    const ancho = t.ancho / fichas.length;

    /* ⚠️ El cuerpo se elige para que las tres fichas entren, no al revés.
       "1 hora y 40 minutos con levado" no entraba a 10,5 y salía cortado con
       puntos suspensivos justo en el dato que alguien mira antes de cocinar.
       Se prueba de mayor a menor; recortar es lo último. */
    const cuerpoFicha = [m.tip, 9, 8].find((s) => {
      doc.font(t.cuerpo).fontSize(s);
      return fichas.every(([, v]) => doc.widthOfString(v) <= ancho - 26);
    }) ?? 8;

    fichas.forEach(([clave, valor], i) => {
      const x = t.margen + 20 + i * ancho;
      if (i > 0) doc.rect(x - 20, y + 11, 0.8, ALTO - 22).fill(t.suave);
      doc.font(t.etiqueta).fontSize(7).fillColor(t.acento)
        .text(clave, x, y + ALTO * 0.27, { width: ancho - 26, characterSpacing: 1.3, lineBreak: false });
      /* ⚠️ Recortado, no confiado a `lineBreak`. "200 °C, 6 minutos por tanda"
         se partía en dos y el segundo renglón se salía de la caja. */
      doc.font(t.cuerpo).fontSize(cuerpoFicha).fillColor(t.tinta);
      doc.text(recortarAlAncho(doc, valor, ancho - 26), x, y + ALTO * 0.54,
        { width: ancho - 26, lineBreak: false });
    });
    y += ALTO + m.aireFichas;
  }

  /* ── Las dos columnas ──────────────────────────────────────────────────── */

  const ANCHO_IZQ = 168;
  const X_DER = t.margen + ANCHO_IZQ + 26;
  const ANCHO_DER = t.ancho - ANCHO_IZQ - 26;

  doc.font(t.etiqueta).fontSize(9).fillColor(t.acento)
    .text("INGREDIENTES", t.margen, y, { width: ANCHO_IZQ, characterSpacing: 1.5, lineBreak: false });
  doc.font(t.etiqueta).fontSize(9).fillColor(t.acento)
    .text("PREPARACIÓN", X_DER, y, { width: ANCHO_DER, characterSpacing: 1.5, lineBreak: false });

  /* ── ⚠️ EL ANCHO DE LAS CANTIDADES SE MIDE, NO SE FIJA ───────────────────
     Acá había 54 puntos puestos a mano y alcanzaban para "500 g". Con
     "1 cucharadita" —que en una receta aparece siempre— el texto se partía en
     dos renglones y el pedazo de abajo caía ENCIMA del ingrediente siguiente:
     "1 cucharadi" arriba y "ta" superpuesto a "300 ml". Ilegible, y adentro de
     un archivo que se vende.

     El ancho sale de la cantidad más larga de ESTA receta. Y el cuerpo también
     se achica antes de recortar: con 10 puntos fijos, "8 unidades, opcional" al
     lado de "tomates cherry" no entraba y las dos cosas salían con puntos
     suspensivos, en la única parte del libro que se lee como lista de compras. */
  const lista = r.ingredientes.slice(0, INGREDIENTES_MAX)
    .map((i) => ({ nombre: soloLoQueEntra(i.nombre), cantidad: soloLoQueEntra(i.cantidad) }))
    .filter((i) => !!i.nombre);

  const anchoDe = (cuerpo: number) => {
    doc.font(t.etiqueta).fontSize(cuerpo);
    const cant = Math.max(0, ...lista.map((i) => doc.widthOfString(i.cantidad)));
    doc.font(t.cuerpo).fontSize(cuerpo);
    const nom = Math.max(0, ...lista.map((i) => doc.widthOfString(i.nombre)));
    return { cant: Math.ceil(cant) + 2, nom, entra: cant + nom + 12 <= ANCHO_IZQ };
  };

  const cuerpoIngrediente = [10, 9.2, 8.4].find((s) => anchoDe(s).entra) ?? 8.4;
  /* El tope de la mitad de la columna existe porque una cantidad disparatada no
     puede dejar sin lugar al nombre, que es lo que de verdad hay que leer. */
  const anchoCantidad = Math.min(anchoDe(cuerpoIngrediente).cant, Math.floor(ANCHO_IZQ * 0.55));
  const anchoNombre = ANCHO_IZQ - anchoCantidad - 10;

  let yIzq = y + 20;
  for (const ing of lista) {
    doc.font(t.cuerpo).fontSize(cuerpoIngrediente).fillColor(t.tinta);
    doc.text(recortarAlAncho(doc, ing.nombre, anchoNombre), t.margen, yIzq,
      { width: anchoNombre, lineBreak: false });
    /* La cantidad pegada a la derecha de su columna: es lo que deja leer la
       lista de un vistazo cuando estás cocinando. */
    doc.font(t.etiqueta).fontSize(cuerpoIngrediente).fillColor(t.suave);
    doc.text(recortarAlAncho(doc, ing.cantidad, anchoCantidad),
      t.margen + ANCHO_IZQ - anchoCantidad, yIzq,
      { width: anchoCantidad, align: "right", lineBreak: false });
    yIzq += m.ingrediente;
  }

  let yDer = y + 20;
  let anchoPasos = ANCHO_DER;
  let xPasos = X_DER;

  for (const [i, paso] of r.pasos.slice(0, PASOS_MAX).entries()) {
    const cuerpo = soloLoQueEntra(paso.texto);
    const nombre = soloLoQueEntra(paso.titulo);
    if (!cuerpo && !nombre) continue;

    doc.font(t.cuerpo).fontSize(m.paso);
    const alto = 16 + doc.heightOfString(cuerpo, { width: anchoPasos - 26, lineGap: 1.5 });

    if (yDer + alto > HOJA.alto - t.abajo) {
      doc.addPage();
      /* En la hoja nueva ya no hay columna de ingredientes al lado, así que
         los pasos que quedan se ensanchan y usan la hoja entera. */
      yDer = t.arriba;
      xPasos = t.margen;
      anchoPasos = t.ancho;
    }

    doc.circle(xPasos + 7, yDer + 6, 7.5).fill(t.acento);
    doc.font(t.etiqueta).fontSize(7.5).fillColor(t.sobreAcento)
      .text(String(i + 1), xPasos - 1, yDer + 3, { width: 16, align: "center", lineBreak: false });

    if (nombre) {
      doc.font(t.etiqueta).fontSize(9).fillColor(t.tinta);
      /* Un título de paso que se parte en dos empuja el texto de abajo y encima
         la cuenta del alto sólo reservó un renglón. */
      doc.text(recortarAlAncho(doc, nombre.toUpperCase(), anchoPasos - 30), xPasos + 22, yDer,
        { width: anchoPasos - 26, characterSpacing: 0.6, lineBreak: false });
    }
    doc.font(t.cuerpo).fontSize(m.paso).fillColor(t.suave)
      .text(cuerpo, xPasos + 22, yDer + (nombre ? 12 : 0),
        { width: anchoPasos - 26, lineGap: 1.5 });

    yDer = doc.y + m.airePaso;
  }

  /* El tip, abajo de todo, cruzando las dos columnas.
     ⚠️ Si los pasos se pasaron a otra hoja, `yIzq` quedó apuntando a una
     posición de la hoja ANTERIOR y compararla con `yDer` da un número que no
     existe: el tip aparecía flotando en el medio de la hoja nueva. Cuando hubo
     salto, manda `yDer` sola. */
  if (r.tip) {
    doc.x = t.margen;
    doc.y = xPasos === t.margen ? yDer + 6 : Math.max(yIzq, yDer) + 6;
    dibujarAviso(doc, soloLoQueEntra(r.tip), t, "TIP", m.tip, m.rellenoTip);
  }

  /* La que sigue empieza en hoja nueva: dos recetas en una hoja no se leen. */
  doc.y = HOJA.alto;
}

/**
 * La hoja de créditos.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ NO ES CORTESÍA: ES LA CONDICIÓN PARA USAR LAS FOTOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las reglas de la API de Pexels piden un enlace visible a Pexels y acreditar
 * a quien sacó cada foto. Sin esta hoja estaríamos usando su API fuera de sus
 * condiciones **adentro de un archivo que se vende**, que es justo el caso en
 * el que a nadie le sirve tener razón a medias.
 *
 * Sólo aparece si hay fotos. Un ebook sin ninguna no la lleva.
 */
function creditos(doc: Doc, fotos: FotoDelEbook[], t: Tema, e: Estado): void {
  /* Cada fotógrafo una sola vez: la misma persona puede tener dos fotos acá. */
  const nombres = [...new Set(
    fotos.map((f) => soloLoQueEntra(f.fotografo)).filter(Boolean),
  )];
  if (nombres.length === 0) return;

  /* ⚠️ Sin las direcciones enteras de cada foto, a propósito. Estaban antes y
     eran diez renglones de `https://www.pexels.com/es-es/foto/persona-...-8477755/`
     que nadie va a tipear jamás, y llenaban una hoja entera de basura al final
     de algo que se vende. Lo que las reglas piden es el enlace a Pexels y el
     nombre de quien sacó la foto; la dirección de cada una nunca fue parte. */
  const linea = `Fotos provistas por Pexels — www.pexels.com. Gracias a ${
    nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`
  }.`;

  doc.font(t.cuerpo).fontSize(9.5);
  const altoLinea = doc.heightOfString(linea, { width: t.ancho - 40, lineGap: 2 });
  const alto = altoLinea + 44;

  /* Se mide y se acomoda igual que un recuadro: si no entra en lo que queda de
     la última hoja, se pasa a la siguiente. Antes esto se llevaba SIEMPRE una
     hoja entera para tres renglones. */
  doc.moveDown(1.5);
  if (!entra(doc, alto, t)) {
    e.conEncabezado = false;
    doc.addPage();
    e.conEncabezado = true;
  }

  const y = doc.y;
  doc.rect(t.margen, y, t.ancho, 0.8).fill(t.acento);

  doc.font(t.etiqueta).fontSize(8).fillColor(t.acento)
    .text("LAS FOTOS DE ESTE LIBRO", t.margen, y + 14,
      { width: t.ancho, characterSpacing: 1.8, lineBreak: false });

  doc.font(t.cuerpo).fontSize(9.5).fillColor(t.suave)
    .text(linea, t.margen, y + 30, { width: t.ancho - 40, lineGap: 2 });
}

/**
 * Los muebles que se repiten en cada hoja: el fondo, el encabezado y la franja
 * del pie con el número de página.
 *
 * ⚠️ Va colgado de `pageAdded` y no llamado a mano. pdfkit agrega hojas solo
 * cuando un capítulo no entra en una, y esas hojas no las pide nadie: sin el
 * escuchador saldrían **sin fondo** —blancas en el tema oscuro, con el texto
 * claro encima e ilegible— y sin número.
 *
 * La tapa no pasa por acá: es la primera hoja, y `pageAdded` no se dispara
 * para la que abre el documento.
 */
function muebles(doc: Doc, t: Tema, e: Estado): void {
  e.numero += 1;

  /* ══════════════════════════════════════════════════════════════════════
     ⚠️ GUARDAR CON QUÉ SE ESTABA ESCRIBIENDO, Y DEVOLVERLO AL FINAL
     ══════════════════════════════════════════════════════════════════════

     Esto corre EN EL MEDIO de un párrafo: pdfkit lo llama cuando el texto no
     entró y abrió otra hoja, y después sigue escribiendo el mismo párrafo.
     Los muebles cambian la tipografía, el tamaño y el color —el pie va en
     Lora Bold de 8 puntos— y pdfkit retoma con lo último que quedó puesto.

     Sin esto, **el resto de cada párrafo cortado salía con la letra del pie
     de página**: chiquito, en negrita y del color de la franja. Pasaba sólo
     en los párrafos que cruzan de hoja, así que se ve en un ebook de treinta
     páginas y no en una prueba corta.

     Los tres campos son internos de pdfkit y no están en sus tipos. Se leen
     igual: la propia biblioteca hace esto mismo —busca `rollbackFont` en su
     código— para las notas al pie y las columnas. */
  const interno = doc as unknown as {
    _fontSource?: unknown;
    _fontSize?: number;
    _fillColor?: [unknown, number];
  };
  const antes = {
    fuente: interno._fontSource,
    tamano: interno._fontSize,
    color: interno._fillColor,
  };

  doc.rect(0, 0, HOJA.ancho, HOJA.alto).fill(t.fondo);

  if (e.conEncabezado && e.capitulo) {
    doc.font(t.titulo).fontSize(8).fillColor(t.suave)
      .text(soloLoQueEntra(e.capitulo).toUpperCase(), t.margen, 46,
        { width: t.ancho, characterSpacing: 1.6, lineBreak: false, ellipsis: true });
    doc.rect(t.margen, 64, t.ancho, 0.8).fill(t.acento);
  }

  doc.rect(0, HOJA.alto - ALTO_FRANJA, HOJA.ancho, ALTO_FRANJA).fill(t.acento);
  sinCortes(doc, () => {
    if (e.pie) {
      doc.font(t.titulo).fontSize(8).fillColor(t.sobreAcento)
        .text(e.pie, t.margen, HOJA.alto - 21,
          { width: t.ancho - 40, characterSpacing: 2, lineBreak: false, ellipsis: true });
    }
    doc.font(t.titulo).fontSize(8).fillColor(t.sobreAcento)
      .text(String(e.numero), HOJA.ancho - t.margen - 40, HOJA.alto - 21,
        { width: 40, align: "right", lineBreak: false });
  });

  /* Devolver la tipografía, el tamaño y el color que había antes. */
  if (antes.fuente) doc.font(antes.fuente as string);
  if (typeof antes.tamano === "number") doc.fontSize(antes.tamano);
  if (antes.color) doc.fillColor(antes.color[0] as string, antes.color[1]);

  /* ⚠️ Devolver el cursor. Dibujar los muebles lo dejó al pie de la hoja, y lo
     primero que pdfkit escriba después arrancaría ahí — encima de la franja.

     ⚠️ Y volver a la PRIMERA columna. Esta función corre en el medio de un
     párrafo, cuando pdfkit abrió una hoja porque el texto no entraba: si la
     columna se quedara en 1, el texto seguiría por la derecha de la hoja nueva
     y la izquierda quedaría en blanco. Lo mismo con `yColumna`, que en una
     hoja recién nacida vuelve a ser el borde de arriba. */
  e.columna = 0;
  e.yColumna = t.arriba;
  e.pisoFranja = t.arriba;
  doc.x = t.xTexto;
  doc.y = t.arriba;
}

/**
 * El PDF entero, en memoria.
 *
 * Devuelve el archivo armado y no lo guarda: quién lo guarda y con qué nombre
 * es decisión de quien llama. Así esto se puede probar sin tocar el depósito.
 */
export function armarPDF(d: DatosDelEbook): Promise<Buffer> {
  /* ⚠️ El molde ANTES del documento: los márgenes con los que nace pdfkit
     salen de él. `moldeDe` nunca falla —un estilo desconocido cae en `libro`—
     así que esto no puede cortar el armado de un ebook ya pagado. */
  const molde = moldeDe(d.estilo);

  const doc = new PDFDocument({
    size: [HOJA.ancho, HOJA.alto],
    margins: {
      top: molde.arriba, bottom: molde.abajo,
      left: molde.margen, right: molde.margen,
    },
    info: {
      Title: soloLoQueEntra(d.titulo),
      Author: soloLoQueEntra(d.autor),
    },
    autoFirstPage: true,
  });

  /* Las letras se registran en el documento antes de dibujar nada, y viajan
     adentro del tema: así cada función que ya recibe los colores recibe
     también con qué tipografía escribirlos, sin un parámetro más. Y desde el
     09/09/26 viaja también el molde, por el mismo motivo. */
  const t = armarTema(
    d.paleta ?? TAPA_DE_FABRICA, d.modo ?? "claro", registrarLetras(doc), molde,
  );

  const e: Estado = {
    numero: 0,
    capitulo: "",
    conEncabezado: true,
    pie: soloLoQueEntra(d.autor || d.titulo).toUpperCase().slice(0, 58),
    columna: 0,
    yColumna: molde.arriba,
    pisoFranja: molde.arriba,
  };
  doc.on("pageAdded", () => muebles(doc, t, e));

  const pedazos: Buffer[] = [];
  const listo = new Promise<Buffer>((resolver, rechazar) => {
    doc.on("data", (p: Buffer) => pedazos.push(p));
    doc.on("end", () => resolver(Buffer.concat(pedazos)));
    doc.on("error", rechazar);
  });

  tapa(doc, d, t);
  contenido(doc, d, t, e);

  if (d.recetas && d.recetas.length > 0) {
    for (const [i, r] of d.recetas.entries()) {
      hojaDeReceta(doc, r, i + 1, d.fotosCapitulos?.[i], t, e);
    }
  } else {
    for (const [i, c] of d.capitulos.entries()) {
      e.capitulo = c.titulo;
      portadilla(doc, c, i + 1, d.fotosCapitulos?.[i], t, e);
      capitulo(doc, c, t, e);
    }
  }

  e.capitulo = "";
  const usadas = [d.fotoTapa, ...(d.fotosCapitulos ?? [])].filter(
    (f): f is FotoDelEbook => !!f,
  );
  creditos(doc, usadas, t, e);

  doc.end();
  return listo;
}
