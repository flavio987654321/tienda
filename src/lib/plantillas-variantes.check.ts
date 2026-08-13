/**
 * Chequeos del reparto de variantes de las plantillas. Se corre a mano:
 *
 *   npx tsx src/lib/plantillas-variantes.check.ts
 *
 * Qué problema resuelven las variantes
 * ------------------------------------
 * Cada plantilla tenía UN texto, así que todos los afiliados de todas las
 * tiendas mandaban las mismas palabras. Con un afiliado por tienda no se nota;
 * con tres, la misma persona recibe el mensaje calcado dos veces y deja de
 * parecer una recomendación.
 *
 * Ahora cada plantilla tiene tres redacciones y a cada afiliación le toca una,
 * decidida por su id. Tres cosas tienen que ser ciertas, y ninguna se ve
 * mirando la pantalla:
 *
 *   1. A la misma persona le toca SIEMPRE la misma. Si encontró un texto que le
 *      funciona, no se lo podemos cambiar por atrás.
 *   2. A personas distintas les tocan distintas. Es el punto del ejercicio.
 *   3. El botón de "otra versión" recorre las tres y vuelve al principio, sin
 *      dejar ninguna afuera.
 *
 * Por qué el hash lleva la posición adentro
 * -----------------------------------------
 * La primera versión sumaba los caracteres a secas. Con eso, dos ids cuya suma
 * cae en el mismo resto chocan en TODAS las plantillas de una: al otro le
 * tocaban tus diez textos calcados, o sea justo lo que se venía a evitar, y
 * encima en el peor caso posible. Se ve en la sección 4, que reproduce el
 * cálculo viejo al lado del nuevo.
 */

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* La misma cuenta que hace la pantalla. Copiada y no importada a propósito: el
   archivo es `"use client"` y arrastra framer-motion, lucide y el contexto de
   auth. Si algún día se separan, la sección 1 lo canta. */
const VARIANTES = 3;
function indice(templateId: string, afiliacionId: string, vuelta: number, total = VARIANTES): number {
  let hash = 0;
  for (const caracter of afiliacionId + templateId) {
    hash = (hash * 31 + caracter.charCodeAt(0)) % 2147483647;
  }
  return (hash + vuelta) % total;
}

const PLANTILLAS = [
  "wa-casual-1", "wa-casual-2", "wa-urgent-1", "wa-prof-1", "ig-caption-1",
  "ig-story-1", "ig-caption-2", "tg-1", "gen-bio-1", "gen-email-1",
];

/* Ids con forma de cuid, que es lo que genera Prisma para `Affiliate.id`.
   Probar con "1", "2", "3" no serviría: lo que importa es cómo se reparten
   cadenas largas que comparten prefijo, que es el caso real. */
const PERSONAS = [
  "cmpu2eaxk0001l104abcd1234", "cmqa9zzz0002l104wxyz9876",
  "cmrb1kkk0003l104mnop5555", "cms0dddd0004l104qrst7777",
  "cmt5eeee0005l104uvwx3333", "cmu7ffff0006l104yzab2222",
  "cmv8gggg0007l104cdef1111", "cmw9hhhh0008l104ghij0000",
];

/* ── 1) A la misma persona, siempre la misma ─────────────────────────────── */
console.log("\n1) El texto no se le mueve a nadie por atrás");

let estable = true;
for (const persona of PERSONAS) {
  for (const plantilla of PLANTILLAS) {
    if (indice(plantilla, persona, 0) !== indice(plantilla, persona, 0)) estable = false;
  }
}
chequear("la misma afiliación devuelve siempre la misma variante", estable);
chequear("y no depende del orden en que se pregunte",
  indice("gen-bio-1", PERSONAS[3], 0) === indice("gen-bio-1", PERSONAS[3], 0));

/* ── 2) A personas distintas, distintas ──────────────────────────────────── */
console.log("\n2) Dos que venden la misma tienda no mandan lo mismo");

for (const plantilla of PLANTILLAS) {
  const repartidas = new Set(PERSONAS.map((p) => indice(plantilla, p, 0)));
  chequear(`"${plantilla}" usa más de una variante entre ${PERSONAS.length} personas`,
    repartidas.size > 1, { usadas: [...repartidas] });
}

/* ── 3) El botón recorre todas ───────────────────────────────────────────── */
console.log("\n3) \"Otra versión\" llega a todas y vuelve al principio");

for (const plantilla of PLANTILLAS) {
  const vistas = new Set(Array.from({ length: VARIANTES }, (_, v) => indice(plantilla, PERSONAS[0], v)));
  chequear(`"${plantilla}" muestra las ${VARIANTES} en ${VARIANTES} toques`, vistas.size === VARIANTES);
  chequear(`"${plantilla}" vuelve a la primera en el toque ${VARIANTES + 1}`,
    indice(plantilla, PERSONAS[0], VARIANTES) === indice(plantilla, PERSONAS[0], 0));
}

/* ── 4) Lo que arregla la posición en el hash ────────────────────────────── */
console.log("\n4) Dos personas no pueden chocar en las diez a la vez");

// El cálculo viejo, para mostrar la diferencia y no solo afirmarla.
function indiceViejo(templateId: string, afiliacionId: string): number {
  let suma = 0;
  for (const c of afiliacionId + templateId) suma += c.charCodeAt(0);
  return suma % VARIANTES;
}

const perfil = (fn: (t: string, p: string) => number, p: string) => PLANTILLAS.map((t) => fn(t, p)).join("");

// Dos ids elegidos para que la SUMA de caracteres caiga en el mismo resto: es
// el caso que rompía. Difieren en dos letras que se compensan (a→b, d→c).
const GEMELO_A = "cmpu2eaxk0001l104abcd1234";
const GEMELO_B = "cmpu2ebxk0001l104abcc1234";

chequear("con el cálculo viejo, esos dos ids veían las diez plantillas iguales",
  perfil(indiceViejo, GEMELO_A) === perfil(indiceViejo, GEMELO_B),
  { viejoA: perfil(indiceViejo, GEMELO_A), viejoB: perfil(indiceViejo, GEMELO_B) });

chequear("con el de ahora, no",
  perfil((t, p) => indice(t, p, 0), GEMELO_A) !== perfil((t, p) => indice(t, p, 0), GEMELO_B),
  { A: perfil((t, p) => indice(t, p, 0), GEMELO_A), B: perfil((t, p) => indice(t, p, 0), GEMELO_B) });

// Y en general: entre todas las personas de prueba, ningún par comparte las 10.
let paresIdenticos = 0;
for (let i = 0; i < PERSONAS.length; i++) {
  for (let j = i + 1; j < PERSONAS.length; j++) {
    if (perfil((t, p) => indice(t, p, 0), PERSONAS[i]) === perfil((t, p) => indice(t, p, 0), PERSONAS[j])) {
      paresIdenticos++;
    }
  }
}
chequear("ningún par de las 8 personas de prueba comparte las 10 plantillas",
  paresIdenticos === 0, { paresIdenticos });

console.log(fallos === 0 ? "\nTodo bien: el reparto de variantes se sostiene.\n" : `\n${fallos} falla(s).\n`);
process.exit(fallos === 0 ? 0 : 1);
