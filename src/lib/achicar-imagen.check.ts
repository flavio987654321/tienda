/**
 * Chequeos de los pesos de imágenes y videos (13/10/26). Se corre a mano:
 *
 *   npx tsx src/lib/achicar-imagen.check.ts
 *
 * Un día se gastó más de 1 GB de Supabase con un video de 17 MB y logos PNG de
 * 2,4 MB. Lo que cuidan estos chequeos no da error de compilación si se rompe:
 * la tienda sigue andando, sólo que cada visita vuelve a costar megas.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { achicarImagen, LADO_MAXIMO, LADO_MAXIMO_LOGO } from "./achicar-imagen";
import { MAX_VIDEO_MB, MAX_VIDEO_SEGUNDOS } from "./subida-directa";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

(async () => {
/* Lo de siempre que sube la gente: una foto grande sin comprimir. */
const grande = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#c96" } })
  .composite([{ input: Buffer.from(`<svg width="4000" height="3000"><text x="200" y="1500" font-size="400">ruido 123</text></svg>`) }])
  .png().toBuffer();
const chica = await achicarImagen(grande);
const medida = chica ? await sharp(chica.bytes).metadata() : null;
chequear("una foto grande sale más liviana", !!chica && chica.bytes.length < grande.length, chica?.bytes.length);
chequear(`y con el lado mayor en ${LADO_MAXIMO}`, medida?.width === LADO_MAXIMO, medida?.width);
chequear("y en WebP", chica?.tipo === "image/webp" && chica.extension === "webp");

const logo = await achicarImagen(grande, { ladoMaximo: LADO_MAXIMO_LOGO });
chequear(`el logo queda en ${LADO_MAXIMO_LOGO}`, (await sharp(logo!.bytes).metadata()).width === LADO_MAXIMO_LOGO);

const transparente = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
const conAlfa = await achicarImagen(transparente);
chequear("la transparencia se mantiene", !conAlfa || (await sharp(conAlfa.bytes).metadata()).hasAlpha === true);

const yaLiviana = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#fff" } }).webp({ quality: 50 }).toBuffer();
chequear("una WebP que ya es liviana queda como vino", (await achicarImagen(yaLiviana)) === null);
chequear("algo que no es imagen no rompe", (await achicarImagen(Buffer.from("hola"))) === null);

/* El guardado: toda imagen pública pasa por el achicado. */
const deposito = readFileSync("src/lib/deposito-imagenes.ts", "utf8");
chequear("guardarImagen achica lo público", /if \(publico && tipo\.startsWith\("image\/"\)\)\s*\{\s*const achicada = await achicarImagen/.test(deposito));

/* Nadie más escribe imágenes públicas por su cuenta (lo otro son los PDF privados de digitales). */
const archivos: string[] = [];
const recorrer = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) recorrer(p); else if (/\.tsx?$/.test(n) && !n.includes(".check.")) archivos.push(p); } };
recorrer("src");
const escriben = archivos.filter((f) => /fetch\(`\$\{[^}]+\}\/storage\/v1\/object\/\$\{/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/")).sort();
chequear("sólo deposito-imagenes y deposito-digital escriben en el storage", JSON.stringify(escriben) === JSON.stringify(["src/lib/deposito-digital.ts", "src/lib/deposito-imagenes.ts"]), escriben);

/* Los videos. */
chequear("tope de video de 20 MB o menos", MAX_VIDEO_MB <= 20, MAX_VIDEO_MB);
chequear("tope de 1 minuto o menos", MAX_VIDEO_SEGUNDOS <= 60, MAX_VIDEO_SEGUNDOS);
chequear("el formulario mira la duración", /duracionDeVideo\(file\)/.test(readFileSync("src/app/dashboard/productos/nuevo/page.tsx", "utf8")));
for (const f of ["src/components/store/templates/motor/VideosMotor.tsx", "src/components/store/templates/drive/VideosDrive.tsx", "src/components/store/templates/volt/VideosVolt.tsx"]) {
  chequear(`${f.split("/").pop()}: con foto, el video no se baja para la tapa`, /reel\.kind === "video" && (!p\.images\[0\]|\(!portada)/.test(readFileSync(f, "utf8")));
}

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
})();
