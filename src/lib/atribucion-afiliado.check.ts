/**
 * Chequeos de a quién le queda la venta. Se corre a mano:
 *
 *   npx tsx src/lib/atribucion-afiliado.check.ts
 *
 * Qué se rompía
 * -------------
 * El `?ref=` del link del afiliado se guardaba en un `useState`, o sea en la
 * memoria de esa pantalla. Cualquier cambio de página lo borraba: tocar una
 * categoría, "ver todos", o un producto en las plantillas que abren ficha
 * aparte. Nueve de las once plantillas tienen links así.
 *
 * La persona compraba igual y la tienda cobraba igual — lo único que se perdía
 * era que la venta fuera del afiliado. Y no avisaba nada: la venta simplemente
 * no aparecía como suya.
 *
 * Por qué es un chequeo y no un comentario
 * ----------------------------------------
 * Porque probarlo a mano es carísimo: hay que entrar con un link de afiliado,
 * navegar, comprar de verdad con MercadoPago y recién ahí mirar si la comisión
 * apareció. Nadie va a repetir eso en cada cambio. Y porque el modo de fallar es
 * silencioso — si esto se rompe otra vez, todo "funciona", sólo que el afiliado
 * no cobra.
 *
 * El caso feo que se cuida acá: `affiliateId` y `hasMercadoPago` tienen que
 * viajar JUNTOS. Con afiliado el cobro exige MercadoPago, y `getPagoOptions`
 * devuelve la lista VACÍA si hay afiliado y la tienda no tiene MercadoPago. O
 * sea que mandar uno sin el otro cambia una comisión perdida por una venta
 * perdida, que es peor que el bug original.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
// Import normal y no dinámico: la librería mira `window` recién cuando se la
// llama, así que no hace falta tener el navegador falso armado al importarla.
import { recordarAfiliado, afiliadoDeEstaTienda } from "./atribucion-afiliado";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* Un navegador de mentira. `localStorage` real no existe en Node, y la librería
   lee `window.location.pathname` para saber en qué tienda está parada. */
let guardado: Record<string, string> = {};
let romperStorage = false;
const irA = (path: string) => { (globalThis as { window?: unknown }).window = falsoWindow(path); };
const falsoWindow = (pathname: string) => ({
  location: { pathname },
  localStorage: {
    getItem: (k: string) => { if (romperStorage) throw new Error("SecurityError"); return guardado[k] ?? null; },
    setItem: (k: string, v: string) => { if (romperStorage) throw new Error("SecurityError"); guardado[k] = v; },
  },
});

console.log("\n1) Sobrevive al cambio de pantalla, que es todo el punto");

irA("/tienda/girly-store");
recordarAfiliado("afiliado-A");
chequear("lo recuerda donde entró", afiliadoDeEstaTienda() === "afiliado-A");

irA("/tienda/girly-store/productos?categoria=Remeras");
chequear("y sigue estando en 'ver todos'", afiliadoDeEstaTienda() === "afiliado-A");

irA("/tienda/girly-store/producto/abc123");
chequear("y en la ficha del producto", afiliadoDeEstaTienda() === "afiliado-A");

irA("/tienda/girly-store/vehiculos");
chequear("y en la pantalla de vehículos", afiliadoDeEstaTienda() === "afiliado-A");

console.log("\n2) Cada tienda tiene el suyo");

irA("/tienda/otra-tienda");
chequear("en otra tienda no hay nada", afiliadoDeEstaTienda() === null);
recordarAfiliado("afiliado-B");
chequear("se guarda el de la otra tienda", afiliadoDeEstaTienda() === "afiliado-B");

irA("/tienda/girly-store");
chequear(
  "y el de la primera NO se pisó",
  afiliadoDeEstaTienda() === "afiliado-A",
  afiliadoDeEstaTienda()
);

console.log("\n3) Dentro de una tienda, gana el último link");

irA("/tienda/girly-store");
recordarAfiliado("afiliado-C");
chequear("el último que la trajo se queda con la venta", afiliadoDeEstaTienda() === "afiliado-C");

console.log("\n4) Vence, y al vencer se limpia");

guardado = {};
irA("/tienda/girly-store");
guardado["tiendaapps:afiliado"] = JSON.stringify({
  "girly-store": { id: "viejo", vence: Date.now() - 1000 },
});
chequear("un afiliado vencido ya no cobra", afiliadoDeEstaTienda() === null);

guardado["tiendaapps:afiliado"] = JSON.stringify({
  "tienda-vieja": { id: "x", vence: Date.now() - 1000 },
  "tienda-viva":  { id: "y", vence: Date.now() + 86_400_000 },
});
recordarAfiliado("nuevo");
const tras = JSON.parse(guardado["tiendaapps:afiliado"]);
chequear("al guardar se barren las vencidas", !("tienda-vieja" in tras), Object.keys(tras));
chequear("y no se lleva puestas las vivas", "tienda-viva" in tras, Object.keys(tras));

console.log("\n5) Fuera de una tienda no inventa nada");

guardado = {};
irA("/tienda/girly-store");
recordarAfiliado("afiliado-A");
irA("/afiliados/billetera");
chequear("en el panel del afiliado no devuelve nada", afiliadoDeEstaTienda() === null);
irA("/");
chequear("en la home tampoco", afiliadoDeEstaTienda() === null);

console.log("\n6) Si el navegador no deja guardar, no se cae la tienda");

// Safari en modo privado TIRA al tocar localStorage en vez de devolver vacío.
guardado = {};
romperStorage = true;
irA("/tienda/girly-store");
let exploto = false;
try { recordarAfiliado("afiliado-A"); afiliadoDeEstaTienda(); } catch { exploto = true; }
chequear("guardar y leer no tiran", !exploto);
chequear("simplemente no hay atribución", afiliadoDeEstaTienda() === null);
romperStorage = false;

