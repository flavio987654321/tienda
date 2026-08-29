/**
 * Chequeos del orden entre el modal de rubro y el tour guiado. Se corre a mano:
 *
 *   npx tsx src/lib/tour-rubro.check.ts
 *
 * Qué se rompió
 * -------------
 * En una cuenta de dueña recién creada aparecían LOS DOS modales encimados: el
 * de "¿qué vendés?" y arriba el tour guiado. Tenían que ser uno y después el
 * otro.
 *
 * El tour esperaba a que hubiera rubro (`storeType` con valor). Parece
 * razonable y está mal: en la base `tipoTienda` tiene `@default("ROPA")`, así
 * que una tienda tiene rubro desde el instante en que se crea. La condición
 * daba verdadera siempre, incluso con el modal abierto preguntando justamente
 * eso.
 *
 * Tener rubro y haberlo elegido son cosas distintas. La segunda la sabe
 * `tipoTiendaConfigurado`, que arranca en `false`.
 *
 * Por qué esto es un chequeo y no un comentario
 * ---------------------------------------------
 * El error no se ve leyendo el código: `if (!storeType) return` se lee como una
 * espera correcta. Sólo se nota sabiendo que la columna tiene default, que está
 * en otro archivo. Y sólo se reproduce con una cuenta nueva sin estrenar — con
 * cualquier cuenta de prueba ya usada, el rubro está confirmado y los dos
 * modales se comportan bien. Es decir: se puede volver a romper sin que nadie
 * lo note hasta que se queje una dueña nueva.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(__dirname, "..", "..");
const leer = (p: string) => readFileSync(join(raiz, p), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const schema  = leer("prisma/schema.prisma");
const layout  = leer("src/components/DashboardLayout.tsx");
const pedidos = leer("src/app/api/pedidos/route.ts");
const modal   = leer("src/app/dashboard/productos/StoreTypeModal.tsx");
const gate    = leer("src/app/dashboard/layout.tsx");

console.log("\n1) La premisa: tener rubro NO es haberlo elegido");

chequear(
  "tipoTienda tiene default, o sea nunca está vacío",
  /tipoTienda\s+String\s+@default\("ROPA"\)/.test(schema)
);
chequear(
  "tipoTiendaConfigurado existe y arranca en false",
  /tipoTiendaConfigurado\s+Boolean\s+@default\(false\)/.test(schema)
);

console.log("\n2) El tour espera al booleano, no al rubro");

// El efecto del tour, aislado por su llamada a TOUR_PANEL_KEY.
const efectoTour = layout.match(/useEffect\(\(\) => \{[^}]*TOUR_PANEL_KEY[\s\S]*?\}, \[[^\]]*\]\);/)?.[0] ?? "";
chequear("se encontró el efecto del tour", efectoTour.length > 0);
chequear(
  "el efecto NO se dispara por storeType",
  efectoTour.length > 0 && !/\bstoreType\b/.test(efectoTour),
  efectoTour.slice(0, 200)
);
chequear(
  "el efecto se dispara por rubroElegido",
  /\}, \[rubroElegido\]\);/.test(efectoTour)
);
chequear(
  "y corta cuando el rubro no está elegido",
  /if \(!rubroElegido\) return;/.test(efectoTour)
);

console.log("\n3) El dato llega, y llega junto con el rubro");

chequear(
  "/api/pedidos devuelve tipoTiendaConfigurado",
  /tipoTiendaConfigurado: store\.tipoTiendaConfigurado/.test(pedidos)
);
chequear(
  "lo devuelve en la MISMA respuesta que tipoTienda",
  /tipoTienda: store\.tipoTienda[\s\S]{0,120}tipoTiendaConfigurado/.test(pedidos)
);
chequear(
  "sin tienda contesta false, no undefined",
  /pendingCount: 0, tipoTienda: "ROPA", tipoTiendaConfigurado: false/.test(pedidos)
);
chequear(
  "el layout lo lee de ahí",
  /if \(data\?\.tipoTiendaConfigurado\) setRubroElegido\(true\)/.test(layout)
);
chequear(
  "arranca en false: sin saber, el tour no abre",
  /const \[rubroElegido, setRubroElegido\] = useState\(false\)/.test(layout)
);

console.log("\n4) Al confirmar el rubro, el tour se destraba");

chequear(
  "el modal avisa cuando guarda",
  /dispatchEvent\(new CustomEvent\("store-type-changed"/.test(modal)
);
chequear(
  "y el layout marca el rubro como elegido al escuchar ese aviso",
  /onStoreTypeChanged[\s\S]{0,400}setRubroElegido\(true\)/.test(layout)
);

console.log("\n5) Los dos modales siguen atados a la misma condición");

chequear(
  "el modal de rubro se muestra mientras tipoTiendaConfigurado sea false",
  /!store\.tipoTiendaConfigurado/.test(gate)
);

/* ── 6) Los textos del tour no pueden prometer lo que el rubro no hace ──────
   El motor ya saltea los pasos cuyo botón no está en pantalla, pero un paso que
   SÍ existe se dibuja con el texto genérico si el rubro no tiene el suyo. Y el
   genérico habla de una tienda que envía: "lo marcás como enviado", "importá
   desde un CSV", "2x1", "tus opciones de envío".

   En una tienda que entrega por descarga eso no es un matiz: la importación por
   CSV está BLOQUEADA en ese rubro, y el 2x1 nunca se puede aplicar porque se
   vende de a una unidad. O sea que el tour —lo primero que ve alguien que entra
   por primera vez— la mandaría a hacer dos cosas que el sistema después le
   impide.

   Se chequea acá y no a ojo porque el texto genérico se lee perfecto: sólo está
   mal para un rubro, y hay que acordarse de cuál. */
console.log("\n6) Los pasos que cambian según el rubro digital");

const guiones = leer("src/components/tours.ts");

/* Cada paso, con lo que su texto GENÉRICO promete y el rubro digital no puede
   cumplir. Si el paso pierde su variante, cae en el genérico y vuelve a mentir. */
const PASOS_QUE_CAMBIAN: { paso: string; prohibido: RegExp; porque: string }[] = [
  { paso: "pedidos",     prohibido: /enviado/i,      porque: "no hay nada que despachar" },
  { paso: "productos",   prohibido: /CSV/i,          porque: "la importación por CSV está bloqueada en este rubro" },
  { paso: "promociones", prohibido: /2x1|cantidad/i, porque: "se vende de a una unidad" },
  { paso: "pagos",       prohibido: /env[íi]o/i,     porque: "no hay envíos que configurar" },
];

for (const { paso, prohibido, porque } of PASOS_QUE_CAMBIAN) {
  // El bloque del paso: desde su clave hasta el cierre de primer nivel.
  const bloque = guiones.match(new RegExp(`\\n  "?${paso}"?: \\{[\\s\\S]*?\\n  \\},`))?.[0] ?? "";
  chequear(`${paso}: existe en el guion`, bloque.length > 0);
  if (!bloque) continue;

  const variante = bloque.match(/DIGITAL: \{[\s\S]*?\n {6}\}/)?.[0] ?? "";
  chequear(`${paso}: tiene texto propio para el rubro digital (${porque})`, variante.length > 0);
  if (!variante) continue;

  chequear(
    `${paso}: ese texto no promete lo que el rubro no hace`,
    !prohibido.test(variante),
    variante.slice(0, 120)
  );
}

console.log(
  fallos === 0
    ? "\nTodo bien: el tour no puede abrirse arriba del modal de rubro.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
