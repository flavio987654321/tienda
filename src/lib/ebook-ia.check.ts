/**
 * Chequeos del ebook con IA: el temario, los capítulos y el PDF.
 *
 *   npx tsx src/lib/ebook-ia.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * Tres cosas, y las tres son plata.
 *
 * **Lo que sale es EL PRODUCTO.** No una pantalla: el archivo que alguien paga y
 * baja. Un capítulo de dos renglones o un temario con capítulos repetidos no es
 * un detalle feo, es una devolución.
 *
 * **El PDF tiene que armarse siempre.** Un emoji adentro de un párrafo no puede
 * hacer fallar el armado del archivo que ya se cobró.
 *
 * **Y un ebook son once llamadas al modelo, no una.** Los topes que estaban
 * escritos para un botón de una sola llamada lo cortan a la mitad.
 */

import { readFileSync } from "fs";
import {
  normalizarIndice, normalizarCapitulo, leerIndice, leerCapitulos, leerPromesa,
  elCapituloQueSigue, pedidoDelCapitulo,
  INSTRUCCIONES_INDICE, INSTRUCCIONES_CAPITULO, ESQUEMA_DEL_INDICE, ESQUEMA_DEL_CAPITULO,
  CAPITULOS_MIN, CAPITULOS_MAX, LARGO_TEMA, MINIMO_TEMA, LARGO_BLOQUE, BLOQUES_MAX,
  TIPOS_DE_BLOQUE, LARGO_TITULO_EBOOK,
  leerGruposDeRecetas, todasLasRecetas, normalizarRecetas, cortarEnUnaIdea,
  INSTRUCCIONES_RECETAS, INSTRUCCIONES_INDICE_RECETARIO, LARGO_PASO,
  type CapituloEscrito, type CapituloPlaneado,
} from "./ebook-ia";
import { armarPDF, soloLoQueEntra } from "./ebook-pdf";
import { CUPO_EBOOK } from "./cupo-ia";
import { RAFAGA_CAPITULOS, RAFAGA_IA, MARGEN_DE_INTENTOS, GLOBAL_EBOOKS_DIARIO } from "./ia-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const capitulosBuenos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    titulo: `Capítulo ${i + 1}`,
    resumen: "De qué se trata este capítulo, en dos renglones.",
    foto: "manos amasando harina",
  }));

/* ── El temario ─────────────────────────────────────────────────────────── */

check("IND-A", normalizarIndice(null) === null && normalizarIndice("hola") === null,
  "un temario que no es un objeto se rechaza");

check("IND-B",
  normalizarIndice({ titulo: "Un ebook", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN) }) !== null,
  "un temario con el mínimo de capítulos se acepta");

/* ⚠️ Menos del mínimo NO es un ebook. Se rechaza entero y se devuelve el cupo:
   es preferible "probá de nuevo" a cobrarle tres capítulos a alguien. */
check("IND-C",
  normalizarIndice({ titulo: "Un ebook", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN - 1) }) === null,
  "un temario con menos capítulos que el mínimo se rechaza entero");

/* Y de más se recorta, no se rechaza: lo que sobra es plata que no se gasta. */
check("IND-D",
  normalizarIndice({ titulo: "Un ebook", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MAX + 5) })
    ?.capitulos.length === CAPITULOS_MAX,
  "un temario con capítulos de más se recorta al máximo");

/* Dos capítulos con el mismo título dejan un índice que se lee como un error de
   imprenta, y encima se escriben —y se pagan— dos veces. */
check("IND-E",
  normalizarIndice({
    titulo: "Un ebook", promesa: "p",
    capitulos: [...capitulosBuenos(CAPITULOS_MIN), { titulo: "capítulo 1", resumen: "otra cosa" }],
  })?.capitulos.length === CAPITULOS_MIN,
  "un capítulo con el título repetido se descarta");

/* Un capítulo sin resumen no se puede escribir después: el resumen es lo único
   que va a leer quien escriba ese capítulo. */
check("IND-F",
  normalizarIndice({
    titulo: "Un ebook", promesa: "p",
    capitulos: [...capitulosBuenos(CAPITULOS_MIN), { titulo: "Sin resumen", resumen: "" }],
  })?.capitulos.length === CAPITULOS_MIN,
  "un capítulo sin resumen se descarta");

/* ⚠️ EL TÍTULO DE LA PERSONA GANA. Pedirle al modelo que lo respete es una
   sugerencia; imponerlo acá es la garantía. Misma decisión que en el embudo. */
check("IND-G",
  normalizarIndice(
    { titulo: "El que inventó la IA", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN) },
    "El que ya tenía escrito",
  )?.titulo === "El que ya tenía escrito",
  "si la persona ya tiene título, se usa el suyo y no el de la IA");

check("IND-H",
  (normalizarIndice(
    { titulo: "De la IA", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN) },
    "  ",
  )?.titulo) === "De la IA",
  "un título propio vacío no pisa al de la IA");

check("IND-I",
  (normalizarIndice(
    { titulo: "x".repeat(500), promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN) },
  )?.titulo.length ?? 0) <= LARGO_TITULO_EBOOK,
  "el título se recorta a su tope");

/* ── Los capítulos ──────────────────────────────────────────────────────── */

const bloques = (n: number) =>
  Array.from({ length: n }, () => ({ tipo: "parrafo", texto: "Un párrafo con algo adentro." }));

check("CAP-A", normalizarCapitulo({ bloques: bloques(5) }, "Título") !== null,
  "un capítulo con bloques suficientes se acepta");

/* Un capítulo de dos renglones es un capítulo fallado. Mejor reintentarlo que
   dejarlo adentro del PDF que alguien va a vender. */
check("CAP-B", normalizarCapitulo({ bloques: bloques(2) }, "Título") === null,
  "un capítulo de menos de tres bloques se rechaza");

check("CAP-C", normalizarCapitulo({ bloques: bloques(5) }, "  ") === null,
  "un capítulo sin título se rechaza");

/* Un tipo que no conocemos se dibuja como párrafo. Descartarlo perdería texto
   que la persona ya pagó; dibujarlo mal rompería el PDF. */
check("CAP-D",
  normalizarCapitulo({ bloques: [...bloques(3), { tipo: "tabla", texto: "algo" }] }, "T")
    ?.bloques[3]?.tipo === "parrafo",
  "un tipo de bloque desconocido se dibuja como párrafo");

