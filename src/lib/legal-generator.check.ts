/**
 * Chequeos del generador de políticas. Se corre a mano:
 *
 *   npx tsx src/lib/legal-generator.check.ts
 *
 * Los dos campos numéricos del asistente se clampeaban solo por abajo
 * (`Math.max(0, …)`), y el `max={100}` de un input no frena a nadie que tipee.
 * O sea que se podía generar "te damos un total de 100000009 días corridos" o
 * "un cargo administrativo del 5000%" — escrito, publicado y firmado como la
 * política legal de la tienda.
 *
 * El bloque 3 es la otra mitad: la política de privacidad no puede declarar un
 * tracker que no existe ni callar uno que sí está corriendo.
 */

import {
  generatePolicyReturns, generatePolicyTerms, generatePolicyShipping, generatePolicyPrivacy,
  acotarDiasExtra, acotarPorcentaje,
  MAX_DIAS_EXTRA_DEVOLUCION, MAX_PORCENTAJE_CANCELACION, MAX_LARGO_DEMORA,
  type LegalWizardAnswers, type LegalStoreInfo, type HechosPrivacidad,
} from "./legal-generator";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const TIENDA: LegalStoreInfo = { name: "Mi Tienda", contact: "+54 9 11 5555-5555" };
const BASE: LegalWizardAnswers = {
  shipsNationwide: true, avgDeliveryDays: "3 a 7", extraReturnDays: 0, cancellationFeePercent: 0,
};

/* ── 1) Los topes ─────────────────────────────────────────────────────────── */
console.log("\n1) Los numeros no se pueden ir de rango");

chequear("un millón de días se corta", acotarDiasExtra(1_000_000) === MAX_DIAS_EXTRA_DEVOLUCION);
chequear("negativo va a 0", acotarDiasExtra(-50) === 0);
chequear("decimal se trunca", acotarDiasExtra(10.9) === 10);
chequear("NaN va a 0", acotarDiasExtra(NaN) === 0);
chequear("Infinity va a 0", acotarDiasExtra(Infinity) === 0);
chequear("5000% se corta en 100", acotarPorcentaje(5000) === MAX_PORCENTAJE_CANCELACION);
chequear("porcentaje negativo va a 0", acotarPorcentaje(-1) === 0);

// Lo que importa no es el clamp suelto: es que el TEXTO no muestre el absurdo,
// aunque el número llegue por otro lado que no sea el input.
console.log("\n1 bis) El texto generado tampoco");

const conAbsurdo = generatePolicyReturns(TIENDA, { ...BASE, extraReturnDays: 99_999_999 });
chequear("no aparece el número absurdo", !conAbsurdo.includes("99999999") && !conAbsurdo.includes("100000009"), conAbsurdo.slice(0, 200));
chequear("dice el tope + los 10 de la ley", conAbsurdo.includes(`${10 + MAX_DIAS_EXTRA_DEVOLUCION} días corridos`));

const conCargoAbsurdo = generatePolicyTerms(TIENDA, { ...BASE, cancellationFeePercent: 5000 });
chequear("no promete un cargo del 5000%", !conCargoAbsurdo.includes("5000%"));
chequear("lo deja en 100%", conCargoAbsurdo.includes("100% del valor de la compra"));

const conCero = generatePolicyTerms(TIENDA, { ...BASE, cancellationFeePercent: 0 });
chequear("con 0 dice que no hay cargo", conCero.includes("sin cargo") && !conCero.includes("cargo administrativo"));
const conNegativo = generatePolicyReturns(TIENDA, { ...BASE, extraReturnDays: -5 });
chequear("negativo cae en el mínimo legal", conNegativo.includes("Fuera del plazo legal de 10 días"));

/* ── 2) El texto libre de la demora ───────────────────────────────────────── */
console.log("\n2) La demora de envio es texto libre");

const largo = generatePolicyShipping(TIENDA, { ...BASE, avgDeliveryDays: "x".repeat(500) });
chequear("se recorta", !largo.includes("x".repeat(MAX_LARGO_DEMORA + 1)));
chequear("vacío cae al default", generatePolicyShipping(TIENDA, { ...BASE, avgDeliveryDays: "" }).includes("3 a 7"));
chequear("solo espacios también", generatePolicyShipping(TIENDA, { ...BASE, avgDeliveryDays: "   " }).includes("3 a 7"));
chequear("sin envío no habla de días", !generatePolicyShipping(TIENDA, { ...BASE, shipsNationwide: false }).includes("días hábiles"));

