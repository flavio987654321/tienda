/**
 * Chequeo de las rutas de API que escriben sin pedir sesión. Se corre a mano:
 *
 *   npx tsx src/lib/rutas-abiertas.check.ts
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * Hay 188 endpoints. Revisarlos de a uno cada vez que se quiere saber "¿esto es
 * seguro?" no lo hace nadie, y por eso la respuesta termina siendo una opinión.
 *
 * Casi todos no son el problema: 151 piden sesión y muchos, además, atan lo que
 * tocan a la tienda del que la tiene. Los que importan son los que ESCRIBEN sin
 * pedirle nada a nadie, porque son los únicos a los que le puede pegar cualquiera
 * con `curl`. Eran 22, y de esos 18 ya tenían tope de ritmo.
 *
 * Este chequeo hace esa separación solo. Lo que queda —escribe, no pide sesión,
 * no tiene tope— es una lista de tres o cuatro que sí se puede leer entera.
 *
 * Lo encontró así: `/api/canasta/soporte` mandaba un mail por llamada sin sesión
 * ni tope, mientras su hermano `/api/contacto`, que hace lo mismo, tenía 5 por
 * IP por minuto. No fue una decisión: la ruta se escribió después y se quedó sin
 * la línea.
 *
 * ── Lo que NO prueba ─────────────────────────────────────────────────────────
 *
 * Que una ruta tenga tope no la hace correcta: esto mira qué defensas están
 * puestas, no si están bien puestas. Sirve para que nunca más haya una ruta que
 * no tenga NINGUNA, que es lo que no se puede ver a ojo con 188 archivos.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = join(__dirname, "..", "..");
const API = join(RAIZ, "src", "app", "api");

/** Los dos porteros del repo. `getOwnerStore` además ata todo a la tienda propia. */
const PORTEROS = /getCurrentUser|getOwnerStore/;

/** Firma de webhook o secreto de cron: la llave viaja en el pedido, no en la sesión. */
const FIRMADO = /CRON_SECRET|x-vercel-cron|signature|Signature|webhook|Webhook/;

/**
 * Cualquier freno de ritmo. Los nombres son varios a propósito: el de 2FA cuenta
 * intentos fallidos (`countFailures`) y el de las visitas filtra bots además del
 * ritmo (`visitaLegitima`), pero los tres son la misma idea.
 */
const TOPES = /checkRateLimit|contarConTope|conRespaldo|visitaLegitima|countFailures|recordFailure|verifyTurnstile/;

const ESCRIBE = /export async function (POST|PUT|PATCH|DELETE)/;

/**
 * Rutas que escriben sin sesión y sin tope A PROPÓSITO. Cada una lleva el motivo
 * escrito: si mañana aparece una nueva acá, tiene que venir con el suyo.
 */
const PERMITIDAS: Record<string, string> = {
  "newsletter/confirmar": "el token del mail ES la credencial; sin token no hace nada",
  "newsletter/baja": "igual que confirmar, y contesta lo mismo con token válido o no para que no se puedan adivinar",
};

function rutas(dir: string, acum: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const p = join(dir, entrada);
    if (statSync(p).isDirectory()) rutas(p, acum);
    else if (entrada === "route.ts" || entrada === "route.tsx") acum.push(p);
  }
  return acum;
}

const todas = rutas(API);
const nombre = (p: string) =>
  relative(API, p).split(sep).slice(0, -1).join("/");

let conSesion = 0, firmadas = 0, soloLeen = 0, conTope = 0;
const desnudas: string[] = [];

for (const p of todas) {
  const src = readFileSync(p, "utf8");
  if (!ESCRIBE.test(src)) { soloLeen++; continue; }
  if (PORTEROS.test(src)) { conSesion++; continue; }
  if (FIRMADO.test(src)) { firmadas++; continue; }
  if (TOPES.test(src)) { conTope++; continue; }
  desnudas.push(nombre(p));
}

console.log(`Endpoints: ${todas.length}`);
console.log(`  ${String(conSesion).padStart(3)}  escriben y piden sesión`);
console.log(`  ${String(firmadas).padStart(3)}  webhook o cron, con firma`);
console.log(`  ${String(soloLeen).padStart(3)}  sólo leen`);
console.log(`  ${String(conTope).padStart(3)}  escriben sin sesión, pero con tope de ritmo`);
console.log(`  ${String(desnudas.length).padStart(3)}  escriben sin sesión y SIN tope`);

let fallos = 0;
console.log("\nLas que escriben sin sesión y sin tope:");
if (desnudas.length === 0) console.log("  (ninguna)");
for (const r of desnudas) {
  const motivo = PERMITIDAS[r];
  if (motivo) console.log(`  ok    ${r} — ${motivo}`);
  else { fallos++; console.log(`  FALLA ${r} — cualquiera le puede pegar en un bucle`); }
}

/* Una permitida que ya no existe es basura que tapa: si la ruta se borró o se le
   puso tope, la excepción sobra y hay que sacarla. */
for (const r of Object.keys(PERMITIDAS)) {
  if (!desnudas.includes(r)) {
    fallos++;
    console.log(`  FALLA ${r} está en la lista de permitidas pero ya no la necesita — sacala`);
  }
}

console.log(fallos === 0
  ? "\nTodo bien: nada escribe sin sesión y sin tope, salvo lo que está justificado.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