check("CAP-E",
  (normalizarCapitulo({ bloques: [...bloques(3), { tipo: "parrafo", texto: "x".repeat(9999) }] }, "T")
    ?.bloques[3]?.texto.length ?? 0) <= LARGO_BLOQUE,
  "un bloque larguísimo se recorta a su tope");

check("CAP-F",
  (normalizarCapitulo({ bloques: bloques(BLOQUES_MAX + 20) }, "T")?.bloques.length ?? 0) <= BLOQUES_MAX,
  "un capítulo con bloques de más se recorta");

check("CAP-G", normalizarCapitulo({ bloques: "no es una lista" }, "T") === null,
  "un capítulo que no trae lista de bloques se rechaza");

/* ── Lo guardado ────────────────────────────────────────────────────────── */

/* La columna es texto: lo que hay adentro es lo que había el día que se
   escribió, no necesariamente lo que el código de hoy espera. Nada de esto
   puede tirar una excepción — del otro lado hay una pantalla que tiene que
   poder mostrar el ebook igual. */
check("LEE-A",
  leerIndice(null).length === 0 && leerIndice("{roto").length === 0 && leerIndice("{}").length === 0,
  "un índice guardado roto se lee como vacío, sin tirar");

check("LEE-B",
  leerCapitulos(null).length === 0 && leerCapitulos("[1,2,3]").length === 0,
  "capítulos guardados rotos se leen como vacío, sin tirar");

/* ── Las dos formas del índice (07/09/26) ────────────────────────────────────
 *
 * Desde esta fecha el índice se guarda como `{promesa, capitulos}` para no
 * tirar la promesa, que es lo único escrito para la TAPA. Los ebooks de antes
 * tienen la lista pelada y **no se pueden reescribir**: si `leerIndice` dejara
 * de entenderlos, cada uno de esos ebooks se quedaría sin capítulos y su PDF
 * saldría vacío. */

const VIEJO = JSON.stringify([
  { titulo: "Uno", resumen: "Resumen uno" },
  { titulo: "Dos", resumen: "Resumen dos" },
]);
const NUEVO = JSON.stringify({
  promesa: "Vas a poder hacer la cosa sin ayuda.",
  capitulos: [
    { titulo: "Uno", resumen: "Resumen uno" },
    { titulo: "Dos", resumen: "Resumen dos" },
  ],
});

check("LEE-G", leerIndice(VIEJO).length === 2 && leerIndice(VIEJO)[0].titulo === "Uno",
  "un índice de los VIEJOS se sigue leyendo entero");
check("LEE-H", leerIndice(NUEVO).length === 2 && leerIndice(NUEVO)[1].titulo === "Dos",
  "un índice de los nuevos también");

check("LEE-I", leerPromesa(NUEVO) === "Vas a poder hacer la cosa sin ayuda.",
  "la promesa se lee de los nuevos");

/* ⚠️ Vacía en los viejos, y NO inventada: quien la usa decide con qué
   reemplazarla. Devolver acá el resumen del capítulo 1 escondería que falta. */
check("LEE-J", leerPromesa(VIEJO) === "" && leerPromesa(null) === "" && leerPromesa("{roto") === "",
  "en los viejos y en los rotos la promesa es vacía, nunca inventada");

/* ── La búsqueda de foto de cada capítulo ───────────────────────────────── */

{
  /* ⚠️ Un capítulo SIN la búsqueda de foto sigue valiendo. El campo se sumó el
     07/09/26; si faltara —el modelo no lo mandó, o el ebook se guardó antes—
     rechazar el capítulo tiraría un ebook entero por una foto. */
  const sinFoto = normalizarIndice({
    titulo: "Un ebook", promesa: "p",
    capitulos: capitulosBuenos(CAPITULOS_MIN).map(({ titulo, resumen }) => ({ titulo, resumen })),
  });
  check("FOT-INDICE-A", sinFoto !== null && sinFoto.capitulos.every((c) => c.foto === ""),
    "un temario sin búsqueda de foto se acepta igual, con el campo vacío");

  const conFoto = normalizarIndice({
    titulo: "Un ebook", promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN),
  });
  check("FOT-INDICE-B", conFoto?.capitulos[0].foto === "manos amasando harina",
    "cuando viene, la búsqueda de foto se guarda tal cual");

  /* Y se lee de vuelta de lo guardado. Si se perdiera acá, el armado caería al
     título en silencio y volveríamos a las fotos de otro tema. */
  const guardadoConFoto = JSON.stringify({
    promesa: "p", capitulos: capitulosBuenos(CAPITULOS_MIN),
  });
  check("FOT-INDICE-C", leerIndice(guardadoConFoto)[0]?.foto === "manos amasando harina",
    "la búsqueda de foto sobrevive a la ida y vuelta a la base");

  /* Un temario viejo, guardado como arreglo pelado y sin el campo. */
  check("FOT-INDICE-D",
    leerIndice(VIEJO).length > 0 && leerIndice(VIEJO).every((c) => c.foto === ""),
    "un temario guardado antes de que el campo existiera se sigue leyendo entero");
}

/* ── El recuadro de aviso ───────────────────────────────────────────────── */

{
  check("AVI-A", TIPOS_DE_BLOQUE.includes("aviso"),
    "`aviso` es un tipo de bloque válido");

  const conAviso = normalizarCapitulo({
    bloques: [
      { tipo: "parrafo", texto: "Un párrafo cualquiera que dice algo." },
      { tipo: "aviso", texto: "Si la masa se pega, metela en la heladera." },
      { tipo: "vineta", texto: "Un punto de una lista." },
    ],
  }, "Un capítulo");
  check("AVI-B", conAviso?.bloques[1]?.tipo === "aviso",
    "un aviso sobrevive el limado y no se degrada a párrafo");

  /* ⚠️ Un tipo que el PDF no sabe dibujar se vuelve párrafo, no se descarta:
     perder el texto sería perder contenido pago. */
  const inventado = normalizarCapitulo({
    bloques: [
      { tipo: "recuadro-fluorescente", texto: "Algo que igual hay que mostrar." },
      { tipo: "parrafo", texto: "Otro párrafo." },
      { tipo: "parrafo", texto: "Y otro más." },
    ],
  }, "Un capítulo");
  check("AVI-C", inventado?.bloques[0]?.tipo === "parrafo" &&
    inventado?.bloques[0]?.texto === "Algo que igual hay que mostrar.",
    "un tipo inventado cae a párrafo sin perder el texto");
}

