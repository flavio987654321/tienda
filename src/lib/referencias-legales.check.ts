/**
 * Chequeo de las referencias cruzadas de /terminos y /privacidad. Se corre a mano:
 *
 *   npx tsx src/lib/referencias-legales.check.ts
 *
 * Los términos se remiten entre sí todo el tiempo ("ver la sección 8 ter", "los
 * plazos están en la sección 6"). Nadie las verifica, y una se rompió:
 *
 *   Sección 7 del Dueño: "Eliminar tu cuenta es otra cosa y no tiene vuelta:
 *                         ver la sección 8."
 *   Sección 8 del Dueño: "Propiedad intelectual".
 *
 * El número venía copiado de los términos del Cliente, donde la 8 sí es
 * cancelación de cuenta. O sea que el documento mandaba a leer una sección que
 * hablaba de otra cosa, y de paso tapaba que el borrado definitivo de cuenta no
 * estaba explicado en ningún lado.
 *
 * Este chequeo lee los dos archivos como texto —igual que
 * `campos-publicos.check.ts` con el schema— y verifica que toda referencia
 * apunte a una sección que existe en el mismo rol.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

// "bis", "ter"… y también el "2 bis a" que usa la política de privacidad para
// meter una sección entre la 2 bis y la 2 ter.
// El `(?![a-z])` del final no es cosmético: sin él, la letra suelta de "2 bis a"
// también hacía juego con la "p" de "sección 3 bis **p**ara el detalle", y el
// chequeo inventaba dos referencias rotas que no existían.
const ORDINAL = String.raw`\d+(?:\s+(?:bis|ter|quater|quinquies|sexies|septies|octies)(?:\s+[a-z](?![a-z]))?)?`;

/** "7 quater. Eliminar tu cuenta" → "7 quater" */
function numeroDe(titulo: string): string | null {
  const m = titulo.match(new RegExp(`^(${ORDINAL})\\s*\\.`, "i"));
  return m ? m[1].toLowerCase().replace(/\s+/g, " ") : null;
}

/** Solo lo que está adentro de `const CONTENT = { … };`. */
function bloqueContenido(fuente: string): string {
  const desde = fuente.indexOf("const CONTENT = {");
  if (desde === -1) return "";
  // El primer `};` a la izquierda del todo cierra el objeto.
  const hasta = fuente.indexOf("\n};", desde);
  return fuente.slice(desde, hasta === -1 ? undefined : hasta);
}

/**
 * Parte el CONTENT por rol y devuelve los títulos de cada uno.
 *
 * Se recorta a CONTENT a propósito: mirando el archivo entero, el `title:` del
 * bloque `openGraph` de la metadata entraba como si fuera una sección legal y
 * el chequeo fallaba por una sección que no existe.
 */
