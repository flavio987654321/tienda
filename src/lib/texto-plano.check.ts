/**
 * Chequeos de la limpieza de descripciones. Se corre a mano:
 *
 *   npx tsx src/lib/texto-plano.check.ts
 *
 * Vale la pena tenerlos escritos porque el resultado de esta función se IMPRIME
 * sobre una imagen que después se sube a Instagram. Un error acá no se ve en un
 * log: se ve en la publicación de la tienda.
 *
 * Los casos de "lo que pasaba antes" salen de una descripción real —la del
 * vestido de Amaranta— que era justo la que se veía mal en el teléfono.
 */

import { textoPlano, textoPlanoCorto } from "./texto-plano";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const igual = (entrada: string | null | undefined, esperado: string, titulo: string) =>
  chequear(titulo, textoPlano(entrada) === esperado, { obtenido: textoPlano(entrada), esperado });

console.log("\n1) Nada adentro");
igual(null, "", "null");
igual(undefined, "", "undefined");
igual("", "", "cadena vacia");
igual("   ", "", "solo espacios");
igual("<p></p>", "", "html sin texto");

console.log("\n2) Etiquetas fuera");
igual("<p>Eleva tu estilo</p>", "Eleva tu estilo", "un parrafo");
igual("<strong>Diseño y Corte:</strong>", "Diseño y Corte:", "negrita");
igual("<p>Uno</p><p>Dos</p>", "Uno Dos", "dos parrafos NO se pegan");
igual("<li>Uno</li><li>Dos</li>", "Uno Dos", "dos items NO se pegan");
igual("Uno<br>Dos", "Uno Dos", "salto de linea");
igual("Uno<br/>Dos", "Uno Dos", "salto de linea cerrado");
igual("<div>Uno</div><div>Dos</div>", "Uno Dos", "dos divs");
igual('<a href="/x" title="y">Ver</a>', "Ver", "etiqueta con atributos");
igual("<h2>Titulo</h2><p>Cuerpo</p>", "Titulo Cuerpo", "encabezado");

console.log("\n3) Entidades");
igual("Blanco&nbsp;y&nbsp;negro", "Blanco y negro", "espacio duro");
igual("Blanco &amp; negro", "Blanco & negro", "ampersand");
igual("Talles S&#47;M", "Talles S/M", "numerica decimal");
igual("Caf&#233;", "Café", "numerica con acento");
igual("Caf&#xE9;", "Café", "numerica hexadecimal");
igual("Ni&ntilde;a", "Niña", "eñe con nombre");
igual("Dise&ntilde;o &amp; Corte", "Diseño & Corte", "dos entidades juntas");
igual("100&deg; de calidad", "100° de calidad", "grados");
igual("Env&iacute;o gratis&hellip;", "Envío gratis…", "acento y puntos suspensivos");
igual("Precio: 50&nbsp;&euro;", "Precio: 50 €", "euro");
igual("&#0;vacio", "&#0;vacio", "codigo cero se deja como estaba");
igual("&noexiste; queda limpio", "queda limpio", "entidad desconocida se borra");
igual("Talle &#55296; raro", "Talle &#55296; raro", "sustituto suelto decimal se deja como estaba");
igual("Talle &#xD800; raro", "Talle &#xD800; raro", "sustituto suelto hexadecimal se deja como estaba");
/* El que importa: medio par de sustitutos hace explotar `encodeURIComponent`, y
   ahí es donde se arma el link de WhatsApp. */
chequear(
  "lo limpio siempre se puede poner en una url",
  (() => {
    try { encodeURIComponent(textoPlano("<p>Talle &#55296; raro</p>")); return true; }
    catch { return false; }
  })(),
  textoPlano("<p>Talle &#55296; raro</p>")
);

console.log("\n4) Espacios");
igual("  Hola   mundo  ", "Hola mundo", "espacios repetidos y de los bordes");
igual("Hola\n\n  mundo", "Hola mundo", "saltos de linea del html");
igual("<p>  Uno  </p>  <p>  Dos  </p>", "Uno Dos", "espacios entre etiquetas");

console.log("\n5) Basura que no tiene que salir impresa");
igual("<style>p{color:red}</style>Hola", "Hola", "estilos con su contenido");
igual("<script>alert(1)</script>Hola", "Hola", "script con su contenido");
igual("<p>a</p><script>var x = '<b>'</script><p>b</p>", "a b", "script con html adentro");

console.log("\n6) La descripcion real que se veia mal en el telefono");
const real =
  "<p>Eleva tu estilo con este encantador vestido largo de silueta fluida, dise&ntilde;ado " +
  "para brindar comodidad y elegancia natural en los d&iacute;as c&aacute;lidos.</p><ul><li><p>" +
  "<strong>Dise&ntilde;o y Corte:</strong> Escote recto con cuerpo de nido de abeja " +
  "(<em>smock</em>) elastizado que se adapta perfectamente a la figura.</p></li></ul>";
const limpio = textoPlano(real);
chequear("no queda ni una etiqueta", !/[<>]/.test(limpio), limpio);
chequear("no queda ninguna entidad", !/&[a-zA-Z#]/.test(limpio), limpio);
chequear("arranca con la primera palabra de verdad", limpio.startsWith("Eleva tu estilo"), limpio.slice(0, 30));
chequear("los acentos volvieron", limpio.includes("diseñado") && limpio.includes("días cálidos"), limpio.slice(0, 140));
chequear("no se pego el parrafo con la lista", limpio.includes("cálidos. Diseño y Corte:"), limpio);
chequear("no quedaron espacios dobles", !limpio.includes("  "), limpio);

console.log("\n7) El corte");
chequear("no corta lo que ya entra", textoPlanoCorto("<p>Corto</p>", 100) === "Corto", textoPlanoCorto("<p>Corto</p>", 100));
const cortado = textoPlanoCorto(real, 60);
chequear("respeta el maximo", cortado.length <= 61, { largo: cortado.length, cortado });
chequear("termina en puntos suspensivos", cortado.endsWith("…"), cortado);
chequear("no parte una palabra al medio", !/\S…$/.test(cortado.replace(/[.,;:]…$/, "…")) || cortado.split(" ").length > 1, cortado);
chequear("no deja un espacio antes de los puntos", !cortado.includes(" …"), cortado);
chequear(
  "una palabra sola larguisima se corta igual",
  textoPlanoCorto("a".repeat(200), 20).length === 21,
  textoPlanoCorto("a".repeat(200), 20)
);
chequear("el corte tambien limpia el html", !/[<>]/.test(textoPlanoCorto(real, 40)), textoPlanoCorto(real, 40));

console.log(fallos === 0 ? "\nTodo bien\n" : `\n${fallos} fallas\n`);
process.exit(fallos === 0 ? 0 : 1);
