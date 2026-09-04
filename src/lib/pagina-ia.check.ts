/**
 * Chequeos de la IA que escribe la página de venta.
 *
 *   npx tsx src/lib/pagina-ia.check.ts
 *
 * ── Lo que se cuida, en una línea ───────────────────────────────────────────
 *
 * **Que la IA no fabrique prueba.** Escribir los beneficios de un ebook es
 * redacción; escribir las opiniones de gente que no compró, prender una garantía
 * que nadie leyó o inventar una oferta que vence es otra cosa, y termina en un
 * reclamo con nuestro nombre adelante.
 *
 * Y que regenerar el texto **no borre el diseño**: el editor no tiene deshacer.
 */

import { readFileSync } from "fs";
import {
  SECCIONES_QUE_ESCRIBE, esquemaDeLaPagina, INSTRUCCIONES_PAGINA, fusionarPaginaIA,
} from "./pagina-ia";
import { SECCIONES, contenidoPorDefecto, normalizarContenido } from "./pagina-venta";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── Lo que la IA NO puede tocar ─────────────────────────────────────────── */

/* ⚠️ EL CHEQUEO DE ESTE ARCHIVO. Cada una de estas queda afuera por un motivo
   distinto, y ninguno es de alcance:
     - opiniones: serían testimonios de gente que no compró.
     - garantia: es una obligación que se asume, y le gana al art. 1116.
     - urgencia / avisoDeVentas: fechas y ventas que no pasaron.
     - precio: sale del producto; copiado, la página muestra el viejo.
     - barra / pie: no son texto de venta, y el pie lleva los legales. */
const PROHIBIDAS = ["opiniones", "garantia", "urgencia", "avisoDeVentas", "precio", "barra", "pie"];
for (const clave of PROHIBIDAS) {
  check(`NO-${clave}`, !SECCIONES_QUE_ESCRIBE.includes(clave),
    `la IA no escribe "${clave}"`);
}

/* Y no están en el esquema, así que el modelo ni siquiera puede intentarlo: la
   forma de la salida es lo que de verdad lo frena, no una frase del prompt. */
const esquema = esquemaDeLaPagina();
check("ESQ-A",
  PROHIBIDAS.every((c) => !(c in esquema.properties)),
  "ninguna prohibida aparece en el esquema de la herramienta");

/* ⚠️ Es una lista BLANCA, no una negra. Con una negra, una sección nueva del
   catálogo entraría sola en lo que la IA escribe — y la próxima que se agregue
   puede ser otra "opiniones". */
const src = readFileSync("src/lib/pagina-ia.ts", "utf8");
check("ESQ-B",
  /SECCIONES_QUE_ESCRIBE\.includes\(s\.clave\)/.test(src) &&
  !/PROHIBIDAS|EXCLUIDAS/.test(src),
  "las secciones que escribe salen de una lista blanca");

/* Las ocho de copy sí están, y con sus campos. */
check("ESQ-C",
  ["portada", "beneficios", "dolores", "comoFunciona", "preguntas", "cierre"]
    .every((c) => c in esquema.properties),
  "las secciones de copy sí están en el esquema");

/* ⚠️ El esquema se DERIVA del catálogo, no está escrito a mano: escrito a mano
   se desincroniza —alguien agrega un campo y la IA no lo llena nunca, sin que
   falle nada—. Se comprueba contra el catálogo de verdad. */
const beneficios = SECCIONES.find((s) => s.clave === "beneficios")!;
const enEsquema = esquema.properties.beneficios as { properties: Record<string, unknown> };
check("ESQ-D",
  beneficios.campos.every((c) => c.clave in enEsquema.properties),
  "el esquema tiene todos los campos que el catálogo declara");

/* Y los topes de largo se le DICEN al modelo, no sólo se recortan después:
   recortado a secas, una frase de 200 en un campo de 90 queda cortada a la
   mitad de una palabra. */
check("ESQ-E", /Máximo \$\{c\.largo\} caracteres/.test(src),
  "al modelo se le dice el tope de cada campo");