console.log("\n7) Basura guardada a mano no rompe ni cobra");

for (const veneno of ['no es json', '"texto"', "null", '{"girly-store":123}', '{"girly-store":{"id":5}}']) {
  guardado = { "tiendaapps:afiliado": veneno };
  irA("/tienda/girly-store");
  let ok = true;
  try { if (afiliadoDeEstaTienda() !== null) ok = false; } catch { ok = false; }
  chequear(`aguanta ${veneno.slice(0, 24)}`, ok);
}

console.log("\n8) Las cuatro pantallas que venden están conectadas");

const raiz = join(__dirname, "..", "..");

/* Leer el archivo Y COMPROBAR QUE SIGUE SIENDO EL QUE CREEMOS.
 *
 * Sin esta comprobación, esta prueba se pudre en silencio, y ya pasó: el listado
 * se mudó de `productos/page.tsx` a `productos/CatalogoGenerico.tsx` —la página
 * quedó como una cáscara que sólo resuelve el template— y acá se siguió leyendo
 * la cáscara. Todos los regex fallaban, y los cinco "FALLA" no decían la causa:
 * parecían cinco agujeros en el cobro cuando en realidad el cobro estaba entero y
 * la que apuntaba mal era la prueba. Media hora para descubrir que no pasaba nada.
 *
 * Peor todavía: si alguien lee cinco fallas que no entiende, la conclusión fácil
 * es "esta prueba está rota" y se deja de correr. Y ahí sí el cobro queda sin
 * nadie mirándolo.
 *
 * `señal` es algo que ese archivo TIENE que tener por lo que hace, no por cómo
 * está escrito hoy. Si no está, cortamos acá con el motivo en castellano en vez
 * de seguir y tirar fallas que hablan de otra cosa. */
const leer = (p: string, señal: string) => {
  const src = readFileSync(join(raiz, p), "utf8");
  if (!src.includes(señal)) {
    console.error(
      `\n✗ ESTA PRUEBA ESTÁ APUNTANDO MAL, no hay nada roto en el cobro (todavía).\n` +
      `  Buscaba "${señal}" adentro de ${p} y no está.\n` +
      `  Lo más probable: ese código se mudó a otro archivo.\n` +
      `  Buscá dónde vive ahora y corregí la ruta acá abajo, en 'const leer'.\n`
    );
    process.exit(1);
  }
  return src;
};

const hook     = leer("src/hooks/useStorefront.ts", "recordarAfiliado");
// El listado NO es `productos/page.tsx`: esa página sólo resuelve qué template
// usar y delega. El carrito, el checkout y el afiliado viven acá.
const listado  = leer("src/app/tienda/[slug]/productos/CatalogoGenerico.tsx", "useCartLogic(");
const ficha    = leer("src/app/tienda/[slug]/producto/[id]/ProductDetailClient.tsx", "useCartLogic(");
const autos    = leer("src/components/store/auto/AutoVehicleShared.tsx", "affiliateId");

chequear("la portada guarda el ref al entrar", /recordarAfiliado\(ref\)/.test(hook));
chequear("y lo recupera cuando no viene en la URL", /const guardado = afiliadoDeEstaTienda\(\)/.test(hook));
chequear("el listado lo manda al cobro", /affiliateId: affiliateId \?\? undefined/.test(listado));
chequear("la ficha lo manda al cobro", /affiliateId: affiliateId \?\? undefined/.test(ficha));
chequear("la consulta de autos lo manda", /affiliateId: afiliadoDeEstaTienda\(\) \?\? undefined/.test(autos));

console.log("\n9) El afiliado nunca viaja sin MercadoPago");

for (const [nombre, src] of [["listado", listado], ["ficha", ficha]] as const) {
  const llamada = src.match(/useCartLogic\(\{[^}]*\}\)/)?.[0] ?? "";
  const tieneAfiliado = /\baffiliateId\b/.test(llamada);
  const tieneMp = /\bhasMercadoPago\b/.test(llamada);
  chequear(`${nombre}: si pasa affiliateId, pasa hasMercadoPago`, tieneAfiliado && tieneMp, llamada);
}

chequear(
  "y el listado pide el dato a la API",
  /setHasMercadoPago\(!!data\.hasMercadoPago\)/.test(listado)
);

console.log("\n10) Y el pedido devuelve el orderId, o nunca se cobra");

/* El agujero que esto cuida: el carrito sólo manda a pagar por MercadoPago si
   `placeOrder` le devuelve el `orderId`. Sin él crea el pedido, vacía el carrito
   y muestra "listo" — sin cobrar. Las dos pantallas devolvían `{ ok: true }` a
   secas, y encima el tipo anotado a mano NO incluía `orderId`, así que
   TypeScript no tenía cómo avisar. Por eso se chequea el tipo también. */
for (const [nombre, src] of [["listado", listado], ["ficha", ficha]] as const) {
  chequear(
    `${nombre}: devuelve el orderId`,
    /return \{ ok: true, orderId: data\.order\?\.id, donationId: data\.donationId \?\? undefined \};/.test(src)
  );
  chequear(
    `${nombre}: y el tipo lo declara, así el compilador puede avisar`,
    /Promise<\{ ok: boolean; orderId\?: string; donationId\?: string; error\?: string \}>/.test(src)
  );
}

console.log(
  fallos === 0
    ? "\nTodo bien: la venta sigue siendo del afiliado aunque la persona navegue.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