const guardado = JSON.stringify([
  { titulo: "Uno", bloques: bloques(4) },
  { titulo: "Dos", bloques: bloques(4) },
]);
check("LEE-C", leerCapitulos(guardado).length === 2,
  "los capítulos guardados bien se leen enteros");

/* ── Cuál sigue ─────────────────────────────────────────────────────────── */

const indice10: CapituloPlaneado[] = capitulosBuenos(CAPITULOS_MAX);
const escritos3 = leerCapitulos(JSON.stringify(
  Array.from({ length: 3 }, (_, i) => ({ titulo: `Capítulo ${i + 1}`, bloques: bloques(4) })),
));

check("SIG-A", elCapituloQueSigue(indice10, escritos3)?.numero === 4,
  "el que sigue es el siguiente al último escrito");
check("SIG-B",
  elCapituloQueSigue(indice10, escritos3)?.capitulo.titulo === indice10[3].titulo,
  "y es el capítulo del temario que corresponde a ese número");
check("SIG-C", elCapituloQueSigue(capitulosBuenos(3), escritos3) === null,
  "con todos escritos, no sigue ninguno");

/* Nunca puede pedir un capítulo que el temario no tiene: eso sería escribir —y
   cobrar— un capítulo inventado. */
check("SIG-D",
  elCapituloQueSigue(capitulosBuenos(2), escritos3) === null,
  "si hay más escritos que planeados, tampoco sigue ninguno");

/* ── Lo que se le pide al modelo ────────────────────────────────────────── */

const pedido = pedidoDelCapitulo("El título", "El tema", "Gente que arranca", indice10, 4);
check("PED-A", pedido.includes("<tema>") && pedido.includes("<temario>"),
  "el texto de la persona va marcado y separado del temario");
check("PED-B", pedido.includes("capítulo 4") && pedido.includes(indice10[3].titulo),
  "se dice cuál capítulo toca, por número y por título");
/* El temario entero va, el texto de los otros capítulos no: serían decenas de
   miles de tokens por llamada, pagados diez veces, para algo que el resumen ya
   resuelve. */
check("PED-C", pedido.length < 6_000,
  "el pedido de un capítulo no arrastra el texto de los anteriores");

/* ── Las reglas del prompt ──────────────────────────────────────────────── */

const prompts = INSTRUCCIONES_INDICE + "\n" + INSTRUCCIONES_CAPITULO;

/* ⚠️ Un modelo inventa estadísticas y testimonios con total naturalidad, y
   suenan perfectos. Esto termina impreso en algo que se vende. */
check("PRO-A", /[Ee]stad[íi]sticas/.test(prompts) && /estudios/.test(prompts),
  "se le prohíbe inventar estadísticas y estudios");
check("PRO-B", /[Tt]estimonios/.test(prompts),
  "se le prohíben los testimonios inventados");
check("PRO-C", /garantizado|[Pp]romesas de resultado/.test(prompts),
  "se le prohíbe prometer resultados");
/* Si el tema toca salud, plata o leyes, la aclaración protege primero a quien
   vende: el art. 40 de la Ley 24.240 lo alcanza a él. */
/* Con \s+ y no un espacio: el prompt está escrito con renglones cortos para
   poder leerlo, así que la frase cae partida en dos. Es la quinta vez en este
   proyecto que un chequeo falla por buscar un espacio donde hay un salto. */
check("PRO-D", /no\s+reemplaza a un profesional/.test(prompts),
  "en salud, plata o leyes se aclara que no reemplaza a un profesional");
check("PRO-E", /markdown/i.test(prompts) && /emojis/i.test(prompts),
  "se le pide texto pelado: ni markdown ni emojis");
check("PRO-F", /rioplatense/.test(prompts) && /"vos"/.test(prompts),
  "se escribe en castellano rioplatense, de vos");

/* La forma la garantiza la herramienta, no una frase pidiendo JSON. */
check("ESQ-A",
  ESQUEMA_DEL_INDICE.properties.capitulos.maxItems === CAPITULOS_MAX &&
  ESQUEMA_DEL_INDICE.properties.capitulos.minItems === CAPITULOS_MIN,
  "el esquema del temario pide entre el mínimo y el máximo de capítulos");
check("ESQ-B",
  ESQUEMA_DEL_CAPITULO.properties.bloques.maxItems === BLOQUES_MAX,
  "el esquema del capítulo tiene tope de bloques");
check("ESQ-C",
  JSON.stringify(ESQUEMA_DEL_CAPITULO).includes(TIPOS_DE_BLOQUE.join('","')),
  "el esquema sólo deja los tipos de bloque que el PDF sabe dibujar");

/* El tema es largo porque hay gente que ya tiene el índice pensado y lo pega
   entero. Con 600 caracteres tenía que resumirlo. */
check("TEM-A", LARGO_TEMA >= 2_000 && MINIMO_TEMA >= 10,
  "el tema entra pegado entero, y con dos palabras no alcanza");

/* ── El PDF ─────────────────────────────────────────────────────────────── */

check("PDF-A", soloLoQueEntra("acción ñandú «hola» —guión— café") === "acción ñandú «hola» —guión— café",
  "los acentos, la eñe y las comillas latinas quedan intactos");

/* ⚠️ Las tipografías de fábrica sólo entienden un byte. Un emoji adentro de un
   párrafo no puede hacer fallar el armado del archivo que ya se cobró. */
check("PDF-B", !/[\u{1F300}-\u{1FAFF}]/u.test(soloLoQueEntra("hola 🚀 chau 🎉")),
  "los emojis se sacan antes de dibujar");
check("PDF-C", soloLoQueEntra("mirá → esto").includes("->"),
  "una flecha que no entra se cambia por una que sí, no desaparece");
check("PDF-D", !soloLoQueEntra("un textoraro").includes(" "),
  "los caracteres de control no llegan al PDF");

const capsPDF: CapituloEscrito[] = Array.from({ length: 6 }, (_, i) => ({
  titulo: `Capítulo ${i + 1}`,
  bloques: [
    { tipo: "parrafo", texto: "Un párrafo largo. ".repeat(40) },
    { tipo: "subtitulo", texto: "Un subtítulo" },
    { tipo: "vineta", texto: "Una viñeta con 🚀 y flecha →" },
    { tipo: "parrafo", texto: "Otro párrafo. ".repeat(60) },
  ],
}));

