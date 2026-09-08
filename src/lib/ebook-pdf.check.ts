/**
 * Chequeos del PDF del ebook. Se corre con:
 *
 *   npx tsx src/lib/ebook-pdf.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTA PRUEBA EXISTE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Este archivo dibuja **lo que el comprador baja**. Un error acá no rompe una
 * pantalla que se arregla y se recarga: sale adentro de un archivo que alguien
 * ya pagó y que quien vende ya mandó.
 *
 * Y lo peor de este código es que **falla de a poquito**. Los tres errores que
 * aparecieron el 07/09/26 —la recursión del pie, la tipografía que se quedaba
 * cambiada en el medio de un párrafo, y las viñetas que volvían al margen— no
 * los agarró nada más que abrir un PDF de 30 hojas y mirarlo. En un ebook
 * corto los tres pasaban desapercibidos.
 *
 * Por eso varias de estas pruebas **arman un PDF de verdad**: es la única
 * forma de que un error de maqueta se note sin que haya un par de ojos.
 */

import { readFileSync, existsSync } from "fs";
import {
  soloLoQueEntra,
  contraste,
  acentoQueSeVe,
  armarPDF,
  type ColoresDeTapa,
  type DatosDelEbook,
} from "./ebook-pdf";
import { PALETAS } from "./pagina-venta";
import {
  LARGO_BLOQUE, INGREDIENTES_MAX, PASOS_MAX, LARGO_PASO, LARGO_DESCRIPCION_RECETA,
  type Bloque, type CapituloEscrito, type Receta,
} from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El texto que entra al PDF ────────────────────────────────────────────── */

{
  check("PDF-A", soloLoQueEntra("Café con azúcar, ñandú") === "Café con azúcar, ñandú",
    "los acentos y la eñe pasan enteros");

  check("PDF-B", soloLoQueEntra("hola 🎂 chau") === "hola chau",
    "un emoji se descarta y no deja un cuadradito");

  /* ⚠️ Los tres espacios de `REEMPLAZOS`. Están escritos con el carácter y no
     con su código, y a simple vista son idénticos: cualquier herramienta que
     reescriba `ebook-pdf.ts` los aplasta a un espacio común, las tres claves
     quedan iguales y TypeScript corta el build. Ya pasó una vez. Esta prueba
     falla si alguno se aplastó. */
  check("PDF-C",
    soloLoQueEntra("uno dos") === "uno dos" &&
    soloLoQueEntra("tres cuatro") === "tres cuatro" &&
    soloLoQueEntra("cinco​seis") === "cincoseis",
    "el espacio duro, el fino y el de ancho cero siguen siendo tres reemplazos distintos");

  check("PDF-D", soloLoQueEntra("primero\nsegundo") === "primero segundo",
    "el salto de línea se vuelve espacio: el corte lo pone la maqueta, no el texto");

  /* ⚠️ Los nombres de quienes sacaron las fotos vienen del banco de imágenes y
     son de todo el mundo. Una letra latina con un acento que la tipografía no
     tiene se descartaba ENTERA, y la hoja de créditos —que existe justamente
     para nombrarlos— mostró "dil Ceren Çelikler" en vez de "İdil Ceren
     Çelikler". Se le come una letra al nombre de una persona a la que estamos
     obligados a acreditar. */
  check("PDF-Z",
    soloLoQueEntra("İdil Ceren Çelikler") === "Idil Ceren Çelikler" &&
    soloLoQueEntra("Michał Nowak") === "Michal Nowak" &&
    /* La š y la Ř se caen al latín; la á y la í ya entraban y se quedan. */
    soloLoQueEntra("Tomáš Řezník") === "Tomáš Rezník",
    "un nombre con letras de otro idioma pierde el acento, nunca la letra");

  /* Y lo que no es una letra latina se sigue descartando: no hay ninguna
     "letra parecida" razonable para un ideograma o un emoji. */
  check("PDF-Z2", soloLoQueEntra("hola 世界 chau") === "hola chau",
    "lo que no es latino se descarta, no se aproxima");
}

/* ── Los colores ──────────────────────────────────────────────────────────── */

const FONDO_OSCURO = "#14120F";
const FONDO_CLARO = "#FCFAF7";
/* El escalón de la norma para texto grande y para lo que no es texto. Es el
   mismo número que usa `acentoQueSeVe`. */
