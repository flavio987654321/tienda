/**
 * Chequeos de la tapa como imagen.
 *
 *   npx tsx src/lib/tapa-imagen.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Esta imagen es la cara del producto.** Es lo que se ve en la página de
 * venta y en el enlace que se pega en WhatsApp o en Instagram, o sea lo primero
 * —y muchas veces lo único— que mira quien podría comprar. Una portada rota o
 * en blanco no es un detalle feo: es la venta que no pasa.
 *
 * **Y no puede llevarse puesto el archivo.** Se dibuja pegada al armado del
 * PDF, que es lo que la persona pagó. Ante cualquier problema tiene que
 * devolver `null` y dejar seguir.
 *
 * **Las letras tienen que dibujarse en el servidor, no sólo acá.** Es el riesgo
 * menos evidente: en una máquina con Windows sobran las tipografías, y en el
 * servidor donde esto corre puede no haber ninguna. Por eso se le pasa el
 * archivo `.ttf` y por eso hay un chequeo que mide que en la imagen haya tinta.
 */

import { readFileSync } from "fs";
import sharp from "sharp";
import { dibujarLaTapa, MEDIDAS_DE_LA_TAPA } from "./tapa-imagen";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const paleta = {
  tinta: "#1F1B16", acento: "#B45309", sobreAcento: "#FFFFFF", suave: "#6B6257",
  acentoOscuro: "#F59E0B", sobreAcentoOscuro: "#1F1B16",
};

const datos = {
  titulo: "Vendé tu conocimiento: de la idea al primer cobro",
  promesa: "Cómo pasar de tener algo para enseñar a la primera venta cobrada.",
  autor: "Taller de Flavia",
  cantidad: 6,
  palabra: ["CAPÍTULO", "CAPÍTULOS"] as [string, string],
  paleta,
};

/** Una foto de mentira, para no depender de internet en una prueba. */
async function fotoDePrueba(): Promise<Buffer> {
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: "#8899AA" },
  }).jpeg().toBuffer();
}

/**
 * Cuánta tinta hay en un pedazo de la hoja.
 *
 * ⚠️ EN UN PEDAZO, y no en la imagen entera. Medida sobre toda la tapa, esta
 * cuenta daba 344.000 con el dibujo de las letras APAGADO A PROPÓSITO: lo que
 * estaba contando era el bloque de color de la maqueta, no una sola letra. Un
 * chequeo que pasa con la función rota es peor que no tenerlo.
 *
 * Así que se mira sólo la franja de papel donde no hay más que texto, y se
 * toma como fondo el píxel de arriba a la izquierda de esa franja, que es
 * papel seguro.
 */
async function cuantaTinta(
  imagen: Buffer, desde: number, alto: number,
): Promise<number> {
  const { data, info } = await sharp(imagen)
    .extract({ left: 0, top: desde, width: MEDIDAS_DE_LA_TAPA.ancho, height: alto })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fondo = [data[0], data[1], data[2]];
  let distintos = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (Math.abs(data[i] - fondo[0]) > 24
      || Math.abs(data[i + 1] - fondo[1]) > 24
      || Math.abs(data[i + 2] - fondo[2]) > 24) distintos++;
  }
  return distintos;
}

