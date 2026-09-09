/**
 * Chequeos del editor de las recetas. Se corre con:
 *
 *   npx tsx src/lib/recetario-texto.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lo mismo que en `ebook-texto`, con una diferencia que lo hace peor: en un
 * ebook de texto, pasarse de la raya hace desaparecer un CAPÍTULO. Acá hace
 * desaparecer una RECETA entera, y una receta es una hoja de un producto que se
 * vendió diciendo cuántas trae.
 *
 * `normalizarRecetas` —el lector— descarta la receta completa, sin decir nada,
 * cuando le falta el título, cuando tiene menos de dos ingredientes o cuando
 * tiene menos de dos pasos. Guardar así no falla en ningún lado: se pierde en la
 * próxima lectura, todas las de abajo se corren un lugar, y **el recetario de
 * treinta entrega veintinueve**.
 *
 * Las cuatro cosas que se prueban:
 *
 *   1. Que no se pueda guardar una receta que después desaparece sola.
 *   2. Que lo que se guarda se pueda volver a leer IGUAL — la prueba de ida y
 *      vuelta contra el lector de verdad.
 *   3. Que no se borre lo que la cadena escribió mientras alguien corregía.
 *   4. Que no se pueda cambiar el PRODUCTO: ni una receta más, ni una menos.
 */

import { readFileSync } from "fs";
import {
  revisarRecetas, fotosDeLasRecetas, sePuedenEditarLasRecetas,
  INGREDIENTES_MIN, PASOS_MIN,
} from "./recetario-texto";
import {
  leerGruposDeRecetas, INGREDIENTES_MAX, PASOS_MAX, LARGO_PASO, LARGO_CAMPO_CORTO,
  type Receta,
} from "./ebook-ia";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const receta = (n: number): Receta => ({
  titulo: `Receta ${n}`,
  descripcion: "Una línea que dice de qué se trata.",
  rinde: "12 porciones",
  tiempo: "45 minutos",
  coccion: "165 °C",
  ingredientes: [
    { nombre: "harina", cantidad: "500 g" },
    { nombre: "sal", cantidad: "" },
    { nombre: "levadura", cantidad: "10 g" },
  ],
  pasos: [
    { titulo: "Mezclar", texto: "Juntar todo en un bol y amasar diez minutos." },
    { titulo: "Levar", texto: "Tapar y esperar una hora en un lugar templado." },
  ],
  tip: "Si la masa se pega, un poco más de harina y listo.",
  foto: "pan recién horneado sobre una tabla",
  fotoElegida: null,
});

/** Dos secciones: tres recetas y dos. Así se guarda de verdad. */
const grupos = (): Receta[][] => [
  [receta(1), receta(2), receta(3)],
  [receta(4), receta(5)],
];
const hay = () => ({ grupos: grupos() });

/* ── Lo que anda ──────────────────────────────────────────────────────────── */

{
  const r = revisarRecetas({ recetas: grupos() }, hay());
  check("REC-A", r.ok && r.grupos.flat().length === 5,
    "cinco recetas en dos secciones vuelven cinco");
}

{
  /* El caso de todos los días: se corrige una cantidad. */
  const mandado = grupos();
  mandado[0][1].ingredientes[0] = { nombre: "harina", cantidad: "450 g" };
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-B", r.ok && r.grupos[0][1].ingredientes[0].cantidad === "450 g",
    "corregir una cantidad se guarda tal cual");
}

{
  /* ⚠️ La cantidad SÍ puede quedar vacía: "sal a gusto" no lleva número, y el
     lector la acepta así. Rechazarla sería obligar a inventar un número. */
  const mandado = grupos();
  mandado[0][0].ingredientes[1] = { nombre: "sal", cantidad: "" };
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-C", r.ok && r.grupos[0][0].ingredientes[1].nombre === "sal",
    "un ingrediente sin cantidad entra igual");
}