const MINIMO = 3.2;

{
  /* ⚠️ Esto es lo que evita que medio ebook se vuelva invisible. Varias
     paletas tienen un acento oscuro —el grafito es casi negro— y ese color
     sobre el fondo del tema oscuro no se ve: el número del capítulo, las rayas
     y los títulos de los recuadros desaparecen en algo que ya se vendió. */
  let todasOscuro = true;
  let todasClaro = true;

  for (const p of PALETAS) {
    const oscuro = acentoQueSeVe(p.acentoOscuro ?? p.acento, p.sobreAcentoOscuro ?? p.sobreAcento, FONDO_OSCURO);
    if (contraste(oscuro.acento, FONDO_OSCURO) < MINIMO) {
      todasOscuro = false;
      console.log(`   ↳ ${p.clave} no llega en oscuro: ${contraste(oscuro.acento, FONDO_OSCURO).toFixed(2)}`);
    }
    /* Y el texto que va ENCIMA del acento tiene que leerse sobre el acento. */
    if (contraste(oscuro.sobreAcento, oscuro.acento) < 4) {
      todasOscuro = false;
      console.log(`   ↳ ${p.clave}: el texto sobre el acento oscuro no se lee`);
    }

    const claro = acentoQueSeVe(p.acento, p.sobreAcento, FONDO_CLARO);
    if (contraste(claro.acento, FONDO_CLARO) < MINIMO) {
      todasClaro = false;
      console.log(`   ↳ ${p.clave} no llega en claro: ${contraste(claro.acento, FONDO_CLARO).toFixed(2)}`);
    }
    if (contraste(claro.sobreAcento, claro.acento) < 4) {
      todasClaro = false;
      console.log(`   ↳ ${p.clave}: el texto sobre el acento claro no se lee`);
    }
  }

  check("PDF-E", todasOscuro, "las 6 paletas se ven contra el fondo del tema oscuro");
  check("PDF-F", todasClaro, "las 6 paletas se ven contra el fondo del tema claro");

  /* Un acento que YA contrasta no se toca: el par de la paleta viene verificado
     a mano y cualquier cosa que le hagamos lo empeora. */
  const yaAnda = acentoQueSeVe("#c2410c", "#ffffff", FONDO_CLARO);
  check("PDF-G", yaAnda.acento === "#c2410c" && yaAnda.sobreAcento === "#ffffff",
    "un acento que ya se ve queda intacto, con su par verificado");

  /* Y uno que no contrasta se corre Y se le recalcula el texto de encima: el
     `sobreAcento` de la paleta estaba verificado contra el color viejo. */
  const corrido = acentoQueSeVe("#111111", "#ffffff", FONDO_OSCURO);
  check("PDF-H",
    corrido.acento !== "#111111" &&
    contraste(corrido.acento, FONDO_OSCURO) >= MINIMO &&
    contraste(corrido.sobreAcento, corrido.acento) >= 4,
    "un acento que no se ve se corre, y el texto de encima se recalcula");
}

/* ── Las tipografías ──────────────────────────────────────────────────────── */

const FUENTES = [
  "PlayfairDisplay-Bold.ttf", "Lora-Regular.ttf", "Lora-Italic.ttf", "Lora-Bold.ttf",
];

{
  check("PDF-I", FUENTES.every((f) => existsSync(`fuentes/${f}`)),
    "los cuatro archivos de tipografía están en `fuentes/`");

  /* ⚠️ La licencia OFL obliga a distribuirla con la fuente, y estas fuentes
     viajan adentro de un archivo que se vende. */
  check("PDF-J",
    existsSync("fuentes/OFL-Lora.txt") && existsSync("fuentes/OFL-PlayfairDisplay.txt"),
    "las licencias OFL viajan al lado de las tipografías");

  /* ⚠️ Sin esta línea las fuentes NO viajan a producción. Y no se cae: hay
     respaldo a las de fábrica, así que el ebook saldría con otra letra sin que
     nadie se entere. Un cambio de aspecto silencioso es peor que un error. */
  const config = readFileSync("next.config.ts", "utf8");
  check("PDF-K", /outputFileTracingIncludes[\s\S]{0,600}\.\/fuentes\/\*\*/.test(config),
    "`next.config.ts` declara `./fuentes/**` para que las tipografías lleguen a producción");
}

