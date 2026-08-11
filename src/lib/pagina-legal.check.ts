/**
 * Chequeos de la cáscara de /terminos y /privacidad. Se corre a mano:
 *
 *   npx tsx src/lib/pagina-legal.check.ts
 *
 * El bloque 1 es un 500 que se podía disparar escribiendo una palabra en la
 * URL. Las dos páginas resolvían el rol así:
 *
 *     const role = (roleParam as keyof typeof CONTENT) ?? "buyer";
 *     const content = CONTENT[role] ?? CONTENT.buyer;
 *
 * El `??` tapa una clave que no existe, pero NO una heredada de
 * `Object.prototype`. `?role=constructor` devuelve la función `Object`, que es
 * truthy — así que el `??` no la reemplaza — y la página reventaba al hacer
 * `content.sections.map`. Lo mismo con `__proto__`, `toString`, `valueOf` y
 * `hasOwnProperty`: cinco URLs públicas que devolvían 500.
 */

import { rolValido, anclaDeSeccion } from "@/components/legal/PaginaLegalPlataforma";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const ROLES = { owner: {}, seller: {}, buyer: {}, donor: {} };

/* ── 1) Las claves de Object.prototype ────────────────────────────────────── */
console.log("\n1) Ninguna clave heredada pasa como rol");

for (const ataque of ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable"]) {
  chequear(`"${ataque}" se rechaza`, rolValido(ataque, ROLES) === null, rolValido(ataque, ROLES));
}

// La prueba de fondo: lo que devuelve esta función SIEMPRE tiene que dar un
// objeto con `sections`. Si alguna vez dejara pasar una clave heredada, vuelve
// el 500.
console.log("\n1 bis) Lo que sale siempre indexa un rol de verdad");
const CONTENIDO: Record<string, { sections: number[] }> = {
  owner: { sections: [1] }, seller: { sections: [1] }, buyer: { sections: [1] },
};
let todosResuelven = true;
for (const crudo of ["owner", "constructor", "__proto__", "toString", "xx", "", "buyer"]) {
  const rol = rolValido(crudo, CONTENIDO) ?? "buyer";
  if (!Array.isArray(CONTENIDO[rol]?.sections)) todosResuelven = false;
}
chequear("ninguna entrada deja el contenido sin secciones", todosResuelven);

/* ── 2) Lo normal ─────────────────────────────────────────────────────────── */
console.log("\n2) Los roles de verdad");

chequear("owner pasa", rolValido("owner", ROLES) === "owner");
chequear("seller pasa", rolValido("seller", ROLES) === "seller");
chequear("buyer pasa", rolValido("buyer", ROLES) === "buyer");
chequear("donor pasa", rolValido("donor", ROLES) === "donor");
// /terminos tiene 3 roles y /privacidad 4: el donante no existe en términos, y
// pedirlo ahí tiene que caer al default en vez de romper.
chequear("donor NO existe en un set de 3", rolValido("donor", { owner: {}, seller: {}, buyer: {} }) === null);

/* ── 3) Basura ────────────────────────────────────────────────────────────── */
console.log("\n3) Basura en el parametro");

for (const basura of ["", "   ", "OWNER", "owner ", "<script>", "../../etc/passwd", "owner,seller"]) {
  chequear(`${JSON.stringify(basura)} se rechaza`, rolValido(basura, ROLES) === null);
}
chequear("undefined se rechaza", rolValido(undefined, ROLES) === null);
chequear("un no-string se rechaza", rolValido(42 as unknown as string, ROLES) === null);

/* ── 4) Las anclas del indice ─────────────────────────────────────────────── */
console.log("\n4) Las anclas del indice");

chequear("saca la numeración", anclaDeSeccion("3. Planes disponibles") === "planes-disponibles", anclaDeSeccion("3. Planes disponibles"));
chequear("saca los acentos", anclaDeSeccion("1. Aceptación de los términos") === "aceptacion-de-los-terminos", anclaDeSeccion("1. Aceptación de los términos"));
chequear("maneja el 'bis'", anclaDeSeccion("6 bis. Programa de Verificación de identidad") === "bis-programa-de-verificacion-de-identidad", anclaDeSeccion("6 bis. Programa de Verificación de identidad"));
chequear("sin barras ni signos raros", /^[a-z0-9-]+$/.test(anclaDeSeccion("9 bis. Fuerza mayor e interrupciones de Mercado Pago")));
chequear("un título vacío no da un ancla vacía", anclaDeSeccion("") === "seccion");
chequear("un título de puros números tampoco", anclaDeSeccion("8. ") === "seccion", anclaDeSeccion("8. "));

// Dos secciones con la misma ancla harían que el índice mande siempre a la
// primera. Se verifica sobre los títulos reales del rol más largo.
console.log("\n4 bis) Ninguna ancla se repite");
const TITULOS_OWNER = [
  "1. Aceptación de los términos", "1 bis. Edad mínima requerida", "2. Descripción del servicio para dueños",
  "3. Planes disponibles", "4. Dominio personalizado (Plan Tienda Premium)", "5. Responsabilidades del dueño",
  "5 bis. Términos y política de privacidad de tu tienda", "6. Gestión de afiliados y comisiones",
  "6 bis. Programa de Verificación de identidad", "6 ter. Notificaciones push a visitantes (Plan Premium)",
  "6 quater. Aplicaciones e integraciones con servicios de terceros",
  "7. Cerrar tu tienda, reactivarla y cierre por falta de pago",
  "7 bis. Fallecimiento o incapacidad del titular", "7 ter. Cambio de rubro de la tienda",
  "8. Propiedad intelectual", "8 bis. Donaciones a la Canasta Solidaria o a una Causa Libre",
  "8 ter. Contenido robado o que infringe derechos de terceros", "9. Disponibilidad del servicio",
  "9 bis. Fuerza mayor e interrupciones de Mercado Pago", "10. Modificaciones", "11. Contacto",
];
const anclas = TITULOS_OWNER.map(anclaDeSeccion);
const repetidas = anclas.filter((a, i) => anclas.indexOf(a) !== i);
chequear(`las ${anclas.length} anclas son únicas`, repetidas.length === 0, repetidas);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