function seccionesPorRol(fuente: string): Record<string, string[]> {
  const roles: Record<string, string[]> = {};
  const partes = bloqueContenido(fuente).split(/^ {2}(\w+): \{$/m);
  for (let i = 1; i < partes.length; i += 2) {
    const clave = partes[i];
    const cuerpo = partes[i + 1] ?? "";
    roles[clave] = [...cuerpo.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
  }
  return roles;
}

const ARCHIVOS: [string, string][] = [
  ["/terminos", join(RAIZ, "src", "app", "terminos", "page.tsx")],
  ["/privacidad", join(RAIZ, "src", "app", "privacidad", "page.tsx")],
];

for (const [nombre, ruta] of ARCHIVOS) {
  const fuente = readFileSync(ruta, "utf8");
  const roles = seccionesPorRol(fuente);

  console.log(`\n── ${nombre} ──`);
  chequear(`se leen los roles (${Object.keys(roles).join(", ")})`, Object.keys(roles).length >= 3, Object.keys(roles));

  for (const [rol, titulos] of Object.entries(roles)) {
    const numeros = new Set(titulos.map(numeroDe).filter((n): n is string => n !== null));
    chequear(`${rol}: ${titulos.length} secciones, todas numeradas`, numeros.size === titulos.length, {
      titulos: titulos.length, numeros: numeros.size,
      sinNumero: titulos.filter((t) => numeroDe(t) === null),
    });

    // Las referencias del cuerpo de ese rol.
    const contenido = bloqueContenido(fuente);
    const inicio = contenido.indexOf(`  ${rol}: {`);
    const fin = contenido.indexOf("\n  },", inicio);
    const cuerpo = contenido.slice(inicio, fin === -1 ? undefined : fin);

    // "sección 8", "sección 8 ter", "seccion 7 quater" — pero NO las que
    // remiten al OTRO documento ("sección 6 de la Política de Privacidad"),
    // que se verifican aparte más abajo.
    const refs = [...cuerpo.matchAll(new RegExp(String.raw`secci[oó]n (${ORDINAL})(?!\s+(?:de|del)\s+la\s+Pol)`, "gi"))]
      .map((m) => m[1].toLowerCase().replace(/\s+/g, " "));

    const rotas = [...new Set(refs)].filter((r) => !numeros.has(r));
    chequear(
      rotas.length === 0
        ? `${rol}: las ${new Set(refs).size} referencias internas apuntan a secciones que existen`
        : `${rol}: REFERENCIAS ROTAS → ${rotas.join(", ")}`,
      rotas.length === 0,
      { rotas, existentes: [...numeros] }
    );
  }
}

/* ── Las referencias al otro documento ─────────────────────────────────────── */
console.log("\n── Entre documentos ──");

const terminos = readFileSync(ARCHIVOS[0][1], "utf8");
const privacidad = readFileSync(ARCHIVOS[1][1], "utf8");
const numerosPrivacidad = new Set(
  Object.values(seccionesPorRol(privacidad)).flat().map(numeroDe).filter((n): n is string => n !== null)
);

const refsCruzadas = [...terminos.matchAll(new RegExp(String.raw`secci[oó]n (${ORDINAL})\s+de\s+la\s+Pol[ií]tica\s+de\s+Privacidad`, "gi"))]
  .map((m) => m[1].toLowerCase().replace(/\s+/g, " "));
const cruzadasRotas = [...new Set(refsCruzadas)].filter((r) => !numerosPrivacidad.has(r));
chequear(
  cruzadasRotas.length === 0
    ? `las ${new Set(refsCruzadas).size} referencias de /terminos a /privacidad existen`
    : `ROTAS hacia /privacidad → ${cruzadasRotas.join(", ")}`,
  cruzadasRotas.length === 0,
  cruzadasRotas
);

/* ── Lo puntual que se arregló ─────────────────────────────────────────────── */
console.log("\n── Los tres arreglos ──");

chequear("existe la sección de eliminar cuenta del dueño", terminos.includes("7 quater. Eliminar tu cuenta"));
chequear("ya no manda a la sección 8 por el borrado de cuenta", !terminos.includes("no tiene vuelta: ver la sección 8."));
chequear("la 5 ya no contradice a la 6 sobre quién paga",
  !terminos.includes("Sos responsable de las comisiones que acordés con tus afiliados"));
chequear("la 5 remite a la 6", terminos.includes("El pago de las comisiones no está a tu cargo"));
chequear("/terminos tiene la solapa donante", /^ {2}donor: \{$/m.test(terminos));
chequear("/privacidad también", /^ {2}donor: \{$/m.test(privacidad));
// Los dos documentos tienen que ofrecer los mismos roles: si uno suma una
// solapa y el otro no, alguien vuelve a caer en la que no le corresponde.
const rolesT = Object.keys(seccionesPorRol(terminos)).sort().join(",");
const rolesP = Object.keys(seccionesPorRol(privacidad)).sort().join(",");
chequear("los dos documentos ofrecen los mismos roles", rolesT === rolesP, { terminos: rolesT, privacidad: rolesP });

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