async function elPDF() {
  const pdf = await armarPDF({
    titulo: "Cómo hacer algo — con acentos y «comillas»",
    promesa: "Vas a poder hacerlo solo.",
    autor: "Quien lo vende 🚀",
    capitulos: capsPDF,
  });

  check("PDF-E", pdf.subarray(0, 5).toString("latin1") === "%PDF-",
    "sale un PDF de verdad");

  /* Tapa + contenido + un capítulo por hoja nueva, como mínimo. */
  const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check("PDF-F", paginas >= capsPDF.length + 2,
    "hay al menos una hoja por capítulo, más la tapa y el contenido");

  /* Un ebook entero pesa kilobytes: el techo de 4,5 MB de la plataforma no lo
     roza ni de cerca. Si algún día esto falla, algo se está embebiendo. */
  check("PDF-G", pdf.length < 2_000_000,
    "el PDF pesa lo que pesa un texto, no lo que pesa una imagen");

  /* Un ebook al que le falta un capítulo no se arma: se avisa y se reintenta. */
  const vacio = await armarPDF({ titulo: "T", promesa: "", autor: "", capitulos: [] });
  check("PDF-H", vacio.subarray(0, 5).toString("latin1") === "%PDF-",
    "hasta sin capítulos el armado no tira, para que el error lo decida quien llama");
}

/* ── Los topes, que acá cuentan distinto ────────────────────────────────── */

/* ⚠️ EL ERROR QUE ESTE CHEQUEO CUIDA. Un ebook son tantas llamadas como
   capítulos, más la del temario, hechas por la pantalla sola en un par de
   minutos. Con la ráfaga del botón barato (8 cada 10 minutos) el ebook se
   cortaba en el capítulo 7 — y la culpa parecía nuestra. */
check("LIM-A", RAFAGA_CAPITULOS > CAPITULOS_MAX + 1,
  "la ráfaga de capítulos aguanta un ebook entero, y sobra");
check("LIM-B", RAFAGA_CAPITULOS > RAFAGA_IA,
  "y es más alta que la del botón de una sola llamada");

const limites = readFileSync("src/lib/ia-digitales.ts", "utf8");

/* Un capítulo no toca los globales: el ebook los tocó al empezar. Contarlo once
   veces sería contar once veces el mismo trabajo, y tres ebooks dejarían sin IA
   a todos los botones baratos del día. */
check("LIM-C",
  /if \(que === "capitulo"\) return \{ permitido: true \};/.test(limites) &&
  limites.indexOf('if (que === "capitulo") return { permitido: true };') <
    limites.indexOf("ia-dig-global-dia"),
  "un capítulo no gasta del presupuesto global: lo gastó el ebook al empezar");

/* Y el ebook tiene presupuesto propio, aparte del de lo barato. */
check("LIM-D", GLOBAL_EBOOKS_DIARIO > 0 && /ia-dig-ebooks-dia/.test(limites),
  "los ebooks tienen su propio global diario, separado del resto");

/* El único agujero sin fondo: pedir "escribime el capítulo que falta" para
   siempre. Cada intento fallido no le gasta cupo a la persona —no recibió
   nada— pero nos cuesta plata igual. */
check("LIM-E", MARGEN_DE_INTENTOS > 0 && MARGEN_DE_INTENTOS <= 10,
  "hay un margen de reintentos por ebook, y es un margen y no una barra libre");

/* ── El cupo ────────────────────────────────────────────────────────────── */

/* Free no escribe ebooks. Está chequeado en el archivo del embudo también, y
   acá se repite a propósito: es la línea que separa lo que cuesta centavos de
   lo que cuesta dólares. */
check("CUP-EB", CUPO_EBOOK.FREE.bienvenida === 0 && CUPO_EBOOK.FREE.mes === 0,
  "Free no tiene ebooks con IA");

/* ── Las tres rutas ─────────────────────────────────────────────────────── */

const empezar = readFileSync("src/app/api/digitales/ia/ebook/route.ts", "utf8");
const paso = readFileSync("src/app/api/digitales/ia/ebook/paso/route.ts", "utf8");
const armar = readFileSync("src/app/api/digitales/ia/ebook/armar/route.ts", "utf8");
const borrador = readFileSync("src/lib/ebook-borrador.ts", "utf8");
const rutas = [empezar, paso, armar];

/* ⚠️ CUANDO SE COMPARA EL ORDEN DE DOS COSAS, SE BUSCA LA LLAMADA Y NO EL
   NOMBRE. Un archivo empieza con sus `import`, así que `indexOf("cobrar")`
   encuentra la línea del import —el renglón 4— y no dónde se cobra de verdad.
   Comparado contra cualquier otra cosa da siempre "primero", y el chequeo pasa
   sin haber mirado nada.
   Encontrado el 04/09/26: seis de los chequeos de acá abajo pasaban así. Por eso
   ahora todos buscan `await loQueSea`, que sólo aparece donde se llama. */

/* ⚠️ ROL DIGITAL, NO OWNER. Es el error que ya cometió la ruta de Sasha al
   revés: pide OWNER y una cuenta digital recibe un 403. Cada ecosistema tiene
   su puerta. */
check("RUT-A", rutas.every((r) => /user\.role !== "DIGITAL"/.test(r)),
  "las tres rutas piden rol DIGITAL");

/* ⚠️ EL DUEÑO VA ADENTRO DEL `where`, no en un `if` después de leer. Sin esto,
   mandando el id de otro se le escribe —y se le reemplaza— el archivo a un
   producto ajeno. Es la falla más cara que puede tener este ecosistema. */
check("RUT-B",
  rutas.every((r) => /store: \{ ownerId: user\.id \}/.test(r)),
  "las tres comprueban que el producto sea de la cuenta, dentro del where");

/* Y sobre un producto borrado tampoco: dejaría un archivo que nadie alcanza. */
check("RUT-C", rutas.every((r) => /deletedAt: null/.test(r)),
  "ninguna trabaja sobre un producto borrado");

/* ── Empezar: la única que cobra ────────────────────────────────────────── */