/* Una imagen NO se pide: sería una dirección inventada. */
const portada = esquema.properties.portada as { properties: Record<string, unknown> };
check("ESQ-F", !("imagen" in portada.properties),
  "no se le pide ninguna imagen: sería una dirección inventada");

/* ── El prompt ──────────────────────────────────────────────────────────── */

check("PRO-A",
  /No prometas resultados/.test(INSTRUCCIONES_PAGINA) &&
  /publicidad\s+\n?\s*engañosa/.test(INSTRUCCIONES_PAGINA),
  "el prompt prohíbe prometer resultados, y dice por qué");
check("PRO-B",
  /No escribas testimonios ni opiniones/.test(INSTRUCCIONES_PAGINA) &&
  /No inventes plazos, cupos ni ofertas que vencen/.test(INSTRUCCIONES_PAGINA),
  "y prohíbe testimonios, plazos y ofertas inventadas");
check("PRO-C",
  /No inventes cifras/.test(INSTRUCCIONES_PAGINA),
  "y prohíbe inventar cifras, alumnos y años de experiencia");

/* ── El merge ───────────────────────────────────────────────────────────── */

/* La página de alguien que ya la tiene armada: estilo elegido, orden propio y
   una opinión escrita a mano. */
const armada = normalizarContenido({
  ...contenidoPorDefecto(),
  estilo: "nocturno",
  paleta: "violeta",
  secciones: contenidoPorDefecto().secciones.map((s) =>
    s.clave === "opiniones"
      ? { ...s, visible: true, campos: { ...s.campos, titulo: "Lo que dijeron" } }
      : s.clave === "portada"
        ? { ...s, campos: { ...s.campos, titulo: "MI TITULO A MANO" } }
        : s),
});

const delModelo = {
  portada: { rotulo: "EBOOK", titulo: "Lo que escribió la IA", subtitulo: "Una bajada.", textoBoton: "Comprar" },
  /* El modelo manda una sección que no le toca: tiene que ser ignorada. */
  opiniones: { titulo: "OPINIONES INVENTADAS" },
};
const fusionada = fusionarPaginaIA(armada, delModelo)!;
const sec = (p: typeof fusionada, clave: string) => p.secciones.find((s) => s.clave === clave)!;

check("MER-A", fusionada !== null && sec(fusionada, "portada").campos.titulo === "Lo que escribió la IA",
  "lo que escribió la IA reemplaza el texto viejo de esa sección");

/* ⚠️ Y si el modelo manda una sección prohibida, se descarta igual: la lista
   blanca se aplica al fusionar, no sólo al pedir. Un esquema es una sugerencia
   fuerte, no una garantía. */
check("MER-B", sec(fusionada, "opiniones").campos.titulo === "Lo que dijeron",
  "una sección prohibida que igual llegue se descarta al fusionar");

/* ⚠️ NO SE PIERDE EL DISEÑO. El editor no tiene deshacer, así que regenerar el
   texto no puede borrar el estilo, la paleta ni qué secciones estaban
   prendidas. */
check("MER-C",
  fusionada.estilo === "nocturno" && fusionada.paleta === "violeta",
  "regenerar el texto conserva el estilo y la paleta");
check("MER-D", sec(fusionada, "opiniones").visible === true,
  "conserva qué secciones estaban prendidas");

/* Un campo que el modelo no mandó conserva el que había, en vez de quedar hueco. */
const parcial = fusionarPaginaIA(armada, { portada: { titulo: "Sólo el título" } })!;
check("MER-E", parcial.secciones.find((s) => s.clave === "portada")!.campos.textoBoton !== "",
  "un campo que el modelo no mandó conserva el que había");

/* Basura no rompe nada, y sin ninguna sección utilizable no se guarda a medias. */
check("MER-F",
  fusionarPaginaIA(armada, null) === null &&
  fusionarPaginaIA(armada, "texto") === null &&
  fusionarPaginaIA(armada, { loQueSea: {} }) === null,
  "si no llegó ninguna sección utilizable, no se fusiona nada");

/* Y todo pasa por la MISMA puerta que el editor: un texto larguísimo se recorta
   con el tope del catálogo, no con uno inventado acá. */
