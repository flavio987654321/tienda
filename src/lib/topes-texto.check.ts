// Que cada campo reciba el tope que le corresponde por lo que ES.
//
// Antes había UN tope para todo: 500 letras, lo mismo para un párrafo que para
// el botón "Ver productos". Medido en el navegador, 500 letras dejaban el título
// de la portada de Aire en 1763px de alto y un botón en 156px.

import { topeDelTexto, nombreDelTope, TOPE_BOTON, TOPE_TITULO, TOPE_BAJADA, TOPE_PARRAFO } from "./topes-texto";

let fallos = 0;
function chequear(titulo: string, ok: boolean, detalle?: unknown) {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
}
const es = (campo: string, tope: number) =>
  chequear(`${campo} → ${tope}`, topeDelTexto(campo) === tope, topeDelTexto(campo));

console.log("1) Los botones son cortos");
for (const c of ["heroCta", "heroCtaSecondary", "nosotrosCta", "ofertasCta", "coleccionCta", "masVistoCta", "aboutCta", "mayoristaCta"]) es(c, TOPE_BOTON);

console.log("\n2) Los títulos entran en dos renglones");
for (const c of ["heroHeading", "contactoTitulo", "nosotrosTitulo", "newsletterHeading", "catalogHeading", "depHeading", "coleccionTitle"]) es(c, TOPE_TITULO);

console.log("\n3) Las bajadas tienen más aire");
for (const c of ["heroSubtext", "contactoBajada", "nosotrosKicker", "storeTagline", "navTagline", "pruebaSocialSubtitle"]) es(c, TOPE_BAJADA);

console.log("\n4) Los párrafos quedan como estaban");
for (const c of ["nosotrosParrafo1", "aboutParagraph1", "footerDescription", "newsletterText", "quoteText"]) es(c, TOPE_PARRAFO);

console.log("\n5) El orden de las reglas importa");
/* `masVistoCta` tiene "Cta" y no tiene "Title", pero si las reglas se probaran al
   revés, un campo con las dos —o un nombre nuevo tipo `ctaTitle`— caería mal.
   Gana la primera que coincide, y "Cta" va primero a propósito. */
chequear("un Cta nunca queda como título", topeDelTexto("ctaTitle") === TOPE_BOTON, topeDelTexto("ctaTitle"));

console.log("\n6) Los que no siguen la convención, a mano");
es("announcementText", 120);   // una línea que cruza la pantalla, no un párrafo
es("storeName", 60);           // entra en la barra, al lado del logo
es("contactPhone", 40);
es("footerMadeIn", 60);

console.log("\n7) Lo desconocido cae en párrafo, no en botón");
/* Equivocarse dejando escribir de más molesta mucho menos que cortarle el texto
   a alguien en la mitad de una frase. Y un campo nuevo casi siempre es texto. */
es("campoQueTodaviaNoExiste", TOPE_PARRAFO);
es("", TOPE_PARRAFO);

console.log("\n8) El nombre en castellano acompaña al tope");
chequear("40 se dice 'un botón'", nombreDelTope(TOPE_BOTON) === "un botón");
chequear("90 se dice 'un título'", nombreDelTope(TOPE_TITULO) === "un título");
chequear("500 se dice 'un párrafo'", nombreDelTope(TOPE_PARRAFO) === "un párrafo");

console.log("\n9) Ningún tope pasa el del servidor");
/* El esquema de zod corta en 500. Un tope de campo más alto dejaría escribir
   algo que el guardado rechaza entero. */
for (const c of ["heroCta", "heroHeading", "nosotrosParrafo1", "announcementText", "loQueSea"]) {
  chequear(`${c} no pasa 500`, topeDelTexto(c) <= 500, topeDelTexto(c));
}

console.log(fallos === 0
  ? "\nTodo bien: cada campo acepta lo que le entra.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