{
  /* Y el título del paso también puede faltar: el molde lo numera igual. */
  const mandado = grupos();
  mandado[0][0].pasos[0] = { titulo: "", texto: "Hacer lo que dice acá." };
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-D", r.ok && r.grupos[0][0].pasos[0].titulo === "",
    "un paso sin nombre entra igual");
}

{
  /* Lo que se pega se lima y se recorta, en vez de rechazarse. */
  const mandado = grupos();
  mandado[0][0].pasos[0] = { titulo: "x".repeat(LARGO_CAMPO_CORTO + 30), texto: "y".repeat(LARGO_PASO + 500) };
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-E",
    r.ok
    && r.grupos[0][0].pasos[0].titulo.length === LARGO_CAMPO_CORTO
    && r.grupos[0][0].pasos[0].texto.length <= LARGO_PASO,
    "lo que se pega de más se recorta, no se rechaza");
}

/* ── 1. La receta que desaparece sola ─────────────────────────────────────── */

{
  const mandado = grupos();
  mandado[0][0].titulo = "";
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-F", !r.ok && /título/i.test(r.ok ? "" : r.error),
    "una receta sin título no se guarda: desaparecería entera");
}

{
  /* Una sola letra tampoco: el lector pide dos. */
  const mandado = grupos();
  mandado[0][0].titulo = "A";
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-G", !r.ok, "un título de una sola letra tampoco alcanza");
}

{
  const mandado = grupos();
  mandado[1][0].ingredientes = [{ nombre: "harina", cantidad: "500 g" }];
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-H", !r.ok && /ingrediente/i.test(r.ok ? "" : r.error),
    `una receta con menos de ${INGREDIENTES_MIN} ingredientes no se guarda`);
}

{
  const mandado = grupos();
  mandado[1][0].pasos = [{ titulo: "Uno", texto: "Hacer una sola cosa." }];
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-I", !r.ok && /paso/i.test(r.ok ? "" : r.error),
    `una receta con menos de ${PASOS_MIN} pasos no se guarda`);
}

{
  /* ⚠️ Y se cuenta sobre lo LIMPIO. Tres ingredientes donde dos están vacíos son
     uno para el lector, y la receta se perdería igual. Es el mismo error que ya
     se había cometido con los pedazos de un capítulo. */
  const mandado = grupos();
  mandado[0][2].ingredientes = [
    { nombre: "harina", cantidad: "500 g" },
    { nombre: "   ", cantidad: "2" },
    { nombre: "", cantidad: "" },
  ];
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-J", !r.ok,
    "tres ingredientes donde dos están vacíos no alcanzan: el lector cuenta uno");
}

{
  /* Lo mismo con los pasos. */
  const mandado = grupos();
  mandado[0][2].pasos = [
    { titulo: "Uno", texto: "Hacer algo." },
    { titulo: "Dos", texto: "   " },
  ];
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-K", !r.ok, "y dos pasos donde uno está vacío tampoco");
}

{
  /* El aviso dice CUÁL receta, contando desde la primera del recetario y no
     desde la primera de su sección: es el número que se ve en pantalla. */
  const mandado = grupos();
  mandado[1][1].titulo = "";
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-L", !r.ok && /receta 5/i.test(r.ok ? "" : r.error),
    "el aviso numera la receta como se ve en pantalla, no dentro de su sección");
}

/* ── 2. Ida y vuelta contra el lector de verdad ───────────────────────────── */

{
  const r = revisarRecetas({ recetas: grupos() }, hay());
  const devuelta = r.ok ? leerGruposDeRecetas(JSON.stringify(r.grupos)) : [];

  check("REC-M", r.ok && devuelta.flat().length === r.grupos.flat().length,
    "lo que el editor deja guardar, el lector lo lee entero: ninguna receta se pierde");
  check("REC-N", r.ok && JSON.stringify(devuelta) === JSON.stringify(r.grupos),
    "y lo lee IGUAL: ni un ingrediente ni un paso cambian al ir y volver");
  check("REC-O", r.ok && devuelta.length === 2 && devuelta[0].length === 3,
    "y las secciones se mantienen: cada una es una llamada al modelo ya cobrada");
}

