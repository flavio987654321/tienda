/**
 * Chequeos de los cuatro moldes de la hoja. Se corre con:
 *
 *   npx tsx src/lib/ebook-estilos.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 1. **Que un ebook viejo se rearme IGUAL.** `libro` tiene que ser exactamente
 *    los números que `ebook-pdf` tenía escritos adentro antes de que existieran
 *    los estilos. Quien vendió un ebook en agosto y hoy rehace el PDF —porque
 *    salió sin fotos, por ejemplo— tiene que recibir el mismo archivo, no uno
 *    parecido.
 *
 * 2. **Que los cuatro se distingan de verdad.** Cuatro miniaturas que después
 *    dan cuatro hojas parecidas es hacerle perder el tiempo a alguien que va a
 *    elegir mirándolas.
 *
 * 3. **Que ninguno arme un PDF ilegible ni reviente.** Los cuatro se dibujan de
 *    verdad acá abajo, con capítulos, subtítulos, avisos y viñetas: el molde
 *    `compacto` parte los párrafos a mano entre columnas, y eso no es un
 *    parámetro que se pueda mirar leyendo — hay que armarlo.
 *
 * 4. **Que la pantalla muestre el molde que se eligió.** Una previa que dibuja
 *    `libro` mientras el archivo sale en `cartel` es peor que no tener previa.
 */

import { readFileSync } from "fs";
import zlib from "zlib";
import {
  ESTILOS, ESTILOS_LISTOS, ESTILO_DE_FABRICA, MOLDES, QUE_ES_CADA_ESTILO,
  moldeDe, anchoUtilDe, columnaDeTexto, anchoDeColumna, ANCHO_DE_HOJA,
  type EstiloDeEbook,
} from "./ebook-estilos";
import { normalizarOpciones, leerOpciones, conEstilo } from "./ebook-opciones";
import { armarPDF } from "./ebook-pdf";
import type { Bloque, CapituloEscrito } from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El molde de siempre no se movió ──────────────────────────────────────── */

{
  /* ⚠️ ESTOS NÚMEROS SON LOS QUE `ebook-pdf` TENÍA ESCRITOS ADENTRO.
     Están copiados a mano a propósito: si alguien "mejora" `libro` tocando la
     tabla, este chequeo se cae y le recuerda que ese molde no es un estilo más
     — es el que ya se usó para armar ebooks que están vendidos. Un estilo nuevo
     se agrega al lado; `libro` no se toca. */
  const l = MOLDES.libro;
  check("EST-A",
    l.margen === 56 && l.arriba === 92 && l.abajo === 78
    && l.columnas === 1 && l.franja === 0
    && l.cuerpo === 11.5 && l.interlinea === 3 && l.alineado === "justify"
    && l.entrada === false
    && l.portadilla === "banda" && l.altoFoto === 350 && l.numero === 72
    && l.subtitulo === "raya" && l.subtituloPt === 13
    && l.tapa === "clasica",
    "`libro` sigue siendo el molde con el que se armaron los ebooks de antes");

  check("EST-B", ESTILO_DE_FABRICA === "libro",
    "y es el de fábrica: un ebook sin estilo guardado sale como siempre");

  /* Y que las medidas de la hoja NO hayan vuelto a `ebook-pdf` como constantes
     propias. Si volvieran, el molde quedaría de adorno y los cuatro estilos
     saldrían iguales sin que nada falle. */
  const pdf = readFileSync("src/lib/ebook-pdf.ts", "utf8");
  check("EST-C",
    !/^const MARGEN = /m.test(pdf) && !/^const ANCHO_UTIL = /m.test(pdf)
    && !/^const ARRIBA = /m.test(pdf) && !/^const ABAJO = /m.test(pdf),
    "el margen y el aire de la hoja salen del molde, no de una constante del PDF");
}

/* ── Que los cuatro sean cuatro ───────────────────────────────────────────── */

