/**
 * Chequeos de la guarda de descargas. Se corre a mano:
 *
 *   npx tsx src/lib/url-utils.check.ts
 *
 * Esto decide a dónde puede ir el SERVIDOR a buscar una imagen que eligió el
 * comerciante. Un agujero acá no se ve en ninguna pantalla y no rompe nada: el
 * ícono sale con la inicial y listo. Por eso los chequeos, y por eso son
 * paranoicos.
 */

import { urlDeDescargaPermitida, isSafeUrl } from "./url-utils";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const rechaza = (url: string) =>
  chequear(`rechaza ${url}`, urlDeDescargaPermitida(url) === null, urlDeDescargaPermitida(url)?.href);
const acepta = (url: string) =>
  chequear(`acepta ${url}`, urlDeDescargaPermitida(url) !== null);

/* ── Lo que hay que frenar ────────────────────────────────────────────────── */
console.log("\n1) Direcciones que apuntan adentro");

// La de metadatos de la nube: la joya de cualquier SSRF.
rechaza("http://169.254.169.254/latest/meta-data/");
rechaza("http://169.254.169.254/");
rechaza("http://localhost/admin");
rechaza("http://localhost:3000/api/admin");
rechaza("https://algo.localhost/x");
rechaza("http://127.0.0.1:5432/");
rechaza("http://127.1.2.3/");
rechaza("http://0.0.0.0/");
rechaza("http://10.0.0.5/interno");
rechaza("http://192.168.1.1/router");
rechaza("http://172.16.0.1/");
rechaza("http://172.31.255.255/");
rechaza("http://100.64.0.1/");
rechaza("http://servicio.internal/");
rechaza("http://[::1]/");
rechaza("http://[fd00::1]/");
rechaza("http://[fe80::1]/");

// La familia que se le escapaba a la primera version. `::ffff:169.254.169.254` es
// la ip de metadatos escrita en IPv6, y el navegador la normaliza a
// `::ffff:a9fe:a9fe` — no empieza con fc, ni con fe80, ni parece IPv4. Pasaba.
rechaza("http://[::ffff:169.254.169.254]/latest/meta-data/");
rechaza("http://[::ffff:a9fe:a9fe]/");
rechaza("http://[::ffff:127.0.0.1]/");
rechaza("http://[::ffff:10.0.0.1]/");
rechaza("http://[::]/");
rechaza("http://[0:0:0:0:0:0:0:1]/");
rechaza("http://[2001:4860:4860::8888]/logo.png"); // hasta las publicas: un logo
                                                    // real no vive en una IPv6 cruda

console.log("\n2) Protocolos que no son http(s)");
rechaza("file:///etc/passwd");
rechaza("gopher://127.0.0.1:11211/");
rechaza("javascript:alert(1)");
rechaza("data:image/png;base64,AAAA");
rechaza("ftp://interno/archivo");

console.log("\n3) Basura");
chequear("null no pasa", urlDeDescargaPermitida(null) === null);
chequear("undefined no pasa", urlDeDescargaPermitida(undefined) === null);
chequear("el string vacio no pasa", urlDeDescargaPermitida("") === null);
chequear("un objeto no pasa", urlDeDescargaPermitida({ href: "http://x" }) === null);
rechaza("no-soy-una-url");
rechaza("/ruta/relativa");

/* ── Lo que tiene que seguir andando ──────────────────────────────────────── */
console.log("\n4) Los logos de verdad siguen entrando");

// El storage real donde viven los logos subidos.
acepta("https://msgqbwzlgupovphzmban.supabase.co/storage/v1/object/public/product-images/products/1786824047310-e2osyo9ae89.png");
acepta("https://cdn.ejemplo.com/logo.png");
acepta("http://ejemplo.com.ar/logo.jpg");
// 172.32 ya está fuera del rango privado (que termina en 172.31).
acepta("http://172.32.0.1/logo.png");
// 169.253 no es link-local.
acepta("http://169.253.0.1/logo.png");
// 100.63 está fuera del rango de carrier-grade NAT (100.64–100.127).
acepta("http://100.63.0.1/logo.png");

/* ── La diferencia con la otra validación ─────────────────────────────────── */
console.log("\n5) Por que no alcanzaba con isSafeUrl");

// Este es el punto de todo: la validación que había al guardar el logo daba por
// buena la url de metadatos, porque solo miraba el protocolo.
chequear("isSafeUrl daba por buena la ip de metadatos (por eso hizo falta la otra)",
  isSafeUrl("http://169.254.169.254/latest/meta-data/") === true);
chequear("y la nueva la frena",
  urlDeDescargaPermitida("http://169.254.169.254/latest/meta-data/") === null);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
