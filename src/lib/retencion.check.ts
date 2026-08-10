/**
 * Chequeos de la retención. Se corre a mano:
 *
 *   npx tsx src/lib/retencion.check.ts
 *
 * Lo que se cuida es que el aviso salga EXACTAMENTE cuando el período se pasa de
 * donde llegan las visitas. Si sale de más, asusta sin motivo; si falta, la
 * pantalla muestra ingresos con las visitas en cero y parece que la tienda
 * estuvo muerta, cuando lo único que pasó es que el dato ya no está.
 */

import {
  periodoExcedeRetencion, DIAS_RETENCION_VISITAS, AVISO_RETENCION,
} from "./retencion";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const HOY = "2026-08-10";
const menos = (dias: number) => {
  const d = new Date(Date.UTC(2026, 7, 10));
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
};

console.log("\n1) Cuando avisar");

chequear("dos años son 730 dias", DIAS_RETENCION_VISITAS === 730);
chequear("hoy no excede", !periodoExcedeRetencion(HOY, HOY));
chequear("90 dias atras no excede", !periodoExcedeRetencion(menos(90), HOY));
chequear("un año atras no excede", !periodoExcedeRetencion(menos(365), HOY));

// El borde exacto: el dia 730 todavia esta guardado, el 731 ya no.
chequear("justo en el corte NO avisa", !periodoExcedeRetencion(menos(730), HOY), menos(730));
chequear("un dia mas atras SI avisa", periodoExcedeRetencion(menos(731), HOY), menos(731));
chequear("tres años avisa", periodoExcedeRetencion(menos(1095), HOY));

console.log("\n2) El texto");

// Las dos mitades tienen que estar: sin la primera, alguien se asusta pensando
// que pierde las ventas; sin la segunda, no sabe que las visitas si se van.
chequear("dice que las ventas se guardan siempre", /ventas se guardan siempre/i.test(AVISO_RETENCION), AVISO_RETENCION);
chequear("y dice cuanto duran las visitas", /2 años/.test(AVISO_RETENCION), AVISO_RETENCION);

console.log("\n3) El cruce de año");

// La cuenta va en UTC sobre las partes separadas: con `new Date(str)` el corte
// se corre un dia en Argentina y el aviso aparece o desaparece por un dia.
chequear("cruzando el fin de año", periodoExcedeRetencion("2024-01-01", "2026-08-10"));
chequear("y con un bisiesto en el medio el borde sigue exacto",
  !periodoExcedeRetencion("2026-08-11", "2028-08-10") && periodoExcedeRetencion("2026-08-10", "2028-08-10"));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
