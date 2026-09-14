/**
 * Chequeos del editor de las láminas. Se corre con:
 *
 *   npx tsx src/lib/infografia-texto.check.ts
 *
 * Lo mismo que en `recetario-texto.check`: pasarse de la raya hace desaparecer
 * una LÁMINA entera, y una lámina es una hoja de un producto que se vendió
 * diciendo cuántas trae. `normalizarLaminas` —el lector— descarta la lámina
 * completa, sin decir nada, cuando le falta el título o el texto.
 *
 * Las cuatro cosas que se prueban:
 *
 *   1. Que no se pueda guardar una lámina que después desaparece sola.
 *   2. Que lo que se guarda se pueda volver a leer IGUAL — la ida y vuelta
 *      contra el lector de verdad.
 *   3. Que no se borre lo que la cadena escribió mientras alguien corregía.
 *   4. Que no se pueda cambiar el PRODUCTO: ni una lámina más, ni una menos.
 */

import { readFileSync } from "fs";
import { revisarLaminas, fotosDeLasLaminas } from "./infografia-texto";
import {
  leerGruposDeLaminas, PUNTOS_MAX, LARGO_TITULO_LAMINA, LARGO_TEXTO_LAMINA, LARGO_PUNTO,
  type Lamina,
} from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const lamina = (n: number): Lamina => ({
  titulo: `Lámina ${n}: una idea que se entiende sola`,
  texto: "Dos frases que la explican. Y qué hacer con ella, dicho corto.",
  puntos: ["Un ejemplo concreto", "Un sí / no"],
  foto: "regadera sobre plantas al sol",
  fotoElegida: null,
});

/* Dos secciones, como las guarda la cadena: cinco y una. */
const grupos = (): Lamina[][] => [[lamina(1), lamina(2), lamina(3), lamina(4), lamina(5)], [lamina(6)]];
const hay = () => ({ grupos: grupos() });

/* ── 1. Lo que se puede guardar ─────────────────────────────────────────── */

{
  const r = revisarLaminas({ laminas: grupos() }, hay());
  check("INF-A", r.ok && r.grupos.flat().length === 6,
    "seis láminas bien formadas se guardan enteras");
}

{
  const mandado = grupos();
  mandado[0][1].texto = "Un texto corregido a mano.";
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-B", r.ok && r.grupos[0][1].texto === "Un texto corregido a mano.",
    "una corrección del texto llega tal cual");
}

{
  /* Sin datos vale: el lector no descarta una lámina por eso. */
  const mandado = grupos();
  mandado[0][0].puntos = [];
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-C", r.ok && r.grupos[0][0].puntos.length === 0,
    "una lámina sin datos se guarda igual");
}

{
  /* Y los datos vacíos se limpian, no se cuentan. */
  const mandado = grupos();
  mandado[0][0].puntos = ["", "  ", "Uno de verdad"];
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-D", r.ok && r.grupos[0][0].puntos.length === 1,
    "los datos vacíos no cuentan: tres renglones en blanco son cero datos");
}

/* ── ⚠️ Lo que desaparecería en silencio ──────────────────────────────────── */

{
  const mandado = grupos();
  mandado[0][2].titulo = "";
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-E", !r.ok && /título/i.test(r.ok ? "" : r.error) && /lámina 3/i.test(r.ok ? "" : r.error),
    "sin título no se guarda, y el aviso dice cuál");
}

{
  const mandado = grupos();
  mandado[0][0].titulo = "X";
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-F", !r.ok, "un título de una sola letra tampoco alcanza");
}

{
  const mandado = grupos();
  mandado[1][0].texto = "   ";
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-G", !r.ok && /texto/i.test(r.ok ? "" : r.error),
    "sin texto no se guarda: la lámina entera desaparecería");
}

/* ── 2. La ida y vuelta contra el lector de verdad ──────────────────────── */