/* ── El PDF armado de verdad ──────────────────────────────────────────────── */

const PALETA: ColoresDeTapa = {
  tinta: "#0f172a", acento: "#c2410c", sobreAcento: "#ffffff", suave: "#f9ece7",
  acentoOscuro: "#fb923c", sobreAcentoOscuro: "#0f172a",
};

/** Cuántas hojas dice tener el PDF. Se lee del propio archivo. */
function hojas(pdf: Buffer): number {
  const texto = pdf.toString("latin1");
  const m = texto.match(/\/Count\s+(\d+)/g) ?? [];
  return m.reduce((mayor, x) => Math.max(mayor, Number(x.replace(/\D/g, ""))), 0);
}

function capitulosDePrueba(cuantos: number, largo: number): CapituloEscrito[] {
  return Array.from({ length: cuantos }, (_, i) => ({
    titulo: `Capítulo de prueba ${i + 1}`,
    bloques: [
      { tipo: "subtitulo" as const, texto: "Un subtítulo" },
      { tipo: "parrafo" as const, texto: "Palabra ".repeat(largo).trim() },
      { tipo: "vineta" as const, texto: "Una viñeta bastante larga como para que tenga que cortar en más de un renglón y se vea si la sangría quedó bien" },
    ],
  }));
}

const base: DatosDelEbook = {
  titulo: "Ebook de prueba",
  promesa: "Una promesa cualquiera para la tapa.",
  autor: "Quien Vende",
  capitulos: capitulosDePrueba(2, 40),
  paleta: PALETA,
};

