/**
 * Chequeos del botón de arrepentimiento. Se corre a mano:
 *
 *   npx tsx src/lib/arrepentimiento.check.ts
 *
 * ── Qué se cuida, y por qué no alcanza con mirarlo ───────────────────────────
 *
 * Es un formulario. Se ve, se completa y anda. Lo que puede romperse acá no se
 * ve usándolo:
 *
 * 1. **Que el motivo se vuelva obligatorio.** Es un asterisco de distancia, y
 *    parece una mejora ("así sabemos por qué"). Pero el art. 34 de la Ley 24.240
 *    dice *sin necesidad de justificar el motivo*: pedirlo como requisito
 *    contradice, en el formulario, lo que la política de la misma tienda promete
 *    dos solapas más allá.
 *
 * 2. **Que pida sesión.** La Resolución 424/2020 exige que se pueda usar sin
 *    registrarse. Agregarle un `getCurrentUser` a la ruta es una línea, y deja
 *    afuera justo a quien compró como invitado.
 *
 * 3. **Que la constancia se pierda si el mail falla.** El número guardado con su
 *    fecha es lo que vale ante un reclamo. Si un error de correo tirara abajo la
 *    solicitud, la persona se quedaría sin nada y con el plazo corriendo.
 *
 * 4. **Que el botón desaparezca de alguna tienda.** Va en el pie de las once
 *    plantillas por una sola vía: la lista de links legales. Si dejara de
 *    agregarse ahí, once tiendas se quedan sin botón y ninguna pantalla lo dice.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  numeroDeConstancia, FORMATO_CONSTANCIA, errorDeLosDatos,
  MAX_MOTIVO, MAX_REFERENCIA,
} from "./arrepentimiento";
import { linksLegales, documentosPublicados, CLAVE_ARREPENTIMIENTO } from "./politicas-tienda";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const ruta       = leer("src/app/api/arrepentimiento/route.ts");
/* El cuerpo de la ruta, SIN los imports. Comparar en qué orden pasan las cosas
   usando el archivo entero encontraba las líneas de import —que están todas
   arriba, y en otro orden que las llamadas— y daba lo contrario de la verdad. */
const cuerpoDeLaRuta = ruta.slice(ruta.indexOf("export async function POST"));
const formulario = leer("src/components/ArrepentimientoForm.tsx");
const schema     = leer("prisma/schema.prisma");
const pie        = leer("src/components/SiteFooter.tsx");

console.log("\n1) El motivo NO se puede pedir obligatorio");

const conMotivo = { nombre: "Ana Pérez", email: "ana@ejemplo.com", referencia: "Pedido 123" };
chequear(
  "una solicitud SIN motivo es válida",
  errorDeLosDatos(conMotivo) === null,
  "el art. 34 dice: sin necesidad de justificar el motivo"
);
chequear(
  "y con motivo también",
  errorDeLosDatos({ ...conMotivo, motivo: "No era lo que esperaba" }) === null
);
chequear(
  "en el formulario, el campo Motivo no está marcado como requerido",
  /label="Motivo"[\s\S]{0,400}<textarea[\s\S]{0,300}\/>/.test(formulario) &&
    !/label="Motivo" requerido/.test(formulario),
  "un asterisco de más ahí contradice lo que promete la política de la tienda"
);
chequear(
  "y lo dice en pantalla, para que nadie escriba de más por las dudas",
  /No hace falta que expliques nada/.test(formulario)
);

console.log("\n2) Lo que sí se pide, y nada más");

chequear("sin nombre no se toma", errorDeLosDatos({ ...conMotivo, nombre: "" }) !== null);
chequear("con un email roto tampoco", errorDeLosDatos({ ...conMotivo, email: "ana@" }) !== null);
chequear("sin decir qué compra tampoco", errorDeLosDatos({ ...conMotivo, referencia: "" }) !== null);
chequear("el teléfono es opcional", errorDeLosDatos({ ...conMotivo, telefono: "" }) === null);
chequear("un motivo enorme se rechaza", errorDeLosDatos({ ...conMotivo, motivo: "x".repeat(MAX_MOTIVO + 1) }) !== null);
chequear("una referencia enorme también", errorDeLosDatos({ ...conMotivo, referencia: "x".repeat(MAX_REFERENCIA + 1) }) !== null);
/* Tres obligatorios y se acabó. Cada campo de más es una persona que abandona, y
   ésta es la pantalla donde no se puede poner un obstáculo. */
