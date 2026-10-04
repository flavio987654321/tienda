/**
 * Chequeos de `descripcionLegible`. Se corre con:
 *
 *   npx tsx src/lib/descripcionLegible.check.ts
 *
 * La descripción del producto trae el color con el que se escribió en el
 * editor. Sobre un template oscuro, el casi negro de siempre no se lee (pasó en
 * tiendaapps con Aurora el 04/10/26). Lo que se vigila:
 *
 *   - que el color que no se lee se saque, y el que se lee quede;
 *   - que no toque `background-color` ni texto que diga "color:";
 *   - que sin un fondo medible no haga nada.
 */

import { descripcionLegible } from "./descripcionLegible";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const OSCURO = "#13141f";
const CLARO = "#ffffff";
const casiNegro = `<p><span style="color:#111827"><strong>Remera básica</strong></span></p>`;

console.log("\n1) Fondo oscuro");
const r1 = descripcionLegible(casiNegro, OSCURO);
chequear("el casi negro se saca", !/#111827/.test(r1), r1);
chequear("el texto queda igual", r1.includes("<strong>Remera básica</strong>"), r1);
const rojo = descripcionLegible(`<span style="color:#f87171">Oferta</span>`, OSCURO);
chequear("un rojo que se lee queda", /#f87171/.test(rojo), rojo);
const rgb = descripcionLegible(`<span style="font-weight:700; color: rgb(17, 24, 39);">x</span>`, OSCURO);
chequear("también en rgb(), y lo demás del estilo queda", !/rgb\(17/.test(rgb) && /font-weight:700/.test(rgb), rgb);

console.log("\n2) Fondo claro");
chequear("el casi negro queda", descripcionLegible(casiNegro, CLARO) === casiNegro);
const blanco = descripcionLegible(`<span style="color:#ffffff">x</span>`, CLARO);
chequear("el blanco se saca", !/#ffffff/.test(blanco), blanco);

console.log("\n3) Lo que no se toca");
const fondoDeLetra = `<span style="background-color:#111827">x</span>`;
chequear("background-color no se toca", descripcionLegible(fondoDeLetra, OSCURO) === fondoDeLetra);
const texto = `<p>Color: #111827 en el frente</p>`;
chequear("un texto que dice \"Color:\" no se toca", descripcionLegible(texto, OSCURO) === texto);
const nombre = `<span style="color:black">x</span>`;
chequear("un nombre de color se deja", descripcionLegible(nombre, OSCURO) === nombre);
chequear("sin fondo medible no hace nada", descripcionLegible(casiNegro, "") === casiNegro);
chequear("con un degradado de fondo no hace nada", descripcionLegible(casiNegro, "linear-gradient(#000, #111)") === casiNegro);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