{
  check("EST-D",
    ESTILOS.every((e) => !!MOLDES[e]) && Object.keys(MOLDES).length === ESTILOS.length,
    "los cuatro estilos tienen molde, y no hay moldes de más");

  check("EST-E",
    ESTILOS.every((e) => ESTILOS_LISTOS.includes(e)),
    "los cuatro se pueden elegir hoy");

  check("EST-F",
    ESTILOS.every((e) => {
      const q = QUE_ES_CADA_ESTILO[e];
      return !!q && q.nombre.length > 0 && q.explica.length > 10 && q.contra.length > 5;
    }),
    "cada uno dice cómo se llama, qué hace y qué le cuesta");

  /* ⚠️ Que no haya dos parecidos. Se comparan sólo las decisiones que cambian
     la hoja de verdad —columnas, franja, cómo abre el capítulo, cómo se marca
     un subtítulo y qué tapa lleva—: dos moldes que difieren en un punto de
     cuerpo son el mismo molde con otro nombre. */
  const laForma = (e: EstiloDeEbook) => {
    const m = MOLDES[e];
    return [m.columnas, m.franja > 0, m.portadilla, m.subtitulo, m.tapa].join("·");
  };
  check("EST-G",
    new Set(ESTILOS.map(laForma)).size === ESTILOS.length,
    "los cuatro se distinguen en algo estructural, no sólo en el nombre");
}

/* ── Las cuentas de la hoja ───────────────────────────────────────────────── */

{
  for (const e of ESTILOS) {
    const m = MOLDES[e];
    const col = columnaDeTexto(m);
    const util = anchoUtilDe(m);

    if (m.franja > 0) {
      check(`EST-H-${e}`,
        col.x === m.margen + m.franja + m.calle && col.ancho === util - m.franja - m.calle,
        `con franja, el cuerpo de ${e} se corre y se angosta`);
    } else {
      check(`EST-H-${e}`,
        col.x === m.margen && col.ancho === util,
        `sin franja, el cuerpo de ${e} ocupa el ancho útil`);
    }
  }

  check("EST-I",
    anchoDeColumna(MOLDES.compacto) === (columnaDeTexto(MOLDES.compacto).ancho - MOLDES.compacto.calle) / 2
    && anchoDeColumna(MOLDES.libro) === columnaDeTexto(MOLDES.libro).ancho,
    "una columna mide la mitad cuando son dos, y todo cuando es una");

  /* ⚠️ Y que ninguna quede tan angosta que no se pueda leer. Con menos de 170
     puntos —unos 45 caracteres con el cuerpo de estos moldes— el texto se corta
     cada tres palabras y, justificado, se llena de ríos de espacio en blanco.
     Es el freno a subir la franja o meter una tercera columna sin medir. */
  for (const e of ESTILOS) {
    check(`EST-J-${e}`, anchoDeColumna(MOLDES[e]) >= 170,
      `el renglón de ${e} da para leer (${Math.round(anchoDeColumna(MOLDES[e]))} pt)`);
  }

  check("EST-K",
    ESTILOS.every((e) => MOLDES[e].margen * 2 < ANCHO_DE_HOJA * 0.4),
    "ningún molde se come la hoja con los márgenes");
}

/* ── Que nada raro corte un armado ────────────────────────────────────────── */

{
  /* ⚠️ Lo mismo que `normalizarOpciones` con el formato y el tema: armar el PDF
     de algo YA PAGADO no se puede cortar porque llegó un estilo inventado. */
  for (const basura of ["violeta", "", "  ", "LIBRO", "1", null, undefined]) {
    check(`EST-L-${String(basura)}`,
      moldeDe(basura as string) === MOLDES.libro,
      `un estilo raro (${JSON.stringify(basura)}) cae en el de siempre`);
  }

  check("EST-M",
    normalizarOpciones({ estilo: "cartel" }).estilo === "cartel"
    && normalizarOpciones({ estilo: "inventado" }).estilo === "libro"
    && normalizarOpciones({}).estilo === "libro",
    "la opción se lima igual que el formato y el tema");

  check("EST-N",
    leerOpciones(JSON.stringify({ promesa: "x", capitulos: [] })).estilo === "libro",
    "un ebook guardado antes de que existieran los estilos sale como `libro`");
}

/* ── Cambiar el estilo sin romper lo demás ────────────────────────────────── */

