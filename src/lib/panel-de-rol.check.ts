/**
 * Chequeos de a dónde manda cada rol. Se corre a mano:
 *
 *   npx tsx src/lib/panel-de-rol.check.ts
 *
 * Lo que se protege acá es que la plataforma le diga a cada persona UN solo
 * lugar. Esta decisión estaba copiada a mano en trece archivos —la home, el nav
 * compartido y los once templates de tienda— más la ruta `/panel`, que la hacía
 * del lado del servidor. Catorce copias de lo mismo, y ya habían empezado a
 * separarse: `/panel` mandaba al dashboard a quien fuera dueño de una tienda
 * aunque su rol no dijera OWNER, y las trece copias de la interfaz no, así que
 * a esa misma persona el botón del nav la mandaba a "Mi cuenta".
 *
 * El caso que más fácil se vuelve a romper es justamente ese: alguien agrega un
 * rol nuevo o mueve una ruta y toca solo el archivo que tenía delante.
 */

import { panelDeRol } from "./panel-de-rol";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) {
    console.log(`  ok   ${titulo}`);
  } else {
    fallos++;
    console.log(`  FALLA ${titulo}`, detalle ?? "");
  }
};

console.log("\nCada rol a su panel:");
chequear("ADMIN va al panel de admin", panelDeRol("ADMIN").href === "/admin");
chequear("OWNER va al dashboard", panelDeRol("OWNER").href === "/dashboard");
chequear("SELLER va al panel de afiliados", panelDeRol("SELLER").href === "/afiliados");
chequear("un comprador va a mi cuenta", panelDeRol("BUYER").href === "/mi-cuenta");

console.log("\nSin rol conocido, nadie se queda sin destino:");
chequear("null cae en mi cuenta", panelDeRol(null).href === "/mi-cuenta");
chequear("undefined cae en mi cuenta", panelDeRol(undefined).href === "/mi-cuenta");
chequear("un rol que no existe cae en mi cuenta", panelDeRol("ROL_NUEVO").href === "/mi-cuenta");

console.log("\nLa regla de /panel: tener tienda pesa más que el rol:");
chequear(
  "con tienda y rol de comprador, va al dashboard",
  panelDeRol("BUYER", true).href === "/dashboard",
);
chequear(
  "con tienda y sin rol, va al dashboard",
  panelDeRol(null, true).href === "/dashboard",
);
chequear(
  "ADMIN con tienda sigue yendo al panel de admin",
  panelDeRol("ADMIN", true).href === "/admin",
  "el admin manda: es el único que no puede quedar atrapado en el dashboard",
);
chequear(
  "SELLER con tienda va al dashboard, no al panel de afiliados",
  panelDeRol("SELLER", true).href === "/dashboard",
  "misma prioridad que tenía /panel antes de unificarse",
);

console.log("\nLas etiquetas acompañan al destino:");
chequear("admin dice Admin", panelDeRol("ADMIN").label === "Admin");
chequear("dashboard dice Mi tienda", panelDeRol("OWNER").label === "Mi tienda");
chequear("afiliados dice Mi panel", panelDeRol("SELLER").label === "Mi panel");
chequear("mi cuenta dice Mi cuenta", panelDeRol("BUYER").label === "Mi cuenta");
chequear(
  "quien tiene tienda ve Mi tienda, no Mi cuenta",
  panelDeRol("BUYER", true).label === "Mi tienda",
  "el texto no puede contradecir a dónde lleva el link",
);

console.log(
  fallos === 0
    ? "\nTodo bien.\n"
    : `\n${fallos} chequeo(s) fallando.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
