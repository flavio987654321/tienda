/**
 * Chequeos de cómo quiere que salga su ebook. Se corre con:
 *
 *   npx tsx src/lib/ebook-opciones.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Dos cosas, y las dos terminan adentro de un archivo que alguien vende:
 *
 * 1. **Que una preferencia mal escrita no corte una generación.** Todo lo raro
 *    cae a lo de fábrica. Rechazar el pedido porque llegó `tema: "violeta"`
 *    sería no entregarle el ebook por un color.
 *
 * 2. **Que no entre un color que no sea de las seis paletas.** Cada paleta trae
 *    el acento Y el texto que va encima, medidos entre sí. Un color libre deja
 *    una franja ilegible en algo ya vendido, y eso no se arregla después.
 */

import { readFileSync } from "fs";
import {
  FORMATOS, FORMATOS_LISTOS, TEMAS, OPCIONES_DE_FABRICA,
  RECETAS_OPCIONES, RECETAS_DE_FABRICA,
  normalizarOpciones, leerOpciones,
} from "./ebook-opciones";
import {
  CAPITULOS_MAX, RECETAS_POR_LLAMADA, seccionesParaRecetas, recetasDeLaSeccion,
} from "./ebook-ia";
import { PALETAS } from "./pagina-venta";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── Lo que llega del navegador ───────────────────────────────────────────── */