/* Los topes van ANTES de leer el cuerpo y antes de tocar la base: un pedido
   rechazado no tiene que costar nada. */
check("RUT-D",
  empezar.indexOf("await permitirGeneracion") < empezar.indexOf("req.json()"),
  "los topes se cuentan antes de leer el cuerpo del pedido");

/* ⚠️ EL CUPO SE GASTA ANTES DE LLAMAR AL MODELO. Después sería tarde: ocho
   pedidos en paralelo pasarían todos el control —porque ninguno gastó
   todavía— y generarían los ocho. */
check("RUT-E",
  empezar.indexOf("await consumirDelCupo") < empezar.indexOf("anthropic.messages.create"),
  "el cupo se gasta antes de llamar al modelo");

/* Y si la llamada falla, se devuelve: la persona no recibió nada y el fallo
   fue nuestro. Son tres los caminos que no entregan nada. */
check("RUT-F",
  (empezar.match(/await devolver\(\)/g) ?? []).length >= 3,
  "el cupo se devuelve en todos los caminos en los que no se entrega nada");

/* Un plan sin ebooks se corta antes de todo, y el mensaje dice qué SÍ puede
   hacer: "no disponible en tu plan" deja a alguien pensando que no puede
   vender, cuando lo único que no puede es pedirnos que se lo escribamos. */
check("RUT-G",
  /podés subir tu propio PDF/.test(empezar) &&
  empezar.indexOf("CUPO_EBOOK[tier]") < empezar.indexOf("await permitirGeneracion"),
  "el plan sin ebooks se corta primero, diciendo qué sí puede hacer");

/* Retomar un ebook a medias no puede costar plata: es el caso para el que se
   guardó el borrador. */
check("RUT-H",
  empezar.indexOf("retomado: true") < empezar.indexOf("await consumirDelCupo"),
  "retomar un ebook empezado se contesta antes de gastar nada");

/* El reintento incluido: uno gratis por ebook, y a partir del segundo se paga. */
check("RUT-I", /reintentos < 1/.test(empezar) && /esGratis/.test(empezar),
  "el primer rehacer es gratis y el resto gasta cupo");

/* Y no se puede rehacer mientras se escribe un capítulo: quedaría un capítulo
   pagado escribiéndose contra un temario que ya no existe. */
check("RUT-J", /Se está escribiendo un capítulo justo ahora/.test(empezar),
  "no se puede rehacer el temario mientras se escribe un capítulo");

/* ── El paso: no cobra, y es la que más gasta ───────────────────────────── */

/* El cupo se gastó al empezar. Si esta ruta lo gastara otra vez, un ebook de
   diez capítulos costaría diez ebooks de cupo. */
check("RUT-K", !/consumirDelCupo/.test(paso),
  "escribir un capítulo no vuelve a gastar cupo");

/* ⚠️ El candado se toma ANTES de llamar al modelo. Al revés, dos pedidos
   escribirían los dos el mismo capítulo y lo pagaríamos dos veces. */
check("RUT-L",
  paso.indexOf("await tomarElCandado") < paso.indexOf("anthropic.messages.create"),
  "el candado se toma antes de llamar al modelo");

/* Y se suelta apenas falla: sin eso habría que esperar los 90 segundos del
   vencimiento, y quien mira la barra no entiende por qué el botón no hace nada. */
check("RUT-M", (paso.match(/soltarElCandado/g) ?? []).length >= 2,
  "el candado se suelta en los dos caminos de falla");

/* ⚠️ LA MARCA DEL CANDADO VA EN EL `where` AL GUARDAR. Es lo que impide que un
   pedido que tardó de más pise lo que escribió el que lo reemplazó: se leyó la
   lista de capítulos antes de llamar al modelo, y guardar la lista vieja
   borraría el capítulo del otro. */
check("RUT-N", /where: \{ id, trabajandoDesde: marca \}/.test(borrador),
  "guardar un capítulo comprueba que el candado siga siendo nuestro");

/* El presupuesto de llamadas va contra el id del EBOOK y no contra la cuenta:
   un ebook que se descontrola no le come el presupuesto a otro. */
check("RUT-O", /ia-ebook-llamadas:\$\{ebook\.id\}/.test(paso),
  "el presupuesto de intentos se cuenta por ebook, no por cuenta");

/* Pedir un capítulo cuando ya están todos no puede costar plata. */
check("RUT-P",
  paso.indexOf("if (!sigue)") < paso.indexOf("anthropic.messages.create"),
  "si ya están todos los capítulos, no se llama al modelo");

/* ── Armar: la que toca el archivo ──────────────────────────────────────── */

/* ⚠️ PRIMERO SUBIR, DESPUÉS ESCRIBIR LA REFERENCIA. Al revés, el producto
   queda apuntando a un archivo que no existe, lo que falta lo da por listo y
   se puede publicar: se cobra y no hay nada que entregar. */
check("RUT-Q",
  armar.indexOf("await subirAlDeposito") < armar.indexOf("archivoPath: refDeArchivo"),
  "el archivo se sube antes de colgarlo del producto");

/* Un ebook al que le falta un capítulo no se arma: sería entregar algo cortado
   a la mitad y marcar el producto como entregable. */
/* `partes` es el largo de la lista guardada: capítulos en un ebook de texto,
   grupos de recetas en un recetario. La cuenta es la misma en los dos, porque
   cada elemento es una llamada al modelo ya cobrada. */
check("RUT-R",
  /partes < indice\.length/.test(armar) &&
  armar.indexOf("partes < indice.length") < armar.indexOf("await armarPDF"),
  "no se arma el PDF si falta escribir alguna parte");

/* Si no se puede guardar la referencia, el archivo subido se borra: si no,
   queda en el depósito sin que nadie lo apunte y lo pagamos para siempre. */
check("RUT-S",
  /quedó huérfano:/.test(armar) && /borrarDelDeposito\(config, ruta\)/.test(armar),
  "si falla el guardado, el archivo que se subió se borra");

/* Y el anterior se borra DESPUÉS de guardar el nuevo: al revés, si el guardado
   falla el producto queda apuntando a un archivo que ya no está. */
check("RUT-T",
  armar.indexOf("archivoPath: refDeArchivo") < armar.indexOf("anterior !== ruta"),
  "el archivo viejo se borra después de guardar el nuevo, nunca antes");

