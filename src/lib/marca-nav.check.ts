/**
 * El logo en la barra de arriba (15/10/26). Ver `components/store/templates/shared/MarcaNav`.
 *   npx tsx src/lib/marca-nav.check.ts
 *
 * La dueña elige en Diseño "Nombre / Logo / Logo y nombre", y tiene que valer en
 * TODOS los templates: uno que dibuje el nombre a mano en la barra se queda con
 * el nombre aunque hayan elegido el logo, y nadie se entera hasta que lo ve una
 * clienta. Un template nuevo entra solo a este chequeo.
 */
import { readFileSync, readdirSync } from "fs";
import { modoDeMarca } from "../components/store/templates/shared/MarcaNav";

let fallos = 0;
const ver = (titulo: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

console.log("\n1) La regla");
ver("sin elegir, el nombre", modoDeMarca(undefined, "x.png") === "nombre");
ver("eligió logo pero no subió ninguno: el nombre", modoDeMarca("logo", null) === "nombre" && modoDeMarca("ambos", "") === "nombre");
ver("con logo, lo que eligió", modoDeMarca("logo", "x.png") === "logo" && modoDeMarca("ambos", "x.png") === "ambos");

console.log("\n2) Cada template dibuja su marca con MarcaNav");
const dir = "src/components/store/templates";
const templates = readdirSync(dir).filter((f) => /^[A-Z].*\.tsx$/.test(f));
ver("hay templates para revisar", templates.length >= 13, templates.length);
for (const f of templates) {
  const s = leer(`${dir}/${f}`);
  const barra = s.indexOf('field="storeName" label="Nombre de la tienda"');
  ver(`${f}: el nombre de la barra va adentro de MarcaNav`,
    barra > 0 && s.lastIndexOf("<MarcaNav", barra) > 0 && s.lastIndexOf("</MarcaNav>", barra) < s.lastIndexOf("<MarcaNav", barra));
}

console.log("\n3) Las páginas de afuera de la portada");
for (const f of [
  `${dir}/productDetail/AireNav.tsx`, `${dir}/productDetail/CasaClaraDetail.tsx`, `${dir}/productDetail/ElectroPrimeDetail.tsx`,
  `${dir}/productDetail/HomeStudioDetail.tsx`, `${dir}/productDetail/TechNovaDetail.tsx`, `${dir}/productDetail/BohoTerraDetail.tsx`,
  `${dir}/productDetail/UrbanPulseDetail.tsx`, `${dir}/productDetail/VehiculoDetail.tsx`, `${dir}/volt/FichaVolt.tsx`, `${dir}/ruta/FichaRuta.tsx`,
  "src/app/tienda/[slug]/productos/CatalogoGenerico.tsx", "src/app/tienda/[slug]/vehiculos/VehiculosGenerico.tsx",
]) ver(`${f.split("/").pop()} usa MarcaNav`, leer(f).includes("<MarcaNav "));

console.log("\n4) Los datos llegan");
ver("la portada le pasa el logo a los templates", /storeLogo: store\.logo/.test(leer("src/app/tienda/[slug]/page.tsx")));
ver("la ficha suelta lee el logo y la elección", /storeLogo: store\?\.logo/.test(leer("src/app/tienda/[slug]/producto/[id]/page.tsx")) && /marcaNav: parsed\.marcaNav/.test(leer("src/app/tienda/[slug]/producto/[id]/page.tsx")));
ver("el editor le pasa el logo a la vista previa", /storeLogo: store\.logo/.test(leer("src/app/dashboard/configuracion/page.tsx")));
ver("la elección se guarda (zod no la descarta)", /marcaNav: z\.enum\(\["nombre", "logo", "ambos"\]\)/.test(leer("src/lib/store-config.ts")));
ver("el logo NO se guarda en el JSON del diseño", !/storeLogo:/.test(leer("src/lib/store-config.ts")));

console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien: el logo llega a todas las barras.");
process.exit(fallos ? 1 : 0);
