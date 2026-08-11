/**
 * Chequeo del endpoint público de la tienda. Se corre a mano:
 *
 *   npx tsx src/lib/campos-publicos.check.ts
 *
 * ── La historia ──────────────────────────────────────────────────────────────
 * `/api/public/[slug]` devolvía la fila entera de `Store` con `include` y le
 * sacaba unos pocos campos con destructuring. O sea que el default era PÚBLICO:
 * toda columna que se agregara a `Store` salía al navegador de cualquier
 * visitante salvo que alguien se acordara de sumarla a esa lista.
 *
 * No se acordaron. La lista tenía los tokens de Mercado Pago y la dirección de
 * despacho —lo que existía cuando se escribió— y cuando llegaron Meta y Google
 * Analytics, sus tokens quedaron viajando en respuestas públicas. Contra la base
 * real había un `fbAccessToken`, un `gaRefreshToken` y dos `tcOwnerAcceptedIp`
 * saliendo así.
 *
 * ── Qué se verifica ahora ────────────────────────────────────────────────────
 * La ruta pasó a lista blanca: un `select` de Prisma con los campos que pueden
 * salir. Lo que no está ahí no se lee de la base, así que agregar una columna ya
 * no publica nada.
 *
 * Este chequeo sigue leyendo el schema y marcando lo que parezca credencial o
 * dato personal, pero ahora la pregunta es la inversa: en vez de "¿está en la
 * lista de exclusiones?", pregunta "¿se coló en la lista blanca?". Y agrega dos
 * cosas que antes no se podían verificar: que la ruta no haya vuelto a
 * `include`, y que lo que la tienda pública realmente consume siga estando.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── Qué se considera sensible ─────────────────────────────────────────────── */

// Un token, un secreto o una credencial nunca salen, estén cifrados o no.
// Cifrado no es lo mismo que público: la clave puede rotar, filtrarse, o el
// algoritmo quedar viejo, y para ese entonces el ciphertext ya está copiado.
const PATRONES = [
  /token/i, /secret/i, /password/i, /apiKey/i,
  // Dato personal del dueño o dirección física de la tienda.
  /^tcOwnerAcceptedIp$/, /^origin(Street|City|Province|PostalCode)$/,
  // Identificadores de cuentas conectadas de terceros.
  /^(mpSellerId|fbUserId|fbBusinessId|fbCatalogId|fbFeedId|fbWabaId|gaAccountId|gaPropertyId)$/,
  // Plata y tripa interna. `commissionRate` es el porcentaje que la tienda le
  // paga a sus afiliadas: salía en cada respuesta pública, o sea que cualquier
  // competidor podía leer cuánto paga. `ownerId` es el id de usuario del dueño.
  /^(commissionRate|ownerId|abandonedCartsSeenAt|verificationBanned)$/,
  // Cuándo y desde dónde aceptó los términos el dueño.
  /^tcOwner(AcceptedAt|Version)$/,
];

// Lo que hace juego con un patrón pero sí puede salir, con el motivo al lado.
const PERMITIDOS: Record<string, string> = {
  // Ninguno por ahora. Si se agrega uno, que quede escrito por qué.
};

/* ── Las columnas de Store ─────────────────────────────────────────────────── */

const schema = readFileSync(join(RAIZ, "prisma", "schema.prisma"), "utf8");
const bloque = schema.match(/^model Store \{([\s\S]*?)^\}/m);
if (!bloque) {
  console.log("  FALLA no encontré el modelo Store en el schema");
  process.exit(1);
}

const columnas = bloque[1]
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))
  .map((l) => l.split(/\s+/)[0])
  .filter((n) => /^[a-z][A-Za-z0-9]*$/.test(n));

console.log(`\n1) El modelo Store se lee (${columnas.length} columnas)`);
chequear("hay columnas", columnas.length > 20, columnas.length);
chequear("está la que motivó esto (fbAccessToken)", columnas.includes("fbAccessToken"));

/* ── La lista blanca de la ruta ────────────────────────────────────────────── */

const ruta = readFileSync(join(RAIZ, "src", "app", "api", "public", "[slug]", "route.ts"), "utf8");