{
  /* El formato se toma del primero que SÍ se puede escribir, no de uno escrito
     a mano: así esta prueba sigue diciendo la verdad cuando el recetario entre
     en `FORMATOS_LISTOS`. */
  const listo = FORMATOS_LISTOS[0];
  const buenas = normalizarOpciones({ formato: listo, tema: "oscuro", paleta: "verde" });
  check("OPC-A",
    buenas.formato === listo && buenas.tema === "oscuro" && buenas.paleta === "verde",
    "una elección válida pasa tal cual");

  /* ⚠️ Nada de esto puede tirar una excepción ni devolver algo raro: corre en
     el camino de generar un ebook. */
  const basura = [null, undefined, 0, "hola", [], { formato: 5 }, { tema: { a: 1 } }];
  const todasCaen = basura.every((x) => {
    const o = normalizarOpciones(x);
    return o.formato === OPCIONES_DE_FABRICA.formato
      && o.tema === OPCIONES_DE_FABRICA.tema
      && o.paleta === "";
  });
  check("OPC-B", todasCaen, "cualquier basura cae a lo de fábrica, sin romper");

  /* ⚠️ EL MÁS IMPORTANTE DE TODO EL ARCHIVO. Un formato que el modelo todavía
     no sabe escribir NO puede entrar, ni siquiera por un pedido hecho a mano
     salteando la pantalla: se cobraría la generación y se entregaría un ebook
     de otra clase. */
  const noListos = FORMATOS.filter((f) => !FORMATOS_LISTOS.includes(f));
  check("OPC-N",
    noListos.every((f) => normalizarOpciones({ formato: f }).formato === "texto"),
    noListos.length > 0
      ? `los formatos que todavía no se pueden escribir (${noListos.join(", ")}) se bajan a texto`
      : "todos los formatos del catálogo se pueden escribir");

  /* Y la pantalla los tiene que apagar, no sólo el servidor: un botón que se
     puede apretar y no hace lo que dice es peor que un botón apagado. */
  const pantallaFormatos = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");
  check("OPC-O",
    noListos.length === 0 || /FORMATOS_LISTOS\.includes\(f\)/.test(pantallaFormatos),
    "la pantalla apaga los formatos que todavía no están");

  check("OPC-C",
    normalizarOpciones({ formato: "novela", tema: "neon" }).formato === "texto" &&
    normalizarOpciones({ formato: "novela", tema: "neon" }).tema === "claro",
    "un formato o un tema inventados caen a los de fábrica");

  /* ⚠️ EL QUE IMPORTA DE VERDAD. Un color que no está en `PALETAS` no puede
     entrar: sus cuatro colores no están medidos entre sí y la franja del pie
     puede quedar con texto ilegible encima. */
  const inventados = ["#ff0000", "rojo", "amarillo-fluor", "naranja ", "NARANJA"];
  check("OPC-D", inventados.every((c) => normalizarOpciones({ paleta: c }).paleta === ""),
    "un color que no es una de las 6 paletas se descarta, no se aproxima");

  check("OPC-E", PALETAS.every((p) => normalizarOpciones({ paleta: p.clave }).paleta === p.clave),
    "las 6 paletas de verdad sí entran");

  /* Vacío NO es la primera paleta: significa "seguir a la página de venta". */
  check("OPC-F", normalizarOpciones({ paleta: "" }).paleta === "",
    "vacío se queda vacío: es 'la de tu página', no la primera");

  /* ── Cuántas recetas ──────────────────────────────────────────────────── */

  check("OPC-Q",
    RECETAS_OPCIONES.every((n) => normalizarOpciones({ recetas: n }).recetas === n),
    "las tres cantidades de recetas entran tal cual");

  /* ⚠️ No se aproxima al más cercano. Un "25" no es una preferencia mal
     escrita: cada llamada escribe `RECETAS_POR_LLAMADA` y el temario no pasa
     de `CAPITULOS_MAX` secciones, así que hay números que el sistema no puede
     cumplir. Redondear sería entregar 24 o 27 cobrando lo que se pidió. */
  const raras = [0, 7, 25, 31, 100, -10, 1.5, "20", null, NaN, Infinity];
  check("OPC-R",
    raras.every((x) => normalizarOpciones({ recetas: x }).recetas === RECETAS_DE_FABRICA),
    "una cantidad que no es una de las tres cae a la de fábrica, no se redondea");

  /* ⚠️ EL QUE ATA LOS TRES NÚMEROS. `RECETAS_OPCIONES` no se puede tocar sola:
     el tope de arriba tiene que caer justo en `CAPITULOS_MAX` secciones. Con
     40 recetas el temario pediría 14 y `leerIndice` cortaría las últimas
     cuatro **sin decir nada** — se cobraría un recetario de 40 y saldría uno
     de 30. */
  check("OPC-S",
    RECETAS_OPCIONES.every((n) => seccionesParaRecetas(n) <= CAPITULOS_MAX),
    `ninguna cantidad pide más de ${CAPITULOS_MAX} secciones (el tope del temario)`);

  /* Y que las secciones sumen EXACTAMENTE lo que se eligió: si la última
     pidiera tres igual, un recetario de 10 saldría con 12. */
  check("OPC-T",
    RECETAS_OPCIONES.every((n) => {
      const secciones = seccionesParaRecetas(n);
      let suma = 0;
      for (let i = 1; i <= secciones; i++) suma += recetasDeLaSeccion(n, i);
      return suma === n;
    }),
    "las secciones suman exactamente las recetas elegidas, ni una más");

  check("OPC-U",
    RECETAS_OPCIONES.every((n) => {
      const secciones = seccionesParaRecetas(n);
      for (let i = 1; i <= secciones; i++) {
        const cuantas = recetasDeLaSeccion(n, i);
        if (cuantas < 1 || cuantas > RECETAS_POR_LLAMADA) return false;
      }
      return true;
    }),
    "ninguna sección queda vacía ni pide más de las que entran en una llamada");
}

/* ── Lo guardado ──────────────────────────────────────────────────────────── */

