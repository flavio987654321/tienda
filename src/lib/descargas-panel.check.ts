/**
 * Chequeos de la sección "Descargas" del panel. Se corre a mano:
 *
 *   npx tsx src/lib/descargas-panel.check.ts
 *
 * ── Por qué esta pantalla necesita un chequeo ────────────────────────────────
 *
 * Es una tabla. Se ve bien, carga rápido y no se rompe. Lo que puede salir mal
 * acá no se ve mirándola:
 *
 * 1. **Que el token se cuele en el HTML.** El token ES el archivo: cualquiera
 *    que lo tenga descarga, sin sesión y sin ser el que compró. Basta con sumar
 *    `token: true` al `select` —una línea, en el archivo que ya lista todo lo
 *    demás— para dejar links de descarga vivos dentro del panel, en el historial
 *    del navegador y en cualquier captura de pantalla. Y la pantalla se seguiría
 *    viendo idéntica.
 *
 * 2. **Que reenviar emita un permiso nuevo.** Sería un botón que regala cinco
 *    descargas por clic y deja vivos los links viejos. Cambiar `findFirst` por
 *    un `create` o tocar `expiresAt` es un renglón.
 *
 * 3. **Que la condición de dueña se caiga del `where`.** Leer la entrega por id
 *    y comparar la tienda después es la forma clásica de olvidarse de
 *    compararla, y el id de otra tienda se prueba en un minuto.
 *
 * 4. **Que la sección se destape antes de tiempo.** Está detrás de una bandera
 *    de entorno a propósito, para poder mergear el rubro sin que ninguna dueña
 *    lo vea. Esconder el botón del menú NO cierra la URL.
 *
 * Ninguna de las cuatro rompe un test de tipos ni se nota en pantalla.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STORE_TYPES } from "./storeTypes";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const pagina   = leer("src/app/dashboard/descargas/page.tsx");
const tabla    = leer("src/app/dashboard/descargas/DescargasTable.tsx");
const reenviar = leer("src/app/api/dashboard/descargas/reenviar/route.ts");
const menu     = leer("src/components/DashboardLayout.tsx");
const avisos   = leer("src/lib/avisos-tienda.ts");

console.log("\n1) El token no sale del servidor");

chequear(
  "la pantalla NO pide el token en su select",
  !/\btoken:\s*true/.test(pagina),
  "un token en el HTML del panel es un link de descarga vivo"
);
/* Se buscan los DOS usos que serían de verdad —un campo `token:` en el tipo de
   la fila, o un `.token` leído de ella— y no la palabra suelta, que aparece en
   los comentarios que explican justamente por qué no está. */
chequear(
  "y la tabla tampoco lo conoce",
  !/\btoken\s*:/.test(tabla) && !/\.token\b/.test(tabla),
  "el botón de reenviar manda el id de la fila, no el token"
);
chequear(
  "el que sí lo lee es el servidor, para el mail",
  /token: true/.test(reenviar)
);

console.log("\n2) Reenviar manda el MISMO permiso");

chequear(
  "lo busca, no lo crea",
  /prisma\.digitalDownload\.findFirst\(/.test(reenviar) &&
    !/digitalDownload\.(create|upsert|update)/.test(reenviar),
  "emitir uno nuevo regalaría 5 descargas por clic y dejaría vivo el link viejo"
);
chequear(
  "manda el vencimiento REAL del permiso, no uno recalculado",
  /venceEl: permiso\.expiresAt/.test(reenviar)
);
chequear(
  "y el tope real, tampoco recalculado",
  /maxDescargas: permiso\.maxDescargas/.test(reenviar)
);
chequear(
  "un permiso vencido no se reenvía",
  /permiso\.expiresAt <= new Date\(\)/.test(reenviar)
);

console.log("\n3) La entrega tiene que ser de SU tienda");

chequear(
  "la condición de dueña va dentro del where, no en un if posterior",
  /findFirst\(\{\s*where: \{ id, orderItem: \{ order: \{ storeId: store\.id \} \} \}/.test(reenviar),
  "buscar por id y comparar después es la forma de olvidarse de comparar"
);
chequear(
  "la pantalla filtra por la tienda en todas sus consultas",
  (pagina.match(/order: \{ storeId: store\.id \}/g) ?? []).length >= 3
);
chequear(
  "y hay tope de envíos, por tienda y por permiso",
  /checkRateLimit\(`reenviar-descarga:tienda:/.test(reenviar) &&
    /checkRateLimit\(`reenviar-descarga:permiso:/.test(reenviar),
  "sin el segundo, veinte clics nerviosos son veinte mails al mismo buzón"
);
chequear(
  "sin sesión no se reenvía nada",
  /const user = await getCurrentUser\(\);\s*\n\s*if \(!user\) return NextResponse\.json\(\{ error: "No autorizado" \}, \{ status: 401 \}\);/.test(reenviar)
);

console.log("\n4) La sección sigue tapada, y por los dos lados");

chequear(
  "el item del menú está detrás de la bandera",
  /NEXT_PUBLIC_DIGITALES_ENABLED === "1"[\s\S]{0,300}\/dashboard\/descargas/.test(menu)
);
chequear(
  "la PANTALLA también, que esconder un botón no cierra una URL",
  /NEXT_PUBLIC_DIGITALES_ENABLED !== "1"\) redirect\("\/dashboard"\)/.test(pagina)
);
chequear(
  "y además la pantalla exige que el rubro entregue un archivo",
  /requiereArchivo\) redirect\("\/dashboard"\)/.test(pagina)
);
chequear(
  "el menú decide por la bandera del rubro y no comparando contra \"DIGITAL\"",
  /ARCHIVO_STORE_TYPES = STORE_TYPES\.filter\(\(t\) => t\.requiereArchivo\)/.test(menu) &&
    /onlyFor: ARCHIVO_STORE_TYPES/.test(menu)
);
chequear(
  "hoy hay al menos un rubro que la vería",
  STORE_TYPES.some((t) => t.requiereArchivo)
);

console.log("\n5) Los avisos apuntan a donde está el botón");

/* Un aviso cuya `seccion` no coincide con el href de un item del menú no se
   pinta en ningún lado: el menú los reparte comparando esas dos cosas. Se ve
   nunca — el aviso existe, se calcula, y no aparece. */
for (const id of ["productos-sin-archivo", "compras-sin-descargar"]) {
  const bloque = avisos.match(new RegExp(`id: "${id}"[\\s\\S]{0,200}`))?.[0] ?? "";
  chequear(`${id}: existe`, bloque.length > 0);
  chequear(
    `${id}: vive en /dashboard/descargas, que es el href del item del menú`,
    /seccion: "\/dashboard\/descargas"/.test(bloque),
    bloque.slice(0, 120)
  );
}
chequear(
  "el rojo de archivo faltante es rojo",
  /id: "productos-sin-archivo",\s*\n\s*nivel: "rojo"/.test(avisos)
);
chequear(
  "y el de compras sin bajar es amarillo: se vendió igual",
  /id: "compras-sin-descargar",\s*\n\s*nivel: "amarillo"/.test(avisos)
);
chequear(
  "los dos se preguntan primero si el rubro entrega por descarga",
  /c\.entregaPorDescarga && estado\.productosDigitalesSinArchivo > 0/.test(avisos) &&
    /c\.entregaPorDescarga && estado\.compradoresSinDescargar > 0/.test(avisos),
  "sin eso, un contador sucio se los mostraría a una tienda de ropa"
);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