/* ── 2 bis) La tienda que entrega un archivo ──────────────────────────────────
   Las tres políticas generadas estaban escritas para algo que llega en una caja.
   Aplicadas a una tienda de descargas no quedaban "raras": quedaban falsas. Le
   prometían un envío que no existe, le hablaban de un producto que "recibe"
   cuando nunca recibe nada, y le pedían devolverlo "sin uso, con sus etiquetas y
   su embalaje original".

   Lo que NO cambia, y por eso se chequea explícitamente: el derecho de
   arrepentimiento son los mismos 10 días corridos del art. 34. Esta tienda no lo
   recorta. Lo único distinto es desde cuándo se cuentan. */
console.log("\n2 bis) La tienda que entrega un archivo");

const DIGITAL: LegalStoreInfo = { ...TIENDA, entregaPorDescarga: true };

const entregaDigital = generatePolicyShipping(DIGITAL, BASE);
chequear("entrega: no promete envíos a todo el país",
  !entregaDigital.includes("Realizamos envíos") && !entregaDigital.includes("días hábiles"), entregaDigital.slice(0, 120));
chequear("entrega: dice que llega por mail", entregaDigital.includes("link de descarga"));
chequear("entrega: dice cuánto dura y cuántas veces",
  entregaDigital.includes("30 días corridos") && entregaDigital.includes("5 veces"));
chequear("entrega: ignora las respuestas de envío del asistente",
  generatePolicyShipping(DIGITAL, { ...BASE, shipsNationwide: false, avgDeliveryDays: "40" }) === entregaDigital);

const devolucionesDigital = generatePolicyReturns(DIGITAL, BASE);
chequear("devoluciones: conserva los 10 días del art. 34",
  devolucionesDigital.includes("10 días corridos") && devolucionesDigital.includes("art. 34"));
chequear("devoluciones: los cuenta desde la compra, no desde que 'recibís el producto'",
  !devolucionesDigital.includes("recibís el producto"), devolucionesDigital.slice(0, 200));
chequear("devoluciones: no promete la garantía de 6 y 3 meses de un objeto",
  !devolucionesDigital.includes("6 meses") && !devolucionesDigital.includes("3 meses"));
chequear("devoluciones: no pide devolverlo con etiquetas y embalaje",
  !devolucionesDigital.includes("embalaje original") && !devolucionesDigital.includes("sin uso"));
chequear("devoluciones: dice qué pasa con el link al cancelar",
  devolucionesDigital.includes("deja de funcionar"));
chequear("devoluciones: promete reemplazo si el archivo no abre",
  devolucionesDigital.includes("no se abre") || devolucionesDigital.includes("no se abre, llega dañado"));

const conDiasExtra = generatePolicyReturns(DIGITAL, { ...BASE, extraReturnDays: 20 });
chequear("devoluciones: los días extra también valen acá", conDiasExtra.includes("30 días corridos desde la compra"));

const terminosDigital = generatePolicyTerms(DIGITAL, BASE);
chequear("términos: no habla de despacho donde no se despacha",
  !terminosDigital.includes("despachado"), terminosDigital.slice(0, 200));
/* La licencia es lo único que la tienda tiene para oponerle a quien revenda el
   archivo o lo suba a un grupo, y es el riesgo número uno de vender algo que se
   copia sin costo. */
chequear("términos: dice que es para uso personal y no se revende",
  terminosDigital.includes("uso personal") && terminosDigital.includes("revenderlos"));

/* Y el otro lado: sin la bandera, todo sale exactamente como antes. Es lo que
   permite que el campo sea opcional sin romperle la política a nadie. */
chequear("sin la bandera, la entrega sigue siendo la de siempre",
  generatePolicyShipping(TIENDA, BASE).includes("Realizamos envíos a todo el país"));
chequear("sin la bandera, las devoluciones siguen siendo las de siempre",
  generatePolicyReturns(TIENDA, BASE).includes("recibís el producto") &&
    generatePolicyReturns(TIENDA, BASE).includes("6 meses"));
chequear("sin la bandera, los términos no hablan de licencias",
  !generatePolicyTerms(TIENDA, BASE).includes("uso personal"));

/* ── 3) La privacidad declara lo que de verdad hay ────────────────────────── */
console.log("\n3) La politica de privacidad no miente sobre los trackers");

