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

console.log("\n4 bis) El campo trampa");

/* Frena al bot ANTES del captcha y sin molestar a nadie. Este formulario es el
   más goloso de los tres públicos del proyecto: cada envío manda DOS mails. */
chequear("el formulario lleva el campo trampa", /name="website"/.test(formulario));
chequear(
  "escondido, fuera del tabulador y oculto para lectores de pantalla",
  /tabIndex=\{-1\}/.test(formulario) &&
    /aria-hidden="true"/.test(formulario) &&
    /autoComplete="off"/.test(formulario) &&
    /left: "-9999px"/.test(formulario),
  "si una persona lo ve o lo tabula, deja de ser una trampa y pasa a ser un bug"
);
chequear("y lo manda al servidor", /motivo, website,/.test(formulario));
chequear(
  "el servidor lo mira ANTES que nada",
  cuerpoDeLaRuta.indexOf("body.website") < cuerpoDeLaRuta.indexOf("errorDeLosDatos(")
);
chequear(
  "y le contesta que salió bien, para no enseñarle cuál es el campo",
  /if \(body\.website\) \{[\s\S]{0,700}return NextResponse\.json\(\{ ok: true, numero: numeroDeConstancia\(\) \}\)/.test(ruta)
);
/* Hay gestores de contraseñas que completan un campo llamado "website". Si le
   pasa a una persona de verdad, su solicitud se descarta sin que se entere — y
   lo que se descarta es un derecho con un plazo corriendo. */
chequear(
  "pero deja rastro, por si el descartado fue una persona",
  /descartada por el campo trampa/.test(ruta)
);

console.log("\n4 ter) Nada entra sin tope");

/* Se busca la línea entera con `includes` y no con una expresión armada al vuelo:
   una expresión construida con texto pegado es fácil de escribir mal, y escrita
   mal da verdadero siempre — un chequeo que nunca falla es peor que no tenerlo. */
for (const campo of ["nombre", "email", "telefono", "referencia", "motivo"]) {
  const declaracion =
    cuerpoDeLaRuta.split("\n").find((l) => l.includes(`const ${campo} = String(body.${campo}`)) ?? "";
  chequear(
    `${campo}: se corta antes de usarse`,
    declaracion.includes(".slice(0, MAX_"),
    declaracion.trim() || "no se encontró la declaración"
  );
}
chequear(
  "el slug se limpia y se corta antes de ir a la consulta y al log",
  /const slug = String\(body\.slug[\s\S]{0,90}\.replace\([\s\S]{0,40}\)\.slice\(0, 120\)/.test(cuerpoDeLaRuta),
  "un texto con saltos de línea en un log sirve para escribir renglones falsos"
);
chequear(
  "y el formulario usa los MISMOS topes que el servidor, no números escritos a mano",
  /maxLength=\{MAX_NOMBRE\}/.test(formulario) &&
    /maxLength=\{MAX_EMAIL\}/.test(formulario) &&
    /maxLength=\{MAX_TELEFONO\}/.test(formulario) &&
    /maxLength=\{MAX_REFERENCIA\}/.test(formulario) &&
    /maxLength=\{MAX_MOTIVO\}/.test(formulario),
  "escritos a mano se separan solos, y el que sufre es quien escribe de más y recibe un error en vez de un tope"
);

/* Lo que la dueña escribe entra en pantallas que mira cualquiera. Un nombre de
   tienda de una sola palabra larguísima, sin esto, empuja el ancho del teléfono
   en vez de bajar de renglón. */
chequear(
  "el texto largo baja de renglón en vez de estirar la pantalla",
  /break-words/.test(formulario) && /break-all/.test(formulario),
  "el nombre de la tienda y el número de constancia son los dos que pueden desbordar"
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
