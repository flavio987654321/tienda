/**
 * Chequeos de las políticas legales de una tienda. Se corre a mano:
 *
 *   npx tsx src/lib/politicas-tienda.check.ts
 *
 * El bloque 2 es el bug de verdad: el interruptor "Visible / Oculta" del panel
 * no hacía nada en la tienda. Las banderas `...Active` se respetaban SOLO en el
 * mail de confirmación; la página pública miraba nada más si había texto. O sea
 * que el dueño apagaba "Términos y condiciones", el panel le decía "Oculta", y
 * seguía visible para cualquiera que entrara al link.
 */

import {
  documentosPublicados, textoPublicado, limpiarTextoLegal, linksLegales,
  titulosLegales, CLAVES_LEGALES, MAX_LARGO_POLITICA,
  type FilaPoliticas,
} from "./politicas-tienda";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/** Una tienda con las cuatro escritas y las cuatro activas. */
const COMPLETA: FilaPoliticas = {
  policyReturns: "Aceptamos cambios dentro de los 30 días.",
  policyShipping: "Enviamos a todo el país.",
  policyTerms: "Al comprar aceptás estos términos.",
  policyPrivacy: "Usamos tus datos solo para tu pedido.",
  policyReturnsActive: true,
  policyShippingActive: true,
  policyTermsActive: true,
  policyPrivacyActive: true,
};

/* ── 1) Lo normal ─────────────────────────────────────────────────────────── */
console.log("\n1) Una tienda con todo cargado");

chequear("publica las cuatro",
  documentosPublicados(COMPLETA).join(",") === "devoluciones,envios,terminos,privacidad",
  documentosPublicados(COMPLETA));
chequear("el orden es el del panel",
  documentosPublicados(COMPLETA).join(",") === CLAVES_LEGALES.join(","));
chequear("devuelve el texto de la que se pide",
  textoPublicado(COMPLETA, "privacidad") === "Usamos tus datos solo para tu pedido.");

/* ── 2) El interruptor tiene que apagar de verdad ─────────────────────────── */
console.log("\n2) Apagar una politica la saca de la tienda");

const sinTerminos: FilaPoliticas = { ...COMPLETA, policyTermsActive: false };
chequear("apagada: no aparece en la lista",
  !documentosPublicados(sinTerminos).includes("terminos"),
  documentosPublicados(sinTerminos));
chequear("apagada: no devuelve el texto aunque el texto siga guardado",
  textoPublicado(sinTerminos, "terminos") === null,
  textoPublicado(sinTerminos, "terminos"));
chequear("apagada: el texto NO se borra de la base",
  sinTerminos.policyTerms === COMPLETA.policyTerms);
chequear("apagar una no afecta a las otras",
  documentosPublicados(sinTerminos).join(",") === "devoluciones,envios,privacidad");

const todasApagadas: FilaPoliticas = {
  ...COMPLETA,
  policyReturnsActive: false, policyShippingActive: false,
  policyTermsActive: false, policyPrivacyActive: false,
};
chequear("las cuatro apagadas: no se publica ninguna",
  documentosPublicados(todasApagadas).length === 0);

/* ── 3) Sin texto no hay política, aunque diga Visible ────────────────────── */
console.log("\n3) Sin texto no se publica nada");

chequear("null no se publica", documentosPublicados({ policyTerms: null, policyTermsActive: true }).length === 0);
chequear("cadena vacía tampoco", documentosPublicados({ policyTerms: "", policyTermsActive: true }).length === 0);
chequear("solo espacios tampoco", documentosPublicados({ policyTerms: "   \n  ", policyTermsActive: true }).length === 0);
chequear("una fila vacía no publica nada", documentosPublicados({}).length === 0);
chequear("null como fila no explota", documentosPublicados(null).length === 0);
chequear("undefined como fila tampoco", documentosPublicados(undefined).length === 0);

// Una tienda vieja puede tener el texto y la bandera sin tocar. El default de
// la base es `true`, y si la query no seleccionó la columna llega `undefined`:
// en ninguno de los dos casos hay que apagarle la política.
console.log("\n3 bis) Banderas sin definir");
chequear("undefined no apaga", documentosPublicados({ policyTerms: "algo" }).includes("terminos"));
chequear("null no apaga", documentosPublicados({ policyTerms: "algo", policyTermsActive: null }).includes("terminos"));
chequear("solo `false` apaga", !documentosPublicados({ policyTerms: "algo", policyTermsActive: false }).includes("terminos"));

/* ── 4) Los links del pie ─────────────────────────────────────────────────── */
console.log("\n4) Los links del pie de la tienda");

const publicadas = documentosPublicados(COMPLETA);
chequear("en la tienda salen las cuatro", linksLegales("mi-tienda", publicadas).length === 4);
chequear("el href apunta bien",
  linksLegales("mi-tienda", publicadas)[0].href === "/tienda/mi-tienda/politicas?tipo=devoluciones",
  linksLegales("mi-tienda", publicadas)[0].href);

// Este era el otro bug: el pie listaba las tres siempre, tuviera o no la tienda
// algo cargado. Una tienda recién hecha mostraba tres links que llevaban a
// "esta tienda todavía no publicó sus políticas".
chequear("tienda sin políticas: NINGÚN link",
  linksLegales("nueva", documentosPublicados({})).length === 0);
chequear("con dos publicadas salen dos",
  linksLegales("x", documentosPublicados({ policyTerms: "a", policyPrivacy: "b" })).length === 2);

// En el editor sí se muestran las cuatro: el dueño tiene que poder ver dónde
// van a caer aunque todavía no las haya escrito.
chequear("en el editor salen las cuatro aunque no haya nada",
  linksLegales("x", [], { enEditor: true }).length === 4);
