/**
 * Chequeos del editor del texto escrito. Se corre con:
 *
 *   npx tsx src/lib/ebook-texto.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cuatro cosas, y las cuatro terminan adentro de un archivo que alguien vende:
 *
 * 1. **Que no se pueda guardar un capítulo que después desaparece solo.**
 *    `leerCapitulos` descarta el capítulo que tiene menos de `BLOQUES_MIN`
 *    pedazos. Guardarlo así no falla en ningún lado: el capítulo se pierde la
 *    próxima vez que se lee, todo lo de abajo se corre un lugar, y sale un PDF
 *    perfecto con el texto del 4 abajo del título del 3.
 *
 * 2. **Que lo que se guarda se pueda volver a leer igual.** Es la prueba de
 *    ida y vuelta: lo que sale de acá pasa por `JSON.stringify` y vuelve por
 *    `leerCapitulos`. Si el lector descarta algo que el editor dejó pasar, la
 *    cuenta cambia — y esa cuenta es la que dice cuántos capítulos hay.
 *
 * 3. **Que no se borre lo que se escribió mientras alguien corregía.** La
 *    cadena escribe del lado del servidor y no se frena porque haya un editor
 *    abierto. Lo que llega del navegador pisa los primeros; los de abajo se
 *    mantienen.
 *
 * 4. **Que nada se descarte en silencio.** `normalizarCapitulo` sí descarta, y
 *    ahí está bien: del otro lado hay un modelo. Acá del otro lado hay alguien
 *    que acaba de escribir eso a mano.
 */

import { readFileSync } from "fs";
import {
  revisarTexto, sePuedeEditarElTexto, COMO_SE_LLAMA_EL_BLOQUE,
  pegarLasFotos, pegarLaTapa,
  type LoQueHayEscrito,
} from "./ebook-texto";
import {
  BLOQUES_MIN, BLOQUES_MAX, LARGO_BLOQUE, LARGO_TITULO_CAPITULO,
  TIPOS_DE_BLOQUE, leerCapitulos,
  type Bloque, type CapituloEscrito,
} from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const bloque = (n: number): Bloque => ({ tipo: "parrafo", texto: `El párrafo número ${n}.` });
const bloques = (n: number) => Array.from({ length: n }, (_, i) => bloque(i + 1));

const cap = (n: number, cuantos = 5): CapituloEscrito => ({
  titulo: `Capítulo ${n}`,
  bloques: bloques(cuantos),
});
const lista = (n: number) => Array.from({ length: n }, (_, i) => cap(i + 1));

const hay = (cuantos: number): LoQueHayEscrito => ({ capitulos: lista(cuantos) });

/* ── Lo que anda ──────────────────────────────────────────────────────────── */

{
  const r = revisarTexto({ capitulos: lista(4) }, hay(4));
  check("TXT-A", r.ok && r.capitulos.length === 4,
    "cuatro capítulos escritos vuelven cuatro");
}

{
  /* El caso de todos los días: se corrige una palabra de un párrafo. */
  const mandado = lista(3);
  mandado[1].bloques[0] = { tipo: "parrafo", texto: "Esto lo corrigió una persona." };
  const r = revisarTexto({ capitulos: mandado }, hay(3));
  check("TXT-B", r.ok && r.capitulos[1].bloques[0].texto === "Esto lo corrigió una persona.",
    "la corrección de un párrafo se guarda tal cual");
}

{
  /* Los cuatro tipos entran, y ninguno se cambia por otro. */
  const uno = cap(1, BLOQUES_MIN);
  uno.bloques = TIPOS_DE_BLOQUE.map((t, i) => ({ tipo: t, texto: `Texto ${i + 1}` }));
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-C",
    r.ok && r.capitulos[0].bloques.map((b) => b.tipo).join(",") === TIPOS_DE_BLOQUE.join(","),
    "los cuatro tipos de pedazo entran sin cambiarse");
}

{
  /* El texto se lima: los caracteres de control no llegan a la base. */
  const uno = cap(1, BLOQUES_MIN);
  uno.bloques[0] = { tipo: "parrafo", texto: "  Con  basura\ny salto  " };
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-D", r.ok && r.capitulos[0].bloques[0].texto === "Con  basura y salto",
    "el texto pegado se lima antes de guardarse");
}

