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
  generatePolicyOperationAutos, generatePolicyTermsAutos,
  acotarDiasExtra, acotarPorcentaje, DIAS_AVISAME, GARANTIA_LEGAL_AUTOS,
  MAX_DIAS_EXTRA_DEVOLUCION, MAX_PORCENTAJE_CANCELACION, MAX_LARGO_DEMORA,
  type LegalWizardAnswers, type LegalStoreInfo, type HechosPrivacidad,
} from "./legal-generator";
import { DIAS_VIGENCIA } from "./busquedas";
import { tieneBloqueDeMail, tieneBloqueDeMailSegunConfig } from "./bloque-mail";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

// Autos (08/10/26): la ruleta no existe ahí (el renderer la excluye por
// template) y no puede salir aunque llegue el dato. Las novedades por mail y
// los seguidores SÍ pueden existir, y "Avisame si entra" está siempre.
console.log("\n3 ter) Autos: lo que puede y lo que no");
const autosForzado = generatePolicyPrivacy(TIENDA, {
  ...SIN_NADA, esAutos: true,
  juegoConEmail: "ruleta", tieneNewsletter: true, tienePushDeSeguidores: true,
});
chequear("autos: la ruleta no sale aunque llegue", !autosForzado.includes("ruleta"));
chequear("autos: no habla de carritos de 45 días", !autosForzado.includes("45 días"));
chequear("autos con el bloque de mail: declara las novedades, de vehículos", autosForzado.includes("cuando ingresen vehículos o baje un precio") && !autosForzado.includes("productos nuevos"));
chequear("autos con seguidores: los declara", autosForzado.includes("activás las notificaciones"));
const autosSinMail = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, esAutos: true });
chequear("autos sin el bloque de mail: no habla de suscribirse", !autosSinMail.includes("Si te suscribís"));
chequear("autos: Avisame si entra se declara siempre", autosSinMail.includes("Avisame si entra") && autosSinMail.includes("lo que estás buscando"));
chequear("autos: dice cuántos días dura", autosSinMail.includes(`A los ${DIAS_AVISAME} días dejamos de avisarte`) && autosSinMail.includes(`deja de usarse a los ${DIAS_AVISAME} días`));
chequear("los días de la política son los mismos que usa el sistema (DIAS_VIGENCIA)", DIAS_AVISAME === DIAS_VIGENCIA, { DIAS_AVISAME, DIAS_VIGENCIA });

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
// La consulta pide nombre, teléfono y mensaje: decir "email" era declarar un dato que no se pide.
const queDatos = autos.split("\n\n").find((b) => b.startsWith("Qué datos recibimos")) ?? "";
chequear("autos: la consulta no dice que pide email", !queDatos.includes("email"), queDatos);
chequear("autos: declara los datos de la tasación", queDatos.includes("tasemos tu usado") && queDatos.includes("kilómetros"));
chequear("autos: para qué incluye la oferta por el usado", autos.includes("pasarte una oferta por tu usado"));
chequear("autos: las cookies no hablan de carrito", !autos.includes("carrito"));
chequear("autos: la tasación entra en el plazo de guardado", autos.includes("de una consulta o de una tasación"));
const autosConTrackers = generatePolicyPrivacy(TIENDA, { ...SIN_NADA, esAutos: true, usaPixel: true });
chequear("autos con Pixel: las cookies tampoco hablan de carrito", !autosConTrackers.includes("carrito") && autosConTrackers.includes("Meta Pixel"));