{
  const guardado = JSON.stringify({
    promesa: "Una promesa que costó una llamada al modelo",
    capitulos: [{ titulo: "Uno", resumen: "algo", foto: "manos amasando" }],
    tapa: { url: "https://images.pexels.com/x.jpg", autor: "Alguien", enlace: "https://pexels.com/x" },
    opciones: { formato: "recetario", tema: "oscuro", paleta: "azul", recetas: 30 },
  });

  const despues = JSON.parse(conEstilo(guardado, "cartel"));

  /* ⚠️ Lo que más importa: cambiar el estilo NO puede llevarse por delante la
     promesa, el temario ni la foto de tapa. Todo eso está pago, y algunas cosas
     —la tapa elegida a mano— no se pueden recuperar. */
  check("EST-O",
    despues.promesa === "Una promesa que costó una llamada al modelo"
    && despues.capitulos.length === 1
    && despues.capitulos[0].foto === "manos amasando"
    && despues.tapa.url === "https://images.pexels.com/x.jpg",
    "cambiar el estilo no toca la promesa, el temario ni la tapa elegida");

  check("EST-P",
    despues.opciones.estilo === "cartel"
    && despues.opciones.formato === "recetario"
    && despues.opciones.tema === "oscuro"
    && despues.opciones.paleta === "azul"
    && despues.opciones.recetas === 30,
    "y no toca el formato, el tema, el color ni la cantidad de recetas");

  check("EST-Q",
    JSON.parse(conEstilo(guardado, "inventado")).opciones.estilo === "libro",
    "un estilo inventado se guarda como el de fábrica, no como está");

  /* Ilegible: se devuelve tal cual. Preferir el estilo viejo antes que dejar a
     un ebook sin índice. Mismo criterio que `conAvisoDeFotos`. */
  check("EST-R",
    conEstilo("{esto no es json", "cartel") === "{esto no es json"
    && conEstilo(null, "cartel") === ""
    && conEstilo("[1,2,3]", "cartel") === "[1,2,3]",
    "lo que no se puede leer se devuelve igual, sin romper el índice");
}

/* ── Que la ruta lo guarde ANTES de dibujar ───────────────────────────────── */

{
  const armar = readFileSync("src/app/api/digitales/ia/ebook/armar/route.ts", "utf8");

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ EL ORDEN, QUE ES LO ÚNICO QUE HAY QUE CUIDAR ACÁ
     ══════════════════════════════════════════════════════════════════════════

     Guardar el estilo tiene que pasar DESPUÉS de tomar el candado. Escrito
     arriba de todo —que es como salió la primera versión— si en ese momento
     había otro armado en curso, el estilo quedaba guardado y el pedido se
     rechazaba dos renglones después con "se está armando en este momento": la
     tarjeta marcaba el molde nuevo y el PDF que se descargaba era el viejo.

     Y tiene que pasar ANTES de dibujar, con el dibujo leyendo lo guardado: si
     el estilo se le pasara suelto a `armarPDF`, el archivo saldría con dos
     columnas y el siguiente rearmado volvería a una. */
  const dondeElCandado = armar.indexOf("await tomarElCandado(");
  const dondeSeGuarda = armar.indexOf("conEstilo(ebook.indice");
  const dondeSeDibuja = armar.indexOf("armarPDF({");
  check("EST-S",
    dondeElCandado > 0 && dondeElCandado < dondeSeGuarda && dondeSeGuarda < dondeSeDibuja
    && /estilo: estiloDelArchivo/.test(armar),
    "el estilo se guarda con el candado tomado, y recién después se dibuja");

  /* Y que no llame al modelo: es lo que hace que cambiarlo sea gratis. */
  check("EST-T",
    !/anthropic|claude|messages\.create/i.test(armar),
    "rehacer el PDF no llama al modelo, así que cambiar de estilo no cuesta");
}

/* ── Las dos puntas de la pantalla ────────────────────────────────────────── */