const SIN_NADA: HechosPrivacidad = {
  usaAnalytics: false, usaPixel: false, usaMercadoPago: false, usaAfiliados: false, esAutos: false,
  juegoConEmail: null, tieneNewsletter: false, tienePushDeSeguidores: false,
};
const limpia = generatePolicyPrivacy(TIENDA, SIN_NADA);
chequear("sin trackers: no nombra a Google", !limpia.includes("Google Analytics"));
chequear("sin trackers: no nombra a Meta", !limpia.includes("Meta Pixel"));
chequear("sin trackers: dice que no hay cookies de publicidad", limpia.includes("No usamos cookies de publicidad"));
chequear("sin MercadoPago: no lo nombra", !limpia.includes("Mercado Pago"));
/* El texto que busca es "persona afiliada" y NO "afiliado", que es lo que el
   barrido de género había dejado acá. Ojo con esa diferencia: el generador
   escribe "una persona afiliada a esta tienda", y "afiliada" no contiene la
   cadena "afiliado" — así que buscando "afiliado" el chequeo pasaba SIEMPRE,
   incluso si la política filtrara la frase con los afiliados apagados. Es
   decir: seguía en verde sin mirar nada. Va la frase textual del generador. */
chequear("sin afiliados: no los nombra", !limpia.includes("persona afiliada"));

const conTodo = generatePolicyPrivacy(TIENDA, {
  usaAnalytics: true, usaPixel: true, usaMercadoPago: true, usaAfiliados: true, esAutos: false,
  juegoConEmail: "ruleta", tieneNewsletter: true, tienePushDeSeguidores: true,
});
chequear("con Analytics: lo declara", conTodo.includes("Google Analytics"));
chequear("con Pixel: lo declara", conTodo.includes("Meta Pixel"));
chequear("con MercadoPago: aclara que la tarjeta no la ve la tienda",
  conTodo.includes("nosotros nunca los vemos ni los guardamos"));
chequear("con afiliados: aclara que no acceden a los datos", conTodo.includes("no accede a tus datos de contacto"));
chequear("con trackers: avisa que se pueden bloquear", conTodo.includes("bloquearlas desde la configuración de tu navegador"));

// Solo uno prendido no puede arrastrar al otro.
const soloPixel = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, usaPixel: true });
chequear("solo Pixel: no inventa Analytics", soloPixel.includes("Meta Pixel") && !soloPixel.includes("Google Analytics"));
const soloGa = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, usaAnalytics: true });
chequear("solo Analytics: no inventa Pixel", soloGa.includes("Google Analytics") && !soloGa.includes("Meta Pixel"));

/* ── 3 bis) Lo que se junta sin que la persona compre ─────────────────────── */
console.log("\n3 bis) Datos de gente que todavia no compro");

// Es la misma categoría que el carrito abandonado —la tienda se queda con el
// contacto de alguien que no le compró nada— pero no se siente así: se siente
// como una ruleta, un formulario de novedades y una campanita. Por eso se
// olvidan, y por eso los lee el sistema en vez de preguntarlos.
chequear("sin nada: no inventa el bloque", !limpia.includes("Datos que podés dejarnos sin comprar"));

const conNewsletter = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, tieneNewsletter: true });
chequear("newsletter: lo declara", conNewsletter.includes("Si te suscribís a nuestras novedades"));
chequear("newsletter: aclara el doble opt-in", conNewsletter.includes("confirmes la suscripción"));
chequear("newsletter: dice cómo darse de baja", conNewsletter.includes("darte de baja"));
chequear("newsletter: aparece en el plazo de guardado", conNewsletter.includes("hasta que te des de baja"));
chequear("newsletter: no arrastra la ruleta", !conNewsletter.includes("ruleta"));

const conRuleta = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, juegoConEmail: "ruleta" });
chequear("ruleta: la declara con su nombre", conRuleta.includes("Si jugás a la ruleta"));
const conRaspadita = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, juegoConEmail: "raspadita" });
chequear("raspadita: la nombra raspadita, no ruleta",
  conRaspadita.includes("Si jugás a la raspadita") && !conRaspadita.includes("a la ruleta"));

const conPush = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, tienePushDeSeguidores: true });
chequear("push: lo declara", conPush.includes("activás las notificaciones"));
chequear("push: dice cómo salirse", conPush.includes("dejar de seguirla"));
chequear("push: aparece en el plazo de guardado", conPush.includes("apenas dejás de seguirla"));

