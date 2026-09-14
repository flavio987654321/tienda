/**
 * Chequeos del editor del temario. Se corre con:
 *
 *   npx tsx src/lib/ebook-temario.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Tres cosas, y las tres terminan adentro de un archivo que alguien vende:
 *
 * 1. **Que lo ya escrito no se pueda mover.** El capítulo escrito Nº 3 es el de
 *    la entrada Nº 3 por su posición y por nada más. Correrla deja el texto de
 *    uno abajo del título de otro, y eso **no falla**: sale un PDF perfecto que
 *    dice cualquier cosa. Es el peor error posible en esta pantalla.
 *
 * 2. **Que un recetario no cambie de tamaño.** Sus secciones son el reparto de
 *    las recetas que la persona eligió y pagó. Sacar una de un recetario de 30
 *    entrega 27 con "30 RECETAS" en la tapa.
 *
 * 3. **Que nada se descarte en silencio.** `normalizarIndice` sí descarta, y
 *    ahí está bien: del otro lado hay un modelo. Acá del otro lado hay alguien
 *    que acaba de escribir eso a mano.
 */

import { readFileSync } from "fs";
import { revisarTemario, sePuedeEditarElTemario, type LoQueHay } from "./ebook-temario";
import {
  CAPITULOS_MIN, CAPITULOS_MAX,
  LARGO_TITULO_CAPITULO, LARGO_RESUMEN_CAPITULO,
  type CapituloPlaneado,
} from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const cap = (n: number): CapituloPlaneado => ({
  titulo: `Capítulo ${n}`,
  resumen: `De qué se trata el capítulo ${n}, en dos renglones.`,
  foto: `escena ${n}`,
});
const lista = (n: number) => Array.from({ length: n }, (_, i) => cap(i + 1));

const hayTexto = (cuantos: number, escritos = 0): LoQueHay => ({
  capitulos: lista(cuantos),
  escritos,
  porSecciones: false,
});

/** El temario tal como lo manda la pantalla. */
const mandar = (capitulos: unknown[], titulo = "Un ebook de prueba", promesa = "Una promesa.") =>
  ({ titulo, promesa, capitulos });

/* ── Lo que anda ──────────────────────────────────────────────────────────── */

{
  const r = revisarTemario(mandar(lista(6)), hayTexto(6));
  check("TEM-A",
    r.ok && r.temario.capitulos.length === 6 && r.temario.titulo === "Un ebook de prueba",
    "un temario válido pasa tal cual");

  /* La foto puede faltar: quien la busca cae al título, que es lo que se hacía
     antes de que el campo existiera. Tumbar un capítulo por una foto sería
     tirar un ebook entero por una foto. */
  const sinFoto = lista(6).map((c) => ({ titulo: c.titulo, resumen: c.resumen }));
  const s = revisarTemario(mandar(sinFoto), hayTexto(6));
  check("TEM-B", s.ok && s.temario.capitulos.every((c) => c.foto === ""),
    "un capítulo sin foto entra igual, con la foto vacía");

  /* La promesa es de la tapa y puede quedar vacía: la tapa se las arregla con
     el resumen del primero, que es lo que hacía antes de que existiera. */
  const sinPromesa = revisarTemario(mandar(lista(6), "Un ebook", ""), hayTexto(6));
  check("TEM-C", sinPromesa.ok && sinPromesa.temario.promesa === "",
    "la promesa puede quedar vacía");
}

/* ── ⚠️ LO ESCRITO NO SE TOCA ─────────────────────────────────────────────── */

{
  const hay = hayTexto(6, 2);

  /* Se manda el capítulo 1 cambiado. Tiene que volver el GUARDADO: el prefijo
     sale de la base, no de lo que llegó, así que ni un pedido hecho a mano
     puede correr las posiciones. */
  const pisado = [
    { titulo: "PISADO", resumen: "otra cosa", foto: "otra" },
    { titulo: "PISADO 2", resumen: "otra cosa", foto: "otra" },
    ...lista(6).slice(2),
  ];
  const r = revisarTemario(mandar(pisado), hay);
  check("TEM-D",
    r.ok
    && r.temario.capitulos[0].titulo === "Capítulo 1"
    && r.temario.capitulos[1].titulo === "Capítulo 2"
    && r.temario.capitulos[2].titulo === "Capítulo 3",
    "lo que ya está escrito vuelve como está guardado, aunque manden otra cosa");

  /* Y NO SE PUEDE BORRAR. Con menos entradas que capítulos escritos, el
     capítulo 2 escrito quedaría bajo el título del 3. */
  const cortado = revisarTemario(mandar(lista(1)), hay);
  check("TEM-E", !cortado.ok && /no se pueden borrar/i.test(cortado.error),
    "borrar un capítulo ya escrito se rechaza, con el motivo escrito");

  /* Sin capítulos escritos sí se puede reordenar todo. */
  const alReves = revisarTemario(mandar(lista(6).reverse()), hayTexto(6));
  check("TEM-F", alReves.ok && alReves.temario.capitulos[0].titulo === "Capítulo 6",
    "con nada escrito todavía, el orden se puede cambiar entero");
}