{
  /* Tal como lo escribe la ruta del temario. */
  const guardado = JSON.stringify({
    promesa: "una promesa",
    capitulos: [{ titulo: "Uno", resumen: "algo", foto: "una foto" }],
    opciones: { formato: FORMATOS_LISTOS[0], tema: "oscuro", paleta: "azul" },
  });
  const leidas = leerOpciones(guardado);
  check("OPC-G",
    leidas.formato === FORMATOS_LISTOS[0] && leidas.tema === "oscuro" && leidas.paleta === "azul",
    "la elección sobrevive la ida y vuelta a la base");

  /* ⚠️ Y AL LEER TAMBIÉN se baja el formato que ya no se puede escribir. Hace
     falta además de al guardar: si un formato se sacara de `FORMATOS_LISTOS`
     —porque se rompió— los ebooks que ya lo tenían guardado seguirían pidiendo
     un molde que no se puede llenar. */
  const conNoListo = JSON.stringify({
    promesa: "p", capitulos: [], opciones: { formato: "recetario", tema: "claro", paleta: "" },
  });
  check("OPC-P",
    FORMATOS_LISTOS.includes("recetario") || leerOpciones(conNoListo).formato === "texto",
    "un formato guardado que hoy no se puede escribir se lee como texto");

  /* ⚠️ Un ebook guardado antes de que esto existiera. Tiene que salir como
     salía: texto, claro, con la paleta de su página. */
  const viejoArreglo = JSON.stringify([{ titulo: "Uno", resumen: "algo" }]);
  const viejoObjeto = JSON.stringify({ promesa: "p", capitulos: [] });
  const deFabrica = (g: string) => {
    const o = leerOpciones(g);
    return o.formato === "texto" && o.tema === "claro" && o.paleta === "";
  };
  check("OPC-H", deFabrica(viejoArreglo) && deFabrica(viejoObjeto),
    "un ebook de antes sale exactamente como salía: texto, claro y el color de su página");

  check("OPC-I",
    deFabrica("{roto") && deFabrica("null") && deFabrica(""),
    "un guardado roto o vacío tampoco rompe: cae a lo de fábrica");
}

/* ── Que las puntas estén conectadas ──────────────────────────────────────── */

{
  /* La pantalla tiene que MANDAR la elección. Sin esto, los botones se dibujan,
     la persona elige, y el ebook sale igual que siempre sin que nada avise. */
  const pantalla = readFileSync("src/app/digitales/productos/EbookIA.tsx", "utf8");
  check("OPC-J",
    /opciones:\s*\{\s*formato,\s*estilo,\s*tema:\s*temaVisual,\s*paleta,\s*recetas:\s*cuantasRecetas\s*\}/.test(pantalla),
    "la pantalla manda la elección al servidor, con la cantidad de recetas adentro");

  /* Y la ruta del temario tiene que GUARDARLA. */
  const temario = readFileSync("src/app/api/digitales/ia/ebook/route.ts", "utf8");
  check("OPC-K",
    /normalizarOpciones\(body\?\.opciones\)/.test(temario) &&
    /indice:\s*JSON\.stringify\(\{[^)]*opciones/.test(temario),
    "la ruta del temario lima la elección y la guarda");

  /* Y la del PDF tiene que USARLA. Que se guarde y no se use es el error que
     nadie ve: la persona elige oscuro y el PDF sale claro, sin ningún error. */
  const armar = readFileSync("src/app/api/digitales/ia/ebook/armar/route.ts", "utf8");
  check("OPC-L",
    /leerOpciones\(ebook\.indice\)/.test(armar) &&
    /modo:\s*opciones\.tema/.test(armar) &&
    /buscarPaleta\(opciones\.paleta \|\| paleta\)/.test(armar),
    "la ruta del PDF usa el tema y el color elegidos, con la página de respaldo");
}

/* ── Que los nombres de pantalla existan ──────────────────────────────────── */

{
  /* Un formato o un tema sin su texto sale como un botón vacío. */
  const opciones = readFileSync("src/lib/ebook-opciones.ts", "utf8");
  check("OPC-M",
    FORMATOS.every((f) => opciones.includes(`  ${f}: {`)) &&
    TEMAS.every((x) => opciones.includes(`  ${x}: {`)),
    "cada formato y cada tema tienen su nombre y su explicación para la pantalla");
}

console.log(fallos === 0
  ? "\nok — la elección se lima, se guarda, se usa, y ningún color de fantasía entra"
  : `\nFALLA — ${fallos} chequeo(s) de las opciones del ebook`);
process.exit(fallos === 0 ? 0 : 1);
