/**
 * Chequeo del endpoint público de la tienda. Se corre a mano:
 *
 *   npx tsx src/lib/campos-publicos.check.ts
 *
 * `/api/public/[slug]` devuelve la fila entera de `Store` con `include` y le
 * saca unos pocos campos con destructuring. O sea que el default es PÚBLICO:
 * toda columna que se agregue a `Store` sale al navegador de cualquier
 * visitante salvo que alguien se acuerde de sumarla a esa lista.
 *
 * No se acordaron. La lista tenía los tokens de Mercado Pago y la dirección de
 * despacho —lo que existía cuando se escribió— y cuando llegaron Meta y Google
 * Analytics, sus tokens quedaron viajando en respuestas públicas. Contra la
 * base real había un `fbAccessToken`, un `gaRefreshToken` y dos
 * `tcOwnerAcceptedIp` saliendo así.
 *
 * Este chequeo lee el schema de Prisma, marca toda columna que parezca
 * credencial o dato personal, y falla si alguna no está siendo excluida. No
 * arregla el default; hace que la próxima vez se note antes de deployar.
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

/* ── Qué excluye hoy la ruta ───────────────────────────────────────────────── */

const ruta = readFileSync(join(RAIZ, "src", "app", "api", "public", "[slug]", "route.ts"), "utf8");

// El destructuring que arma `safeStore`: todo lo que esté antes del rest es
// lo que NO sale.
const destructuring = ruta.match(/const \{([\s\S]*?)\.\.\.safeStore\s*\} = store;/);
chequear("la ruta arma safeStore con destructuring", !!destructuring);

const excluidos = new Set(
  (destructuring?.[1] ?? "")
    .split(/[,\n]/)
    .map((s) => s.replace(/\/\/.*$/, "").trim())
    .filter((s) => /^[a-z][A-Za-z0-9]*$/.test(s))
);

console.log(`\n2) La ruta excluye ${excluidos.size} campos`);
chequear("excluye mpAccessToken", excluidos.has("mpAccessToken"));
chequear("excluye fbAccessToken", excluidos.has("fbAccessToken"), [...excluidos]);
chequear("excluye gaRefreshToken", excluidos.has("gaRefreshToken"));
chequear("excluye tcOwnerAcceptedIp", excluidos.has("tcOwnerAcceptedIp"));

/* ── Ninguna columna sensible se escapa ────────────────────────────────────── */

console.log("\n3) Ninguna columna sensible sale al público");

const sensibles = columnas.filter((c) => PATRONES.some((p) => p.test(c)) && !(c in PERMITIDOS));
chequear(`se detectaron ${sensibles.length} columnas sensibles`, sensibles.length > 0, sensibles);

const escapadas = sensibles.filter((c) => !excluidos.has(c));
chequear(
  escapadas.length === 0
    ? "todas están excluidas"
    : `SE ESTÁN PUBLICANDO: ${escapadas.join(", ")}`,
  escapadas.length === 0,
  escapadas
);

/* ── Las políticas sí salen: son documentos públicos ───────────────────────── */

console.log("\n4) Lo que sí tiene que salir sigue saliendo");
for (const publica of ["policyReturns", "policyTerms", "policyPrivacy", "storeConfig", "name", "slug"]) {
  chequear(`${publica} no está excluida`, !excluidos.has(publica));
}

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