/* ── El recetario no cambia de tamaño ─────────────────────────────────────── */

{
  const hay: LoQueHay = { capitulos: lista(4), escritos: 0, porSecciones: true };

  const menos = revisarTemario(mandar(lista(3)), hay);
  const mas = revisarTemario(mandar(lista(5)), hay);
  check("TEM-G", !menos.ok && !mas.ok,
    "un recetario no puede agregar ni quitar secciones: son las de las recetas que pagó");

  /* Pero renombrarlas sí, que es para lo que sirve el editor. */
  const renombrado = lista(4).map((c, i) => ({ ...c, titulo: `Postres ${i + 1}` }));
  const r = revisarTemario(mandar(renombrado), hay);
  check("TEM-H", r.ok && r.temario.capitulos[0].titulo === "Postres 1",
    "las secciones de un recetario sí se pueden renombrar");

  /* ⚠️ Y con cuatro secciones, un recetario no cae en el mínimo de un ebook de
     texto. Sin la rama del recetario, `CAPITULOS_MIN` rechazaría un recetario
     de 10 recetas —que son 4 secciones— sin que nadie entienda por qué. */
  check("TEM-I", CAPITULOS_MIN > 4 ? r.ok : true,
    "un recetario chico no se choca contra el mínimo de capítulos de un ebook de texto");
}

/* ── Cuántos capítulos puede tener un ebook de texto ──────────────────────── */

{
  const pocos = revisarTemario(mandar(lista(CAPITULOS_MIN - 1)), hayTexto(CAPITULOS_MIN - 1));
  check("TEM-J", !pocos.ok && pocos.error.includes(String(CAPITULOS_MIN)),
    `menos de ${CAPITULOS_MIN} capítulos se rechaza, y el mensaje dice cuántos hacen falta`);

  /* ⚠️ SE RECHAZA, NO SE CORTA. Cortar dejaría a alguien mirando un temario de
     doce y recibiendo un ebook de diez, sin que nada lo avise. */
  const muchos = revisarTemario(mandar(lista(CAPITULOS_MAX + 2)), hayTexto(CAPITULOS_MAX));
  check("TEM-K", !muchos.ok,
    `más de ${CAPITULOS_MAX} capítulos se rechaza en vez de cortarse en silencio`);

  const justos = revisarTemario(mandar(lista(CAPITULOS_MAX)), hayTexto(CAPITULOS_MAX));
  check("TEM-L", justos.ok, `${CAPITULOS_MAX} capítulos, que es el tope, entran`);
}

/* ── Nada se descarta en silencio ─────────────────────────────────────────── */

{
  /* Sin resumen, ese capítulo se escribiría a ciegas sobre un título: el
     resumen es lo ÚNICO que lee el modelo cuando escribe el capítulo. */
  const sinResumen = lista(6);
  sinResumen[3] = { ...sinResumen[3], resumen: "   " };
  const r = revisarTemario(mandar(sinResumen), hayTexto(6));
  check("TEM-M", !r.ok && r.error.includes("4"),
    "un capítulo sin resumen se rechaza, y el mensaje dice cuál es");

  const sinTitulo = lista(6);
  sinTitulo[1] = { ...sinTitulo[1], titulo: "" };
  const t = revisarTemario(mandar(sinTitulo), hayTexto(6));
  check("TEM-N", !t.ok && t.error.includes("2"),
    "un capítulo sin título se rechaza, y el mensaje dice cuál es");

  const sinTituloDelEbook = revisarTemario(mandar(lista(6), " "), hayTexto(6));
  check("TEM-O", !sinTituloDelEbook.ok, "el ebook sin título se rechaza");

  /* Dos capítulos iguales se leen como un error de imprenta, y se escriben —y
     se pagan— dos veces. ⚠️ Y se compara sin importar mayúsculas. */
  const repetidos = lista(6);
  repetidos[4] = { ...repetidos[4], titulo: "CAPÍTULO 3" };
  const d = revisarTemario(mandar(repetidos), hayTexto(6));
  check("TEM-P", !d.ok && /mismo título/i.test(d.error),
    "dos capítulos con el mismo título se rechazan, aunque cambien las mayúsculas");

  /* ⚠️ Y contra lo YA ESCRITO también: el repetido puede estar en el prefijo,
     que la pantalla no deja editar y por eso es fácil de olvidar. */
  const contraEscrito = [...lista(2), { titulo: "capítulo 1", resumen: "algo", foto: "" }, ...lista(6).slice(3)];
  const e = revisarTemario(mandar(contraEscrito), hayTexto(6, 2));
  check("TEM-Q", !e.ok && /mismo título/i.test(e.error),
    "un título repetido contra un capítulo ya escrito también se rechaza");
}

/* ── El texto que llega de afuera ─────────────────────────────────────────── */

