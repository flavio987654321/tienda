/**
 * Chequeo de la verificación en dos pasos de tiendas, digitales y afiliados.
 * Ver `lib/seguridad-cuenta`.  npx tsx src/lib/seguridad-cuenta.check.ts
 *
 * Dos mitades: las reglas puras (códigos, plazos, dispositivos) se prueban de
 * verdad; lo que depende de Supabase se controla en el código, porque son las
 * promesas que hacen los términos y no pueden desaparecer en silencio.
 */
import { readFileSync, existsSync } from "fs";
import {
  CANTIDAD_CODIGOS, DIAS_ESPERA_CON_CONTRASENA, DIAS_ESPERA_SIN_CONTRASENA,
  segundoPasoDesde, formatearCodigo, normalizarCodigoRespaldo, describirDispositivo, nivelDeSeguridad, venceLaEspera, diasDeEspera,
} from "./seguridad-cuenta-reglas";

import { TERMINOS_DOS_PASOS, PRIVACIDAD_DATO_DOS_PASOS } from "./legal-seguridad";

let fallos = 0;
const ver = (titulo: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** El código sin comentarios, para que una frase en un comentario no cuente como código. */
const codigo = (p: string) => leer(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

console.log("\n1) Los códigos de respaldo");
const bytes = Uint8Array.from({ length: 8 }, (_, i) => i * 37);
const c = formatearCodigo(bytes);
ver("tienen forma abcd-efgh", /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(c), c);
ver("se aceptan en mayúscula, sin guion o con espacios", normalizarCodigoRespaldo(c.toUpperCase()) === c && normalizarCodigoRespaldo(c.replace("-", " ")) === c);
ver("no usan letras que se confunden (0 o 1 l i u)", !/[01oliu]/.test(c));
ver("un código con una letra ambigua no se acepta", normalizarCodigoRespaldo("abcd-efg0") === null && normalizarCodigoRespaldo("abcd-efgl") === null);
ver("ni uno corto, ni algo que no es texto", normalizarCodigoRespaldo("abc-def") === null && normalizarCodigoRespaldo(12345678) === null);
const muchos = new Set(Array.from({ length: 2000 }, () => formatearCodigo(crypto.getRandomValues(new Uint8Array(8)))));
ver("2000 códigos al azar no se repiten", muchos.size === 2000, muchos.size);
ver(`se dan ${CANTIDAD_CODIGOS}`, CANTIDAD_CODIGOS === 8);

console.log("\n2) La espera de \"Perdí mi celular\"");
const desde = new Date("2026-10-15T12:00:00Z");
ver("con contraseña, 7 días", DIAS_ESPERA_CON_CONTRASENA === 7 && venceLaEspera(desde, true).toISOString() === "2026-10-22T12:00:00.000Z");
ver("sin contraseña, 14 días", DIAS_ESPERA_SIN_CONTRASENA === 14 && venceLaEspera(desde, false).toISOString() === "2026-10-29T12:00:00.000Z");
ver("diasDeEspera dice lo mismo", diasDeEspera(true) === 7 && diasDeEspera(false) === 14);

console.log("\n3) El dispositivo, como lo reconoce la persona");
ver("Chrome en Windows", describirDispositivo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36") === "Chrome en Windows");
ver("Safari en iPhone", describirDispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1") === "Safari en iPhone");
ver("Chrome en Android", describirDispositivo("Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36") === "Chrome en Android");
ver("Edge no se confunde con Chrome", describirDispositivo("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141 Safari/537.36 Edg/141.0") === "Edge en Windows");
ver("la sesión abierta desde nuestro servidor (código por mail) se nombra así", describirDispositivo("Vercel Edge Functions").includes("servidor"));
ver("sin dato, no se inventa", describirDispositivo(null) === "Dispositivo desconocido");

console.log("\n4) El nivel que ve la persona");
ver("sin nada: básico", nivelDeSeguridad({ huellas: 0, apps: 0, codigosLibres: 0 }).nivel === "basico");
ver("con huella y sin códigos: bueno", nivelDeSeguridad({ huellas: 1, apps: 0, codigosLibres: 0 }).nivel === "bueno");
ver("con huella y códigos: alto", nivelDeSeguridad({ huellas: 1, apps: 0, codigosLibres: 3 }).nivel === "alto");

console.log("\n5) Cuándo pasó el segundo paso, según la sesión");
ver("lee la huella (mfa/webauthn)", segundoPasoDesde([{ method: "password", timestamp: 100 }, { method: "mfa/webauthn", timestamp: 200 }]) === 200_000);
ver("lee la app (totp)", segundoPasoDesde([{ method: "totp", timestamp: 300 }]) === 300_000);
ver("la contraseña sola no cuenta", segundoPasoDesde([{ method: "password", timestamp: 100 }, { method: "otp", timestamp: 150 }]) === null);
ver("sin datos, null", segundoPasoDesde(undefined) === null && segundoPasoDesde(["password"]) === null);

console.log("\n6) Sin el segundo paso no se es nadie");
const sesion = codigo("src/lib/auth-session.ts");
ver("getCurrentUser devuelve null si falta el segundo paso", /return r && !r\.faltaSegundoPaso \? r\.user : null;/.test(sesion));
ver("y el admin sigue con su propio camino", /const falta = !isAdminEmail && \(await faltaSegundoPaso\(supabase, data\.user\)\);/.test(sesion));
const mfa = codigo("src/lib/mfa.ts");
ver("faltaSegundoPaso falla cerrado", /if \(error \|\| !data\) return true;/.test(mfa) && /catch \{\s*return true;\s*\}/.test(mfa.slice(mfa.indexOf("faltaSegundoPaso"))));
ver("y mira los factores recién leídos, no los de la cookie", /user\.factors \?\? \[\]\)\.some\(\(f\) => f\.status === "verified"\)/.test(mfa));
const mw = codigo("src/middleware.ts");
const paneles = mw.match(/const PANTALLAS_CON_CUENTA = (\/.*\/);/)?.[1] ?? "";
for (const p of ["panel", "dashboard", "digitales", "afiliados", "mi-cuenta", "actualizar-contrasena"]) {
  ver(`el middleware manda /${p} a verificar`, paneles.includes(p));
}
ver("y manda a /verificar con el destino", /new URL\("\/verificar", request\.url\)/.test(mw) && /searchParams\.set\("next"/.test(mw));

console.log("\n7) Lo que prometen los términos");
const adminRec = codigo("src/app/api/admin/seguridad/recuperaciones/route.ts");
ver("el admin no tiene forma de quitar el doble paso de nadie", !/apagarDosPasos|deleteFactor|mfa\.admin/.test(adminRec));
const link = codigo("src/app/api/seguridad/recuperacion/link/route.ts");
ver("los links del mail no hacen nada con sólo abrirlos (no hay GET)", !/export async function GET/.test(link) && /export async function POST/.test(link));
ver("la página del link no llama a la API sola", !/useEffect/.test(codigo("src/app/seguridad/recuperacion/RecuperacionCliente.tsx")));
const activado = codigo("src/app/api/seguridad/activado/route.ts");
ver("el primer método pide el código por mail, y si no está lo deshace", /factores\.length === 1/.test(activado) && /deleteFactor\(\{ id: factorId, userId: user\.id \}\)/.test(activado));
const nucleo = codigo("src/lib/seguridad-cuenta.ts");
ver("al terminar la espera se traban los cobros", /await apagarDosPasos\(r\.userId\);\s*const hasta = new Date\(ahora\.getTime\(\) \+ DIAS_DINERO_TRABADO \* DIA_MS\);\s*await trabarDinero\(r\.userId, hasta\);/.test(nucleo));
ver("y con un código de respaldo también", /entrarConCodigoRespaldo[\s\S]{0,300}trabarDinero\(u\.id/.test(nucleo));
ver("pasar el segundo paso cancela el pedido abierto", /cancelarRecuperacionesDe\(userId, "entró con el segundo paso"\)/.test(nucleo));
ver("el cron sólo termina las que están esperando (no las congeladas)", /where: \{ id: r\.id, estado: "esperando" \},\s*data: \{ estado: "completada"/.test(nucleo));
ver("si el mail del pedido no sale, el pedido no arranca", /recuperacionDosPasos\.delete\(\{ where: \{ id: r\.id \} \}\)/.test(nucleo));
ver("los códigos se guardan como HMAC, nunca en claro", /createHmac\("sha256", secreto\(\)\)\.update\(`respaldo:\$\{codigo\}`\)/.test(nucleo) && !/huella: c\b|huella: codigo\b/.test(nucleo));
ver("gastar un código es una sola escritura con la condición adentro", /updateMany\(\{\s*where: \{ userId, huella: huellaCodigo\(codigo\), usadoAt: null \}/.test(nucleo));

console.log("\n8) A dónde va la plata pide verificar");
const pagos = codigo("src/app/api/pagos/route.ts");
ver("cambiar un CBU ya cargado en la tienda", /habiaDatos\s*\?\s*await identidadReciente\(req, user\.id, \{ tocaDinero: true \}\)/.test(pagos));
ver("desconectar Mercado Pago", /identidadReciente\(req, user\.id, \{ tocaDinero: true \}\)/.test(codigo("src/app/api/mp/oauth/disconnect/route.ts")));
const conectar = codigo("src/app/api/mp/oauth/connect/route.ts");
ver("cambiar una cuenta de Mercado Pago ya conectada", /if \(yaConectada\?\.mpAccessToken\)[\s\S]{0,120}identidadReciente/.test(conectar));
ver("y no se conecta nada con los cobros trabados", /const trabado = await dineroTrabado\(user\.id\);/.test(conectar));
const identidad = codigo("src/lib/identidad-reciente.ts");
ver("con doble paso, el mail solo no alcanza", /if \(conDosPasos\) \{[\s\S]*?return \{ ok: false, status: 403/.test(identidad));

console.log("\n9) Los documentos");
ver("los términos usan los plazos del código", TERMINOS_DOS_PASOS.some((t) => t.includes(`${DIAS_ESPERA_CON_CONTRASENA} días`)) && TERMINOS_DOS_PASOS.some((t) => t.includes("nunca quita")));
ver("la privacidad dice que la huella no sale del dispositivo", PRIVACIDAD_DATO_DOS_PASOS.includes("nunca salen de tu dispositivo"));
const terminos = leer("src/app/terminos/page.tsx");
ver("las tres solapas tienen la sección", (terminos.match(/list: TERMINOS_DOS_PASOS/g) ?? []).length === 3);
ver("la privacidad, en las tres solapas", (leer("src/app/privacidad/page.tsx").match(/^\s*PRIVACIDAD_DATO_DOS_PASOS,/gm) ?? []).length === 3);
ver("la versión subió", /CURRENT_TERMS_VERSION = "1\.11"/.test(leer("src/lib/legal.ts")));
ver("la ayuda tiene su artículo, en el índice", /slug: "verificacion-en-dos-pasos"/.test(leer("src/lib/ayuda/indice.ts")) && /slug: "verificacion-en-dos-pasos"/.test(leer("src/lib/ayuda/articulos.ts")));
ver("Sasha sabe dónde está", /### Seguridad — verificación en dos pasos/.test(leer("src/lib/asistente-prompt.ts")) && /slug: "seguridad"/.test(leer("src/lib/sasha-digital-saber.ts")));
ver("la migración existe", existsSync("prisma/migrations/20261015120000_seguridad_dos_pasos/migration.sql"));

console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien: sin el segundo paso no se entra, y la plata no se mueve sin verificar.");
process.exit(fallos ? 1 : 0);