async function pruebasDeArmado() {
  /* Sin fotos: es el camino de una cuenta sin clave de Pexels, y el que se
     entregaba antes de todo esto. Tiene que salir entero. */
  const sinFotos = await armarPDF(base);
  check("PDF-L",
    sinFotos.subarray(0, 5).toString() === "%PDF-" && hojas(sinFotos) > 0,
    "un ebook sin ninguna foto se arma igual");

  /* ⚠️ EL QUE IMPORTA. Un capítulo largo cruza de hoja, y ahí es donde
     estaban los dos peores errores: el pie de página abría hojas sin parar
     hasta reventar la pila, y la tipografía del pie se le quedaba pegada al
     resto del párrafo. Si vuelve la recursión, esto no termina. */
  const largo = await armarPDF({ ...base, capitulos: capitulosDePrueba(3, 900) });
  const cuantas = hojas(largo);
  check("PDF-M", cuantas > 6 && cuantas < 200,
    `un ebook con párrafos que cruzan de hoja termina y da un número sensato (${cuantas} hojas)`);

  /* Una foto rota no puede voltear el armado: el ebook ya está escrito y
     pagado cuando se llega a dibujarlo. */
  const rota = { datos: Buffer.from("esto no es una imagen"), fotografo: "Nadie", enlace: "" };
  const conRota = await armarPDF({ ...base, fotoTapa: rota, fotosCapitulos: [rota, null] });
  check("PDF-N", conRota.subarray(0, 5).toString() === "%PDF-" && hojas(conRota) > 0,
    "una foto ilegible no rompe el armado: se dibuja el bloque de color");

  /* Los dos temas tienen que armar. El oscuro pinta el fondo de cada hoja
     desde el escuchador de `pageAdded`; si eso se rompiera, las hojas que
     pdfkit agrega solo saldrían blancas con texto claro encima. */
  const oscuro = await armarPDF({ ...base, modo: "oscuro" });
  check("PDF-O", oscuro.subarray(0, 5).toString() === "%PDF-" && hojas(oscuro) > 0,
    "el tema oscuro se arma");

  /* Sin paleta —una cuenta que todavía no armó su página de venta— también. */
  const sinPaleta = await armarPDF({ ...base, paleta: undefined });
  check("PDF-P", sinPaleta.subarray(0, 5).toString() === "%PDF-" && hojas(sinPaleta) > 0,
    "sin paleta se cae a la de fábrica y se arma igual");

  /* ⚠️ La hoja de créditos aparece SÓLO si hubo fotos. No es cortesía: las
     reglas de la API de Pexels piden nombrar a quien sacó la foto, y esto se
     vende. Un ebook con fotos y sin créditos nos deja fuera de sus términos.

     Se cuenta por hojas y no buscando la palabra "Pexels" adentro del archivo:
     el texto de un PDF va comprimido, así que buscarlo daría que no está
     SIEMPRE —también cuando está— y la prueba pasaría rota para siempre. */
  const foto = {
    datos: Buffer.from("tampoco es una imagen"),
    fotografo: "Fotografa De Prueba",
    enlace: "https://www.pexels.com/foto/123/",
  };
  const conCreditos = await armarPDF({ ...base, fotoTapa: foto });
  check("PDF-Q", hojas(conCreditos) === hojas(sinFotos) + 1,
    `con fotos hay exactamente una hoja más, la de créditos (${hojas(sinFotos)} → ${hojas(conCreditos)})`);

  /* Dos fotos del mismo fotógrafo se nombran una sola vez, así que sigue
     siendo UNA hoja de más y no dos. */
  const dosIguales = await armarPDF({ ...base, fotoTapa: foto, fotosCapitulos: [foto, foto] });
  check("PDF-R", hojas(dosIguales) === hojas(sinFotos) + 1,
    "varias fotos del mismo fotógrafo no agrandan los créditos");

  /* ── El recuadro de aviso ────────────────────────────────────────────────
     ⚠️ Un párrafo lo parte pdfkit solo cuando no entra. Un recuadro NO se
     puede partir: es una caja de un trazo, y si arranca cerca del pie sigue de
     largo por encima de la franja y del número de página sin que nada avise.
     Por eso `dibujarAviso` se mide antes y salta de hoja si no entra. */
  const muchosAvisos = await armarPDF({
    ...base,
    capitulos: [{
      titulo: "Capítulo con avisos",
      bloques: Array.from({ length: 14 }, (_, i): Bloque => ({
        tipo: i % 2 === 0 ? "aviso" : "parrafo",
        texto: `Texto número ${i}. ` + "Palabra ".repeat(40).trim(),
      })),
    }],
  });
  const conAvisos = hojas(muchosAvisos);
  check("PDF-T", conAvisos > 2 && conAvisos < 40,
    `un capítulo lleno de recuadros termina y da un número sensato (${conAvisos} hojas)`);

  /* ⚠️ Y el más largo que el limado deja pasar tiene que ENTRAR EN UNA HOJA.
     Si un aviso midiera más que el alto útil, el salto no lo salvaría —salta
     una vez, no en un bucle— y la caja se comería el pie igual. */
  const maximo = await armarPDF({
    ...base,
    capitulos: [{
      titulo: "Capítulo con el aviso más largo posible",
      bloques: [
        { tipo: "parrafo", texto: "Antes." },
        { tipo: "aviso", texto: "a".repeat(LARGO_BLOQUE - 1).replace(/a{9}/g, "palabra ") },
        { tipo: "parrafo", texto: "Después." },
      ],
    }],
  });
  check("PDF-U", hojas(maximo) <= hojas(sinFotos) + 2,
    `el aviso más largo que el limado permite entra sin desbordar (${hojas(maximo)} hojas)`);

  /* ── Las hojas en blanco ─────────────────────────────────────────────────
     ⚠️ EL ERROR QUE ESTA PRUEBA EXISTE PARA QUE NO VUELVA.

     Una viñeta se dibuja en dos pasos —la bolita y el texto— apuntando los dos
     a la misma posición. Cuando esa posición ya no entraba en la hoja, pdfkit
     abría una hoja para la bolita y OTRA para el texto, porque le seguía
     llegando la posición vieja. Quedaba una hoja con una bolita sola y nada
     más. Se veía en la hoja 20 del ebook de tortas del 07/09/26.

     No se puede mirar "¿esta hoja está vacía?" desde afuera del PDF, así que
     se compara: el MISMO texto, una vez con viñetas y otra con párrafos, tiene
     que ocupar casi lo mismo. Si las viñetas empiezan a filtrar hojas, los dos
     números se separan y esto falla. */
  const texto = (i: number) => `Punto número ${i} de una lista, con suficiente largo como para llegar al borde de la hoja y obligar a cortar.`;
  const conViñetas = await armarPDF({
    ...base,
    capitulos: Array.from({ length: 3 }, (_, c) => ({
      titulo: `Capítulo ${c + 1}`,
      bloques: [
        { tipo: "parrafo" as const, texto: "Palabra ".repeat(320).trim() },
        ...Array.from({ length: 12 }, (_, i): Bloque => ({ tipo: "vineta", texto: texto(i) })),
      ],
    })),
  });
  const conParrafos = await armarPDF({
    ...base,
    capitulos: Array.from({ length: 3 }, (_, c) => ({
      titulo: `Capítulo ${c + 1}`,
      bloques: [
        { tipo: "parrafo" as const, texto: "Palabra ".repeat(320).trim() },
        ...Array.from({ length: 12 }, (_, i): Bloque => ({ tipo: "parrafo", texto: texto(i) })),
      ],
    })),
  });
  const diferencia = Math.abs(hojas(conViñetas) - hojas(conParrafos));
  check("PDF-V", diferencia <= 1,
    `las viñetas no filtran hojas de más (${hojas(conViñetas)} contra ${hojas(conParrafos)})`);

  /* ── ⚠️ UNA RECETA, UNA HOJA ───────────────────────────────────────────────
     Es la promesa entera del recetario: quien cocina apoya el teléfono y lee
     de ahí. Una receta partida al medio la rompe, y deja la hoja anterior con
     un hueco.

     Esto no es teórico. Con las tres recetas de verdad del 07/09/26 salieron
     NUEVE hojas para TRES recetas: cada una se partía y la segunda hoja tenía
     un paso suelto y el tip. Dos causas, las dos medidas:

     1. La foto cuadrada de al lado del título medía siempre 148 puntos y
        empujaba todo 160 abajo — más que la banda ancha que no había entrado.
     2. Ocho pasos de tres renglones no entran, y punto. La hoja tiene que
        apretar (ver `APRETADA`), no partirse.

     Se prueba con la receta más grande que el limado deja pasar. Si el molde
     vuelve a partir una receta, esto falla. */
  const recetaGorda = (i: number): Receta => ({
    titulo: `Receta de prueba número ${i} con un título bastante largo`,
    descripcion: "x".repeat(0) + "palabra ".repeat(Math.ceil(LARGO_DESCRIPCION_RECETA / 8)).slice(0, LARGO_DESCRIPCION_RECETA).trim(),
    rinde: "1 pan grande, 8 porciones bien servidas",
    tiempo: "2 horas y media contando el levado",
    coccion: "180 °C, 25 minutos por cada tanda",
    ingredientes: Array.from({ length: INGREDIENTES_MAX }, (_, n) => ({
      nombre: `ingrediente número ${n + 1}`,
      cantidad: n % 3 === 0 ? "8 unidades, opcional" : "500 g",
    })),
    /* ⚠️ Del largo EXACTO que el limado permite. Con pasos más cortos esta
       prueba pasaba y la receta grande de verdad se partía igual. */
    pasos: Array.from({ length: PASOS_MAX }, (_, n) => ({
      titulo: `Título del paso número ${n + 1}`,
      texto: "palabra ".repeat(Math.ceil(LARGO_PASO / 8)).slice(0, LARGO_PASO).trim(),
    })),
    tip: "Un consejo del final que también ocupa dos renglones, porque es lo último que entra y lo primero que se cae.",
    foto: "pan casero",
  });

  const CUANTAS = 4;
  const recetario = await armarPDF({
    ...base,
    capitulos: [],
    recetas: Array.from({ length: CUANTAS }, (_, i) => recetaGorda(i + 1)),
  });
  /* Tapa + contenido + una hoja por receta. Sin fotos no hay créditos. */
  check("PDF-W", hojas(recetario) === 2 + CUANTAS,
    `cada receta entra en UNA hoja aun con ${INGREDIENTES_MAX} ingredientes y ${PASOS_MAX} pasos largos `
    + `(${hojas(recetario)} hojas, se esperaban ${2 + CUANTAS})`);

  /* Y que no se haya arreglado apretando siempre: una receta corta tiene que
     seguir saliendo holgada y ocupar su hoja igual. */
  const cortito = await armarPDF({
    ...base,
    capitulos: [],
    recetas: [{
      titulo: "Tostadas", descripcion: "Rápidas.", rinde: "2", tiempo: "5 minutos", coccion: "Sin horno",
      ingredientes: [{ nombre: "pan", cantidad: "2 rebanadas" }, { nombre: "manteca", cantidad: "a gusto" }],
      pasos: [{ titulo: "Tostar", texto: "Poné el pan en la tostadora." },
              { titulo: "Untar", texto: "Pasale la manteca mientras está caliente." }],
      tip: "", foto: "tostadas",
    }],
  });
  check("PDF-X", hojas(cortito) === 3, `una receta corta ocupa una hoja (${hojas(cortito)})`);

  /* ── ⚠️ Y LA DEL MEDIO, QUE ES LA QUE DE VERDAD SE ROMPIÓ ─────────────────
     PDF-W usa la receta más grande que el limado deja pasar, y esa entra
     porque la hoja aprieta. Pero la que salió partida el 07/09/26 no era la
     más grande: era una normal, de ocho pasos de dos o tres renglones, que
     entraba holgada **hasta que la foto cuadrada de 148 puntos le comía 74**.

     O sea que la falla vive justo en el medio: recetas que entran, pero no si
     la foto se sirve primero. Sin esta prueba, volver a poner el cuadrado fijo
     pasaba los chequeos. */
  const recetaNormal = (i: number): Receta => ({
    titulo: `Pan de prueba número ${i} en airfryer`,
    descripcion: "Corteza crocante y miga tierna, ideal para el desayuno o para acompañar cualquier comida.",
    rinde: "1 pan grande, 8 porciones",
    tiempo: "2 horas con levado",
    coccion: "180 °C, 25 minutos",
    ingredientes: Array.from({ length: 6 }, (_, n) => ({
      nombre: `ingrediente ${n + 1}`, cantidad: "1 cucharadita",
    })),
    pasos: Array.from({ length: 8 }, (_, n) => ({
      titulo: `Paso ${n + 1}`,
      texto: "Mezclá todo con cuidado, amasá sobre la mesada unos ocho minutos hasta que quede liso y elástico, y dejá descansar tapado el tiempo que haga falta hasta que duplique.",
    })),
    tip: "Si se dora demasiado rápido arriba, cubrilo con papel aluminio los últimos diez minutos de cocción.",
    foto: "pan casero",
  });

  /* ⚠️ Y con una foto QUE SE PUEDA ABRIR. Las otras pruebas usan buffers rotos
     a propósito —para ver que no rompan el armado—, pero con una foto rota el
     molde dibuja el bloque de color y nunca entra al camino del cuadrado, que
     es justo el que falló. Un PNG de 8×8 alcanza: lo que importa es que pdfkit
     lo abra y le dé un alto. */
  const fotoDeVerdad = {
    datos: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4UWGDFTEMLQkAQfNfAVTFtrMAAAAASUVORK5CYII=",
      "base64",
    ),
    fotografo: "Fotografa De Prueba",
    enlace: "https://www.pexels.com/foto/123/",
  };

  const normales = await armarPDF({
    ...base,
    capitulos: [],
    recetas: Array.from({ length: 3 }, (_, i) => recetaNormal(i + 1)),
    fotosCapitulos: [fotoDeVerdad, fotoDeVerdad, fotoDeVerdad],
  });
  /* Tapa + contenido + 3 recetas + créditos, que aparecen porque hay fotos. */
  check("PDF-Y", hojas(normales) === 6,
    `una receta común de 8 pasos entra en su hoja con la foto puesta (${hojas(normales)} hojas, se esperaban 6)`);

  /* El título y el autor van en los datos del archivo, que es lo que muestra
     el lector de PDF en la pestaña. Esos NO van comprimidos. */
  const datos = conCreditos.toString("latin1");
  check("PDF-S",
    datos.includes("Ebook de prueba") && datos.includes("Quien Vende"),
    "el título y quien vende quedan en los datos del archivo");
}

pruebasDeArmado()
  .then(() => {
    console.log(fallos === 0
      ? "\nok — el PDF del ebook se arma entero y se lee en las dos variantes"
      : `\nFALLA — ${fallos} chequeo(s) del PDF`);
    process.exit(fallos === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.log(`\nFALLA — el armado del PDF tiró una excepción: ${e?.message ?? e}`);
    process.exit(1);
  });