{
  const tarjeta = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
  check("EST-U",
    /acc\.rehacerPDF\(p, x\)/.test(tarjeta) && /Es gratis\./.test(tarjeta),
    "la tarjeta deja cambiar el estilo con el ebook escrito, y dice que es gratis");

  const modal = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");
  check("EST-V",
    /setEstilo\(x\)/.test(modal) && /cambiar después, gratis/.test(modal),
    "el modal lo pregunta antes, y avisa que se puede cambiar después");

  /* ⚠️ La miniatura NO puede tener números propios. Dibujada a mano, alguien
     cambia `franja` acá y la miniatura sigue mostrando la de antes — y una
     miniatura es justo lo que se mira para elegir. */
  const mini = readFileSync("src/app/digitales/productos/MiniaturaDeEstilo.tsx", "utf8");
  check("EST-W",
    /MOLDES\[estilo\]/.test(mini)
    && /columnaDeTexto\(m, ANCHO\)/.test(mini)
    && /anchoDeColumna\(m, ANCHO\)/.test(mini),
    "la miniatura se dibuja del molde, no a mano");

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ Y QUE UN RECETARIO NO PROMETA COLUMNAS
     ══════════════════════════════════════════════════════════════════════════

     El estilo cambia la hoja de adentro **sólo donde hay prosa**. La hoja de una
     receta tiene su propio molde —mide ingredientes, pasos y fichas para elegir
     entre tres densidades— y todavía no escucha al estilo: las cuatro salen
     iguales adentro.

     La primera versión del selector no lo sabía, y con "Recetario" elegido
     mostraba cuatro miniaturas con dos columnas de texto corrido y decía
     "columna angosta y una franja al costado donde caen los subtítulos". Un
     recetario no tiene subtítulos. Se elegía mirando una hoja que ese archivo
     nunca iba a tener.

     Así que en un recetario se muestra LA TAPA, que es lo que sí cambia, y los
     textos hablan de la tapa. Cuando la receta aprenda los moldes, esto se saca
     — y este chequeo con él. */
  check("EST-AA",
    /muestra\?: "hoja" \| "tapa"/.test(mini) && /function LaTapa\(/.test(mini),
    "la miniatura sabe dibujar la tapa, que es lo único que cambia en un recetario");

  const cadaUno = readFileSync("src/lib/ebook-estilos.ts", "utf8");
  check("EST-AB",
    ESTILOS.every((e) => QUE_ES_CADA_ESTILO[e].tapa.length > 20)
    && /tapa: string;/.test(cadaUno),
    "cada estilo dice qué le hace a la tapa, aparte de qué le hace a la hoja");

  check("EST-AC",
    /esRecetario \? "¿Cómo querés que sea la tapa\?"/.test(modal)
    && /muestra=\{esRecetario \? "tapa" : "hoja"\}/.test(modal)
    && /muestra=\{esUnRecetario \? "tapa" : "hoja"\}/.test(tarjeta),
    "con un recetario, el modal y la tarjeta muestran la tapa y no la hoja");
}

/* ── Y que los cuatro armen un PDF de verdad ──────────────────────────────── */

const parrafo = (n: number) =>
  "Lo primero que conviene entender es que el precio no se calcula: se prueba. "
  + "Nadie acierta el numero en la primera, y el que dice que si esta redondeando "
  + `para atras una historia que le salio bien. Este es el parrafo numero ${n} y `
  + "esta escrito largo a proposito, para que el cortador de columnas tenga que "
  + "partirlo en el medio y se vea si el pedazo que sigue arranca donde tiene.";

function unCapitulo(i: number): CapituloEscrito {
  const bloques: Bloque[] = [];
  for (let k = 0; k < 9; k++) {
    if (k === 2 || k === 6) bloques.push({ tipo: "subtitulo", texto: `Lo que casi nadie mira, parte ${k}` });
    else if (k === 4) bloques.push({ tipo: "aviso", texto: "Si tu precio no incomoda a nadie, esta bajo." });
    else if (k === 7) bloques.push({ tipo: "vineta", texto: "Anotar cuantos entraron y cuantos pagaron." });
    else bloques.push({ tipo: "parrafo", texto: parrafo(k) });
  }
  return { titulo: `Capitulo ${i}: de la idea al primer cobro`, bloques };
}

/** Dónde arranca cada renglón del PDF, sacado de los flujos de contenido. */
function arranquesDeRenglon(pdf: Buffer): number[] {
  const texto = pdf.toString("latin1");
  const xs: number[] = [];
  let i = 0;
  for (;;) {
    const a = texto.indexOf("stream", i);
    if (a < 0) break;
    let ini = a + 6;
    if (texto[ini] === "\r") ini++;
    if (texto[ini] === "\n") ini++;
    const fin = texto.indexOf("endstream", ini);
    if (fin < 0) break;
    i = fin + 9;
    try {
      const claro = zlib.inflateSync(pdf.subarray(ini, fin)).toString("latin1");
      for (const m of claro.matchAll(/1 0 0 1 ([\d.]+) [\d.]+ Tm/g)) xs.push(Math.round(Number(m[1])));
    } catch { /* no todos los flujos son de contenido */ }
  }
  return xs;
}

async function dibujarLosCuatro() {
  const datos = {
    titulo: "Vende tu conocimiento sin volverte loco",
    promesa: "Un metodo corto para poner precio y cobrar la primera vez.",
    autor: "Taller de Flavio",
    capitulos: [1, 2, 3].map(unCapitulo),
  };

  const hechos: Record<string, number[]> = {};

  for (const estilo of ESTILOS) {
    let pdf: Buffer | null = null;
    try {
      pdf = await armarPDF({ ...datos, estilo });
    } catch {
      pdf = null;
    }
    check(`EST-X-${estilo}`,
      !!pdf && pdf.length > 10_000 && pdf.subarray(0, 4).toString() === "%PDF",
      `${estilo} arma un PDF de verdad (${pdf ? Math.round(pdf.length / 1024) : 0} KB)`);
    if (pdf) hechos[estilo] = arranquesDeRenglon(pdf);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ EL QUE NO SE PUEDE MIRAR LEYENDO EL CÓDIGO
     ══════════════════════════════════════════════════════════════════════════

     Que `columnas: 2` esté en la tabla no quiere decir que el PDF use dos: el
     texto lo parte a mano `escribirParrafo`, y si esa cuenta se rompe el
     archivo sale igual —con TODO en la columna de la izquierda y la derecha en
     blanco— sin fallar en ningún lado. Acá se abren los flujos del PDF y se
     mira dónde arranca cada renglón de verdad. */
  const compacto = MOLDES.compacto;
  const izquierda = columnaDeTexto(compacto).x;
  const derecha = izquierda + anchoDeColumna(compacto) + compacto.calle;
  const enCompacto = hechos.compacto ?? [];
  check("EST-Y",
    enCompacto.filter((x) => Math.abs(x - izquierda) <= 1).length > 20
    && enCompacto.filter((x) => Math.abs(x - derecha) <= 1).length > 20,
    "en `compacto` el texto usa LAS DOS columnas, no sólo la de la izquierda");

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ Y EL DE LA FRANJA, QUE CASI SE ESCRIBE MIDIENDO LO QUE NO ERA
     ══════════════════════════════════════════════════════════════════════════

     La primera versión de este chequeo contaba cuántos renglones caían en el
     margen izquierdo de `manual` y pedía que fueran unos cuantos. **Pasaba con
     la franja apagada**: la portadilla de ese molde ya pone ahí el número del
     capítulo y la lista de lo que viene, así que el margen nunca estaba vacío.

     La segunda versión armaba el mismo ebook sin subtítulos para comparar, y
     tampoco servía: la portadilla LISTA los subtítulos en esa misma franja, así
     que sacarlos la vacía por los dos lados y la diferencia no dice nada.

     Lo que se mide entonces son las dos cosas que hacen a la franja, y una es
     del código: que el subtítulo se dibuje en el margen con el ANCHO de la
     franja, y que el cursor vuelva a la altura donde estaba —eso último es todo
     el asunto, porque es lo que hace que el cuerpo NO baje—. Sin la vuelta del
     cursor la franja existe igual y el texto queda con un hueco al lado de cada
     subtítulo, que es el modo silencioso de romper este molde. */
  const manual = MOLDES.manual;
  const enManual = hechos.manual ?? [];

  const fuente = readFileSync("src/lib/ebook-pdf.ts", "utf8");
  const comoDibujaElSubtitulo = fuente.slice(
    fuente.indexOf("function dibujarSubtitulo"),
    fuente.indexOf("function dibujarBloque"),
  );
  check("EST-Z",
    /if \(m\.franja > 0\) \{/.test(comoDibujaElSubtitulo)
    && /\.text\(texto, t\.margen, y, \{ width: m\.franja/.test(comoDibujaElSubtitulo)
    && /doc\.y = y;/.test(comoDibujaElSubtitulo)
    && enManual.filter((x) => Math.abs(x - manual.margen) <= 1).length > 5
    && enManual.filter((x) => Math.abs(x - columnaDeTexto(manual).x) <= 1).length > 20,
    "en `manual` el subtítulo se dibuja en la franja y el cuerpo no baja");

  console.log(fallos === 0
    ? "\nok — los cuatro moldes se distinguen, arman un PDF y `libro` sigue siendo el de siempre"
    : `\nFALLA — ${fallos} chequeo(s) de los estilos del ebook`);
  process.exit(fallos === 0 ? 0 : 1);
}

dibujarLosCuatro();