{
  /* ⚠️ La foto elegida sobrevive a la ida y vuelta. Sin esto, el armado la
     buscaría de nuevo en cada PDF que se rehace y las fotos cambiarían solas —
     que es exactamente el bug que se arregló en los capítulos de texto. */
  const mandado = grupos();
  mandado[0][0].fotoElegida = {
    id: "123",
    url: "https://images.pexels.com/photos/123/pan.jpeg",
    fotografo: "Alguien",
    enlace: "https://www.pexels.com/photo/123/",
  };
  const r = revisarRecetas({ recetas: mandado }, hay());
  const devuelta = r.ok ? leerGruposDeRecetas(JSON.stringify(r.grupos)) : [];
  check("REC-P",
    r.ok && devuelta[0][0].fotoElegida?.id === "123",
    "la foto elegida a mano sobrevive al guardado y a la relectura");
}

{
  /* Y se puede SACAR: `null` tiene que quedar en null, sin caer a la vieja. */
  const conFoto = grupos();
  conFoto[0][0].fotoElegida = {
    id: "123", url: "https://images.pexels.com/photos/123/pan.jpeg",
    fotografo: "Alguien", enlace: "https://www.pexels.com/photo/123/",
  };
  const mandado = grupos();
  mandado[0][0].fotoElegida = null;
  const r = revisarRecetas({ recetas: mandado }, { grupos: conFoto });
  check("REC-Q", r.ok && r.grupos[0][0].fotoElegida === null,
    "y se puede sacar: no se cae a la que estaba antes");
}

{
  /* ⚠️ Una dirección que no es del banco ni nuestra se descarta. Es la misma
     guarda de siempre: esa dirección la baja NUESTRO servidor al armar el PDF. */
  const mandado = grupos();
  (mandado[0][0] as unknown as Record<string, unknown>).fotoElegida = {
    id: "1", url: "http://192.168.0.1/interna.jpg",
    fotografo: "x", enlace: "http://192.168.0.1/",
  };
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-R", r.ok && r.grupos[0][0].fotoElegida === null,
    "una dirección de foto que no es del banco no se guarda");
}

/* ── 3. Lo que se escribió en el medio no se borra ────────────────────────── */

{
  /* Alguien abrió el editor con dos secciones y la cadena escribió la tercera
     mientras corregía. Manda dos; la tercera tiene que seguir estando. */
  const conTres = [...grupos(), [receta(6), receta(7)]];
  const mandado = grupos();
  mandado[0][0].titulo = "Corregida";
  const r = revisarRecetas({ recetas: mandado }, { grupos: conTres });

  check("REC-S", r.ok && r.grupos.length === 3,
    "la sección que se escribió mientras corregía no se borra");
  check("REC-T", r.ok && r.grupos[0][0].titulo === "Corregida",
    "y la corrección se guarda igual");
  check("REC-U", r.ok && r.grupos[2][0].titulo === "Receta 6",
    "la que se escribió en el medio queda tal como se escribió");
}

/* ── 4. No se puede cambiar el producto ───────────────────────────────────── */

{
  const r = revisarRecetas({ recetas: [...grupos(), [receta(9)]] }, hay());
  check("REC-V", !r.ok, "no se pueden agregar secciones desde el editor");
}

{
  /* ⚠️ El número de recetas es lo que se eligió antes de generar, lo que va en
     la tapa —"30 RECETAS"— y lo que justifica el precio. Que se pueda corregir
     el texto no quiere decir que se pueda cambiar el producto. */
  const menos = grupos();
  menos[0] = menos[0].slice(0, 2);
  const r = revisarRecetas({ recetas: menos }, hay());
  check("REC-W", !r.ok && /cantidad/i.test(r.ok ? "" : r.error),
    "ni borrar una receta: el número va en la tapa y justifica el precio");

  const mas = grupos();
  mas[0] = [...mas[0], receta(8)];
  const r2 = revisarRecetas({ recetas: mas }, hay());
  check("REC-X", !r2.ok, "ni agregar una");
}