/* Se cuentan los `required` de los campos de verdad y no la palabra "requerido",
   que además aparece en la declaración del componente. Es el atributo que hace
   que el navegador lo exija, o sea lo que la persona sufre. */
chequear(
  "son TRES los campos obligatorios, no más",
  (formulario.match(/^\s+required$/gm) ?? []).length === 3,
  (formulario.match(/^\s+required$/gm) ?? []).length
);

console.log("\n3) La constancia");

const numeros = new Set<string>();
for (let i = 0; i < 500; i++) numeros.add(numeroDeConstancia());
chequear("500 seguidas dan 500 distintas", numeros.size === 500, numeros.size);
chequear("todas con el formato esperado", [...numeros].every((n) => FORMATO_CONSTANCIA.test(n)));
/* Se dicta por teléfono cuando alguien reclama: la O y el 0, la I y el 1 suenan
   igual y no pueden estar las dos. */
chequear(
  "sin las letras y números que se confunden dichos en voz alta",
  [...numeros].every((n) => !/[OI01]/.test(n.slice(3))),
  [...numeros].find((n) => /[OI01]/.test(n.slice(3)))
);
chequear(
  "el número es único en la base, no sólo en el código",
  /numero String @unique/.test(schema),
  "dos pedidos en paralelo leen los dos 'todavía no existe' y crean los dos"
);
chequear(
  "y si dos chocan, se reintenta en vez de fallar",
  /P2002/.test(ruta) && /intento < 3/.test(ruta)
);

console.log("\n4) La puerta abierta, protegida como tal");

chequear(
  "NO pide sesión",
  !/getCurrentUser/.test(ruta),
  "la Resolución 424/2020 exige que se pueda usar sin registrarse"
);
chequear("tiene tope por IP", /checkRateLimit\(`arrepentimiento:\$\{ip\}`/.test(ruta));
chequear("y captcha", /verifyTurnstile/.test(ruta));
/* El token del captcha es de un solo uso: gastarlo antes de validar los campos
   obliga a resolverlo de nuevo para corregir una letra. */
chequear(
  "el captcha se verifica DESPUÉS de validar los campos",
  cuerpoDeLaRuta.indexOf("errorDeLosDatos(") < cuerpoDeLaRuta.indexOf("verifyTurnstile("),
  "si no, corregir una letra obliga a resolver el captcha otra vez"
);

console.log("\n5) La solicitud no se pierde");

chequear(
  "se guarda ANTES de mandar los mails",
  cuerpoDeLaRuta.indexOf("arrepentimiento.create") < cuerpoDeLaRuta.indexOf("sendArrepentimientoEmails(")
);
chequear(
  "y si el mail falla, la solicitud igual queda registrada",
  /catch \(err\) \{\s*\n\s*console\.error\("\[arrepentimiento\] la solicitud quedó guardada pero el mail no salió/.test(ruta),
  "el número guardado con su fecha es lo que vale ante un reclamo"
);
/* Del otro lado hay alguien ejerciendo un derecho con un plazo corriendo: perder
   su solicitud porque la dirección estaba mal escrita sería cargarle un error
   nuestro. */
chequear(
  "un slug que no existe NO tira la solicitud: se toma igual",
  /slug sin tienda/.test(ruta) && !/status: 404/.test(ruta)
);
chequear(
  "storeId es nullable: la plataforma también vende y también necesita el botón",
  /storeId String\?/.test(schema)
);

console.log("\n6) El botón está donde tiene que estar");

chequear(
  "en el pie de TODA tienda, tenga políticas o no",
  linksLegales("x", documentosPublicados({})).some((l) => l.clave === CLAVE_ARREPENTIMIENTO)
);
chequear(
  "y también en una que las tiene todas",
  linksLegales("x", documentosPublicados({
    policyReturns: "a", policyShipping: "b", policyTerms: "c", policyPrivacy: "d",
  })).some((l) => l.clave === CLAVE_ARREPENTIMIENTO)
);
chequear(
  "en el pie del sitio de TiendaApps",
  /href: "\/arrepentimiento"/.test(pie),
  "la plataforma vende suscripciones: le corresponde igual que a cualquier comercio"
);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