{
  const mandado = grupos();
  mandado[0][0].titulo = "  Con espacios de más  ";
  mandado[0][0].puntos = ["a".repeat(LARGO_PUNTO + 40), "b", "c", "d"];
  const r = revisarLaminas({ laminas: mandado }, hay());
  const devuelta = r.ok ? leerGruposDeLaminas(JSON.stringify(r.grupos)) : [];
  check("INF-H", r.ok && devuelta.flat().length === r.grupos.flat().length,
    "lo que el editor deja guardar, el lector lo lee entero: ninguna lámina se pierde");
  check("INF-I", r.ok && JSON.stringify(devuelta) === JSON.stringify(r.grupos),
    "y lo lee IGUAL: el editor lima con las mismas reglas que el lector");
  check("INF-J", r.ok && devuelta[0][0].puntos.length === PUNTOS_MAX
    && devuelta[0][0].puntos[0].length <= LARGO_PUNTO,
    "los datos de más se cortan al tope y cada uno a su largo");
}

{
  /* Los topes son los del molde: lo que se pase se recorta, en una idea. */
  const mandado = grupos();
  mandado[0][0].titulo = "Una idea. " + "palabra ".repeat(30);
  mandado[0][0].texto = "Frase corta. ".repeat(50);
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-K", r.ok
    && r.grupos[0][0].titulo.length <= LARGO_TITULO_LAMINA
    && r.grupos[0][0].texto.length <= LARGO_TEXTO_LAMINA
    && r.grupos[0][0].texto.endsWith("."),
    "un título o un texto que se pasa se recorta al tope, terminando en una idea");
}

{
  /* La foto elegida sobrevive a la ida y vuelta; sin esto el armado buscaría
     otra en cada PDF que se rehace. */
  const mandado = grupos();
  mandado[0][0].fotoElegida = {
    id: "123", url: "https://images.pexels.com/photos/123/riego.jpeg",
    fotografo: "Alguien", enlace: "https://www.pexels.com/photo/123/",
  };
  const r = revisarLaminas({ laminas: mandado }, hay());
  const devuelta = r.ok ? leerGruposDeLaminas(JSON.stringify(r.grupos)) : [];
  check("INF-L", r.ok && devuelta[0][0].fotoElegida?.id === "123",
    "la foto elegida a mano sobrevive al guardado y a la relectura");
}

{
  /* Y se puede SACAR: `null` queda en null, sin caer a la vieja. */
  const conFoto = grupos();
  conFoto[0][0].fotoElegida = {
    id: "123", url: "https://images.pexels.com/photos/123/riego.jpeg",
    fotografo: "Alguien", enlace: "https://www.pexels.com/photo/123/",
  };
  const mandado = grupos();
  mandado[0][0].fotoElegida = null;
  const r = revisarLaminas({ laminas: mandado }, { grupos: conFoto });
  check("INF-M", r.ok && r.grupos[0][0].fotoElegida === null,
    "y se puede sacar: no se cae a la que estaba antes");
}

{
  const mandado = grupos();
  (mandado[0][0] as unknown as Record<string, unknown>).fotoElegida = {
    id: "1", url: "http://192.168.0.1/interna.jpg", fotografo: "x", enlace: "http://192.168.0.1/",
  };
  const r = revisarLaminas({ laminas: mandado }, hay());
  check("INF-N", r.ok && r.grupos[0][0].fotoElegida === null,
    "una dirección de foto que no es del banco no se guarda");
}

/* ── 3. Lo que se escribió en el medio no se borra ────────────────────────── */

{
  const conTres = [...grupos(), [lamina(7), lamina(8)]];
  const mandado = grupos();
  mandado[0][0].titulo = "Corregida";
  const r = revisarLaminas({ laminas: mandado }, { grupos: conTres });
  check("INF-O", r.ok && r.grupos.length === 3 && r.grupos[0][0].titulo === "Corregida"
    && r.grupos[2][0].titulo === lamina(7).titulo,
    "lo corregido pisa lo suyo y la sección que se escribió mientras tanto sigue estando");
}