{
  /* Y se recorta al tope, en vez de rechazarse: pegar de más no es un error. */
  const uno = cap(1, BLOQUES_MIN);
  uno.bloques[0] = { tipo: "parrafo", texto: "x".repeat(LARGO_BLOQUE + 500) };
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-E", r.ok && r.capitulos[0].bloques[0].texto.length === LARGO_BLOQUE,
    "un pedazo más largo que el tope se recorta");

  const otro = cap(1, BLOQUES_MIN);
  otro.titulo = "y".repeat(LARGO_TITULO_CAPITULO + 50);
  const r2 = revisarTexto({ capitulos: [otro] }, hay(1));
  check("TXT-F", r2.ok && r2.capitulos[0].titulo.length === LARGO_TITULO_CAPITULO,
    "un título más largo que el tope se recorta");
}

/* ── 1. El capítulo que desaparece solo ───────────────────────────────────── */

{
  const uno = cap(1, BLOQUES_MIN - 1);
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-G", !r.ok && /pedazo/.test(r.ok ? "" : r.error),
    "un capítulo por debajo del mínimo de pedazos no se guarda");
}

{
  /* ⚠️ Y se mide sobre lo LIMADO: tres pedazos donde dos son espacios en blanco
     son uno para el lector, y el capítulo se perdería igual. */
  const uno: CapituloEscrito = {
    titulo: "Capítulo 1",
    bloques: [
      { tipo: "parrafo", texto: "Uno de verdad." },
      { tipo: "parrafo", texto: "   " },
      { tipo: "parrafo", texto: " " },
    ],
  };
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-H", !r.ok,
    "tres pedazos donde dos están vacíos no alcanzan: el lector cuenta uno");
}

{
  /* El pedazo vacío se AVISA, no se descarta callado. Ver el punto 4. */
  const uno = cap(1, BLOQUES_MIN + 2);
  uno.bloques[1] = { tipo: "parrafo", texto: "   " };
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-I", !r.ok && /vacío/i.test(r.ok ? "" : r.error),
    "un pedazo vacío se avisa aunque sobren pedazos, no se tira en silencio");
}

/* ── 2. Ida y vuelta: lo guardado se vuelve a leer igual ──────────────────── */

{
  const mandado = lista(6);
  mandado[0].bloques = TIPOS_DE_BLOQUE.map((t, i) => ({ tipo: t, texto: `Pedazo ${i + 1}` }));
  const r = revisarTexto({ capitulos: mandado }, hay(6));

  const devuelta = r.ok ? leerCapitulos(JSON.stringify(r.capitulos)) : [];
  check("TXT-J", r.ok && devuelta.length === r.capitulos.length,
    "lo que el editor deja guardar, el lector lo lee entero: ningún capítulo se pierde");
  check("TXT-K", r.ok && JSON.stringify(devuelta) === JSON.stringify(r.capitulos),
    "y lo lee IGUAL: ni un pedazo ni un tipo cambian al ir y volver");
}

/* ── 3. Lo que se escribió en el medio no se borra ────────────────────────── */

{
  /* Alguien abrió el editor con 4 capítulos y la cadena escribió el 5º
     mientras corregía. Manda 4; el 5º tiene que seguir estando. */
  const mandado = lista(4);
  mandado[0].bloques[0] = { tipo: "parrafo", texto: "Corregido." };
  const r = revisarTexto({ capitulos: mandado }, hay(5));

  check("TXT-L", r.ok && r.capitulos.length === 5,
    "el capítulo que se escribió mientras corregía no se borra");
  check("TXT-M", r.ok && r.capitulos[0].bloques[0].texto === "Corregido.",
    "y la corrección se guarda igual");
  check("TXT-N", r.ok && r.capitulos[4].titulo === "Capítulo 5",
    "el que se escribió en el medio queda tal como se escribió");
}

{
  /* Al revés no: mandar más capítulos de los que hay es una posición que el
     temario no tiene. */
  const r = revisarTexto({ capitulos: lista(7) }, hay(5));
  check("TXT-O", !r.ok, "no se pueden agregar capítulos desde el editor del texto");
}

/* ── 4. Nada se descarta en silencio ──────────────────────────────────────── */

{
  const uno = cap(1, BLOQUES_MIN);
  uno.titulo = "  ";
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-P", !r.ok && /título/i.test(r.ok ? "" : r.error),
    "un capítulo sin título se avisa con el motivo");
}

{
  const uno = cap(1, BLOQUES_MIN) as unknown as { bloques: unknown[] };
  uno.bloques = [{ tipo: "recuadrito", texto: "algo" }, bloque(1), bloque(2)];
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-Q", !r.ok,
    "un tipo de pedazo que no existe se rechaza, no se convierte en párrafo");
}