chequear("con los tres: los tres aparecen",
  ["novedades", "ruleta", "notificaciones"].every((t) => conTodo.includes(t)));

// Autos no tiene ninguna de las tres: el renderer excluye la ruleta por
// template y esos dos templates no dibujan el formulario de novedades. Aunque
// alguien arme los hechos mal, el generador no puede emitirlas.
console.log("\n3 ter) En autos ninguna de las tres puede salir");
const autosForzado = generatePolicyPrivacy(TIENDA, {
  ...SIN_NADA, esAutos: true,
  juegoConEmail: "ruleta", tieneNewsletter: true, tienePushDeSeguidores: true,
});
chequear("autos: no aparece el bloque", !autosForzado.includes("Datos que podés dejarnos sin comprar"), autosForzado.slice(0, 120));
chequear("autos: no habla de novedades", !autosForzado.includes("novedades"));
chequear("autos: no habla de ruleta", !autosForzado.includes("ruleta"));
chequear("autos: no habla de carritos de 45 días", !autosForzado.includes("45 días"));

/* ── 4) Lo que tiene que estar siempre ────────────────────────────────────── */
console.log("\n4) Las clausulas que no pueden faltar");

for (const [titulo, texto] of [
  ["nombra la Ley 25.326", limpia.includes("Ley 25.326")],
  ["dice que se pueden borrar los datos", limpia.includes("que los borremos")],
  ["nombra al organismo de control", limpia.includes("Agencia de Acceso a la Información Pública")],
  ["nombra a TiendaApps como plataforma", limpia.includes("TiendaApps")],
  ["dice cuánto se guardan", limpia.includes("Cuánto los guardamos")],
] as [string, boolean][]) {
  chequear(titulo, texto);
}

// Una tienda de autos no tiene checkout: hablarle de "tu pedido" y de carritos
// abandonados es describirle un flujo que no existe.
console.log("\n4 bis) Autos");
const autos = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, esAutos: true });
chequear("autos: habla de consulta, no de pedido", autos.includes("consulta") && !autos.includes("dirección de entrega"));
chequear("autos: aclara que no recibe datos de tarjeta", autos.includes("No pedimos ni recibimos datos de tarjetas"));
chequear("no-autos: sí habla del carrito abandonado", limpia.includes("no llegás a confirmar la compra"));

/* ── 5) Sin datos de la tienda no queda un hueco ──────────────────────────── */
console.log("\n5) Una tienda sin nombre ni WhatsApp");

const pelada = generatePolicyPrivacy({ name: "", contact: "" }, SIN_NADA);
chequear("no deja 'en  tratamos'", !pelada.includes("En  "), pelada.slice(0, 80));
chequear("cae a 'esta tienda'", pelada.includes("esta tienda"));
chequear("sin contacto no deja un paréntesis vacío", !pelada.includes("()"));

/* ── 6) Cómo escribirle a la tienda ───────────────────────────────────────── */
console.log("\n6) La frase de contacto se lee bien con y sin WhatsApp");

// Esto no lo agarró ningún chequeo: se vio leyendo el texto real de una tienda
// sin WhatsApp cargado. Decía "Escribinos o por email y lo resolvemos" — una
// frase rota, justo donde se le explica al comprador cómo ejercer sus derechos.
chequear("sin WhatsApp: no queda el 'o' colgado", !pelada.includes("Escribinos o por email"), pelada.slice(-320));
chequear("sin WhatsApp: dice 'Escribinos por email'", pelada.includes("Escribinos por email y lo resolvemos"));

const sinWa = generatePolicyReturns({ name: "X", contact: "" }, BASE);
chequear("devoluciones sin WhatsApp tampoco", !sinWa.includes("escribinos o por email"), sinWa.slice(0, 240));
chequear("devoluciones sin WhatsApp: frase entera", sinWa.includes("escribinos por email indicando tu número de pedido"));

const conWa = generatePolicyPrivacy(TIENDA, SIN_NADA);
chequear("con WhatsApp: lo nombra y deja el email", conWa.includes(`por WhatsApp (${TIENDA.contact}) o por email`), conWa.slice(-260));

// Un contacto de puros espacios es lo mismo que no tener contacto.
const soloEspacios = generatePolicyPrivacy({ name: "X", contact: "   " }, SIN_NADA);
chequear("contacto en blanco se trata como vacío", soloEspacios.includes("Escribinos por email"));
chequear("y no deja un paréntesis con aire", !soloEspacios.includes("WhatsApp ("));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
