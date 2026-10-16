/**
 * Chequeos de los tutoriales. Se corre a mano:
 *
 *   npx tsx src/lib/tutoriales.check.ts
 *
 * Lo que se rompe sin hacer ruido: un "Ir a la pantalla" que lleva a una
 * pantalla que se movió (404 adentro del panel), un link de YouTube pegado mal
 * (la tarjeta sigue diciendo "Próximamente" y nadie entiende por qué), y el
 * video de ropa que le aparece a una concesionaria.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { TUTORIALES, idDeYoutube, tutorialesPara, type PanelConTutoriales } from "./tutoriales";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

// ── Cada pantalla existe, y los ids no se repiten ────────────────────────────
const existe = (ruta: string) => existsSync(join(process.cwd(), "src", "app", ruta.split("?")[0], "page.tsx"));
for (const panel of Object.keys(TUTORIALES) as PanelConTutoriales[]) {
  chequear(`${panel}: existe su página de tutoriales`, existe(`/${{ tienda: "dashboard", afiliado: "afiliados", digitales: "digitales" }[panel]}/tutoriales`));
  const ids = new Set<string>();
  for (const s of TUTORIALES[panel]) {
    for (const t of s.tutoriales) {
      const clave = `${s.id}/${t.id}`;
      chequear(`${panel} ${clave}: id único`, !ids.has(clave));
      ids.add(clave);
      if (t.pantalla) chequear(`${panel} ${clave}: la pantalla ${t.pantalla} existe`, existe(t.pantalla));
      if (t.video) chequear(`${panel} ${clave}: el link de YouTube se entiende`, idDeYoutube(t.video) !== null, t.video);
    }
  }
}

// ── Los links de YouTube que se pegan ────────────────────────────────────────
const ID = "dQw4w9WgXcQ";
for (const link of [
  ID,
  `https://youtu.be/${ID}`,
  `https://youtu.be/${ID}?si=abc123`,
  `https://www.youtube.com/watch?v=${ID}`,
  `https://www.youtube.com/watch?v=${ID}&t=42s`,
  `https://m.youtube.com/watch?v=${ID}`,
  `https://youtube.com/shorts/${ID}`,
  `https://www.youtube.com/embed/${ID}`,
  `  https://youtu.be/${ID}  `,
]) chequear(`entiende ${link.trim()}`, idDeYoutube(link) === ID, idDeYoutube(link));
for (const malo of ["", null, "https://vimeo.com/123", "https://youtube.com/watch?v=corto", "https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)"]) {
  chequear(`rechaza ${JSON.stringify(malo)}`, idDeYoutube(malo) === null);
}

// ── Cada rubro ve lo suyo ────────────────────────────────────────────────────
const ids = (rubro: string | null) => tutorialesPara("tienda", rubro).flatMap((s) => s.tutoriales.map((t) => t.id));
const autos = ids("AUTOS");
const ropa = ids("ROPA");
chequear("autos ve consultas y tasaciones", autos.includes("consultas") && autos.includes("tasaciones"));
chequear("autos no ve pedidos, cupones ni cobros de carrito", !autos.includes("pedidos") && !autos.includes("cupones") && !autos.includes("cobros"));
chequear("autos no ve afiliados (está en pausa en su rubro)", !autos.includes("afiliados"));
chequear("ropa ve pedidos, cupones y afiliados", ropa.includes("pedidos") && ropa.includes("cupones") && ropa.includes("afiliados"));
chequear("ropa no ve consultas ni la agencia", !ropa.includes("consultas") && !ropa.includes("agencia"));
chequear("sin rubro se ve todo", ids(null).length === TUTORIALES.tienda.flatMap((s) => s.tutoriales).length);
chequear("ninguna sección queda vacía", ["AUTOS", "ROPA"].every((r) => tutorialesPara("tienda", r).every((s) => s.tutoriales.length > 0)));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