const listaBlanca = ruta.match(/const CAMPOS_PUBLICOS = \{([\s\S]*?)^\} as const;/m);
chequear("la ruta declara CAMPOS_PUBLICOS", !!listaBlanca);

// Sin anclar a inicio de línea: la lista agrupa campos por tema y mete varios
// por renglón (`id: true, slug: true, name: true,`). Anclado con `^\s*` leía
// nada más el primero de cada línea —22 de 68— y daba por ausentes campos que
// estaban ahí. El chequeo fallaba por su propio parser, no por la ruta.
const publicos = new Set(
  [...(listaBlanca?.[1] ?? "").matchAll(/\b([a-z][A-Za-z0-9]*):\s*true/g)].map((m) => m[1])
);

console.log(`\n2) La lista blanca tiene ${publicos.size} campos`);
chequear("no está vacía", publicos.size > 10, publicos.size);

// La regla de fondo: el `select` es lo que hace que el default sea cerrado. Si
// alguien vuelve a `include`, la lista blanca queda de adorno y todo el modelo
// se publica de nuevo sin que ningún chequeo se entere.
const consulta = ruta.match(/prisma\.store\.findFirst\(\{([\s\S]*?)\n {4}\}\)/);
chequear("la consulta usa select y no include",
  !!consulta && /\n\s{6}select: \{/.test(consulta[1]) && !/\n\s{6}include: \{/.test(consulta[1]));
chequear("el select arranca por CAMPOS_PUBLICOS",
  !!consulta && /\.\.\.CAMPOS_PUBLICOS/.test(consulta[1]));

/* ── Ninguna columna sensible se coló ──────────────────────────────────────── */

console.log("\n3) Ninguna columna sensible entró a la lista blanca");

const sensibles = columnas.filter((c) => PATRONES.some((p) => p.test(c)) && !(c in PERMITIDOS));
chequear(`se detectaron ${sensibles.length} columnas sensibles`, sensibles.length > 0, sensibles);

const coladas = sensibles.filter((c) => publicos.has(c));
chequear(
  coladas.length === 0
    ? "ninguna está en CAMPOS_PUBLICOS"
    : `SE ESTÁN PUBLICANDO: ${coladas.join(", ")}`,
  coladas.length === 0,
  coladas
);

// `ownerId` y `mpAccessToken` sí se leen de la base —hacen falta para calcular
// `isOwner` y `hasMercadoPago`— pero se sacan de la respuesta. Si alguien borra
// ese destructuring, salen los dos.
console.log("\n3 bis) Los dos internos se leen pero no se devuelven");
chequear("el select los pide", /\n\s+ownerId: true,/.test(ruta) && /\n\s+mpAccessToken: true,/.test(ruta));
chequear("y el destructuring los saca de la respuesta",
  /const \{ ownerId: _ownerId, mpAccessToken: _mpAccessToken, \.\.\.safeStore \} = store;/.test(ruta));

/* ── Lo que la tienda necesita sigue saliendo ──────────────────────────────── */

// Estos seis son los que la tienda pública realmente lee del objeto `store`
// (todo lo demás que muestra lo saca del JSON de `storeConfig`). Si alguno se
// cae de la lista blanca, la tienda deja de renderizar y no lo dice ningún tipo:
// la respuesta es JSON suelto, así que `tsc` no ve nada.
console.log("\n4) Lo que la tienda consume de verdad sigue en la lista");
for (const necesario of ["id", "name", "storeConfig", "tipoTienda"]) {
  chequear(`${necesario} está`, publicos.has(necesario), [...publicos]);
}
chequear("products se piden aparte (con su propio select)", /\n\s+products: \{/.test(ruta));
chequear("promotions también", /\n\s+promotions: \{/.test(ruta));

// Las políticas legales son documentos públicos: la página `/politicas`, el pie
// de los once templates y el mail de confirmación las leen de acá.
console.log("\n4 bis) Las políticas legales siguen saliendo");
for (const politica of ["policyReturns", "policyShipping", "policyTerms", "policyPrivacy",
                        "policyReturnsActive", "policyShippingActive", "policyTermsActive",
                        "policyPrivacyActive", "policiesUpdatedAt"]) {
  chequear(`${politica} está`, publicos.has(politica));
}

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
