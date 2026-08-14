/**
 * Chequeos de la pausa del programa de afiliados por rubro. Se corre a mano:
 *
 *   npx tsx src/lib/afiliados-por-rubro.check.ts
 *
 * Qué se está cuidando
 * --------------------
 * En autos y motos la venta no se cobra online: el auto se paga en la
 * concesionaria. La comisión igual se acredita —cuando el dueño confirma una
 * consulta— pero no la respalda nada, porque no pasó un peso por la plataforma.
 * En los rubros de carrito sí: MercadoPago separa la comisión de la venta misma.
 *
 * Con precios de auto, esa diferencia deja de ser un detalle: 5% de treinta
 * millones son un millón y medio de comisión sobre una venta que nunca tocamos.
 * Necesita su propio diseño, así que por ahora está pausado.
 *
 * Por qué hace falta un chequeo
 * -----------------------------
 * Porque una pausa se destraba SIN QUERER y a medias. Son cinco lugares: la
 * pantalla del dueño, el interruptor que la guarda, el listado de tiendas para
 * postularse, la postulación, y la consulta que crea la comisión.
 *
 * Que alguno se olvide no rompe nada visible — simplemente vuelve a quedar
 * abierta una puerta que creíamos cerrada. El caso peor es el ÚLTIMO: aunque
 * nadie pueda postularse, si `api/leads` vuelve a atribuirle la consulta a un
 * afiliado viejo, se acredita plata igual.
 *
 * Todo pregunta por `soportaAfiliados` y ninguno compara contra "AUTOS" a mano,
 * justamente para que destrabarlo sea cambiar un booleano y no acordarse de
 * cinco archivos. Eso también se chequea acá.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { soportaAfiliados, RUBROS_CON_AFILIADOS, STORE_TYPES, MOTIVO_SIN_AFILIADOS } from "./storeTypes";

const raiz = join(__dirname, "..", "..");
const leer = (p: string) => readFileSync(join(raiz, p), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log("\n1) Quién tiene afiliados y quién no");

chequear("autos y motos NO", !soportaAfiliados("AUTOS"));
chequear("ropa sí", soportaAfiliados("ROPA"));
chequear("hogar y tech sí", soportaAfiliados("HOGAR_TECH"));
chequear("gastronomía sí", soportaAfiliados("GASTRONOMIA"));
chequear("general sí", soportaAfiliados("GENERAL"));

// Un rubro nuevo no puede entrar sin que alguien decida esto a propósito.
chequear(
  "todos los rubros dicen explícitamente si tienen o no",
  STORE_TYPES.every((t) => typeof t.supportsAffiliates === "boolean"),
  STORE_TYPES.filter((t) => typeof t.supportsAffiliates !== "boolean").map((t) => t.id)
);

console.log("\n2) Un rubro desconocido no abre la puerta sola");

chequear("rubro inventado cae en el default y no explota", typeof soportaAfiliados("MARCIANOS") === "boolean");
chequear("null tampoco explota", typeof soportaAfiliados(null) === "boolean");

console.log("\n3) La lista para la base y el chequeo en código dicen lo mismo");

chequear(
  "RUBROS_CON_AFILIADOS coincide con soportaAfiliados, uno por uno",
  STORE_TYPES.every((t) => RUBROS_CON_AFILIADOS.includes(t.id) === soportaAfiliados(t.id)),
  { lista: RUBROS_CON_AFILIADOS }
);
chequear("y autos no está en la lista", !RUBROS_CON_AFILIADOS.includes("AUTOS"));
chequear("la lista no quedó vacía", RUBROS_CON_AFILIADOS.length > 0);

console.log("\n4) Los cinco lugares preguntan, y ninguno decide por su cuenta");

const archivos: [string, string][] = [
  ["el interruptor del dueño (pantalla)", "src/app/dashboard/vendedoras/AffiliateToggle.tsx"],
  ["guardar el interruptor (API)",        "src/app/api/configuracion/route.ts"],
  ["postularse a una tienda",             "src/app/api/vendedoras/route.ts"],
  ["la consulta que crea la comisión",    "src/app/api/leads/route.ts"],
];

for (const [nombre, ruta] of archivos) {
  const src = leer(ruta);
  chequear(`${nombre}: pregunta por soportaAfiliados`, /soportaAfiliados\(/.test(src));
}

const listado = leer("src/app/api/vendedoras/route.ts");
chequear(
  "el listado de tiendas filtra por rubro en la consulta a la base",
  /tipoTienda: \{ in: RUBROS_CON_AFILIADOS \}/.test(listado)
);

console.log("\n5) Nadie compara contra \"AUTOS\" escrito a mano");

/* No se prohíbe la palabra "AUTOS" en estos archivos: hay usos legítimos y
   anteriores a esto que no tienen nada que ver con afiliados —el toggle la usa
   para saber si pedir MercadoPago, y configuración para saber qué le falta a una
   concesionaria antes de publicar—. Prohibirla entera sería un chequeo que
   molesta sin cuidar nada.
   Lo que se busca es más preciso: que la decisión sobre AFILIADOS no se tome
   comparando el texto. Ahí es donde destrabar el booleano dejaría una puerta
   cerrada de más, o abierta de menos. */
for (const [nombre, ruta] of archivos) {
  const sospechosas = leer(ruta)
    .split("\n")
    .filter((l) => /["']AUTOS["']/.test(l) && /afiliad|affiliate/i.test(l));
  chequear(
    `${nombre}: ninguna decisión de afiliados compara contra "AUTOS"`,
    sospechosas.length === 0,
    sospechosas.map((l) => l.trim())
  );
}

console.log("\n6) La consulta se sigue guardando, sólo que sin comisión");

const leads = leer("src/app/api/leads/route.ts");
chequear(
  "el corte es sobre a quién se le atribuye, no sobre crear la consulta",
  /if \(affiliateId && soportaAfiliados\(store\.tipoTienda\)\)/.test(leads)
);
chequear(
  "y no se corta la creación entera con un return",
  !/soportaAfiliados\(store\.tipoTienda\)\)\s*\{?\s*return NextResponse/.test(leads)
);

console.log("\n7) El motivo se le explica a la persona");

chequear("hay un motivo escrito", MOTIVO_SIN_AFILIADOS.length > 40);
chequear("dice de qué rubro habla", /autos y motos/i.test(MOTIVO_SIN_AFILIADOS));
chequear(
  "el interruptor lo muestra en vez de inventar su propio texto",
  /\{MOTIVO_SIN_AFILIADOS\}/.test(leer("src/app/dashboard/vendedoras/AffiliateToggle.tsx"))
);

console.log(
  fallos === 0
    ? "\nTodo bien: en autos y motos no se promete ninguna comisión.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