{
  /* Los caracteres de control no los escribe nadie a mano: llegan pegados. Un
     salto de línea adentro de un título se arrastra al PDF y a la base. */
  const sucio = lista(6);
  sucio[0] = { ...sucio[0], titulo: "Con\nun\tsalto" };
  const r = revisarTemario(mandar(sucio), hayTexto(6));
  check("TEM-R", r.ok && !/[\n\t]/.test(r.temario.capitulos[0].titulo),
    "los caracteres de control se limpian antes de guardar");

  const largo = lista(6);
  largo[0] = { ...largo[0], titulo: "a".repeat(LARGO_TITULO_CAPITULO + 80), resumen: "b".repeat(LARGO_RESUMEN_CAPITULO + 200) };
  const l = revisarTemario(mandar(largo), hayTexto(6));
  check("TEM-S",
    l.ok
    && l.temario.capitulos[0].titulo.length === LARGO_TITULO_CAPITULO
    && l.temario.capitulos[0].resumen.length === LARGO_RESUMEN_CAPITULO,
    "un título o un resumen larguísimos se recortan a su tope");

  /* Nada de esto puede tirar una excepción: corre en una ruta. */
  const basura: unknown[] = [null, undefined, 0, "hola", [], { titulo: 5 }, { capitulos: "no" }];
  const todasCaen = basura.every((x) => {
    try { return revisarTemario(x, hayTexto(6)).ok === false; } catch { return false; }
  });
  check("TEM-T", todasCaen, "cualquier basura se rechaza con un motivo, sin romper");
}

/* ── En qué estados se puede editar ───────────────────────────────────────── */

{
  check("TEM-U",
    sePuedeEditarElTemario("ESCRIBIENDO") && sePuedeEditarElTemario("FALLADO"),
    "mientras se escribe, el temario se puede corregir");

  /* ⚠️ EL QUE IMPORTA. Con todo escrito el temario ya no dirige nada: los
     títulos del PDF salen de cada capítulo escrito. Dejarlo editar sería dar la
     sensación de estar arreglando un archivo que sale igual — y en LISTO, un
     archivo que además ya se puede haber vendido. */
  check("TEM-V",
    !sePuedeEditarElTemario("COMPLETO") && !sePuedeEditarElTemario("LISTO"),
    "con el ebook ya escrito o ya armado, el temario no se edita");
}

/* ── Que las puntas estén conectadas ──────────────────────────────────────── */

{
  const ruta = readFileSync("src/app/api/digitales/ia/ebook/indice/route.ts", "utf8");

  /* ⚠️ EL MÁS IMPORTANTE DE ESTE BLOQUE. Las opciones —formato y cuántas
     recetas— viven adentro del MISMO JSON que el temario. Reescribirlo sin
     leerlas las borraría: un recetario de 30 volvería a ser un ebook de texto
     en el medio de la escritura. Y tomarlas del cuerpo dejaría cambiar por acá
     lo que se cobró. */
  check("TEM-W",
    /leerOpciones\(fresco\.indice\)/.test(ruta) && !/normalizarOpciones\(body/.test(ruta),
    "la ruta guarda las opciones que ya estaban, y no las que manda el navegador");

  /* El candado, y la relectura CON el candado en la mano: entre el primer
     SELECT y el candado puede haberse escrito un capítulo, y ese ya no se toca. */
  check("TEM-X",
    /tomarElCandado/.test(ruta) && /const fresco = await prisma\.ebookIA\.findUnique/.test(ruta),
    "la ruta toma el candado y recién ahí lee lo que hay");

  /* Y guarda pidiendo que el candado siga siendo nuestro. */
  check("TEM-Y",
    /where:\s*\{\s*id:\s*fresco\.id,\s*trabajandoDesde:\s*marca\s*\}/.test(ruta),
    "la ruta no pisa nada si perdió el candado mientras validaba");

  /* El dueño adentro del `where`, en las dos puntas de la ruta. */
  const dueños = ruta.match(/store:\s*\{\s*ownerId:\s*user\.id\s*\}/g) ?? [];
  check("TEM-Z", dueños.length >= 2,
    "leer y guardar el temario piden que el producto sea de esta cuenta");

  const pantalla = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");

  /* ⚠️ Que la pantalla FRENE. Sin esto el editor existe y no lo ve nadie: se
     arman diez capítulos sobre un temario que nadie leyó. */
  check("TEM-AA", /setPaso\("revisar"\)/.test(pantalla),
    "la pantalla frena en el temario en vez de arrancar a escribir sola");

  /* Y que use LA MISMA función que el servidor para prender el botón. Dos
     copias de la regla se desincronizan de a una, y la que queda vieja es la
     que nadie mira. */
  check("TEM-AB", /revisarTemario\(/.test(pantalla) && /sePuedeEditarElTemario\(/.test(pantalla),
    "la pantalla decide con la misma función que el servidor, no con una copia");
}

console.log(fallos === 0
  ? "\nok — lo escrito no se mueve, el recetario no cambia de tamaño y nada se descarta callado"
  : `\nFALLA — ${fallos} chequeo(s) del editor del temario`);
process.exit(fallos === 0 ? 0 : 1);