{
  const uno = cap(1, 1);
  uno.bloques = bloques(BLOQUES_MAX + 1);
  const r = revisarTexto({ capitulos: [uno] }, hay(1));
  check("TXT-R", !r.ok && new RegExp(String(BLOQUES_MAX)).test(r.ok ? "" : r.error),
    "pasarse del máximo de pedazos se avisa con el número");
}

{
  check("TXT-S", !revisarTexto(null, hay(1)).ok, "sin cuerpo no se guarda nada");
  check("TXT-T", !revisarTexto({}, hay(1)).ok, "sin lista de capítulos tampoco");
  check("TXT-U", !revisarTexto({ capitulos: [] }, hay(1)).ok, "con la lista vacía tampoco");
  check("TXT-V", !revisarTexto({ capitulos: [null] }, hay(1)).ok, "con un capítulo nulo tampoco");
}

/* ── En qué estados se puede ──────────────────────────────────────────────── */

{
  check("TXT-W",
    !sePuedeEditarElTexto("INDICE")
    && sePuedeEditarElTexto("ESCRIBIENDO")
    && sePuedeEditarElTexto("COMPLETO")
    && sePuedeEditarElTexto("LISTO")
    && sePuedeEditarElTexto("FALLADO"),
    "con el temario recién armado no hay nada que corregir; escrito sí, aunque se haya cortado");
}

/* ── La ruta y la pantalla ────────────────────────────────────────────────── */