async function laTapa() {
  const foto = await fotoDePrueba();

  /* ── Que salga, en las tres maquetas ─────────────────────────────────── */

  const clara = await dibujarLaTapa({ ...datos, foto, modo: "claro" });
  check("TAP-A", clara !== null, "la tapa clara con foto se dibuja");

  const oscura = await dibujarLaTapa({ ...datos, foto, modo: "oscuro" });
  check("TAP-B", oscura !== null, "la tapa oscura con foto se dibuja");

  const sinFoto = await dibujarLaTapa({ ...datos, foto: null, modo: "claro" });
  check("TAP-C", sinFoto !== null, "y la que no tiene foto también");

  if (!clara || !oscura || !sinFoto) {
    console.log("\nFALLA — sin tapa no se puede seguir chequeando");
    process.exit(1);
  }

  const medidas = await sharp(clara).metadata();
  check("TAP-D",
    medidas.width === MEDIDAS_DE_LA_TAPA.ancho && medidas.height === MEDIDAS_DE_LA_TAPA.alto,
    "sale del tamaño que declara, con la proporción de una A4");

  /* ⚠️ JPEG y no PNG. Con foto, el mismo dibujo en PNG pesa cuatro veces más y
     se ve igual — y esto viaja en cada visita a la página de venta. */
  check("TAP-E", medidas.format === "jpeg", "sale en JPEG");

  /* ⚠️ Y que pese lo que pesa una portada. Sin tope, una foto grande metida
     entera acá se convierte en medio mega colgado de la página de venta. */
  check("TAP-F", clara.length < 400_000,
    `pesa menos de 400 KB (${Math.round(clara.length / 1024)} KB)`);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ EL CHEQUEO QUE IMPORTA: QUE LAS LETRAS SE DIBUJEN
     ══════════════════════════════════════════════════════════════════════════

     Es el riesgo real de este archivo. Si la tipografía no se encuentra, sharp
     no tira: dibuja con lo que haya, y si no hay nada dibuja nada. La tapa
     saldría —del tamaño correcto, en JPEG, pesando bien— y sería un rectángulo
     de color liso. Todo lo de arriba pasaría en verde.

     Se mira la franja de papel de la tapa clara: abajo de la foto y arriba de
     la franja del autor. Ahí no hay ningún bloque de color — sólo el título,
     la rayita y la promesa. Sin letras, esa franja queda casi vacía. */
  const desde = Math.round(MEDIDAS_DE_LA_TAPA.alto * 0.55);
  const tinta = await cuantaTinta(clara, desde, Math.round(MEDIDAS_DE_LA_TAPA.alto * 0.35));
  check("TAP-G", tinta > 15_000,
    `las letras se dibujan de verdad (${tinta} píxeles con tinta)`);

  /* ── Lo que le puede llegar de una persona ───────────────────────────── */

  /* ⚠️ Un `&` en el título rompía el dibujo entero: Pango lee marcado, así que
     "Ventas & marketing" es XML inválido. No es un caso raro — es un ampersand
     en el nombre de un producto. */
  const conSignos = await dibujarLaTapa({
    ...datos, foto,
    titulo: "Ventas & marketing <sin vueltas>",
    promesa: "Con & y con <> adentro",
    modo: "claro",
  });
  check("TAP-H", conSignos !== null, "un título con & o con <> no rompe la tapa");

  /* ⚠️ Sharp TIRA si algo se compone fuera del borde, y el largo del título lo
     escribe una persona: un título de doce palabras empuja todo lo de abajo.
     Sin el filtro, eso no sería una tapa fea sino un armado que falla. */
  const larguisimo = await dibujarLaTapa({
    ...datos, foto, modo: "claro",
    titulo: "Cómo armar, escribir, corregir y vender tu primer producto digital sin tener "
      + "público, sin pagar publicidad, sin saber programar y sin gastar un peso en herramientas",
    promesa: "Una promesa larguísima que también ocupa varios renglones y empuja todo lo que "
      + "viene abajo, incluido el nombre de quien vende, que va contra el borde de la hoja.",
  });
  check("TAP-I", larguisimo !== null, "un título larguísimo no la hace fallar");

  /* Vacíos: un ebook sin promesa y sin autor existe —los guardados antes del
     07/09/26 no tienen promesa— y tiene que salir igual. */
  const pelado = await dibujarLaTapa({
    ...datos, foto: null, modo: "claro", promesa: "", autor: "", cantidad: 0,
  });
  check("TAP-J", pelado !== null, "sin promesa, sin autor y sin sello también sale");

  /* ⚠️ Y una foto que no es una foto. Llega de un banco ajeno: un archivo
     cortado a la mitad tiene que dar la tapa de color, no una excepción. */
  const rota = await dibujarLaTapa({
    ...datos, foto: Buffer.from("esto no es una imagen"), modo: "claro",
  });
  check("TAP-K", rota !== null, "una foto ilegible cae a la tapa de color");

  /* ── Que no se separe del PDF ni de quien la cuelga ──────────────────── */

  const fuente = readFileSync("src/lib/tapa-imagen.ts", "utf8");

  /* ⚠️ Los colores NO se escriben acá: salen de la misma función que usa el PDF
     y la vista previa. Copiados, la portada muestra un verde y el archivo sale
     con otro. */
  check("TAP-L",
    /coloresDelEbook\(d\.paleta, d\.modo\)/.test(fuente),
    "los colores salen de la misma función que el PDF");

  /* ⚠️ Y las tipografías van por archivo, no por nombre: es lo único que
     garantiza que el título se dibuje en un servidor sin fuentes instaladas. */
  check("TAP-M",
    /fontfile: rutaDeFuente\(o\.fuente\.archivo\)/.test(fuente)
    && /PlayfairDisplay-Bold\.ttf/.test(fuente),
    "las letras se piden por archivo y no por nombre de fuente");

  const config = readFileSync("next.config.ts", "utf8");
  check("TAP-N",
    /outputFileTracingIncludes/.test(config) && /\.\/fuentes\/\*\*/.test(config),
    "y esos archivos viajan con la función");

  const armar = readFileSync("src/app/api/digitales/ia/ebook/armar/route.ts", "utf8");

  /* ⚠️ Sólo donde no hay nada. Si la persona subió su portada, esa manda: esto
     llena un lugar vacío, no reemplaza una decisión. */
  check("TAP-O",
    /if \(!yaTienePortada\) \{/.test(armar)
    && /data: \{ images: JSON\.stringify\(\[donde\]\) \}/.test(armar),
    "el armado sólo la pone si el producto no tiene portada");

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ Y SE DIBUJA DESPUÉS DE QUE EL ARCHIVO YA QUEDÓ COLGADO DEL PRODUCTO
     ══════════════════════════════════════════════════════════════════════════

     Estuvo un día al revés: se dibujaba entre la subida del PDF y la
     transacción, y el `images` viajaba adentro de ella para que la portada y el
     archivo entraran juntos o no entrara ninguno.

     Estaba mal. Todo eso corre adentro de una función con techo de 60 segundos:
     un Supabase lento dibujando o subiendo una imagen se comía el tiempo que le
     faltaba al armado, y la función moría **con el PDF ya arriba y sin escribir
     la base**. El producto seguía entregando el archivo viejo y quedaba uno
     huérfano que pagamos igual.

     Una decoración no puede poner en riesgo lo que se vende. Encontrado en la
     auditoría del panel, un día después de haberlo escrito. */
  check("TAP-P",
    armar.indexOf("let portada: string | null = null") > armar.indexOf("prisma.$transaction("),
    "y se dibuja después de que el archivo ya quedó colgado del producto");

  /* ⚠️ Y las dos subidas que hace el armado tienen tiempo máximo. Sin él, un
     Supabase colgado no da error: se queda esperando hasta que matan la función,
     con el archivo a medio subir y la base sin escribir. Eran los únicos dos
     `fetch` a un tercero de este ecosistema sin plazo. */
  check("TAP-Q",
    /signal: AbortSignal\.timeout\(ESPERA\)/.test(
      readFileSync("src/lib/deposito-imagenes.ts", "utf8"))
    && /signal: AbortSignal\.timeout\(ESPERA_DE_SUBIDA\)/.test(
      readFileSync("src/lib/deposito-digital.ts", "utf8")),
    "las dos subidas del armado tienen tiempo máximo");

  /* Y sin pedirle nada más al banco de imágenes: usa la foto que el PDF ya bajó. */
  check("TAP-R",
    /foto: fotoTapa\?\.datos \?\? null/.test(armar),
    "usa la foto que el PDF ya bajó, sin pedir otra");

  /* ⚠️ El guardado es el MISMO que usa la subida del navegador. Dos copias del
     mismo guardado se separan solas: una arregla el `cache-control` y la otra
     no. Ver `deposito-imagenes`. */
  const subida = readFileSync("src/app/api/upload/route.ts", "utf8");
  check("TAP-S",
    /guardarImagen\(bytes, \{/.test(subida) && /from "@\/lib\/deposito-imagenes"/.test(armar),
    "la portada y la subida del navegador guardan por la misma puerta");

  console.log(fallos === 0
    ? "\nok — la tapa del ebook sale como imagen, con letras y sin llevarse el archivo"
    : `\nFALLA — ${fallos} chequeo(s) de la tapa`);
  process.exit(fallos === 0 ? 0 : 1);
}

void laTapa();
