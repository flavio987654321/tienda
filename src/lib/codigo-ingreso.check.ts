/* Corre con: npx tsx src/lib/codigo-ingreso.check.ts */
import { readFileSync } from "node:fs";
import { normalizarEmail, normalizarCodigo, INTENTOS_MAX } from "./codigo-ingreso";
import { googleRecienConectado } from "./alta-google";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}
const leer = (p: string) => readFileSync(p, "utf8");

/* ── Datos ───────────────────────────────────────────────────────────────── */
check("CO-A", normalizarEmail("  Ana@Gmail.com ") === "ana@gmail.com" && normalizarEmail("no-es-mail") === null
  && normalizarEmail(42) === null && normalizarEmail("a@b.c".padStart(300, "x")) === null,
  "el mail se normaliza, y lo que no es mail se rechaza");
check("CO-B", normalizarCodigo(" 123 456 ") === "123456" && normalizarCodigo("12345") === null
  && normalizarCodigo("12345a") === null && normalizarCodigo(123456) === null,
  "el código son solo números (6 a 10), con o sin espacios");

/* ── Pedir el código ─────────────────────────────────────────────────────── */
const pedir = leer("src/app/api/auth/codigo/pedir/route.ts");
check("CO-C", pedir.includes("verifyTurnstile(") && pedir.includes("codigo-ip:") && pedir.includes("codigo-mail:"),
  "pedir un código lleva captcha y tope por IP y por mail (no se le llena la casilla a nadie)");
check("CO-D", (pedir.match(/return listo;/g) ?? []).length >= 4 && !/status: 404/.test(pedir),
  "contesta lo mismo exista o no la cuenta: no sirve para averiguar quién está registrado");
check("CO-E", pedir.includes("user.banned") && pedir.includes("esElAdmin("),
  "no se le manda código a una cuenta suspendida ni al admin");

/* ── Entrar con el código ────────────────────────────────────────────────── */
const entrar = leer("src/app/api/auth/codigo/entrar/route.ts");
check("CO-F", entrar.includes("countFailures(clave)") && entrar.includes("recordFailure(clave") && INTENTOS_MAX <= 5
  && entrar.includes("`codigo-entrar:${email}`"),
  "los códigos errados se cuentan por mail y a los 5 se frena: un código de 6 números no se adivina");
check("CO-G", entrar.indexOf("sinConfirmar =") < entrar.indexOf("verifyOtp(") && entrar.includes("updateUserById(data.user.id"),
  "robo por adelantado: si el mail nunca se confirmó, la contraseña de otro se anula");
check("CO-H", entrar.includes("esElAdmin(data.user.id") && entrar.includes('signOut({ scope: "local" })'),
  "el admin no entra con código aunque lo consiga");

/* ── La pantalla ─────────────────────────────────────────────────────────── */
const pantalla = leer("src/components/EntrarConCodigo.tsx");
check("CO-I", (pantalla.match(/AbortSignal\.timeout\(/g) ?? []).length === 2 && pantalla.includes("if (enVuelo.current")
  && pantalla.includes("enVuelo.current = false"),
  "sin internet no queda girando y dos toques no mandan dos mails");
check("CO-J", pantalla.includes('autoComplete="one-time-code"') && pantalla.includes('inputMode="numeric"'),
  "el celular ofrece pegar el código del mail y abre el teclado numérico");
check("CO-K", leer("src/components/panel/PanelLogin.tsx").includes("<EntrarConCodigo")
  && leer("src/app/(auth)/login/page.tsx").includes("<EntrarConCodigo"),
  "el código está en el login de la web y en el de la app instalada");

/* ── Agregar contraseña ──────────────────────────────────────────────────── */
const agregar = leer("src/components/AgregarContrasena.tsx");
check("CO-L", agregar.includes("validarContrasena(clave)") && agregar.includes("clave !== repetir")
  && agregar.includes('"/api/auth/contrasena"') && agregar.includes("d.tiene === false"),
  "agregar contraseña usa la regla de siempre, pide repetirla, y solo aparece a quien no tiene");
const servidor = leer("src/lib/alta-google-servidor.ts");
check("CO-L2", servidor.includes("encrypted_password") && /catch[\s\S]*return true;/.test(servidor)
  && leer("src/app/dashboard/ajustes/page.tsx").includes("tieneContrasena(user.id)")
  && leer("src/app/admin/usuarios/page.tsx").includes("con_clave"),
  "si tiene contraseña se mira en la contraseña misma (no en la lista de proveedores, que no siempre se entera)");
check("CO-H2", entrar.includes("suspendida?.banned"), "una cuenta suspendida no entra con un código viejo");
for (const [id, archivo] of [
  ["CO-M1", "src/app/digitales/configuracion/TabGeneral.tsx"],
  ["CO-M2", "src/app/afiliados/VendedorasClient.tsx"],
  ["CO-M3", "src/app/mi-cuenta/page.tsx"],
  ["CO-M4", "src/app/dashboard/ajustes/page.tsx"],
] as const) {
  check(id, leer(archivo).includes("<AgregarContrasena />"), `"Agregar contraseña" está en ${archivo.split("/").slice(-2).join("/")}`);
}

/* ── Aviso de Google conectado ───────────────────────────────────────────── */
const ahora = Date.parse("2026-10-02T12:00:00Z");
const hace = (min: number) => new Date(ahora - min * 60000).toISOString();
const conClave = { provider: "email", identity_data: { email_verified: true } };
check("CO-N", googleRecienConectado({ identities: [conClave, { provider: "google", created_at: hace(1) }] }, ahora)
  && !googleRecienConectado({ identities: [conClave, { provider: "google", created_at: hace(60 * 24) }] }, ahora)
  && !googleRecienConectado({ identities: [{ provider: "google", created_at: hace(1) }] }, ahora)
  && !googleRecienConectado({ identities: [{ provider: "email", identity_data: { email_verified: false } }, { provider: "google", created_at: hace(1) }] }, ahora),
  "se avisa solo cuando Google se suma recién a una cuenta que ya tenía contraseña");
check("CO-O", leer("src/app/auth/callback/route.ts").includes("sendAvisoGoogleConectado("),
  "el regreso de Google manda el aviso");

/* ── Admin y ayuda ───────────────────────────────────────────────────────── */
check("CO-P", leer("src/app/admin/usuarios/page.tsx").includes("raw_app_meta_data->'providers'")
  && leer("src/app/admin/usuarios/UsuariosAdmin.tsx").includes("Solo Google"),
  "la lista de usuarios del admin dice quién entra con Google");
check("CO-Q", leer("src/lib/ayuda/articulos.ts").includes('slug: "entrar-con-google-o-con-un-codigo"')
  && leer("src/lib/ayuda/articulos.ts").includes("${INTENTOS_MAX} códigos equivocados"),
  "hay un artículo de ayuda, y sus números salen de las constantes");

if (fallos) { console.log(`\n${fallos} chequeo(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