chequear("sin slug no rompe el href",
  linksLegales(undefined, publicadas)[0].href === "/tienda//politicas?tipo=devoluciones");

/* ── 5) Los nombres ───────────────────────────────────────────────────────── */
console.log("\n5) Como se llama cada una");

const normal = titulosLegales("ROPA");
const autos = titulosLegales("AUTOS");
const digital = titulosLegales("DIGITAL");
chequear("normal: Política de envíos", normal.envios.largo === "Política de envíos");
// Una concesionaria no envía ni acepta devoluciones: la operación se cierra en
// persona. Llamarlas así le prometía al comprador algo que no existe.
chequear("autos: NO dice envíos", autos.envios.largo === "Cómo se coordina la entrega");
chequear("autos: NO dice devoluciones", autos.devoluciones.largo === "Condiciones de la operación");
chequear("términos se llama igual en los dos", normal.terminos.largo === autos.terminos.largo);
chequear("privacidad se llama igual en los dos", normal.privacidad.largo === autos.privacidad.largo);
chequear("los links de autos usan el nombre de autos",
  linksLegales("conce", publicadas, { tipoTienda: "AUTOS" })[1].label === "Cómo se coordina la entrega");

/* El rubro que entrega por descarga tampoco envía, pero por el motivo contrario:
   entrega en el acto, por mail. Y "cambios" sobre un archivo no significa nada.
   Si el pie dijera "Política de envíos" estaría contradiciendo a la página que
   linkea, que ya se titula distinto — y prometiendo un envío que no existe. */
chequear("digital: NO dice envíos", digital.envios.largo === "Política de entrega y descarga");
chequear("digital: NO dice cambios", digital.devoluciones.largo === "Devoluciones y arrepentimiento");
chequear("digital: términos y privacidad se llaman igual que siempre",
  digital.terminos.largo === normal.terminos.largo && digital.privacidad.largo === normal.privacidad.largo);
chequear("los links de una tienda de descargas usan SU nombre",
  linksLegales("archivos", publicadas, { tipoTienda: "DIGITAL" })[1].label === "Política de entrega y descarga");
chequear("sin rubro se cae en los nombres de siempre, no en los de un rubro",
  linksLegales("x", publicadas)[1].label === "Política de envíos");
chequear("y los tres rubros tienen título para las cuatro claves",
  [normal, autos, digital].every((t) => CLAVES_LEGALES.every((c) => !!t[c].corto && !!t[c].largo)));
chequear("los cortos de digital también entran en un pie de una línea",
  linksLegales("x", publicadas, { tipoTienda: "DIGITAL", cortos: true }).every((l) => l.label.length <= 14),
  linksLegales("x", publicadas, { tipoTienda: "DIGITAL", cortos: true }).map((l) => l.label));
chequear("los cortos entran en un pie de una línea",
  linksLegales("x", publicadas, { cortos: true }).every((l) => l.label.length <= 14),
  linksLegales("x", publicadas, { cortos: true }).map((l) => l.label));
chequear("hay título para las cuatro claves",
  CLAVES_LEGALES.every((c) => !!normal[c].corto && !!normal[c].largo));

/* ── 6) Lo que se guarda ──────────────────────────────────────────────────── */
console.log("\n6) Limpieza del texto antes de guardar");

chequear("recorta al tope", limpiarTextoLegal("a".repeat(MAX_LARGO_POLITICA + 500)).length === MAX_LARGO_POLITICA);
chequear("uno de 5 MB no explota", limpiarTextoLegal("x".repeat(5_000_000)).length === MAX_LARGO_POLITICA);
chequear("saca espacios de los bordes", limpiarTextoLegal("  hola  ") === "hola");
chequear("respeta los renglones del medio", limpiarTextoLegal("a\n\nb") === "a\n\nb");
// La página pública parte por "\n": un "\r\n" de Windows dejaba un "\r" suelto
// al final de cada renglón.
chequear("normaliza los saltos de Windows", limpiarTextoLegal("a\r\nb") === "a\nb");
chequear("un no-string devuelve vacío", limpiarTextoLegal(null) === "" && limpiarTextoLegal(42) === "");
chequear("un objeto tampoco pasa", limpiarTextoLegal({ toString: () => "x".repeat(99) }) === "");
// El corte va antes del trim: al revés, un texto de puros espacios al final
// gastaba lugar del tope.
chequear("puro espacio queda vacío", limpiarTextoLegal(" ".repeat(10_000)) === "");

/* ── 7) La misma regla en los tres lados ──────────────────────────────────── */
console.log("\n7) Tienda, pie y mail dicen lo mismo");

// El mail arma su bloque con `textoPublicado`, la tienda con
// `documentosPublicados` y el pie con `linksLegales`. Los tres tienen que
// coincidir para cualquier combinación: eran tres copias de la regla y una
// (la del mail) era la única que funcionaba.
let coinciden = true;
for (let mascara = 0; mascara < 16; mascara++) {
  const fila: FilaPoliticas = {
    policyReturns: mascara & 1 ? "a" : null,
    policyShipping: mascara & 2 ? "b" : null,
    policyTerms: mascara & 4 ? "c" : null,
    policyPrivacy: mascara & 8 ? "d" : null,
  };
  const lista = documentosPublicados(fila);
  const delPie = linksLegales("x", lista).map((l) => l.clave);
  const delMail = CLAVES_LEGALES.filter((c) => textoPublicado(fila, c) !== null);
  if (lista.join(",") !== delPie.join(",") || lista.join(",") !== delMail.join(",")) coinciden = false;
}
chequear("las 16 combinaciones dan lo mismo en los tres", coinciden);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