{
  const ruta = readFileSync("src/app/api/digitales/ia/ebook/texto/route.ts", "utf8");

  /* ⚠️ El dueño adentro del `where`, en las DOS puntas — y las dos puntas ya no
     están en el mismo archivo: guardar es esta ruta, leer es la pantalla, que
     lee del lado del servidor. Acá adentro está el texto entero del ebook, que
     ES el producto que esa persona vende. */
  const pagina = readFileSync("src/app/digitales/productos/[id]/ebook/page.tsx", "utf8");
  const dueño = /store:\s*\{\s*ownerId:\s*user\.id\s*\}/;
  check("TXT-X", dueño.test(ruta) && dueño.test(pagina),
    "leer y guardar el texto piden que el producto sea de esta cuenta");

  /* Y la de bajar el archivo, que es la más cara de todas si se olvida: sin el
     dueño adentro del `where`, mandando el id de otro se baja gratis el
     producto que esa persona vende. */
  const bajar = readFileSync("src/app/api/digitales/productos/[id]/archivo/route.ts", "utf8");
  check("TXT-X2", dueño.test(bajar),
    "bajar el archivo propio pide que el producto sea de esta cuenta");

  /* El candado, y la relectura con el candado en la mano: `/paso` puede estar
     escribiendo el capítulo que sigue justo ahora. */
  /* ⚠️ `await tomarElCandado(` y no `tomarElCandado`: el nombre pelado aparece
     ANTES en la línea del import, así que la comparación daba que sí sin haber
     mirado nunca la llamada. Es el mismo error que ya se coló en PAD-H. */
  const tomaElCandado = ruta.indexOf("await tomarElCandado(");
  const releeLaFila = ruta.indexOf("await prisma.ebookIA.findUnique(");
  check("TXT-Y",
    tomaElCandado >= 0 && releeLaFila >= 0 && tomaElCandado < releeLaFila,
    "la ruta toma el candado y recién ahí lee lo que hay");

  check("TXT-Z",
    /where:\s*\{\s*id:\s*fresco\.id,\s*trabajandoDesde:\s*marca\s*\}/.test(ruta),
    "la ruta no pisa nada si perdió el candado mientras validaba");

  /* ⚠️ Que el estado BAJE de LISTO. El PDF colgado del producto es el de antes:
     dejarlo en LISTO diría que el archivo tiene los cambios, y no los tiene. */
  check("TXT-AA",
    /fresco\.estado === "LISTO" \? "COMPLETO" : fresco\.estado/.test(ruta),
    "guardar el texto baja el ebook de LISTO a COMPLETO: el PDF que hay es el viejo");

  /* Y que NO llame al modelo: corregir a mano no puede costar una generación.
     Se buscan FORMAS DE CÓDIGO —el paréntesis, el punto— y no las palabras
     sueltas: un comentario que explique por qué acá no se consume cupo haría
     fallar el chequeo sin que nada esté mal. */
  check("TXT-AB",
    !/consumirDelCupo\(|anthropic\.|pedirAlModelo\(/i.test(ruta),
    "corregir el texto no gasta cupo ni llama al modelo");

  const pantalla = readFileSync("src/app/digitales/productos/EbookTexto.tsx", "utf8");

  /* Que use LA MISMA función que el servidor para prender el botón. Dos copias
     de la regla se desincronizan de a una. */
  check("TXT-AC", /revisarTexto\(/.test(pantalla),
    "la pantalla decide con la misma función que el servidor, no con una copia");

  /* ⚠️ Que el botón de borrar se APAGUE en el mínimo, en vez de dejar borrar y
     avisar después. Es lo que impide llegar a un capítulo que desaparece. */
  check("TXT-AD",
    /disabled=\{guardando \|\| c\.bloques\.length <= BLOQUES_MIN\}/.test(pantalla),
    "no se puede borrar por debajo del mínimo: el botón se apaga solo");

  /* Y que se diga que el PDF se rehace. Guardar el texto no cambia el archivo:
     sin decirlo, alguien guarda, cierra y sigue entregando el de antes. */
  check("TXT-AE", /rehace el PDF/.test(pantalla),
    "la pantalla avisa que el archivo se rehace con los cambios");

  /* ⚠️ Que el texto NO viva adentro del editor. Si viviera, la vista previa de
     al lado se enteraría de los cambios recién al guardar — o sea, cuando ya no
     sirve mirarla. Es lo que hace que las dos columnas sirvan para algo. */
  check("TXT-AM",
    /onCapitulos\(/.test(pantalla) && !/useState<CapituloEscrito\[\]>/.test(pantalla),
    "el texto vive arriba del editor, así la vista previa lo ve mientras se escribe");

  const previa = readFileSync("src/app/digitales/productos/VistaPreviaEbook.tsx", "utf8");

  /* ⚠️ Y que la previa NO tenga los colores escritos a mano. Salen de la misma
     función que usa el PDF (`ebook-colores`): una copia se desincroniza de a
     una, y ahí la previa muestra un verde y el archivo sale con otro. */
  check("TXT-AN",
    /coloresDelEbook\(/.test(previa) && !/#[0-9a-fA-F]{6}/.test(previa),
    "la vista previa usa los colores del PDF, no una copia");

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ QUIEN DECLARA `container-type` NO PUEDE USAR `cqw`
     ══════════════════════════════════════════════════════════════════════════

     Estaban los dos en la misma regla y la previa salía con un zoom enorme:
     `1cqw` adentro del PROPIO contenedor no se puede medir contra sí mismo
     —sería circular— así que el navegador lo mide contra el ancestro que haya,
     y si no hay ninguno, contra la ventana. En una pantalla de 1920 px eso daba
     una letra de 37 px donde tenían que ser 9.

     Y no falla en ningún lado: se ve enorme y listo. Por eso hay un chequeo. */
  const reglas = previa.match(/\.[a-z-]+\s*\{[^}]*\}/g) ?? [];
  const laQueDeclara = reglas.filter((r) => r.includes("container-type"));
  check("TXT-AO",
    laQueDeclara.length > 0 && laQueDeclara.every((r) => !r.includes("cqw")),
    "el que declara el contenedor no se mide contra sí mismo: si no, la previa sale con zoom");

  /* Y que la previa muestre DÓNDE van las fotos. El PDF lleva una en la tapa y
     una por capítulo; sin los huecos, la previa muestra un ebook que no es el
     que sale, y esconde que la foto se busca con una frase que se puede
     cambiar en el temario. */
  check("TXT-AP",
    /HuecoDeFoto/.test(previa) && /fotos\[i\]/.test(previa),
    "la vista previa muestra dónde va cada foto y con qué se busca");

  const alrededor = readFileSync("src/app/digitales/productos/[id]/ebook/EditorClient.tsx", "utf8");

  /* Que se arme el PDF después de guardar, y no se deje para nunca.
     ⚠️ Los dos tienen que ESTAR: `indexOf` devuelve -1 cuando no encuentra, y
     -1 es menor que cualquier cosa — el chequeo daría que sí justo el día que
     alguien borre el guardado. */
  const guarda = alrededor.indexOf('pedir("/api/digitales/ia/ebook/texto"');
  const arma = alrededor.indexOf("datos.hayQueArmar === true");
  check("TXT-AF", guarda >= 0 && arma >= 0 && guarda < arma,
    "después de guardar el texto, la pantalla rehace el PDF");

  const tarjeta = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");

  /* Y que un recetario no ofrezca el botón: sus recetas son campos. */
  check("TXT-AG",
    /p\.ebook\.opciones\.formato !== "recetario"/.test(tarjeta),
    "el recetario no ofrece el editor del texto, que dibuja párrafos");

  /* ⚠️ Que se llegue por una DIRECCIÓN y no por un paso adentro del modal.
     Estuvo así un rato y estaba mal: un modal de 576 px es para decidir una
     cosa, no para corregir diez capítulos de novecientas palabras en una
     ventana que se cierra con un clic al costado. */
  const ventana = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");
  check("TXT-AK",
    !/paso === "texto"/.test(ventana) && /\/ebook`/.test(ventana),
    "el editor es una pantalla propia, no un paso adentro de la ventana");

  /* Y que desde la tarjeta se pueda BAJAR el archivo. Sin esto, el ebook que
     acaba de costar una generación es un renglón de texto gris: la única forma
     de ver el propio ebook era comprárselo. */
  check("TXT-AL",
    /\/api\/digitales\/productos\/\$\{p\.id\}\/archivo/.test(tarjeta),
    "la tarjeta deja bajar el archivo que se entrega");
}

/* ── La página para mirarlo ───────────────────────────────────────────────── */

{
  /* ⚠️ Que el ejemplo NO exista en producción, ni la tarjeta ni el editor. Es
     un producto inventado: no muestra datos de nadie, pero una tarjeta falsa
     arriba de los productos de verdad de alguien sería lo peor que puede pasar
     en esta pantalla. Los dos candados son una línea cada uno. */
  const paginaDelEbook = readFileSync("src/app/digitales/productos/[id]/ebook/page.tsx", "utf8");
  check("TXT-AI",
    /process\.env\.NODE_ENV === "development" && id === ID_DEL_EJEMPLO/.test(paginaDelEbook),
    "el editor de ejemplo sólo se abre en desarrollo");

  const lista = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
  check("TXT-AJ",
    /process\.env\.NODE_ENV === "development" && \(/.test(lista)
    && /PRODUCTO_DE_EJEMPLO/.test(lista),
    "la tarjeta de ejemplo sólo se dibuja en desarrollo");

  /* Y que el ejemplo no le pegue a la base con un id que no existe. */
  const alrededorDelEditor = readFileSync(
    "src/app/digitales/productos/[id]/ebook/EditorClient.tsx", "utf8");
  check("TXT-AJ2",
    alrededorDelEditor.indexOf("if (deMentira)") <
      alrededorDelEditor.indexOf('pedir("/api/digitales/ia/ebook/texto"'),
    "el ejemplo se corta antes de guardar: no le pega a la base");
}

/* ── Los nombres ──────────────────────────────────────────────────────────── */

{
  check("TXT-AH",
    TIPOS_DE_BLOQUE.every((t) => (COMO_SE_LLAMA_EL_BLOQUE[t]?.nombre ?? "").length > 0),
    "cada tipo de pedazo tiene un nombre en castellano para mostrar");
}

/* ── Las fotos ────────────────────────────────────────────────────────────── */

{
  const indice = [
    { titulo: 'Uno', resumen: 'De qué va.', foto: 'una escena', fotoElegida: null },
    { titulo: 'Dos', resumen: 'De qué va.', foto: 'otra escena', fotoElegida: null },
  ];
  const buena = {
    id: '123', url: 'https://images.pexels.com/photos/1/x.jpg',
    fotografo: 'Alguien', enlace: 'https://www.pexels.com/photo/1/',
  };

  const r = pegarLasFotos({ fotos: [{ frase: 'cambiada', elegida: buena }, null] }, indice);
  check('TXT-AQ', r[0].foto === 'cambiada' && r[0].fotoElegida?.id === '123',
    'la foto elegida y su frase se guardan');
  check('TXT-AR', r[1].foto === 'otra escena',
    'el capítulo del que no se dijo nada queda como estaba');

  /* ⚠️ Lo que NO puede pasar: que por la puerta de las fotos se reescriba el
     temario. El resumen es lo único que se lee para escribir un capítulo. */
  const r2 = pegarLasFotos(
    { fotos: [{ frase: 'x', elegida: null, resumen: 'PISADO', titulo: 'PISADO' }] },
    indice,
  );
  check('TXT-AS', r2[0].resumen === 'De qué va.' && r2[0].titulo === 'Uno',
    'por las fotos no se puede reescribir el temario');

  /* Y que una dirección que no es del banco no entre: el servidor la baja. */
  const mala = { ...buena, url: 'http://10.0.0.1/interno.jpg' };
  const r3 = pegarLasFotos({ fotos: [{ frase: 'x', elegida: mala }] }, indice);
  check('TXT-AT', r3[0].fotoElegida === null,
    'una dirección que no es del banco de imágenes se descarta');

  const r4 = pegarLasFotos({ fotos: [{ frase: 'x', elegida: { ...buena, fotografo: '' } }] }, indice);
  check('TXT-AU', r4[0].fotoElegida === null,
    'una foto sin autor se descarta: ese nombre es la licencia');

  /* ── La foto propia ────────────────────────────────────────────────────
     Cambia dos reglas: no lleva créditos —no hay a quién acreditar— y su
     dirección tiene que ser de NUESTRO depósito, no del banco. */
  const propia = { id: 'propia:x', url: '/uploads/abc.jpg', fotografo: '', enlace: '', propia: true };
  const rp = pegarLasFotos({ fotos: [{ frase: 'x', elegida: propia }] }, indice);
  check('TXT-BA', rp[0].fotoElegida?.propia === true && rp[0].fotoElegida?.url === '/uploads/abc.jpg',
    'una foto propia entra sin autor: no va a la hoja de créditos');

  /* ⚠️ Pero su dirección tampoco puede ser cualquiera: la baja el servidor. */
  const rq = pegarLasFotos(
    { fotos: [{ frase: 'x', elegida: { ...propia, url: 'http://10.0.0.1/interno.jpg' } }] },
    indice,
  );
  check('TXT-BB', rq[0].fotoElegida === null,
    'una foto "propia" apuntando a otro lado se descarta igual');

  const rr = pegarLasFotos(
    { fotos: [{ frase: 'x', elegida: { ...propia, url: '/uploads/../../etc/passwd' } }] },
    indice,
  );
  check('TXT-BC', rr[0].fotoElegida === null,
    'y una que se quiere salir de la carpeta, tampoco');

  /* Sin la marca `propia`, la misma dirección NO entra: sería una foto del
     banco sin autor y sin enlace. */
  const rs = pegarLasFotos(
    { fotos: [{ frase: 'x', elegida: { ...propia, propia: false } }] },
    indice,
  );
  check('TXT-BD', rs[0].fotoElegida === null,
    'sin la marca de propia, una foto sin autor no entra por la puerta del banco');

  /* La tapa: sin decir nada, queda la que había. */
  const hayTapa = { frase: 'algo', elegida: null };
  check('TXT-AV', pegarLaTapa({}, hayTapa).frase === 'algo',
    'guardar el texto sin hablar de la tapa no borra la tapa');
  check('TXT-AW', pegarLaTapa({ tapa: { frase: 'nueva', elegida: buena } }, hayTapa).elegida?.id === '123',
    'la foto de la tapa se guarda');

  /* Y que el armado la use: sin esto, elegirla no cambiaría el archivo. */
  const armado = readFileSync('src/app/api/digitales/ia/ebook/armar/route.ts', 'utf8');
  check('TXT-AX',
    /bajarElegida\(/.test(armado) && /leerFotoDeTapa\(/.test(armado),
    'el armado usa la foto elegida en vez de buscar otra');

  /* ⚠️ Y que las otras dos rutas que reescriben el índice NO borren la tapa:
     vive en la raíz de ese JSON, al lado de la promesa y las opciones. */
  const temario = readFileSync('src/app/api/digitales/ia/ebook/indice/route.ts', 'utf8');
  check('TXT-AY', /tapa: leerFotoDeTapa\(/.test(temario),
    'corregir el temario no borra la foto de la tapa');
  check('TXT-AZ', /fotoElegida: leerFotoElegida\(/.test(readFileSync('src/lib/ebook-temario.ts', 'utf8')),
    'corregir el temario no borra las fotos elegidas de los capítulos');
}

console.log(fallos === 0
  ? "\nok — ningún capítulo se pierde, lo escrito en el medio no se borra y nada se descarta callado"
  : `\nFALLA — ${fallos} chequeo(s) del editor del texto`);
process.exit(fallos === 0 ? 0 : 1);
