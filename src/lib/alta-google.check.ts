/* Corre con: npx tsx src/lib/alta-google.check.ts */
import { readFileSync } from "node:fs";
import {
  tieneGoogle, registroSinConfirmarConGoogle, altaPendiente, caminoSeguro, destinoTrasGoogle, esNavegadorDeApp,
} from "./alta-google";
import { estadoDeLaSesion, vencida } from "./sesion-admin";

let fallos = 0;
function check(id: string, ok: boolean, texto: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${texto}`);
  if (!ok) fallos++;
}
const leer = (p: string) => readFileSync(p, "utf8");

/* ── Quién tiene Google ──────────────────────────────────────────────────── */
check("GO-A", tieneGoogle({ app_metadata: { providers: ["email", "google"] } })
  && tieneGoogle({ identities: [{ provider: "google" }] })
  && !tieneGoogle({ app_metadata: { providers: ["email"] } }) && !tieneGoogle(null),
  "se reconoce una cuenta con Google, y una de mail sola no");
check("GO-B", registroSinConfirmarConGoogle({
  app_metadata: { providers: ["email", "google"] },
  identities: [{ provider: "email", identity_data: { email_verified: false } }, { provider: "google" }],
}) && !registroSinConfirmarConGoogle({
  app_metadata: { providers: ["email", "google"] },
  identities: [{ provider: "email", identity_data: { email_verified: true } }, { provider: "google" }],
}) && !registroSinConfirmarConGoogle({
  app_metadata: { providers: ["email"] },
  identities: [{ provider: "email", identity_data: { email_verified: false } }],
}), "el robo por adelantado: solo cuando hay Google Y un registro con mail nunca confirmado");

/* ── Alta a medio hacer ──────────────────────────────────────────────────── */
const vacio = { role: "BUYER", termsAcceptedAt: null, tieneTienda: false, tieneSuscripcion: false };
check("GO-C", altaPendiente(null) && altaPendiente(vacio), "sin perfil, o con el comprador vacío: le falta el alta");
check("GO-D", !altaPendiente({ ...vacio, termsAcceptedAt: new Date() })
  && !altaPendiente({ ...vacio, role: "OWNER" })
  && !altaPendiente({ ...vacio, tieneTienda: true })
  && !altaPendiente({ ...vacio, tieneSuscripcion: true }),
  "una cuenta que ya eligió algo nunca vuelve al alta (no se le puede cambiar el rol ni el plan)");

/* ── A dónde va ──────────────────────────────────────────────────────────── */
check("GO-E", caminoSeguro("//malo.com") === null && caminoSeguro("https://malo.com") === null
  && caminoSeguro("/\\malo.com") === null && caminoSeguro("/a\nb") === null && caminoSeguro("/dashboard") === "/dashboard",
  "el regreso solo va a caminos de este sitio");
check("GO-F", destinoTrasGoogle(true, "/registro?google=1&plan=owner&tier=PREMIUM") === "/registro?google=1&plan=owner&tier=PREMIUM"
  && destinoTrasGoogle(true, "/registro?plan=seller") === "/registro?plan=seller&google=1"
  && destinoTrasGoogle(true, "/dashboard") === "/registro?google=1"
  && destinoTrasGoogle(true, "//malo.com") === "/registro?google=1",
  "sin el alta terminada va al registro, con lo que ya había elegido");
check("GO-G", destinoTrasGoogle(false, "/registro?google=1") === "/panel"
  && destinoTrasGoogle(false, "/dashboard/pedidos") === "/dashboard/pedidos"
  && destinoTrasGoogle(false, "https://malo.com") === "/panel"
  && destinoTrasGoogle(false, null) === "/panel",
  "con la cuenta hecha va a donde iba, o a su panel");

/* ── Navegadores de apps ─────────────────────────────────────────────────── */
check("GO-H", esNavegadorDeApp("Mozilla/5.0 (iPhone) Instagram 300.0")
  && esNavegadorDeApp("Mozilla/5.0 [FBAN/FBIOS;FBAV/400]")
  && esNavegadorDeApp("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit")
  && !esNavegadorDeApp("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36")
  && !esNavegadorDeApp("Mozilla/5.0 (iPhone) Version/17 Mobile Safari/604.1"),
  "Instagram y Facebook muestran el aviso de abrir Chrome; Chrome y Safari, el botón");

/* ── El admin no entra con Google ────────────────────────────────────────── */
const conGoogleYCodigo = estadoDeLaSesion({
  currentLevel: "aal2", nextLevel: "aal2",
  currentAuthenticationMethods: [{ method: "totp", timestamp: Math.floor(Date.now() / 1000) }, { method: "oauth", timestamp: Math.floor(Date.now() / 1000) }],
});
check("GO-I", vencida(conGoogleYCodigo, Date.now(), Date.now()) === "google",
  "en el admin, una sesión de Google se corta aunque haya puesto el código");
const cb = leer("src/app/auth/callback/route.ts");
check("GO-J", cb.includes("esElAdmin(user.id, user.email)") && cb.includes('signOut({ scope: "local" })')
  && cb.indexOf("esElAdmin(") < cb.indexOf("destinoTrasGoogle("),
  "el regreso de Google le cierra la sesión al admin antes de mandarlo a ningún lado");
check("GO-K", leer("src/middleware.ts").includes("!estado.conGoogle"), "el middleware mira Google también en las rutas del admin");

/* ── El alta con Google valida lo mismo que la de siempre ────────────────── */
const g = leer("src/app/api/auth/registro/google/route.ts");
const r = leer("src/app/api/auth/registro/route.ts");
check("GO-L", g.includes("validarDatosDeAlta(body)") && r.includes("validarDatosDeAlta(body)")
  && g.includes("nombreDeTiendaTomado(") && r.includes("nombreDeTiendaTomado(")
  && g.includes("perfilDeAlta(") && r.includes("perfilDeAlta("),
  "las dos puertas usan las mismas validaciones y arman el mismo perfil");
check("GO-M", g.includes("tieneGoogle(user)") && g.includes("tieneAltaPendiente(user.id)") && g.includes("esElAdmin(")
  && g.includes("checkRateLimit("),
  "el alta con Google solo sirve a una cuenta de Google, sin terminar, que no es el admin, y con límite");
check("GO-N", leer("src/components/BotonGoogle.tsx").includes("if (!GOOGLE_PRENDIDO"),
  "el botón queda apagado hasta configurar Google");
check("GO-O", leer("src/app/panel/page.tsx").includes('redirect("/registro?google=1")'),
  "quien entra al panel sin terminar el alta va a terminarla");

if (fallos) { console.log(`\n${fallos} chequeo(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