const largo = fusionarPaginaIA(armada, { portada: { titulo: "x".repeat(500) } })!;
const topeTitulo = SECCIONES.find((s) => s.clave === "portada")!.campos.find((c) => c.clave === "titulo")!.largo;
check("MER-G",
  (largo.secciones.find((s) => s.clave === "portada")!.campos.titulo as string).length === topeTitulo,
  `lo largo se recorta con el tope del catálogo (${topeTitulo})`);

/* ── La ruta ────────────────────────────────────────────────────────────── */

const ruta = readFileSync("src/app/api/digitales/ia/pagina/route.ts", "utf8");

/* ⚠️ El producto tiene que ser SUYO, con el dueño adentro del `where`. Sin esto,
   cualquier cuenta digital le lee y le escribe la página al producto de otra. */
check("RUT-A",
  /store: \{ ownerId: user\.id \}/.test(ruta) && /user\.role !== "DIGITAL"/.test(ruta),
  "sólo se escribe la página de un producto propio");

/* No guarda: la ruta del editor sigue siendo la única que escribe `paginaVenta`. */
/* Se mira que no ESCRIBA: leer `paginaVenta` sí hace falta —es lo que se fusiona
   y lo que dice si es la primera—, escribirla no. */
check("RUT-B",
  !/product\.update/.test(ruta) && !/product\.upsert/.test(ruta) &&
  /pagina,\s*$/m.test(ruta),
  "devuelve la página y no la guarda");

/* Los topes antes de leer el cuerpo, y si Redis falla se frena. */
check("RUT-C",
  ruta.indexOf("permitirGeneracion") < ruta.indexOf("req.json()") &&
  /no se pudieron contar los topes, se rechaza/.test(ruta),
  "los topes van primero y, si no se pueden contar, se rechaza");

/* La primera página de cada producto no gasta cupo, y la condición la verifica
   el SERVIDOR contra la base — no la manda el navegador. */
check("RUT-D",
  /const esLaPrimera = producto\.paginaVenta === null/.test(ruta) &&
  !/body[\s\S]{0,80}primera/i.test(ruta),
  "la primera página gratis la decide el servidor, no el navegador");

/* Y cuando sí gasta, gasta antes de llamar al modelo y devuelve si falla. */
check("RUT-E",
  ruta.indexOf("consumirDelCupo") < ruta.indexOf("anthropic.messages.create") &&
  (ruta.match(/if \(bolsa\) await devolverAlCupo/g) ?? []).length === 2,
  "el cupo se gasta antes de llamar y se devuelve en los dos caminos de error");

/* ── La ventana ─────────────────────────────────────────────────────────── */

const ventana = readFileSync("src/app/digitales/productos/[id]/pagina/EscribirConIA.tsx", "utf8");

/* ⚠️ Pregunta antes de escribir. El editor NO tiene deshacer: si alguien estuvo
   media hora ajustando y aprieta esto sin saber qué hace, pierde la media hora. */
check("VEN-A", /hayCambiosSinGuardar &&/.test(ventana) && /se van a pisar/.test(ventana),
  "avisa antes de pisar cambios sin guardar");

/* Y dice qué NO toca, que es lo que tranquiliza a quien ya tiene la página
   armada — justo el que no se anima a apretar. */
check("VEN-B",
  /No toca/.test(ventana) && /opiniones/.test(ventana) && /garantía/.test(ventana),
  "dice qué no toca: estilo, orden, opiniones y garantía");

/* La primera es gratis y se dice: saca el miedo a apretar cuando todavía no vio
   lo que hace. */
check("VEN-C", /Esta primera no gasta cupo/.test(ventana),
  "avisa cuando la generación no gasta cupo");

const editor = readFileSync("src/app/digitales/productos/[id]/pagina/EditorClient.tsx", "utf8");
check("VEN-D",
  /onListo=\{\(nueva\) => \{ setPagina\(nueva\); setSucio\(true\)/.test(editor),
  "lo que devuelve entra como borrador y marca cambios sin guardar");

console.log(fallos === 0
  ? "\nok — la IA escribe la página y no fabrica prueba, ni borra el diseño"
  : `\nFALLA — ${fallos} chequeo(s) de la página con IA`);
process.exit(fallos === 0 ? 0 : 1);
