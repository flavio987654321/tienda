/**
 * Chequeos de los enlaces para compartir. Se corre con:
 *
 *   npx tsx src/lib/enlaces-compartir.check.ts
 *
 * Lo que importa: que un link armado acá entre por `clasificarOrigen` y
 * `campaniaDe` y se cuente exactamente como se ve en la pantalla. Si esta
 * pantalla dice "Instagram · historia · lanzamiento" y Estadísticas cuenta
 * "Otros · otro · lanzamiento", el sistema entero miente.
 */

import { existsSync, readFileSync } from "node:fs";
import { CANALES, direccionBase, enlaceParaCompartir, campaniaLimpia } from "./enlaces-compartir";
import { clasificarOrigen } from "./origen-visita";
import { campaniaDe, medioDe } from "./utm-digital";

/* Lo mismo que hace el navegador al entrar (`utmDeLaUrl` en visitas-digitales), y lo que la ruta le pasa a `campaniaDe`. */
function utmDe(url: string) {
  const q = new URL(url).searchParams;
  return { utmSource: q.get("utm_source") || "", medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "", content: q.get("utm_content") || "" };
}

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── La dirección base ───────────────────────────────────────────────────── */

const app = "https://www.tiendaapps.com";
check("BASE-A", direccionBase({ id: "x", slugDigital: "mecanica", dominioPropio: "mecanicafacil.com.ar" }, "tiendaapps.com", app) === "https://mecanicafacil.com.ar",
  "con dominio propio, el dominio propio");
check("BASE-B", direccionBase({ id: "x", slugDigital: "mecanica", dominioPropio: null }, "tiendaapps.com", app) === "https://mecanica.tiendaapps.com",
  "sin dominio propio, la de tiendaapps");
check("BASE-C", direccionBase({ id: "ckabc", slugDigital: null, dominioPropio: null }, "tiendaapps.com", `${app}/`) === "https://www.tiendaapps.com/p/ckabc",
  "sin nada, la larga, sin barra doble");

/* ── Cada canal se cuenta como se ve ─────────────────────────────────────── */

for (const canal of CANALES) {
  const url = enlaceParaCompartir("https://mecanica.tiendaapps.com", canal, "Lanzamiento Septiembre");
  const utm = utmDe(url);
  const origen = clasificarOrigen(null, utm.utmSource, "mecanica.tiendaapps.com", false);
  const camp = campaniaDe(utm, utm.utmSource);
  check(`CANAL-${canal.clave}`,
    origen === canal.source && camp !== null && camp.campania === "lanzamiento septiembre" && camp.medio === medioDe(canal.medium) && camp.medio !== "otro",
    `${canal.nombre} entra como ${canal.source} · ${medioDe(canal.medium)} · "lanzamiento septiembre"`);
}

/* ── El link en sí ───────────────────────────────────────────────────────── */

const ig = CANALES[0];
check("LINK-A", enlaceParaCompartir("https://x.com", ig) === "https://x.com/?utm_source=instagram&utm_medium=bio", "sin campaña no lleva utm_campaign vacío, y el dominio pelado lleva la barra");
check("LINK-B", enlaceParaCompartir("https://x.com?a=1", ig) === "https://x.com?a=1&utm_source=instagram&utm_medium=bio", "si la base ya trae ?, se suma con &");
check("LINK-C", enlaceParaCompartir("https://x.com", ig, "  =HYPERLINK(\"malo\")  ").endsWith("&utm_campaign=hyperlink%28malo%29"),
  "la campaña pasa por la misma limpieza que al entrar: sin =, sin comillas, sin espacios de sobra, en minúscula");
check("LINK-D", campaniaLimpia("Promo Día del Padre") === "promo día del padre", "lo que se ve es lo que se va a contar");

/* ── La pantalla y la tarjeta ────────────────────────────────────────────── */

const pagina = "src/app/digitales/marketing/enlaces/page.tsx";
check("PANT-A", existsSync(pagina) && existsSync("src/app/digitales/marketing/enlaces/EnlacesClient.tsx"), "la pantalla existe");
if (existsSync(pagina)) {
  const p = readFileSync(pagina, "utf8").replace(/\r\n/g, "\n");
  const c = readFileSync("src/app/digitales/marketing/enlaces/EnlacesClient.tsx", "utf8").replace(/\r\n/g, "\n");
  const m = readFileSync("src/app/digitales/marketing/page.tsx", "utf8").replace(/\r\n/g, "\n");
  check("PANT-B", /user\.role !== "DIGITAL"/.test(p) && /store: \{ ownerId: user\.id \}/.test(p) && /rolDigital: "PRINCIPAL"/.test(p), "sólo los principales de quien mira");
  check("PANT-C", /CANALES\.map/.test(c) && /enlaceParaCompartir\(/.test(c) && /BotonCopiar/.test(c), "dibuja cada canal con su link y su botón de copiar");
  check("PANT-D", /isActive/.test(c) && /Publicá/.test(c), "un producto sin publicar lo avisa: repartir el link de un borrador es repartir un 404");
  check("PANT-E", /\/digitales\/marketing\/enlaces/.test(m), "Marketing lleva a la pantalla");
}

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