console.log("\n4 ter) Autos: condiciones y términos");
const AUTOS_RESP = { hasWarranty: false, requiresDeposit: false, depositRefundable: false };
const sinGarantia = generatePolicyOperationAutos(TIENDA, AUTOS_RESP);
const conGarantia = generatePolicyOperationAutos(TIENDA, { ...AUTOS_RESP, hasWarranty: true });
chequear("sin garantía propia: igual nombra la garantía legal", sinGarantia.includes(GARANTIA_LEGAL_AUTOS));
chequear("con garantía propia: también", conGarantia.includes(GARANTIA_LEGAL_AUTOS));
chequear("la garantía legal dice 3 meses usados y 6 meses 0 km", GARANTIA_LEGAL_AUTOS.includes("3 meses para usados") && GARANTIA_LEGAL_AUTOS.includes("6 meses para vehículos 0 km"));
const terminosAutos = generatePolicyTermsAutos(TIENDA, AUTOS_RESP);
chequear("términos: precios en pesos o dólares según el vehículo", terminosAutos.includes("en pesos o en dólares, según cada vehículo"));
chequear("términos: la tasación depende de ver el auto en persona", terminosAutos.includes("queda sujeta a revisar el vehículo"));
chequear("términos: el primer contacto no es sólo WhatsApp", terminosAutos.includes("por WhatsApp, por teléfono o desde el formulario"));
chequear("términos: no es venta a distancia", terminosAutos.includes("no es una venta a distancia"));

console.log("\n4 quater) Cuándo una tienda junta mails (lib/bloque-mail)");
chequear("Auto Motor con el bloque a la vista: sí", tieneBloqueDeMail("auto-motor", []));
chequear("Auto Motor con el bloque oculto: no", !tieneBloqueDeMail("auto-motor", ["am-novedades"]));
chequear("Auto Drive con el bloque oculto: no", !tieneBloqueDeMail("auto-drive", ["ad-novedades"]));
chequear("Auto Drive ocultando OTRO bloque: sí", tieneBloqueDeMail("auto-drive", ["am-novedades", "ad-videos"]));
chequear("Aire (moda): sí", tieneBloqueDeMail("aire", []));
chequear("Electro Prime (sin bloque): no", !tieneBloqueDeMail("electro-prime", []));
chequear("sin diseño elegido: no", !tieneBloqueDeMail(null, []));
chequear("desde el JSON de la base", tieneBloqueDeMailSegunConfig(JSON.stringify({ template: "auto-motor" })) && !tieneBloqueDeMailSegunConfig(JSON.stringify({ template: "auto-motor", hiddenSections: ["am-novedades"] })));
chequear("JSON roto: no (y no explota)", !tieneBloqueDeMailSegunConfig("{roto"));
chequear("JSON vacío: no", !tieneBloqueDeMailSegunConfig(""));
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

/* Lo que declara cada TIENDA (arriba) y lo que declara la PLATAFORMA tienen que
   decir lo mismo (08/10/26). La política de TiendaApps no nombraba el newsletter
   por mail, decía que del seguidor push no se guardaba ningún dato y no tenía
   una palabra de tasaciones ni de "Avisame si entra". */
console.log("\n5) La política de la plataforma dice lo mismo que las de las tiendas");
const raiz = join(__dirname, "..", "..");
const priv = readFileSync(join(raiz, "src/app/privacidad/page.tsx"), "utf8");
const term = readFileSync(join(raiz, "src/app/terminos/page.tsx"), "utf8");
chequear("privacidad: declara los suscriptores por mail (Dueño y Cliente)", priv.includes("Suscriptores por mail de tu tienda") && priv.includes("Novedades por mail de una tienda"));
chequear("privacidad: ya no dice que del seguidor no se guarda ningún dato", !priv.includes("No almacenamos nombre, email ni ningún dato personal identificable del visitante"));
chequear("privacidad: declara tasaciones y 'Avisame si entra' (Dueño y Cliente)", (priv.match(/Avisame si entra/g) ?? []).length >= 4 && priv.includes("Tasación de tu usado"));
chequear("privacidad: los días de la búsqueda salen de DIAS_VIGENCIA", priv.includes("import { DIAS_VIGENCIA }") && !/\b90 días la búsqueda/.test(priv));
chequear("términos: el tope semanal sale de la constante", term.includes("${PUSH_CAMPAIGNS_PER_WEEK} campañas por semana") && !term.includes("máximo 3 campañas"));
chequear("términos: ninguna consulta de autos acredita comisión", !term.includes("la comisión se acredita cuando el dueño de la tienda confirma la venta") && !term.includes("Si confirmás la consulta como venta, la comisión se acredita"));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