/* ── 4. No se puede cambiar el producto ─────────────────────────────────── */

{
  const r = revisarLaminas({ laminas: [...grupos(), [lamina(9)]] }, hay());
  check("INF-P", !r.ok, "no se pueden agregar secciones desde el editor");
}

{
  const menos = grupos();
  menos[0].pop();
  const r = revisarLaminas({ laminas: menos }, hay());
  const mas = grupos();
  mas[1].push(lamina(10));
  const r2 = revisarLaminas({ laminas: mas }, hay());
  check("INF-Q", !r.ok && /cantidad/i.test(r.ok ? "" : r.error) && !r2.ok,
    "ni una lámina menos ni una más por sección: el número es lo que se vendió");
}

/* ── Lo que llega roto ────────────────────────────────────────────────────── */

check("INF-R",
  !revisarLaminas(null, hay()).ok
  && !revisarLaminas({}, hay()).ok
  && !revisarLaminas({ laminas: "no" }, hay()).ok
  && !revisarLaminas({ laminas: [null] }, hay()).ok,
  "lo que no tiene forma de láminas se rechaza sin tirar");

{
  const f = fotosDeLasLaminas(grupos());
  check("INF-S", f.length === 6 && f[0].frase === "regadera sobre plantas al sol",
    "las fotos salen todas seguidas, en el orden en que se ven");
}

/* ── Que las tres puntas usen las mismas reglas ───────────────────────────── */

{
  const ruta = readFileSync("src/app/api/digitales/ia/ebook/texto/route.ts", "utf8");
  check("INF-T",
    /revisarLaminas\(body, hay\)/.test(ruta)
    && /const esInfografia = opciones\.formato === "infografia"/.test(ruta),
    "la ruta que guarda atiende la infografía con las reglas de su lector");

  const editor = readFileSync("src/app/digitales/productos/InfografiaTexto.tsx", "utf8");
  check("INF-U",
    /import \{ revisarLaminas \} from "@\/lib\/infografia-texto"/.test(editor)
    && /revisarLaminas\(\{ laminas \}, \{ grupos: guardadas \}\)/.test(editor),
    "la pantalla revisa con LA MISMA función que el servidor");

  /* Cada campo con su contador a la vista: los topes son del molde y lo que
     se pase se corta en el archivo. */
  check("INF-V",
    /contador\(l\.titulo\.length, LARGO_TITULO_LAMINA\)/.test(editor)
    && /contador\(l\.texto\.length, LARGO_TEXTO_LAMINA\)/.test(editor)
    && /contador\(punto\.length, LARGO_PUNTO\)/.test(editor),
    "el título, el texto y cada dato muestran cuánto queda de su tope");

  const cliente = readFileSync("src/app/digitales/productos/[id]/ebook/EditorClient.tsx", "utf8");
  check("INF-W",
    /esInfografia \? \(\s*<InfografiaTexto/.test(cliente)
    && /esInfografia \? \(\s*<VistaPreviaInfografia/.test(cliente)
    && /\{ laminas: conFotos \}/.test(cliente),
    "el editor dibuja el de láminas y su previa, y guarda con las fotos pegadas");

  const pagina = readFileSync("src/app/digitales/productos/[id]/ebook/page.tsx", "utf8");
  check("INF-X",
    /laminas=\{esInfografia \? gruposDeLaminas : undefined\}/.test(pagina)
    && /fotosDeLasLaminas\(gruposDeLaminas\)/.test(pagina),
    "la pantalla del editor le pasa las láminas y sus fotos");
}

console.log(fallos === 0
  ? "\nok — ninguna lámina se pierde, y la infografía que se vendió es la que se entrega"
  : `\nFALLA — ${fallos} chequeo(s) del editor de láminas`);
process.exit(fallos === 0 ? 0 : 1);