/* Dos armados a la vez subirían dos archivos y el producto se quedaría con
   uno: el otro queda en el depósito sin que nadie lo alcance. */
check("RUT-U", /tomarElCandado/.test(armar),
  "armar el PDF también toma el candado");

/* Esta ruta no llama al modelo, pero sube archivos y escribe en la base. */
check("RUT-V", /checkRateLimit/.test(armar),
  "armar tiene su propio freno, aunque no llame al modelo");

/* ⚠️ pdfkit abre sus archivos de medidas en tiempo de ejecución, con una ruta
   que se arma sola. El empaquetador no ve esas aperturas, así que no las copia
   y la función se cae RECIÉN EN PRODUCCIÓN, al armar el primer PDF. En local
   anda porque está node_modules entero — o sea que esto no se puede probar
   acá, sólo cuidar. */
const config = readFileSync("next.config.ts", "utf8");
check("RUT-W",
  /outputFileTracingIncludes/.test(config) && /pdfkit\/js\/data/.test(config),
  "las tipografías de pdfkit viajan con la función que arma el PDF");

/* ── El recetario, de punta a punta ─────────────────────────────────────── */

{
  /* ⚠️ EL QUE CUIDA QUE NO SE ENTREGUE OTRA COSA. Las tres rutas tienen que
     mirar el formato guardado. Si una sola se lo olvida, el recorrido se
     rompe en silencio: se cobra un recetario y sale un ebook de texto, o al
     revés se le piden párrafos a un molde de recetas. */
  check("REC-A",
    /INSTRUCCIONES_INDICE_RECETARIO/.test(empezar) &&
    /esquemaDelIndiceRecetario\(secciones\)/.test(empezar),
    "la ruta del temario pide secciones cuando es un recetario");

  /* Y con la cantidad de secciones CLAVADA, no un rango: si el modelo devuelve
     menos, el recetario sale más chico de lo que se cobró. */
  check("REC-B",
    /normalizarIndice\([\s\S]{0,120}esRecetario \? secciones/.test(empezar),
    "un temario de recetario con menos secciones de las pedidas se rechaza entero");

  check("REC-C",
    /INSTRUCCIONES_RECETAS/.test(paso) &&
    /esquemaDeRecetas\(cuantasRecetas\)/.test(paso) &&
    /normalizarRecetas\(bloque\.input, cuantasRecetas\)/.test(paso),
    "la ruta del paso escribe recetas, con el tope de esa sección");

  /* ⚠️ `max_tokens` más alto para las recetas. Cortarse ahí no devuelve las
     que ya escribió: devuelve NADA, y se paga igual. */
  check("REC-D", /max_tokens: esRecetario \? 4000 : 3000/.test(paso),
    "las recetas tienen más techo de salida que un capítulo");

  check("REC-E",
    /recetas: esRecetario \? recetas : undefined/.test(armar) &&
    /recetas\.map\(\(r\) => r\.foto \|\| r\.titulo\)/.test(armar),
    "la ruta del PDF pasa las recetas y busca UNA FOTO POR RECETA, no por sección");

  /* La barra de la pantalla se dibuja con esto. Sin la rama del recetario
     quedaría en cero mientras la persona mira cómo se escribe su recetario. */
  /* ⚠️ Y cuenta RECETAS, no las secciones en que se parten: un recetario de 10
     se escribe en 4 secciones, así que contando secciones la barra le decía
     "2 de 4" a alguien que había elegido 10. */
  check("REC-F",
    /leerGruposDeRecetas\(fila\.capitulos\)/.test(borrador) &&
    /grupos\.reduce\(\(n, g\) => n \+ g\.length, 0\)/.test(borrador) &&
    /^\s+opciones,$/m.test(borrador),
    "el borrador cuenta recetas —no secciones— y devuelve la elección entera");

  /* ── Lo guardado ──────────────────────────────────────────────────────── */

  const receta = (n: number) => ({
    titulo: `Receta ${n}`, descripcion: "d", rinde: "2", tiempo: "10 minutos", coccion: "Sin horno",
    ingredientes: [{ nombre: "harina", cantidad: "500 g" }, { nombre: "sal", cantidad: "" }],
    pasos: [{ titulo: "Uno", texto: "Mezclá todo." }, { titulo: "Dos", texto: "Cociná." }],
    tip: "", foto: "pan",
  });

  const dosGrupos = JSON.stringify([[receta(1), receta(2), receta(3)], [receta(4)]]);
  check("REC-G",
    leerGruposDeRecetas(dosGrupos).length === 2 &&
    todasLasRecetas(dosGrupos).length === 4 &&
    todasLasRecetas(dosGrupos)[3].titulo === "Receta 4",
    "las recetas se leen agrupadas por sección y se aplanan en orden");

  /* ⚠️ Un grupo vacío CORTA la lista. Si la sección 2 no tiene nada, la 3 no
     puede contar como escrita: el bucle tiene que volver a la 2, no saltearla
     y dejar un agujero adentro del recetario. */
  const conAgujero = JSON.stringify([[receta(1)], [], [receta(3)]]);
  check("REC-H", leerGruposDeRecetas(conAgujero).length === 1,
    "un grupo vacío corta la cuenta: el bucle vuelve a esa sección, no la saltea");

  check("REC-I",
    leerGruposDeRecetas("{roto").length === 0 &&
    leerGruposDeRecetas(null).length === 0 &&
    leerGruposDeRecetas(JSON.stringify([[{ titulo: "sin nada" }]])).length === 0,
    "un guardado roto, vacío o sin recetas de verdad devuelve una lista vacía");

  /* Y el limado de la sección: si el modelo manda tres cuando se pidió una,
     sobran dos adentro de algo que se vendió como de diez recetas. */
  check("REC-J",
    normalizarRecetas({ recetas: [receta(1), receta(2), receta(3)] }, 1).length === 1,
    "una sección que pidió una receta no guarda las tres que mandó el modelo");

  /* ── ⚠️ QUE NINGÚN PASO TERMINE A MITAD DE PALABRA ──────────────────────
     Pasó de verdad: la receta de medialunas del 07/09/26 decía "Repetí este
     doblado tres veces, enfriando 10 minutos en" y ahí se terminaba. Quien
     está amasando no tiene forma de saber qué venía, y ya está adentro de un
     archivo vendido. Ver `cortarEnUnaIdea`. */
  const conPunto = "Estirá la masa en un rectángulo. Untá la mitad con la manteca fría en trocitos, doblá y estirá de nuevo. Repetí este doblado tres veces, enfriando 10 minutos en la heladera.";
  const cortadoPunto = cortarEnUnaIdea(conPunto, 160) ?? "";
  check("REC-K",
    cortadoPunto.length <= 160 && cortadoPunto.endsWith("."),
    `un paso que se pasa se corta en el último punto y termina como una idea entera (${cortadoPunto.length} caracteres)`);

  /* Si no hay ningún punto cerca del final, al menos no corta una palabra al
     medio: puntos suspensivos, que se leen como recortado y no como un error. */
  const sinPunto = "palabra ".repeat(40).trim();
  const cortadoEspacio = cortarEnUnaIdea(sinPunto, 160) ?? "";
  check("REC-L",
    cortadoEspacio.endsWith("…") && !/\bpalabr…$/.test(cortadoEspacio),
    "sin un punto cerca, corta en un espacio y avisa con puntos suspensivos");

  check("REC-M",
    cortarEnUnaIdea("Corto.", 160) === "Corto." &&
    cortarEnUnaIdea("", 160) === null &&
    cortarEnUnaIdea(null, 160) === null,
    "un texto que entra queda intacto, y uno vacío devuelve null");

  /* Y el modelo tiene que SABER el largo: recortar es la red, no la solución.
     Sin esto en el prompt, cada receta larga llega para ser cortada. */
  check("REC-N",
    INSTRUCCIONES_RECETAS.includes(`${LARGO_PASO} caracteres`),
    "el prompt le dice al modelo cuántos caracteres entran en un paso");

  /* ⚠️ El prompt del temario del recetario ACLARA que la línea de la tapa no
     es una promesa de resultado. Sin esa aclaración se contradice con la regla
     de "nada de promesas" que está más abajo, y el modelo la deja vacía: pasó,
     y la tapa del recetario de prueba salió sin nada bajo el título. */
  check("REC-O",
    /no una promesa de resultado/.test(INSTRUCCIONES_INDICE_RECETARIO) &&
    /nunca la dejes vacía/.test(INSTRUCCIONES_INDICE_RECETARIO),
    "el temario del recetario aclara que la línea de la tapa sí va, y no se contradice");
}

/* ── La pantalla ────────────────────────────────────────────────────────── */

const ventana = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");
const lista = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
const pantalla = readFileSync("src/app/digitales/productos/page.tsx", "utf8");

/* El botón existe, está prendido y abre la ventana. */
check("PAN-A",
  /const IA_LISTA = true;/.test(lista) && /acc\.abrirEbook\(p\)/.test(lista),
  "el botón del ebook está prendido y abre la ventana");

/* ⚠️ Doble clic. Dos clics en el mismo cuadro leen los dos el estado viejo, así
   que el freno tiene que ser un ref y no un useState. */
check("PAN-B", /enVuelo = useRef\(false\)/.test(ventana) && /enVuelo\.current = true/.test(ventana),
  "el doble clic se frena con un ref, no con estado");

/* ⚠️ Y el bucle se corta cuando la ventana se cierra. Sin esto sigue pidiendo
   capítulos contra un componente que ya no existe — y cada pedido cuesta. */
check("PAN-C",
  /vivo = useRef\(true\)/.test(ventana) &&
  /useEffect\(\(\) => \(\) => \{ vivo\.current = false; \}, \[\]\)/.test(ventana) &&
  /if \(!vivo\.current\) return;/.test(ventana),
  "cerrar la ventana corta el bucle de capítulos");

/* ⚠️ EL ERROR FRENA EL BUCLE Y PONE UN BOTÓN. Un bucle que reintenta solo,
   contra un modelo que está teniendo un mal día, gasta diez veces sin que nadie
   mire. Seguir es decisión de la persona. */
check("PAN-D",
  /Seguir desde donde iba/.test(ventana) &&
  !/setTimeout\([^)]*seguir/.test(ventana),
  "un error frena el bucle y espera que la persona decida seguir");

/* ⚠️ EL AGUJERO QUE ESTE CHEQUEO CUIDA. El bucle no arranca solo al volver a
   una ventana dejada a medias —cada vuelta cuesta plata, así que seguir lo
   decide la persona—. Con el botón sólo cuando había error, volver con TODOS
   los capítulos escritos y el PDF sin armar dejaba la lista entera tildada y
   nada que apretar: el ebook pago quedaba a un paso del final, sin salida. */
check("PAN-P",
  /\{!trabajando && \(/.test(ventana) && /Armar el PDF/.test(ventana),
  "al volver a un ebook a medias siempre hay un botón para seguir");

/* ⚠️ LO MÁS IMPORTANTE QUE DICE ESTA PANTALLA, Y TIENE QUE DECIR LAS DOS COSAS.
   Hasta el 08/09/26 decía sólo la mitad linda —"podés cerrar, cuando vuelvas
   sigue desde donde iba"— y eso se lee como que sigue SOLO. No sigue: el bucle
   vive en la pantalla. Alguien se iba a otro panel creyendo que su ebook se
   estaba escribiendo y volvía media hora después al mismo lugar.
   Ahora tiene que decir que se frena Y que no se pierde nada. */
check("PAN-E",
  /la escritura se frena/.test(ventana) && /No se pierde nada/.test(ventana),
  "se avisa que irse frena la escritura, y que aun así no se pierde nada");

/* ⚠️ Y la barra cuenta con la palabra del formato. Decía "2 de 4" —secciones—
   a alguien que había elegido 10 recetas: el número que ve tiene que ser el
   que eligió, con su nombre al lado. */
check("PAN-E4",
  /\{escritos\} de \{total\} \{COMO_SE_LLAMA\[ebook\?\.opciones\.formato \?\? formato\]\.partes\}/.test(ventana),
  "la barra dice el número en la unidad que la persona eligió");

/* ⚠️ "REHACERLO" NO PUEDE OLVIDARSE DE LO QUE LA PERSONA ELIGIÓ.
   Ese botón devuelve a la pantalla del formulario, y los botones de formato,
   tema, color y cantidad arrancaban en lo de fábrica: quien había hecho un
   recetario de 30 recetas volvía a una pantalla que decía "Ebook de texto", y
   si apretaba sin mirar recibía OTRO PRODUCTO y una generación cobrada.
   Encontrado en el repaso del 08/09/26, antes de commitear. */
check("PAN-E5",
  /const elegidas = estadoInicial\?\.opciones \?\? OPCIONES_DE_FABRICA;/.test(ventana) &&
  /useState<FormatoDeEbook>\(elegidas\.formato\)/.test(ventana) &&
  /useState<number>\(elegidas\.recetas\)/.test(ventana),
  "al rehacer, los botones arrancan en lo que ya había elegido y no en lo de fábrica");

check("PAN-E2",
  /Seguir escribiendo/.test(ventana) && /sin gastar otra generación/.test(ventana),
  "y se dice con qué botón se retoma, sin gastar otra generación");

/* ⚠️ Y NO se promete el editor, que todavía no existe: acá decía "Vas a poder
   leerlo y cambiarlo antes de publicar" y hoy sólo se puede rehacer entero.
   Cuando el editor exista, esta prueba se da vuelta. */
check("PAN-E3",
  !/cambiarlo antes de publicar/.test(ventana),
  "no se promete un editor que todavía no está");

/* Reemplazar un archivo que la persona subió a mano sin avisarle es perderle el
   trabajo. Se avisa ANTES de apretar. */
check("PAN-F",
  /producto\.tieneArchivo && \(/.test(ventana) && /lo reemplaza/.test(ventana),
  "si ya hay un PDF cargado, se avisa antes de reemplazarlo");

/* La bolsa de bienvenida no vuelve nunca: cuando se empieza a gastar, se dice. */
check("PAN-G",
  /salioDe === "bienvenida"/.test(ventana) && /no se renuevan/.test(ventana),
  "se avisa cuando el ebook sale de la bolsa que no se renueva");

/* Y las dos bolsas se muestran separadas: con el total solo, alguien gasta su
   reserva permanente creyendo que se le renueva. */
check("PAN-H",
  /quedanDelMes/.test(ventana) && /quedanDeBienvenida/.test(ventana),
  "el cupo se muestra en sus dos bolsas, no como un total");

/* Free ve el botón —el archivo tiene dos caminos, no uno— pero apagado, y el
   cartel dice que es el plan y no una falla. */
check("PAN-I",
  /acc\.tier === "FREE"/.test(lista) && /viene desde el plan Starter/.test(lista),
  "en Free el botón se ve apagado y dice que es por el plan");

/* Un ebook a medio escribir se dice en la tarjeta: si hay que abrir algo para
   enterarse, nadie se entera. */
/* ⚠️ Y con la PALABRA de su formato: decía "4 de 10 capítulos" para un
   recetario, que no tiene capítulos. Un número con la palabra equivocada al
   lado hace dudar de todo lo demás que dice la pantalla. */
check("PAN-J",
  /a medio escribir/.test(lista) &&
  /p\.ebook\.escritos/.test(lista) &&
  /COMO_SE_LLAMA\[p\.ebook\.opciones\.formato\]/.test(lista),
  "la tarjeta dice si quedó a medio escribir, con el nombre que corresponde");

/* ⚠️ QUE LO LEA ANTES DE PUBLICAR. Lo que se vende lo firma quien vende:
   nosotros no podemos garantizar que un modelo no escribió una macana, y quien
   cobra es quien responde (art. 40 de la Ley 24.240). */
check("PAN-K",
  /Leelo antes de publicarlo/.test(ventana) && /quien vende es quien responde/.test(ventana),
  "se pide leerlo antes de publicar, y se dice de quién es la responsabilidad");

/* Los campos que se escriben a mano llevan tope, en el navegador y en el
   servidor. El del navegador es comodidad; el que manda es el otro. */
check("PAN-L",
  /maxLength=\{LARGO_TEMA\}/.test(ventana) &&
  /slice\(0, LARGO_TEMA\)/.test(ventana) &&
  /maxLength=\{LARGO_PUBLICO\}/.test(ventana),
  "los campos que se escriben tienen tope");

/* Y no se puede mandar con dos palabras: el mismo mínimo que aplica el
   servidor, leído de la misma constante. */
check("PAN-M",
  /tema\.trim\(\)\.length < MINIMO_TEMA/.test(ventana) && /disabled=\{trabajando \|\| temaCorto/.test(ventana),
  "no se puede pedir el ebook con dos palabras, y el mínimo es el del servidor");

/* ⚠️ El texto de los capítulos NO viaja al navegador. Son decenas de miles de
   caracteres por producto que la pantalla no muestra —muestra una barra— y que
   viajarían con cada dibujo de la lista. */
check("PAN-N",
  /estadoDelBorrador\(f\.ebookIA\)/.test(pantalla) && !/capitulos: f\.ebookIA/.test(pantalla),
  "la lista de productos no manda el texto de los capítulos al navegador");

/* El cupo de ebooks es una bolsa APARTE del de armar el embudo: gastar todas
   las páginas de venta no puede dejar a nadie sin poder escribir su ebook. */
check("PAN-O",
  /estadoDelCupo\(user\.id, tier, "EBOOK", enPrueba\)/.test(pantalla),
  "la pantalla lee el cupo de ebooks aparte, y con el mismo criterio de prueba que el servidor");

/* ⚠️ SIN ESTO NO SE PUEDE PRENDER NADA. Los botones de IA mandan el texto de la
   persona a un tercero, y eso hay que declararlo ANTES, no después. Estaba sin
   declarar hasta el 04/09/26, con los otros dos botones de IA ya andando. */
const privacidad = readFileSync("src/app/privacidad/page.tsx", "utf8");
const solapaDigital = privacidad.slice(
  privacidad.indexOf("  digital: {"), privacidad.indexOf("  buyer: {"));
check("PRI-A",
  /Anthropic/.test(solapaDigital) && /inteligencia artificial/.test(solapaDigital),
  "la política de privacidad de digitales declara quién procesa los textos");
check("PRI-B",
  /ni un solo dato de quien te compra/.test(solapaDigital),
  "y aclara que a la IA no le llega ningún dato de los compradores");

elPDF().then(() => {
  console.log(fallos === 0
    ? "\nok — el ebook se lima antes de venderse, y el PDF se arma igual"
    : `\nFALLA — ${fallos} chequeo(s) del ebook con IA`);
  process.exit(fallos === 0 ? 0 : 1);
});