{
  /* Los topes de cada receta son los que hacen que entre en su hoja. */
  const mandado = grupos();
  mandado[0][0].ingredientes = Array.from({ length: INGREDIENTES_MAX + 5 }, (_, i) => ({
    nombre: `cosa ${i + 1}`, cantidad: "1",
  }));
  const r = revisarRecetas({ recetas: mandado }, hay());
  check("REC-Y", r.ok && r.grupos[0][0].ingredientes.length === INGREDIENTES_MAX,
    `no entran más de ${INGREDIENTES_MAX} ingredientes: una hoja no es elástica`);

  const otro = grupos();
  otro[0][0].pasos = Array.from({ length: PASOS_MAX + 4 }, (_, i) => ({
    titulo: `Paso ${i + 1}`, texto: "Hacer una cosa por vez.",
  }));
  const r2 = revisarRecetas({ recetas: otro }, hay());
  check("REC-Z", r2.ok && r2.grupos[0][0].pasos.length === PASOS_MAX,
    `ni más de ${PASOS_MAX} pasos`);
}

/* ── Lo que llega roto ────────────────────────────────────────────────────── */

check("REC-AA",
  !revisarRecetas(null, hay()).ok
  && !revisarRecetas({}, hay()).ok
  && !revisarRecetas({ recetas: "no" }, hay()).ok
  && !revisarRecetas({ recetas: [null] }, hay()).ok,
  "lo que no tiene forma de recetas se rechaza sin tirar");

check("REC-AB",
  sePuedenEditarLasRecetas("COMPLETO") && sePuedenEditarLasRecetas("LISTO")
  && !sePuedenEditarLasRecetas("INDICE"),
  "se corrige desde que hay algo escrito, no antes");

{
  const f = fotosDeLasRecetas(grupos());
  check("REC-AC", f.length === 5 && f[0].frase === "pan recién horneado sobre una tabla",
    "las fotos salen todas seguidas, en el orden en que se ven");
}

/* ── Que las tres puntas usen las mismas reglas ───────────────────────────── */

{
  const ruta = readFileSync("src/app/api/digitales/ia/ebook/texto/route.ts", "utf8");

  /* ⚠️ La ruta RECHAZABA los recetarios. Si esa línea vuelve, el botón queda
     ofreciendo algo que del otro lado contesta que no. */
  check("REC-AD",
    /revisarRecetas\(body, hay\)/.test(ruta)
    && !/todavía no se corrige a mano/.test(ruta),
    "la ruta que guarda atiende los dos formatos");

  /* ⚠️ Y cada uno se lima con las reglas de SU lector: un recetario por
     `revisarRecetas` y un ebook de texto por `revisarTexto`. */
  check("REC-AE",
    /const esRecetario = opciones\.formato === "recetario"/.test(ruta)
    && /revisarTexto\(body, hay\)/.test(ruta),
    "y cada formato se lima con las reglas del suyo");

  /* El candado, la relectura fresca y el estado son los mismos para los dos:
     son las partes donde equivocarse borra algo que se pagó. */
  check("REC-AF",
    ruta.indexOf("await tomarElCandado(") < ruta.indexOf("const esRecetario")
    && /where: \{ id: fresco\.id, trabajandoDesde: marca \}/.test(ruta),
    "los dos pasan por el mismo candado y por la misma escritura");

  const armado = readFileSync("src/app/api/digitales/ia/ebook/armar/route.ts", "utf8");
  check("REC-AG",
    /recetas\.map\(\(r\) => r\.fotoElegida \?\? null\)/.test(armado),
    "el armado usa la foto elegida de cada receta en vez de buscar otra");
}

console.log(fallos === 0
  ? "\nok — ninguna receta se pierde, y el recetario que se vendió es el que se entrega"
  : `\nFALLA — ${fallos} chequeo(s) del editor de recetas`);
process.exit(fallos === 0 ? 0 : 1);
